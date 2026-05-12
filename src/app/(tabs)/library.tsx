import AutoHideScrollView from "@/src/components/AutoHideScrollView";
import { SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { supabase } from "@/src/lib/supabase";
import { performMutation } from "@/src/lib/sync";
import { getDb } from "@/src/db/database";
import { decode } from "base-64";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { ROUNDNESS } from "@/src/constants/Theme";

// Import extracted components
import LibraryHeader from "@/src/components/Library/LibraryHeader";
import LibraryStats from "@/src/components/Library/LibraryStats";
import BookGrid from "@/src/components/Library/BookGrid";
import AddBookModal from "@/src/components/Library/AddBookModal";
import BookDetailsModal from "@/src/components/Library/BookDetailsModal";

interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  file_uri: string;
  cover_uri: string;
  status: "reading" | "finished" | "want_to_read";
  updated_at: string;
  synthesis?: string;
}

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const userId = user?.id || "guest";

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Data
  const {
    data: books,
    loading: booksLoading,
    refresh: refreshBooks,
  } = useData<Book>(
    "SELECT * FROM books WHERE (user_id = ? OR user_id IS NULL) ORDER BY updated_at DESC",
    [userId],
  );

  const stats = useMemo(() => {
    const reading = books.filter((b) => b.status === "reading");
    const finished = books.filter((b) => b.status === "finished");
    const totalPagesRead = books.reduce(
      (acc, b) => acc + (b.current_page || 0),
      0,
    );
    return {
      reading: reading.length,
      finished: finished.length,
      pages: totalPagesRead,
    };
  }, [books]);

  useFocusEffect(
    useCallback(() => {
      refreshBooks();
    }, [refreshBooks]),
  );

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setSelectedFile(file);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
          const { data, error } = await supabase.functions.invoke(
            "process-book-ai",
            {
              body: { filename: file.name },
            },
          );

          if (!error && data) {
            setBookTitle(data.title || file.name.replace(/\.[^/.]+$/, ""));
            setBookAuthor(data.author || "");
            setTotalPages(data.totalPages?.toString() || "");
          } else {
            setBookTitle(file.name.replace(/\.[^/.]+$/, ""));
          }
        } catch (e) {
          setBookTitle(file.name.replace(/\.[^/.]+$/, ""));
        } finally {
          setShowAddModal(true);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleAddBook = async () => {
    if (!bookTitle.trim()) return;

    setLoading(true);
    try {
      let finalUri = "";
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const localUri = `${FileSystem.documentDirectory}books/${fileName}`;
        const dirPath = `${FileSystem.documentDirectory}books/${userId}`;
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        await FileSystem.copyAsync({
          from: selectedFile.uri,
          to: localUri,
        });

        const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        supabase.storage
          .from("books")
          .upload(filePath, decode(base64), {
            contentType: selectedFile.mimeType || "application/pdf",
            upsert: true,
          })
          .then(({ error }) => {
            if (error) console.error("Cloud sync error:", error);
          });

        finalUri = localUri;
      }

      const id = Math.random().toString(36).substring(7);
      await performMutation("books", "INSERT", {
        id,
        user_id: userId,
        title: bookTitle.trim(),
        author: bookAuthor.trim() || "Unknown",
        total_pages: parseInt(totalPages) || 0,
        current_page: 0,
        file_uri: finalUri,
        status: "reading",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setShowAddModal(false);
      setBookTitle("");
      setBookAuthor("");
      setTotalPages("");
      setSelectedFile(null);
      refreshBooks();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("Upload Error", "Failed to add book to library.");
    } finally {
      setLoading(false);
    }
  };

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] =
    useState<Book | null>(null);

  const openDetails = (book: Book) => {
    setSelectedBookForDetails(book);
    setShowDetailsModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openReader = (book: Book) => {
    setShowDetailsModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/reader/${book.id}`);
  };

  const handleDeleteBook = async (id: string, fileUri?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Remove Book",
      "Are you sure you want to delete this book from your library?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await performMutation("books", "DELETE", { id });

              if (fileUri) {
                const fileInfo = await FileSystem.getInfoAsync(fileUri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(fileUri);
                }
              }

              const db = await getDb();
              await db.runAsync("DELETE FROM reading_sessions WHERE book_id = ?", [id]);

              refreshBooks();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (e) {
              console.error("Delete error:", e);
              Alert.alert("Error", "Failed to delete book");
            }
          },
        },
      ],
    );
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const generateAIInsights = async (book: Book) => {
    setIsGeneratingAI(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-book-ai",
        {
          body: { title: book.title },
        },
      );

      if (error) throw error;

      await performMutation("books", "UPDATE", {
        id: book.id,
        synthesis: data.synthesis,
        updated_at: new Date().toISOString(),
      });

      refreshBooks();
      Alert.alert(
        "AI Synthesis Complete",
        "Insights have been generated from your reading session.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert("AI Error", "Failed to generate insights.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <LibraryHeader onSettingsPress={() => router.push("/modal")} />

          <AutoHideScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <LibraryStats stats={stats} />

            <BookGrid
              books={books as any}
              loading={booksLoading}
              onBookPress={openDetails}
              onEmptyPress={handlePickDocument}
            />
          </AutoHideScrollView>

          <AddBookModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            bookTitle={bookTitle}
            onTitleChange={setBookTitle}
            bookAuthor={bookAuthor}
            onAuthorChange={setBookAuthor}
            totalPages={totalPages}
            onPagesChange={setTotalPages}
            onAddBook={handleAddBook}
            loading={loading}
          />

          <BookDetailsModal
            visible={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            book={selectedBookForDetails as any}
            onContinueReading={() => selectedBookForDetails && openReader(selectedBookForDetails)}
            onGenerateAI={() => selectedBookForDetails && generateAIInsights(selectedBookForDetails)}
            onDelete={() => selectedBookForDetails && handleDeleteBook(selectedBookForDetails.id, selectedBookForDetails.file_uri)}
            isGeneratingAI={isGeneratingAI}
          />

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={handlePickDocument}
            activeOpacity={0.8}
          >
            <Plus size={28} color={colors.onPrimary} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
});
