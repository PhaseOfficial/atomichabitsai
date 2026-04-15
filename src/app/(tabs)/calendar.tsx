import { FONTS, SPACING } from "@/src/constants/Theme";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { Plus, Settings } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

type Schedule = {
  id: string;
  date: string;
  time_blocks: string;
};

type TimeBlock = {
  start: string;
  end: string;
  task: string;
  description?: string;
  type?: "deep-work" | "sleep" | "walk" | "default";
};

const TIME_MARKERS = Array.from({ length: 24 }, (_, index) => {
  const hour = index.toString().padStart(2, "0");
  return `${hour}:00`;
});

const parseTimeString = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return { hours: Number(hours), minutes: Number(minutes) };
};

const getTimeOffset = (time: string) => {
  const { hours, minutes } = parseTimeString(time);
  return hours * 80 + (minutes * 80) / 60;
};

const getBlockHeight = (start: string, end: string) => {
  const startTime = parseTimeString(start);
  const endTime = parseTimeString(end);
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  return Math.max(40, ((endMinutes - startMinutes) * 80) / 60);
};

const parseTimeBlocks = (schedules: Schedule[]) => {
  if (!schedules.length) return [];
  try {
    const blocks = JSON.parse(schedules[0].time_blocks) as TimeBlock[];
    return Array.isArray(blocks) ? blocks : [];
  } catch {
    return [];
  }
};

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = new Date().toISOString().split("T")[0];
  const {
    data: schedules,
    loading,
    refresh,
  } = useData<Schedule>("SELECT * FROM schedules WHERE date = ?", [today]);

  const timeBlocks = useMemo(() => parseTimeBlocks(schedules), [schedules]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Navigation Bar */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarPlaceholder}>
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.avatarLogo}
                  resizeMode="contain"
                />
              </View>
              <Image
                source={require("@/assets/images/Artboard 1 logo.png")}
                style={[styles.logoImage, { tintColor: colors.primary }]}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.iconButton}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Date Header */}
          <View style={styles.dateHeader}>
            <View>
              <Text style={styles.dayLabel}>
                SCHEDULE_LOG /{" "}
                {new Date()
                  .toLocaleDateString("en-US", { weekday: "long" })
                  .toUpperCase()}
              </Text>
              <Text style={styles.dateLabel}>
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.toggleContainer}>
              <TouchableOpacity style={styles.toggleButtonActive}>
                <Text style={styles.toggleTextActive}>DAY_VIEW</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleButton}>
                <Text style={styles.toggleText}>WEEK_VIEW</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Timeline Grid */}
          <View style={styles.timelineContainer}>
            {/* Time Markers */}
            <View style={styles.timeMarkers}>
              {TIME_MARKERS.map((time, index) => (
                <View key={index} style={styles.timeMarkerRow}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
              <View style={styles.gridLines}>
                {TIME_MARKERS.map((_, index) => (
                  <View key={index} style={styles.gridLine} />
                ))}
              </View>

              {timeBlocks.map((block, index) => {
                const top = getTimeOffset(block.start);
                const height = getBlockHeight(block.start, block.end);

                let blockStyle = styles.defaultBlock;
                if (block.type === "deep-work") blockStyle = styles.deepWorkBlock;
                if (block.type === "sleep" || block.type === "walk")
                  blockStyle = styles.priorityBlock;

                const isDeepWork = block.type === "deep-work";

                return (
                  <View
                    key={index}
                    style={[styles.taskBlock, blockStyle, { top, height }]}
                  >
                    <View style={styles.taskHeader}>
                      <View>
                        <Text style={styles.dataLabel}>
                          BLOCK_ID: {index.toString().padStart(2, "0")}
                        </Text>
                        <Text
                          style={[
                            styles.taskTitle,
                            isDeepWork && { color: colors.onPrimary },
                          ]}
                        >
                          {block.task.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.blockFooter}>
                      <Text
                        style={[
                          styles.taskTime,
                          isDeepWork && { color: colors.onPrimary + "CC" },
                        ]}
                      >
                        {block.start} {">"} {block.end}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {timeBlocks.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>NULL_SCHEDULE_DATA</Text>
                </View>
              )}

              {/* Current Time Indicator */}
              <View
                style={[
                  styles.currentTimeIndicator,
                  { top: getTimeOffset(new Date().toTimeString().slice(0, 5)) },
                ]}
              >
                <View
                  style={[
                    styles.indicatorLine,
                    { backgroundColor: colors.tertiary },
                  ]}
                />
                <View
                  style={[
                    styles.indicatorLabel,
                    { backgroundColor: colors.tertiary },
                  ]}
                >
                  <Text style={styles.indicatorText}>REAL_TIME</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => refresh()}
        >
          <Plus size={24} color={colors.onPrimary} strokeWidth={2} />
        </TouchableOpacity>
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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline + "26",
      backgroundColor: colors.background,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      backgroundColor: colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLogo: {
      width: 24,
      height: 24,
    },
    logoImage: {
      height: 32,
      width: 120,
    },
    iconButton: {
      padding: 4,
    },
    dateHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline + "26",
    },
    dayLabel: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.outline,
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    dateLabel: {
      fontFamily: FONTS.headline,
      fontSize: 48,
      color: colors.primary,
    },
    toggleContainer: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.outline + "26",
      padding: 2,
    },
    toggleButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    toggleButtonActive: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.primary,
    },
    toggleText: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.outline,
    },
    toggleTextActive: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.onPrimary,
    },
    timelineContainer: {
      flexDirection: "row",
      paddingRight: 0,
    },
    timeMarkers: {
      width: 60,
      borderRightWidth: 1,
      borderRightColor: colors.outline + "26",
    },
    timeMarkerRow: {
      height: 80,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 8,
    },
    timeText: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.outline,
    },
    contentArea: {
      flex: 1,
      position: "relative",
      minHeight: 1920, // 24 hours * 80px
    },
    gridLines: {
      ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
      height: 80,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline + "0D",
    },
    taskBlock: {
      position: "absolute",
      left: 0,
      right: 0,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.outline + "1A",
      justifyContent: "space-between",
    },
    dataLabel: {
      fontFamily: FONTS.label,
      fontSize: 7,
      letterSpacing: 1,
      color: colors.outline,
      marginBottom: 2,
    },
    taskTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.primary,
    },
    defaultBlock: {
      backgroundColor: colors.surface,
    },
    deepWorkBlock: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    priorityBlock: {
      backgroundColor: colors.surface,
      borderLeftWidth: 4,
      borderLeftColor: colors.tertiary,
    },
    blockFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    taskTime: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.outline,
    },
    currentTimeIndicator: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 10,
    },
    indicatorLine: {
      flex: 1,
      height: 1,
    },
    indicatorLabel: {
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    indicatorText: {
      color: "#fff",
      fontFamily: FONTS.label,
      fontSize: 7,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      padding: SPACING.xl,
      alignItems: "center",
    },
    emptyText: {
      color: colors.outline,
      fontFamily: FONTS.label,
      fontSize: 10,
      letterSpacing: 2,
    },
  });
