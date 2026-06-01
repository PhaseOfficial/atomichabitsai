import AutoHideScrollView from "@/src/components/AutoHideScrollView";
import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { getLocalDateString } from "@/src/lib/date-utils";
import { performMutation } from "@/src/lib/sync";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
    CheckCircle2,
    Clock,
    Copy,
    History as HistoryIcon,
    Layout,
    Menu,
    Settings,
    BookOpen
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "History" | "Repository" | "Reading";
type FilterType = "Day" | "Week" | "Month" | "Year";

interface Task {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  completed_sessions: number;
  estimated_sessions: number;
  tag: string;
  updated_at: string;
  todos?: string;
}

interface ScheduleBlock {
  start: string;
  end: string;
  task: string;
  type?: string;
  todos?: any[];
  date: string;
}

interface ReadingLog {
  id: string;
  book_id: string;
  book_title: string;
  start_page: number;
  end_page: number;
  pages_read: number;
  duration_seconds: number;
  logged_at: string;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<TabType>("History");
  const [activeFilter, setActiveFilter] = useState<FilterType>("Month");

  const userId = user?.id || "guest";
  const today = getLocalDateString();

  // 1. Fetch Completed Tasks History
  const {
    data: completedTasks,
    loading: tasksLoading,
    refresh: refreshTasks,
  } = useData<Task>(
    `SELECT * FROM tasks 
     WHERE (user_id = ? OR user_id IS NULL) 
     AND status = 'done' 
     ORDER BY updated_at DESC LIMIT 200`,
    [userId],
  );

  // 2. Fetch Past Schedules
  const {
    data: pastSchedules,
    loading: schedulesLoading,
    refresh: refreshSchedules,
  } = useData<{ date: string; time_blocks: string }>(
    `SELECT date, time_blocks FROM schedules 
     WHERE (user_id = ? OR user_id IS NULL) 
     AND date <= ?
     ORDER BY date DESC`,
    [userId, today],
  );

  // 3. Fetch Reading History
  const {
    data: readingLogs,
    loading: readingLoading,
    refresh: refreshReading,
  } = useData<ReadingLog>(
    `SELECT rl.*, b.title as book_title 
     FROM reading_logs rl
     JOIN books b ON rl.book_id = b.id
     WHERE (rl.user_id = ? OR rl.user_id IS NULL)
     ORDER BY rl.logged_at DESC LIMIT 100`,
    [userId],
  );

  // Filtering Logic
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const allHistory = pastSchedules
      .flatMap((s) => {
        try {
          const blocks = JSON.parse(s.time_blocks) as any[];
          return blocks.map((b) => ({ ...b, date: s.date }));
        } catch {
          return [];
        }
      })
      .filter((b) => b.type !== "break" && b.task !== "Break");

