import { FONTS, SPACING, ROUNDNESS } from "@/src/constants/Theme";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuth } from "@/src/hooks/useAuth";
import { Plus, Settings, Moon, Zap, Target } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

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
  return hours * 100 + (minutes * 100) / 60;
};

const getBlockHeight = (start: string, end: string) => {
  const startTime = parseTimeString(start);
  const endTime = parseTimeString(end);
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  return Math.max(50, ((endMinutes - startMinutes) * 100) / 60);
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
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || 'guest';
  const today = new Date().toISOString().split('T')[0];
  
  const {
    data: schedules,
    loading,
    refresh,
  } = useData<Schedule>("SELECT * FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)", [today, userId]);

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
          bounces={true}
        >
          {/* Header */}
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
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/modal')}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Date & Metrics Header */}
          <View style={styles.dateHeader}>
            <View style={styles.dateInfo}>
              <Text style={styles.dayLabel}>
                {new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
              </Text>
              <Text style={styles.dateLabel}>
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Moon size={14} color={colors.secondary} />
                <Text style={styles.metricValue}>7.5h</Text>
              </View>
              <View style={styles.metricItem}>
                <Zap size={14} color={colors.primary} />
                <Text style={styles.metricValue}>420</Text>
              </View>
              <View style={styles.metricItem}>
                <Target size={14} color={colors.tertiary} />
                <Text style={styles.metricValue}>85%</Text>
              </View>
            </View>
          </View>

          {/* Timeline View */}
          <View style={styles.timelineWrapper}>
            <View style={styles.timeColumn}>
              {TIME_MARKERS.map((time, index) => (
                <View key={index} style={styles.timeSlot}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              <View style={styles.gridLines}>
                {TIME_MARKERS.map((_, index) => (
                  <View key={index} style={styles.gridLine} />
                ))}
              </View>

              {timeBlocks.length > 0 ? (
                timeBlocks.map((block, index) => {
                  const top = getTimeOffset(block.start);
                  const height = getBlockHeight(block.start, block.end);

                  let blockStyle = styles.defaultBlock;
                  let textStyle = { color: colors.onSurface };
                  let labelStyle = { color: colors.onSurfaceVariant };

                  if (block.type === "deep-work") {
                    blockStyle = styles.deepWorkBlock;
                    textStyle = { color: colors.onPrimary };
                    labelStyle = { color: colors.onPrimary + 'B3' };
                  } else if (block.type === "walk") {
                    blockStyle = styles.walkBlock;
                  }

                  return (
                    <View
                      key={index}
                      style={[styles.taskBlock, blockStyle, { top, height }]}
                    >
                      <View>
                        <Text style={[styles.blockLabel, labelStyle]}>
                          {block.type?.replace("-", " ").toUpperCase() || "EVENT"}
                        </Text>
                        <Text style={[styles.taskTitle, textStyle]}>
                          {block.task}
                        </Text>
                      </View>
                      <Text style={[styles.taskTime, labelStyle]}>
                        {block.start} — {block.end}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCalendar}>
                  <Text style={styles.emptyText}>No blocks scheduled for today.</Text>
                </View>
              )}

              {/* Current Time Indicator */}
              <View
                style={[
                  styles.currentTimeLine,
                  { top: getTimeOffset(new Date().toTimeString().slice(0, 5)) },
                ]}
              >
                <View style={[styles.timeDot, { backgroundColor: colors.tertiary }]} />
                <View style={[styles.line, { backgroundColor: colors.tertiary }]} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert('Add Block', 'Scheduling functionality coming soon.')}
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
      borderRadius: ROUNDNESS.full,
      backgroundColor: colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
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
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateInfo: {
      flex: 1,
    },
    dayLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 12,
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    dateLabel: {
      fontFamily: FONTS.headline,
      fontSize: 32,
      color: colors.onSurface,
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    metricItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceVariant + '80',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: ROUNDNESS.sm,
    },
    metricValue: {
      fontFamily: FONTS.labelSm,
      fontSize: 12,
      color: colors.onSurface,
    },
    timelineWrapper: {
      flexDirection: "row",
      paddingRight: SPACING.lg,
    },
    timeColumn: {
      width: 70,
    },
    timeSlot: {
      height: 100,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 10,
    },
    timeText: {
      fontFamily: FONTS.label,
      fontSize: 11,
      color: colors.onSurfaceVariant,
    },
    calendarGrid: {
      flex: 1,
      position: "relative",
      minHeight: 2400,
    },
    gridLines: {
      ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
      height: 100,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '33',
    },
    taskBlock: {
      position: "absolute",
      left: 0,
      right: 0,
      padding: 12,
      borderRadius: ROUNDNESS.md,
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
      marginRight: 4,
    },
    blockLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 9,
      letterSpacing: 1,
      marginBottom: 2,
    },
    taskTitle: {
      fontFamily: FONTS.headline,
      fontSize: 16,
    },
    taskTime: {
      fontFamily: FONTS.label,
      fontSize: 11,
    },
    defaultBlock: {
      backgroundColor: colors.surface,
    },
    deepWorkBlock: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    walkBlock: {
      backgroundColor: colors.secondaryContainer,
      borderLeftWidth: 4,
      borderLeftColor: colors.secondary,
    },
    currentTimeLine: {
      position: "absolute",
      left: -5,
      right: 0,
      height: 2,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 10,
    },
    timeDot: {
      width: 10, height: 10,
      borderRadius: 5,
    },
    line: {
      flex: 1,
      height: 2,
    },
    fab: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    emptyCalendar: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
  });
