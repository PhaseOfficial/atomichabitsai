import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { supabase } from "@/src/lib/supabase";
import { performMutation } from "@/src/lib/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode } from "base-64";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  Book as BookIcon,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  Menu,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  X
} from "lucide-react-native";
import React, {
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper for PDF Placeholder
const PdfPlaceholder = (props: any) => (
  <View style={[props.style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 20 }]}>
    <BookOpen size={48} color="#ccc" style={{ marginBottom: 16 }} />
    <Text style={{ textAlign: 'center', color: '#666', fontSize: 16, fontWeight: '600' }}>
      PDF Reader Unavailable
    </Text>
    <Text style={{ textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 }}>
      Native modules are not supported in Expo Go.
    </Text>
    <TouchableOpacity 
      style={{ marginTop: 20, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
      onPress={() => Alert.alert("Development Build Required", "To view PDFs, you must create a development build by running 'npx expo run:android' or 'npx expo run:ios'.")}
    >
      <Text style={{ color: 'white', fontWeight: 'bold' }}>Learn More</Text>
    </TouchableOpacity>
  </View>
);

// Safe PDF Component Wrapper
const Pdf = (props: any) => {
  const [PdfComponent, setPdfComponent] = useState<any>(null);
  const [error, setError] = useState(false);

  useMemo(() => {
    try {
      // Lazy require to avoid top-level native module evaluation crashes
      const PdfLib = require("react-native-pdf");
      const Comp = PdfLib.default || PdfLib;
      setPdfComponent(() => Comp);
    } catch (e) {
      console.log("PDF Reader not available - likely running in Expo Go");
      setError(true);
    }
  }, []);

  if (error) return <PdfPlaceholder {...props} />;
  if (!PdfComponent) return <ActivityIndicator style={props.style} />;
  
  const Comp = PdfComponent;
  return <Comp {...props} />;
};

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
  last_page_read?: number;
}

interface ReadingLog {
  id: string;
  book_id: string;
  pages_read: number;
  duration_minutes: number;
  duration_seconds: number;
  logged_at: string;
  notes?: string;
}

interface ReadingSession {
  bookId: string;
  startTime: number;
  startPage: number;
  lastUpdateTime: number;
  accumulatedTime: number;
  notes: Note[];
}

interface Note {
  id: string;
  page: number;
  content: string;
  timestamp: string;
  color?: string;
}

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const userId = user?.id || "guest";

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Reader Session State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPdfPages, setTotalPdfPages] = useState(0);
  const [currentPageInput, setCurrentPageInput] = useState("");

  // Timer State
  const [sessionTime, setSessionTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number | null>(null);
  const accumulatedTime = useRef<number>(0);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Animation values
  const notePanelHeight = useSharedValue(0);
  const notePanelOpacity = useSharedValue(0);

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

  // Timer Functions
  const startTimer = useCallback(() => {
    if (!isTimerRunning && activeBook) {
      setIsTimerRunning(true);
      sessionStartTime.current = Date.now();

      timerInterval.current = setInterval(() => {
        if (sessionStartTime.current) {
          const elapsed = Math.floor(
            (Date.now() - sessionStartTime.current) / 1000,
          );
          setSessionTime(accumulatedTime.current + elapsed);
        }
      }, 1000);
    }
  }, [isTimerRunning, activeBook]);

  const pauseTimer = useCallback(() => {
    if (isTimerRunning && sessionStartTime.current) {
      setIsTimerRunning(false);
      const elapsed = Math.floor(
        (Date.now() - sessionStartTime.current) / 1000,
      );
      accumulatedTime.current += elapsed;
      setSessionTime(accumulatedTime.current);

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      sessionStartTime.current = null;
    }
  }, [isTimerRunning]);

  const resetTimer = useCallback(() => {
    pauseTimer();
    accumulatedTime.current = 0;
    setSessionTime(0);
  }, [pauseTimer]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Notes Functions
  const addNote = useCallback(
    (page: number, content: string) => {
      const newNote: Note = {
        id: Math.random().toString(36).substring(7),
        page,
        content,
        timestamp: new Date().toISOString(),
        color: colors.primary,
      };

      setNotes((prev) => [...prev, newNote]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [colors.primary],
  );

  const updateNote = useCallback((noteId: string, content: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, content, timestamp: new Date().toISOString() }
          : note,
      ),
    );
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getNotesForCurrentPage = useCallback(() => {
    return notes.filter((note) => note.page === currentPage);
  }, [notes, currentPage]);

  // Save Reading Session
  const saveReadingSession = useCallback(async () => {
    if (!activeBook) return;

    const sessionData: ReadingSession = {
      bookId: activeBook.id,
      startTime: sessionStartTime.current || Date.now(),
      startPage: activeBook.current_page,
      lastUpdateTime: Date.now(),
      accumulatedTime: accumulatedTime.current,
      notes,
    };

    try {
      await AsyncStorage.setItem(
        `reading_session_${activeBook.id}`,
        JSON.stringify(sessionData),
      );
    } catch (error) {
      console.error("Failed to save reading session:", error);
    }
  }, [activeBook, notes]);

  // Load Reading Session
  const loadReadingSession = useCallback(async (bookId: string) => {
    try {
      const sessionData = await AsyncStorage.getItem(
        `reading_session_${bookId}`,
      );
      if (sessionData) {
        const session: ReadingSession = JSON.parse(sessionData);
        accumulatedTime.current = session.accumulatedTime;
        setSessionTime(session.accumulatedTime);
        setNotes(session.notes || []);
        return session;
      }
    } catch (error) {
      console.error("Failed to load reading session:", error);
    }
    return null;
  }, []);

  const [isExtracting, setIsExtracting] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setSelectedFile(file);
        setIsExtracting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
          // Trigger AI Metadata Extraction
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
          setIsExtracting(false);
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

        // Copy file to app's document directory for local access
        const localUri = `${FileSystem.documentDirectory}books/${fileName}`;
        await FileSystem.makeDirectoryAsync(
          `${FileSystem.documentDirectory}books`,
          { intermediates: true },
        );
        await FileSystem.copyAsync({
          from: selectedFile.uri,
          to: localUri,
        });

        // Upload to Supabase Storage (async, don't block)
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

  const openReader = async (book: Book) => {
    setShowDetailsModal(false);
    setActiveBook(book);

    // Load previous session if exists
    const savedSession = await loadReadingSession(book.id);

    setCurrentPage(book.current_page || 0);
    setCurrentPageInput((book.current_page || 0).toString());
    setShowReader(true);

    // Start timer
    startTimer();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeReader = async () => {
    if (!activeBook) return;

    pauseTimer();

    const pagesRead = Math.max(0, currentPage - (activeBook.current_page || 0));
    const durationSeconds = sessionTime;

    try {
      // Update book progress
      await performMutation("books", "UPDATE", {
        id: activeBook.id,
        current_page: currentPage,
        last_page_read: currentPage,
        status:
          activeBook.total_pages > 0 && currentPage >= activeBook.total_pages
            ? "finished"
            : "reading",
        updated_at: new Date().toISOString(),
      });

      // Log reading session if there was activity
      if (pagesRead > 0 || durationSeconds > 60) {
        await performMutation("reading_logs", "INSERT", {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          book_id: activeBook.id,
          pages_read: pagesRead,
          duration_seconds: durationSeconds,
          duration_minutes: durationSeconds / 60,
          notes: notes.length > 0 ? JSON.stringify(notes) : null,
          logged_at: new Date().toISOString(),
        });
      }

      // Save session for later resume
      await saveReadingSession();

      setShowReader(false);
      setActiveBook(null);
      resetTimer();
      setNotes([]);
      refreshBooks();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Error saving reading session:", e);
      setShowReader(false);
    }
  };

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPdfPages(total);
    setCurrentPageInput(page.toString());

    // Update book total pages if it wasn't set
    if (
      activeBook &&
      (!activeBook.total_pages || activeBook.total_pages === 0)
    ) {
      performMutation("books", "UPDATE", {
        id: activeBook.id,
        total_pages: total,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const goToPage = () => {
    const pageNum = parseInt(currentPageInput);
    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPdfPages) {
      setCurrentPage(pageNum);
      // PDF component will handle the page change
    }
  };

  const notePanelAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: notePanelHeight.value,
      opacity: notePanelOpacity.value,
    };
  });

  const toggleNotePanel = () => {
    const isOpening = notePanelHeight.value === 0;
    notePanelHeight.value = withSpring(isOpening ? 300 : 0);
    notePanelOpacity.value = withTiming(isOpening ? 1 : 0);
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

              // Clear session data
              await AsyncStorage.removeItem(`reading_session_${id}`);

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
          body: { title: book.title, notes: notes },
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => router.push("/menu")}
            >
              <Menu size={24} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/images/Artboard 1 logo.png")}
                style={styles.logoImage}
                tintColor={colors.primary}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => router.push("/modal")}
            >
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Library Stats */}
            <View style={styles.statsSection}>
              <View style={styles.statCard}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={styles.statValue}>{stats.pages}</Text>
                <Text style={styles.statLabel}>PAGES READ</Text>
              </View>
              <View style={styles.statCard}>
                <BookOpen size={18} color={colors.secondary} />
                <Text style={styles.statValue}>{stats.reading}</Text>
                <Text style={styles.statLabel}>ACTIVE</Text>
              </View>
              <View style={styles.statCard}>
                <CheckCircle2 size={18} color={colors.tertiary} />
                <Text style={styles.statValue}>{stats.finished}</Text>
                <Text style={styles.statLabel}>FINISHED</Text>
              </View>
            </View>

            {/* Library Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Library</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handlePickDocument}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={styles.addBtnText}>ADD BOOK</Text>
                </TouchableOpacity>
              </View>

              {booksLoading ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={{ marginTop: 40 }}
                />
              ) : (
                <View style={styles.bookGrid}>
                  {books.map((book) => {
                    const progress =
                      book.total_pages > 0
                        ? Math.round(
                            (book.current_page / book.total_pages) * 100,
                          )
                        : 0;
                    return (
                      <TouchableOpacity
                        key={book.id}
                        style={styles.bookCard}
                        onPress={() => openDetails(book)}
                      >
                        <View
                          style={[
                            styles.bookCover,
                            { backgroundColor: colors.surfaceVariant },
                          ]}
                        >
                          <BookIcon
                            size={40}
                            color={colors.outlineVariant}
                            strokeWidth={1}
                          />
                          {book.status === "reading" && (
                            <View style={styles.resumeIndicator}>
                              <Play size={12} color="#fff" fill="#fff" />
                            </View>
                          )}
                          <View style={styles.progressOverlay}>
                            <Text style={styles.progressText}>{progress}%</Text>
                          </View>
                        </View>
                        <Text style={styles.bookTitle} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text style={styles.bookAuthor} numberOfLines={1}>
                          {book.author}
                        </Text>

                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor:
                                  book.status === "finished"
                                    ? colors.tertiary
                                    : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {books.length === 0 && (
                    <TouchableOpacity
                      style={styles.emptyBookCard}
                      onPress={handlePickDocument}
                    >
                      <Upload
                        size={32}
                        color={colors.outline}
                        strokeWidth={1.5}
                      />
                      <Text style={styles.emptyBookText}>
                        Your library is empty
                      </Text>
                      <Text style={styles.emptyBookSub}>
                        Tap to add your first book
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Add Book Modal */}
          <Modal visible={showAddModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalContainer}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Book</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <X size={24} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>TITLE</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={bookTitle}
                      onChangeText={setBookTitle}
                      placeholder="Book Title"
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>AUTHOR</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={bookAuthor}
                      onChangeText={setBookAuthor}
                      placeholder="Author Name"
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>TOTAL PAGES</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={totalPages}
                      onChangeText={setTotalPages}
                      keyboardType="numeric"
                      placeholder="Total pages"
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                    onPress={handleAddBook}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                      <>
                        <Upload size={20} color={colors.onPrimary} />
                        <Text style={styles.primaryBtnText}>
                          Add to Library
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* PDF Reader Modal */}
          <Modal
            visible={showReader}
            animationType="fade"
            presentationStyle="fullScreen"
          >
            <View style={styles.readerContainer}>
              <SafeAreaView style={styles.readerHeader}>
                <View style={styles.readerInfo}>
                  <Text style={styles.readerTitle} numberOfLines={1}>
                    {activeBook?.title}
                  </Text>
                  <View style={styles.readerMetaRow}>
                    <View style={styles.timerContainer}>
                      <Timer
                        size={14}
                        color={isTimerRunning ? colors.success : colors.primary}
                      />
                      <Text
                        style={[
                          styles.readerTimer,
                          isTimerRunning && { color: colors.success },
                        ]}
                      >
                        {formatTime(sessionTime)}
                      </Text>
                    </View>
                    <Text style={styles.pageIndicator}>
                      Page {currentPage} of{" "}
                      {totalPdfPages || activeBook?.total_pages || "?"}
                    </Text>
                  </View>
                </View>
                <View style={styles.readerActions}>
                  <TouchableOpacity
                    style={styles.readerActionBtn}
                    onPress={toggleNotePanel}
                  >
                    <BookMarked size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.readerCloseBtn}
                    onPress={closeReader}
                  >
                    <X size={24} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              <View style={styles.readerBody}>
                {activeBook?.file_uri ? (
                  <Pdf
                    source={{ uri: activeBook.file_uri, cache: true }}
                    onLoadComplete={(numberOfPages, filePath) => {
                      setTotalPdfPages(numberOfPages);
                      if (!activeBook.total_pages) {
                        setTotalPdfPages(numberOfPages);
                      }
                    }}
                    onPageChanged={(page, numberOfPages) => {
                      handlePageChange(page, numberOfPages);
                    }}
                    onError={(error) => {
                      console.error("PDF Error:", error);
                      Alert.alert("Error", "Failed to load PDF");
                    }}
                    onPressLink={(uri) => {
                      console.log("Link pressed:", uri);
                    }}
                    page={currentPage}
                    horizontal={false}
                    enablePaging={true}
                    enableRTL={false}
                    enableAnnotationRendering={true}
                    fitPolicy={2} // Fit to width
                    style={styles.pdfView}
                  />
                ) : (
                  <View style={styles.readerPlaceholder}>
                    <BookOpen size={48} color={colors.outlineVariant} />
                    <Text style={styles.placeholderText}>
                      No document available
                    </Text>
                  </View>
                )}
              </View>

              {/* Notes Panel */}
              <Animated.View
                style={[styles.notesPanel, notePanelAnimatedStyle]}
              >
                <View style={styles.notesHeader}>
                  <Text style={styles.notesTitle}>
                    Notes for Page {currentPage}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingNote(null);
                      setCurrentNote("");
                      setShowNoteModal(true);
                    }}
                  >
                    <Plus size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.notesList}>
                  {getNotesForCurrentPage().map((note) => (
                    <View key={note.id} style={styles.noteItem}>
                      <View style={styles.noteContent}>
                        <Text style={styles.noteText}>{note.content}</Text>
                        <Text style={styles.noteTimestamp}>
                          {new Date(note.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View style={styles.noteActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingNote(note);
                            setCurrentNote(note.content);
                            setShowNoteModal(true);
                          }}
                        >
                          <Pencil size={16} color={colors.outline} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteNote(note.id)}>
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {getNotesForCurrentPage().length === 0 && (
                    <Text style={styles.noNotesText}>
                      No notes for this page
                    </Text>
                  )}
                </ScrollView>
              </Animated.View>

              <SafeAreaView style={styles.readerFooter}>
                <View style={styles.pageInputGroup}>
                  <Text style={styles.footerLabel}>Go to:</Text>
                  <TextInput
                    style={styles.pageInput}
                    value={currentPageInput}
                    onChangeText={setCurrentPageInput}
                    keyboardType="numeric"
                    onSubmitEditing={goToPage}
                  />
                  <TouchableOpacity style={styles.goButton} onPress={goToPage}>
                    <ArrowRight size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.finishBtn, isTimerRunning && styles.pauseBtn]}
                  onPress={isTimerRunning ? pauseTimer : startTimer}
                >
                  {isTimerRunning ? (
                    <>
                      <Clock size={20} color={colors.onSurface} />
                      <Text
                        style={[
                          styles.finishBtnText,
                          { color: colors.onSurface },
                        ]}
                      >
                        PAUSE
                      </Text>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} color="#fff" />
                      <Text style={styles.finishBtnText}>RESUME</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SafeAreaView>
            </View>
          </Modal>

          {/* Note Editor Modal */}
          <Modal visible={showNoteModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalContainer}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingNote
                      ? "Edit Note"
                      : `Add Note - Page ${currentPage}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowNoteModal(false);
                      setEditingNote(null);
                      setCurrentNote("");
                    }}
                  >
                    <X size={24} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalField}>
                  <TextInput
                    style={[styles.modalInput, styles.noteInput]}
                    value={currentNote}
                    onChangeText={setCurrentNote}
                    placeholder="Write your note here..."
                    placeholderTextColor={colors.outline}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (currentNote.trim()) {
                      if (editingNote) {
                        updateNote(editingNote.id, currentNote.trim());
                      } else {
                        addNote(currentPage, currentNote.trim());
                      }
                      setShowNoteModal(false);
                      setEditingNote(null);
                      setCurrentNote("");
                    }
                  }}
                >
                  <Save size={20} color={colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>
                    {editingNote ? "Update Note" : "Save Note"}
                  </Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          </Modal>

          {/* Book Details Modal */}
          <Modal visible={showDetailsModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Book Details</Text>
                  <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                    <X size={24} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>

                {selectedBookForDetails && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.detailsHeader}>
                      <View
                        style={[styles.bookCover, { width: 120, height: 160 }]}
                      >
                        <BookIcon size={48} color={colors.outlineVariant} />
                      </View>
                      <View style={styles.detailsMeta}>
                        <Text style={styles.detailsTitle}>
                          {selectedBookForDetails.title}
                        </Text>
                        <Text style={styles.detailsAuthor}>
                          {selectedBookForDetails.author}
                        </Text>
                        <View style={styles.detailsStats}>
                          <View style={styles.detailStatItem}>
                            <TrendingUp size={14} color={colors.primary} />
                            <Text style={styles.detailStatText}>
                              {selectedBookForDetails.current_page} /{" "}
                              {selectedBookForDetails.total_pages} pages
                            </Text>
                          </View>
                          <View style={styles.detailStatItem}>
                            <Clock size={14} color={colors.secondary} />
                            <Text style={styles.detailStatText}>
                              Last read:{" "}
                              {new Date(
                                selectedBookForDetails.updated_at,
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginBottom: 12 }]}
                      onPress={() => openReader(selectedBookForDetails)}
                    >
                      <Play size={20} color={colors.onPrimary} fill="#fff" />
                      <Text style={styles.primaryBtnText}>
                        Continue Reading
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderWidth: 1,
                          borderColor: colors.outlineVariant + "33",
                        },
                      ]}
                      onPress={() => generateAIInsights(selectedBookForDetails)}
                      disabled={isGeneratingAI}
                    >
                      {isGeneratingAI ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <Sparkles size={20} color={colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.primaryBtnText,
                          { color: colors.onSurface },
                        ]}
                      >
                        Generate AI Insights
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteActionBtn}
                      onPress={() => {
                        setShowDetailsModal(false);
                        handleDeleteBook(
                          selectedBookForDetails.id,
                          selectedBookForDetails.file_uri,
                        );
                      }}
                    >
                      <Trash2 size={18} color={colors.error} />
                      <Text style={styles.deleteActionText}>
                        Remove from Library
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.background,
      height: 60,
    },
    logoContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: -1,
    },
    logoImage: { height: 40, width: 160 },
    menuBtn: { padding: 8 },
    ghostBtn: { padding: 8 },
    scrollContent: {
      paddingBottom: 40,
    },
    statsSection: {
      flexDirection: "row",
      padding: SPACING.lg,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      alignItems: "center",
    },
    statValue: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
      marginTop: 8,
    },
    statLabel: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.outline,
      marginTop: 2,
      letterSpacing: 0.5,
    },
    section: {
      padding: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: FONTS.headline,
      fontSize: 22,
      color: colors.onSurface,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addBtnText: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
      letterSpacing: 0.5,
    },
    bookGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    bookCard: {
      width: (Dimensions.get("window").width - SPACING.lg * 2 - 16) / 2,
      marginBottom: 16,
    },
    bookCover: {
      aspectRatio: 3 / 4.5,
      borderRadius: ROUNDNESS.lg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    resumeIndicator: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    progressOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingVertical: 6,
      alignItems: "center",
    },
    progressText: {
      color: "#fff",
      fontFamily: FONTS.labelSm,
      fontSize: 11,
    },
    bookTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.onSurface,
    },
    bookAuthor: {
      fontFamily: FONTS.body,
      fontSize: 11,
      color: colors.outline,
      marginTop: 2,
    },
    progressBarBg: {
      height: 3,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 1.5,
      marginTop: 8,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 1.5,
    },
    emptyBookCard: {
      width: "100%",
      paddingVertical: 40,
      borderRadius: ROUNDNESS.xl,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.outlineVariant,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      backgroundColor: colors.surface + "80",
    },
    emptyBookText: {
      fontFamily: FONTS.headline,
      fontSize: 16,
      color: colors.onSurface,
    },
    emptyBookSub: {
      fontFamily: FONTS.body,
      fontSize: 13,
      color: colors.outline,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: ROUNDNESS.xl,
      borderTopRightRadius: ROUNDNESS.xl,
      padding: SPACING.lg,
      maxHeight: "85%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.lg,
    },
    modalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
    },
    modalField: {
      marginBottom: 20,
    },
    modalLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.outline,
      marginBottom: 8,
      letterSpacing: 1,
    },
    modalInput: {
      backgroundColor: colors.surfaceVariant + "4D",
      borderRadius: ROUNDNESS.md,
      padding: 14,
      fontFamily: FONTS.body,
      fontSize: 16,
      color: colors.onSurface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    noteInput: {
      minHeight: 120,
      textAlignVertical: "top",
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: ROUNDNESS.full,
      marginTop: 10,
      marginBottom: 20,
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontFamily: FONTS.labelSm,
      fontSize: 16,
    },
    detailsHeader: {
      flexDirection: "row",
      gap: 16,
      marginBottom: SPACING.xl,
    },
    detailsMeta: {
      flex: 1,
      justifyContent: "center",
    },
    detailsTitle: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
    },
    detailsAuthor: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.outline,
      marginTop: 4,
    },
    detailsStats: {
      marginTop: 12,
      gap: 6,
    },
    detailStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detailStatText: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    deleteActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
      paddingVertical: 12,
    },
    deleteActionText: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.error,
    },
    readerContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    readerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "33",
    },
    readerInfo: {
      flex: 1,
      marginRight: 20,
    },
    readerTitle: {
      fontFamily: FONTS.headline,
      fontSize: 18,
      color: colors.onSurface,
    },
    readerMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    timerContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    readerTimer: {
      fontFamily: FONTS.label,
      fontSize: 13,
      color: colors.primary,
    },
    pageIndicator: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.outline,
    },
    readerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    readerActionBtn: {
      padding: 8,
    },
    readerCloseBtn: {
      padding: 8,
    },
    readerBody: {
      flex: 1,
      backgroundColor: "#f5f5f5",
    },
    pdfView: {
      flex: 1,
      width: Dimensions.get("window").width,
    },
    readerPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      gap: 20,
    },
    placeholderText: {
      textAlign: "center",
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.outline,
      lineHeight: 20,
    },
    notesPanel: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + "33",
      overflow: "hidden",
    },
    notesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "33",
    },
    notesTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.onSurface,
    },
    notesList: {
      padding: 16,
      maxHeight: 300,
    },
    noteItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      backgroundColor: colors.surfaceVariant + "40",
      padding: 12,
      borderRadius: ROUNDNESS.md,
      marginBottom: 8,
    },
    noteContent: {
      flex: 1,
      marginRight: 12,
    },
    noteText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurface,
      lineHeight: 20,
    },
    noteTimestamp: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.outline,
      marginTop: 4,
    },
    noteActions: {
      flexDirection: "row",
      gap: 12,
    },
    noNotesText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.outline,
      textAlign: "center",
      paddingVertical: 20,
    },
    readerFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + "33",
    },
    pageInputGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    footerLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    pageInput: {
      width: 60,
      height: 36,
      backgroundColor: colors.surfaceVariant + "80",
      borderRadius: 6,
      textAlign: "center",
      fontFamily: FONTS.labelSm,
      fontSize: 15,
      color: colors.primary,
    },
    goButton: {
      padding: 4,
    },
    finishBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: ROUNDNESS.full,
      gap: 8,
    },
    pauseBtn: {
      backgroundColor: colors.surfaceVariant,
    },
    finishBtnText: {
      color: "#fff",
      fontFamily: FONTS.labelSm,
      fontSize: 12,
      letterSpacing: 0.5,
    },
  });
