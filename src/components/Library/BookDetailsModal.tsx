import { ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import {
    Book as BookIcon,
    Clock,
    Play,
    Sparkles,
    Trash2,
    TrendingUp,
    X,
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Book {
  id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  status: "reading" | "finished" | "want_to_read";
  file_uri: string;
  updated_at: string;
}

interface BookDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  book: Book | null;
  isGeneratingAI: boolean;
  onContinueReading: () => void;
  onGenerateAI: () => void;
  onDelete: () => void;
}

export default function BookDetailsModal({
  visible,
  onClose,
  book,
  isGeneratingAI,
  onContinueReading,
  onGenerateAI,
  onDelete,
}: BookDetailsModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book Details</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {book && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailsHeader}>
                <View style={[styles.bookCover, { width: 120, height: 160 }]}>
                  <BookIcon size={48} color={colors.outlineVariant} />
                </View>
                <View style={styles.detailsMeta}>
                  <Text style={styles.detailsTitle}>{book.title}</Text>
                  <Text style={styles.detailsAuthor}>{book.author}</Text>
                  <View style={styles.detailsStats}>
                    <View style={styles.detailStatItem}>
                      <TrendingUp size={14} color={colors.primary} />
                      <Text style={styles.detailStatText}>
                        {book.current_page} / {book.total_pages} pages
                      </Text>
                    </View>
                    <View style={styles.detailStatItem}>
                      <Clock size={14} color={colors.secondary} />
                      <Text style={styles.detailStatText}>
                        Last read:{" "}
                        {new Date(book.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginBottom: 12 }]}
                onPress={onContinueReading}
              >
                <Play size={20} color={colors.onPrimary} fill="#fff" />
                <Text style={styles.primaryBtnText}>Continue Reading</Text>
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
                onPress={onGenerateAI}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Sparkles size={20} color={colors.primary} />
                )}
                <Text
                  style={[styles.primaryBtnText, { color: colors.onSurface }]}
                >
                  Generate AI Insights
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={onDelete}
              >
                <Trash2 size={18} color={colors.error} />
                <Text style={styles.deleteActionText}>Remove from Library</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      maxHeight: "90%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: ROUNDNESS.lg,
      borderTopRightRadius: ROUNDNESS.lg,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceVariant,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onSurface,
    },
    detailsHeader: {
      flexDirection: "row",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      gap: SPACING.lg,
    },
    bookCover: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: ROUNDNESS.md,
      justifyContent: "center",
      alignItems: "center",
    },
    detailsMeta: {
      flex: 1,
      justifyContent: "flex-start",
    },
    detailsTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.onSurface,
      marginBottom: SPACING.sm,
    },
    detailsAuthor: {
      fontSize: 12,
      color: colors.outline,
      marginBottom: SPACING.md,
    },
    detailsStats: {
      gap: SPACING.sm,
    },
    detailStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    detailStatText: {
      fontSize: 11,
      color: colors.onSurface,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: ROUNDNESS.md,
      gap: SPACING.sm,
      marginHorizontal: SPACING.lg,
      marginVertical: SPACING.md,
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    deleteActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
      gap: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.error + "30",
      borderRadius: ROUNDNESS.md,
    },
    deleteActionText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
  });