    return allHistory.filter((item) => {
      const itemDate = new Date(item.date);
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      if (activeFilter === "Day") return diffDays <= 0;
      if (activeFilter === "Week") return diffDays <= 7;
      if (activeFilter === "Month") return diffDays <= 31;
      if (activeFilter === "Year") return diffDays <= 365;
      return true;
    });
  }, [pastSchedules, activeFilter]);

  const filteredInventory = useMemo(() => {
    const now = new Date();
    return completedTasks.filter((task) => {
      const taskDate = new Date(task.updated_at);
      const diffTime = now.getTime() - taskDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      if (activeFilter === "Day") return diffDays <= 0;
      if (activeFilter === "Week") return diffDays <= 7;
      if (activeFilter === "Month") return diffDays <= 31;
      if (activeFilter === "Year") return diffDays <= 365;
      return true;
    });
  }, [completedTasks, activeFilter]);

  const filteredReading = useMemo(() => {
    const now = new Date();
    return readingLogs.filter((log) => {
      const logDate = new Date(log.logged_at);
      const diffTime = now.getTime() - logDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      if (activeFilter === "Day") return diffDays <= 0;
      if (activeFilter === "Week") return diffDays <= 7;
      if (activeFilter === "Month") return diffDays <= 31;
      if (activeFilter === "Year") return diffDays <= 365;
      return true;
    });
  }, [readingLogs, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
      refreshSchedules();
      refreshReading();
    }, [refreshTasks, refreshSchedules, refreshReading]),
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
      year: "numeric",
    });
  };

  return (
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

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "History" && styles.activeTab]}
            onPress={() => {
              setActiveTab("History");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <HistoryIcon
              size={16}
              color={activeTab === "History" ? colors.primary : colors.outline}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "History" && { color: colors.primary },
              ]}
            >
              Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "Repository" && styles.activeTab]}
            onPress={() => {
              setActiveTab("Repository");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Layout
              size={16}
              color={
                activeTab === "Repository" ? colors.primary : colors.outline
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "Repository" && { color: colors.primary },
              ]}
            >
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "Reading" && styles.activeTab]}
            onPress={() => {
              setActiveTab("Reading");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <BookOpen
              size={16}
              color={activeTab === "Reading" ? colors.primary : colors.outline}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "Reading" && { color: colors.primary },
              ]}
            >
              Reading
            </Text>
          </TouchableOpacity>
        </View>

        <AutoHideScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            {/* Filter Bar */}
            <View style={styles.filterRow}>
              {["Day", "Week", "Month", "Year"].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterBtn,
                    activeFilter === f && {
                      backgroundColor: colors.primary + "1A",
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setActiveFilter(f as FilterType)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === f && {
                        color: colors.primary,
                        fontFamily: FONTS.labelSm,
                      },
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "History" ? (
              <View style={styles.historyList}>
                {schedulesLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={{ marginTop: 40 }}
                  />
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((block, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.historyCard}
                      onPress={() => handleReuseTask(block)}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateText}>
                            {block.date === today ? "TODAY" : block.date}
                          </Text>
                        </View>
                        <Text style={styles.timeRange}>
                          {block.start} - {block.end}
                        </Text>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.taskTitle}>{block.task}</Text>
                        <View style={styles.cardActions}>
                          <Copy size={16} color={colors.primary} />
                          <Text style={styles.reuseText}>REUSE</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Clock size={40} color={colors.outlineVariant} />
                    <Text style={styles.emptyText}>
                      No historical data for this period.
                    </Text>
                  </View>
                )}
              </View>
            ) : activeTab === "Reading" ? (
              <View style={styles.historyList}>
                {readingLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={{ marginTop: 40 }}
                  />
                ) : filteredReading.length > 0 ? (
                  filteredReading.map((log) => (
                    <View key={log.id} style={styles.historyCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateText}>{formatDate(log.logged_at)}</Text>
                        </View>
                        <Text style={styles.timeRange}>{formatDuration(log.duration_seconds)}</Text>
                      </View>
                      <View style={styles.cardBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitle}>{log.book_title}</Text>
                          <Text style={styles.inventoryMeta}>
                            Read {log.pages_read} pages (p. {log.start_page} → {log.end_page})
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <BookOpen size={40} color={colors.outlineVariant} />
                    <Text style={styles.emptyText}>No reading history for this period.</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.inventoryList}>
                {tasksLoading ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={{ marginTop: 40 }}
                  />
                ) : filteredInventory.length > 0 ? (
                  filteredInventory.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={styles.inventoryCard}
                      onPress={() => handleReuseTask(task)}
                    >
                      <View style={styles.inventoryMain}>
                        <View
                          style={[
                            styles.tagBadge,
                            { backgroundColor: colors.secondaryContainer },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              { color: colors.onSecondaryContainer },
                            ]}
                          >
                            {task.tag || "General"}
                          </Text>
                        </View>
                        <Text style={styles.inventoryTitle}>{task.title}</Text>
                        <Text style={styles.inventoryMeta}>
                          Completed{" "}
                          {getLocalDateString(new Date(task.updated_at))}
                        </Text>
                      </View>
                      <View style={styles.reuseIconBtn}>
                        <Copy size={20} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <CheckCircle2
                      size={48}
                      color={colors.outlineVariant}
                      strokeWidth={1}
                    />
                    <Text style={styles.emptyText}>
                      No completed tasks for this period.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </AutoHideScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) =>
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
    tabContainer: {
      flexDirection: "row",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "33",
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginRight: 12,
      borderRadius: ROUNDNESS.full,
    },
    activeTab: {
      backgroundColor: colors.primaryContainer,
    },
    tabText: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.outline,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      padding: SPACING.lg,
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: SPACING.xl,
      flexWrap: "wrap",
    },
    filterBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: "transparent",
      minWidth: 60,
      alignItems: "center",
    },
    filterText: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    historyList: { gap: 16 },
    historyCard: {
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    dateBadge: {
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    dateText: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.onSurfaceVariant,
    },
    timeRange: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
    },
    cardBody: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    taskTitle: {
      fontFamily: FONTS.headline,
      fontSize: 18,
      color: colors.onSurface,
      flex: 1,
      marginRight: 16,
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.primary + "1A",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    reuseText: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
    },
    inventoryList: { gap: 12 },
    inventoryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    inventoryMain: { flex: 1 },
    tagBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 6,
    },
    tagText: { fontFamily: FONTS.label, fontSize: 9 },
    inventoryTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 16,
      color: colors.onSurface,
    },
    inventoryMeta: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.outline,
      marginTop: 4,
    },
    reuseIconBtn: {
      padding: 12,
      backgroundColor: colors.primaryContainer,
      borderRadius: ROUNDNESS.md,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      gap: 16,
    },
    emptyText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.outline,
      textAlign: "center",
      paddingHorizontal: 40,
    },
  });
