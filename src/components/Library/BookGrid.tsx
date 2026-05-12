import { SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { Upload } from "lucide-react-native";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import BookCard from "./BookCard";

interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: "reading" | "finished" | "want_to_read";
  file_uri: string;
  cover_uri: string;
}

interface BookGridProps {
  books: Book[];
  loading: boolean;
  onBookPress: (book: Book) => void;
  onEmptyPress: () => void;
}

export default function BookGrid({
  books,
  loading,
  onBookPress,
  onEmptyPress,
}: BookGridProps) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    bookGrid: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
    },
    emptyBookCard: {
      flex: 1,
      backgroundColor: colors.surfaceVariant + "40",
      borderStyle: "dashed",
      borderWidth: 2,
      borderColor: colors.outline + "40",
      borderRadius: 12,
      padding: SPACING.lg,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 200,
      gap: SPACING.md,
    },
    emptyBookText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurface,
    },
    emptyBookSub: {
      fontSize: 12,
      color: colors.outline,
    },
  });

  if (loading) {
    return (
      <View style={[styles.bookGrid, { alignItems: "center", marginTop: 40 }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.bookGrid}>
      {books.map((book) => (
        <BookCard key={book.id} book={book} onPress={() => onBookPress(book)} />
      ))}
      {books.length === 0 && (
        <TouchableOpacity style={styles.emptyBookCard} onPress={onEmptyPress}>
          <Upload size={32} color={colors.outline} strokeWidth={1.5} />
          <Text style={styles.emptyBookText}>Your library is empty</Text>
          <Text style={styles.emptyBookSub}>Tap to add your first book</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
