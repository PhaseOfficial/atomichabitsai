import { ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { useData } from "@/src/hooks/useData";
import {
    Book as BookIcon,
    Clock,
    Play,
    Sparkles,
    Trash2,
    TrendingUp,
    X,
    ChevronRight,
    Calendar,
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

interface ReadingLog {
  id: string;
  start_page: number;
  end_page: number;
  pages_read: number;
  duration_seconds: number;
  logged_at: string;
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

  const { data: logs, loading: logsLoading } = useData<ReadingLog>(
    "SELECT * FROM reading_logs WHERE book_id = ? ORDER BY logged_at DESC LIMIT 5",
    [book?.id || ""],
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return "< 1 min";
    return `${mins} min${mins > 1 ? "s" : ""}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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

              {/* Reading History Section */}
              <View style={styles.historySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Reading History</Text>
                  <TrendingUp size={16} color={colors.outline} />
                </View>

                {logsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : logs.length > 0 ? (
                  <View style={styles.logsList}>
                    {logs.map((log) => (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logLeft}>
                          <View style={styles.dateChip}>
                            <Calendar size={10} color={colors.primary} />
                            <Text style={styles.logDateText}>{formatDate(log.logged_at)}</Text>
                          </View>
                          <Text style={styles.logPagesText}>
                            p. {log.start_page} → {log.end_page}
                          </Text>
                        </View>
                        <View style={styles.logRight}>
                          <Text style={styles.logDurationText}>
                            {formatDuration(log.duration_seconds)}
                          </Text>
                          <Text style={styles.logDeltaText}>+{log.pages_read} pages</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyLogsText}>No reading sessions logged yet.</Text>
                )}
              </View>

              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.surfaceVariant,
                      borderWidth: 1,
                      borderColor: colors.outlineVariant + "33",
                      marginHorizontal: 0,
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
              </View>
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
    historySection: {
      paddingHorizontal: SPACING.lg,
      marginVertical: SPACING.md,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.onSurface,
      letterSpacing: 0.5,
    },
    logsList: {
      gap: SPACING.sm,
    },
    logItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surfaceVariant + "40",
      padding: SPACING.md,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "20",
    },
    logLeft: {
      gap: 4,
    },
    dateChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    logDateText: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.primary,
    },
    logPagesText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.onSurface,
    },
    logRight: {
      alignItems: "flex-end",
      gap: 2,
    },
    logDurationText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.onSurface,
    },
    logDeltaText: {
      fontSize: 10,
      color: colors.outline,
    },
    emptyLogsText: {
      fontSize: 12,
      color: colors.outline,
      fontStyle: "italic",
      textAlign: "center",
      marginVertical: SPACING.md,
    },
    actionSection: {
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      gap: SPACING.md,
    },
    deleteActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
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

