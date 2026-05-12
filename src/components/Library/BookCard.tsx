import { ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { Book as BookIcon, Play } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: "reading" | "finished" | "want_to_read";
}

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export default function BookCard({ book, onPress }: BookCardProps) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    bookCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.md,
      overflow: "hidden",
      marginBottom: SPACING.md,
    },
    bookCover: {
      height: 160,
      backgroundColor: colors.surfaceVariant,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    resumeIndicator: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    progressOverlay: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    progressText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    bookTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.onSurface,
      paddingHorizontal: SPACING.sm,
      paddingTop: SPACING.sm,
    },
    bookAuthor: {
      fontSize: 11,
      color: colors.outline,
      paddingHorizontal: SPACING.sm,
    },
    progressBarBg: {
      height: 3,
      backgroundColor: colors.surfaceVariant,
      marginHorizontal: SPACING.sm,
      marginVertical: SPACING.sm,
      borderRadius: 1.5,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 1.5,
    },
  });

  const progress =
    book.total_pages > 0
      ? Math.round((book.current_page / book.total_pages) * 100)
      : 0;

  return (
    <TouchableOpacity style={styles.bookCard} onPress={onPress}>
      <View style={styles.bookCover}>
        <BookIcon size={40} color={colors.outlineVariant} strokeWidth={1} />
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
                book.status === "finished" ? colors.tertiary : colors.primary,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}
