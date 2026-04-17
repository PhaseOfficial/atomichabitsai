import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { performMutation } from "@/src/lib/sync";
import { useRouter } from "expo-router";
import {
    Clock,
    Menu,
    Plus,
    Settings,
    Target,
    Zap
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

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
  type?: "deep-work" | "sleep" | "walk" | "default" | "break";
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

const toMinutes = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

const toTimeString = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const splitDeepWorkBlock = (
  block: TimeBlock,
  focusDuration: number,
  breakDuration: number,
) => {
  const blocks: TimeBlock[] = [];
  const start = toMinutes(block.start);
  const end = toMinutes(block.end);
  const LUNCH_START = 12 * 60;
  const LUNCH_END = 13 * 60;
  const bridgesLunch = start < LUNCH_START && end > LUNCH_END;
  let current = start;

  const pushFocusSegment = (segmentEnd: number) => {
    blocks.push({
      ...block,
      start: toTimeString(current),
      end: toTimeString(segmentEnd),
    });
    current = segmentEnd;
  };

  const pushBreakSegment = (breakEnd: number) => {
    blocks.push({
      task: "Break",
      type: "break",
      start: toTimeString(current),
      end: toTimeString(breakEnd),
    });
    current = breakEnd;
  };

  while (current < end) {
    if (bridgesLunch && current === LUNCH_START) {
      blocks.push({
        task: "Lunch",
        type: "default",
        start: toTimeString(LUNCH_START),
        end: toTimeString(LUNCH_END),
      });
      current = LUNCH_END;
      continue;
    }

    const segmentEnd = Math.min(current + focusDuration, end, bridgesLunch && current < LUNCH_START ? LUNCH_START : end);
    pushFocusSegment(segmentEnd);

    if (current >= end) break;
    if (bridgesLunch && current === LUNCH_START) continue;

    const nextBreakEnd = Math.min(current + breakDuration, end, bridgesLunch && current < LUNCH_START ? LUNCH_START : end);
    if (nextBreakEnd > current) {
      pushBreakSegment(nextBreakEnd);
    }
  }

  return blocks;
};

const normalizeTimeBlocks = (blocks: TimeBlock[], focusDuration: number) => {
  const breakDuration = Math.min(15, Math.max(5, Math.round(focusDuration * 0.25)));
  return blocks
    .flatMap((block) => {
      const duration = toMinutes(block.end) - toMinutes(block.start);
      if (block.type === "deep-work" && duration > focusDuration) {
        return splitDeepWorkBlock(block, focusDuration, breakDuration);
      }
      return [block];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
};

const parseTimeBlocks = (schedules: Schedule[], focusDuration: number) => {
  if (!schedules.length) return [];
  try {
    const blocks = JSON.parse(schedules[0].time_blocks) as TimeBlock[];
    return Array.isArray(blocks) ? normalizeTimeBlocks(blocks, focusDuration) : [];
  } catch {
    return [];
  }
};

interface Habit {
  id: string;
  title: string;
  preferred_time: string;
  location: string;
  is_done_today: number;
}

export default function CalendarScreen() {
  const { colors, sprintDuration } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || "guest";
  const today = new Date().toISOString().split("T")[0];
  
  const [showModal, setShowModal] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [blockType, setBlockType] = useState<"event" | "deep-work" | "walk" | "break">("event");
  const [blockLocation, setBlockLocation] = useState("");
  const [blockDescription, setBlockDescription] = useState("");

  const {
    data: schedules,
    loading: schedulesLoading,
    refresh: refreshSchedule,
  } = useData<Schedule>(
    "SELECT * FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
    [today, userId],
  );

  const {
    data: habits,
    loading: habitsLoading,
    refresh: refreshHabits,
  } = useData<Habit>(
    `SELECT h.id, h.title, h.preferred_time, h.location,
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at) = date('now')) as is_done_today
     FROM habits h 
     WHERE h.is_active = 1 AND (h.user_id = ? OR h.user_id IS NULL)`,
    [userId],
  );

  const rawTimeBlocks = useMemo(
    () => {
      if (!schedules.length) return [];
      try {
        const blocks = JSON.parse(schedules[0].time_blocks) as TimeBlock[];
        return Array.isArray(blocks) ? blocks : [];
      } catch { return []; }
    },
    [schedules]
  );

  const displayBlocks = useMemo(
    () => normalizeTimeBlocks(rawTimeBlocks, sprintDuration),
    [rawTimeBlocks, sprintDuration]
  );

  const combinedBlocks = useMemo(() => {
    const blocks: any[] = [...displayBlocks];

    habits.forEach((habit) => {
      if (habit.preferred_time) {
        const [h, m] = habit.preferred_time.split(":").map(Number);
        const duration = 30;
        const endTime = toTimeString(toMinutes(habit.preferred_time) + duration);

        blocks.push({
          start: habit.preferred_time,
          end: endTime,
          task: habit.title,
          type: "habit",
          location: habit.location,
          isDone: habit.is_done_today > 0,
          isHabit: true
        });
      }
    });

    const sorted = blocks.sort((a, b) => a.start.localeCompare(b.start));
    const layoutBlocks: any[] = [];
    let currentCluster: any[] = [];
    let clusterEnd = "00:00";

    sorted.forEach((block) => {
      if (block.start < clusterEnd) {
        currentCluster.push(block);
        if (block.end > clusterEnd) clusterEnd = block.end;
      } else {
        if (currentCluster.length > 0) processCluster(currentCluster, layoutBlocks);
        currentCluster = [block];
        clusterEnd = block.end;
      }
    });

    if (currentCluster.length > 0) processCluster(currentCluster, layoutBlocks);
    return layoutBlocks;
  }, [displayBlocks, habits]);

  const handleEditBlock = (block: any, index: number) => {
    if (block.isHabit) {
      router.push('/hh_habits');
      return;
    }
    
    // Find the original index in rawTimeBlocks
    const originalIndex = rawTimeBlocks.findIndex(b => b.start === block.start && b.task === block.task);
    setEditingBlockIndex(originalIndex);
    setBlockTitle(block.task);
    setBlockStart(block.start);
    setBlockEnd(block.end);
    setBlockType(block.type || "event");
    setBlockLocation(block.location || "");
    setBlockDescription(block.description || "");
    setShowModal(true);
  };

  const handleAdjustTime = (type: 'start' | 'end', delta: number) => {
    const currentTime = type === 'start' ? blockStart : blockEnd;
    const newMinutes = Math.max(0, Math.min(1439, toMinutes(currentTime) + delta));
    const newTime = toTimeString(newMinutes);
    if (type === 'start') setBlockStart(newTime);
    else setBlockEnd(newTime);
  };

  const handleSaveBlock = async () => {
    if (!blockTitle.trim()) {
      Alert.alert("Error", "Please enter a title for the block.");
      return;
    }
    if (toMinutes(blockStart) >= toMinutes(blockEnd)) {
      Alert.alert("Error", "Start time must be before end time.");
      return;
    }

    let nextBlocks = [...rawTimeBlocks];
    const newBlock: TimeBlock = {
      start: blockStart,
      end: blockEnd,
      task: blockTitle,
      type: blockType === "event" ? undefined : blockType,
      location: blockLocation || undefined,
      description: blockDescription || undefined,
    };

    if (editingBlockIndex !== null && editingBlockIndex !== -1) {
      nextBlocks[editingBlockIndex] = newBlock;
    } else {
      nextBlocks.push(newBlock);
    }

    // Sort blocks before saving
    nextBlocks.sort((a, b) => a.start.localeCompare(b.start));

    const schedule = schedules?.[0];
    try {
      if (schedule) {
        await performMutation("schedules", "UPDATE", {
          id: schedule.id,
          user_id: schedule.user_id || userId,
          date: today,
          time_blocks: JSON.stringify(nextBlocks),
        });
      } else {
        await performMutation("schedules", "INSERT", {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          date: today,
          time_blocks: JSON.stringify(nextBlocks),
        });
      }
      setShowModal(false);
      resetModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Failed to save schedule block.");
    }
  };

  const handleDeleteBlock = async () => {
    if (editingBlockIndex === null) return;
    
    Alert.alert("Delete Block", "Are you sure you want to remove this block?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          const nextBlocks = rawTimeBlocks.filter((_, i) => i !== editingBlockIndex);
          const schedule = schedules[0];
          await performMutation("schedules", "UPDATE", {
            id: schedule.id,
            user_id: schedule.user_id || userId,
            date: today,
            time_blocks: JSON.stringify(nextBlocks),
          });
          setShowModal(false);
          resetModal();
        }
      }
    ]);
  };

  const resetModal = () => {
    setEditingBlockIndex(null);
    setBlockTitle("");
    setBlockStart("09:00");
    setBlockEnd("10:00");
    setBlockType("event");
    setBlockLocation("");
    setBlockDescription("");
  };

  const stats = useMemo(() => {
    const focusMinutes = displayBlocks
      .filter((b) => b.type === "deep-work")
      .reduce((acc, b) => acc + (toMinutes(b.end) - toMinutes(b.start)), 0);

    const habitTotal = habits.length;
    const habitDone = habits.filter((h) => h.is_done_today > 0).length;
    const adherence = habitTotal > 0 ? Math.round((habitDone / habitTotal) * 100) : 0;

    return {
      focusHours: (focusMinutes / 60).toFixed(1),
      adherence: `${adherence}%`,
      votes: habitDone,
    };
  }, [displayBlocks, habits]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push("/menu")}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/Artboard 1 logo.png')} style={styles.logoImage} tintColor={colors.primary} resizeMode="contain" />
          </View>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push("/modal")}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.dateHeader}>
            <View style={styles.dateInfo}>
              <Text style={styles.dayLabel}>{new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}</Text>
              <Text style={styles.dateLabel}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}><Target size={14} color={colors.secondary} /><Text style={styles.metricValue}>{stats.adherence}</Text></View>
              <View style={styles.metricItem}><Zap size={14} color={colors.primary} /><Text style={styles.metricValue}>{stats.votes}</Text></View>
              <View style={styles.metricItem}><Clock size={14} color={colors.tertiary} /><Text style={styles.metricValue}>{stats.focusHours}h</Text></View>
            </View>
          </View>

          <View style={styles.timelineWrapper}>
            <View style={styles.timeColumn}>
              {TIME_MARKERS.map((time, index) => (
                <View key={index} style={styles.timeSlot}><Text style={styles.timeText}>{time}</Text></View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              <View style={styles.gridLines}>{TIME_MARKERS.map((_, index) => <View key={index} style={styles.gridLine} />)}</View>

              {combinedBlocks.map((block, index) => {
                const top = getTimeOffset(block.start);
                const height = getBlockHeight(block.start, block.end);
                const blockStyle = block.type === "deep-work" ? styles.deepWorkBlock : 
                                   block.type === "break" ? styles.breakBlock :
                                   block.type === "habit" ? [styles.habitBlock, block.isDone && { opacity: 0.6 }] :
                                   styles.defaultBlock;

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPress={() => handleEditBlock(block, index)}
                    style={[
                      styles.taskBlock, 
                      blockStyle, 
                      { 
                        top, height,
                        left: `${(block.column || 0) * (100 / (block.totalCols || 1))}%`,
                        width: `${100 / (block.totalCols || 1)}%`
                      }
                    ]}
                  >
                    <Text style={[styles.blockLabel, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurfaceVariant }]}>
                      {block.type?.toUpperCase() || "EVENT"}
                    </Text>
                    <Text style={[styles.taskTitle, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurface }]} numberOfLines={1}>
                      {block.task}
                    </Text>
                    {block.description && (
                      <Text style={[styles.taskLocation, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurfaceVariant }]} numberOfLines={1}>
                        • {block.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.currentTimeLine, { top: getTimeOffset(new Date().toTimeString().slice(0, 5)) }]}>
                <View style={[styles.timeDot, { backgroundColor: colors.tertiary }]} />
                <View style={[styles.line, { backgroundColor: colors.tertiary }]} />
              </View>
            </View>
          </View>
        </ScrollView>

        <Modal visible={showModal} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingBlockIndex !== null ? "Edit Block" : "Add Block"}</Text>
                {editingBlockIndex !== null && (
                  <TouchableOpacity onPress={handleDeleteBlock}>
                    <Trash2 size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>WHAT ARE YOU DOING?</Text>
                  <TextInput style={styles.modalInput} value={blockTitle} onChangeText={setBlockTitle} placeholder="Activity title" placeholderTextColor={colors.outline} />
                </View>

                <View style={styles.timeAdjustmentRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.modalLabel}>START</Text>
                    <View style={styles.timePickerContainer}>
                      <TouchableOpacity onPress={() => handleAdjustTime('start', -15)} style={styles.timeAdjustBtn}><Text style={styles.timeAdjustText}>-</Text></TouchableOpacity>
                      <Text style={styles.timeValueText}>{blockStart}</Text>
                      <TouchableOpacity onPress={() => handleAdjustTime('start', 15)} style={styles.timeAdjustBtn}><Text style={styles.timeAdjustText}>+</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.modalLabel}>END</Text>
                    <View style={styles.timePickerContainer}>
                      <TouchableOpacity onPress={() => handleAdjustTime('end', -15)} style={styles.timeAdjustBtn}><Text style={styles.timeAdjustText}>-</Text></TouchableOpacity>
                      <Text style={styles.timeValueText}>{blockEnd}</Text>
                      <TouchableOpacity onPress={() => handleAdjustTime('end', 15)} style={styles.timeAdjustBtn}><Text style={styles.timeAdjustText}>+</Text></TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>BLOCK TYPE</Text>
                  <View style={styles.modalTypeRow}>
                    {["event", "deep-work", "break", "walk"].map((type) => (
                      <TouchableOpacity key={type} style={[styles.typeOption, blockType === type && { backgroundColor: colors.primary }]} onPress={() => setBlockType(type as any)}>
                        <Text style={[styles.typeOptionText, blockType === type && { color: colors.onPrimary }]}>{type.replace("-", " ")}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>TASK DETAILS (TO-DO STYLE)</Text>
                  <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={blockDescription} onChangeText={setBlockDescription} placeholder="Sub-tasks or notes..." placeholderTextColor={colors.outline} multiline />
                </View>
                
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>LOCATION</Text>
                  <TextInput style={styles.modalInput} value={blockLocation} onChangeText={setBlockLocation} placeholder="Where?" placeholderTextColor={colors.outline} />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowModal(false); resetModal(); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveBlock}>
                  <Text style={styles.modalSaveText}>Save Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => { resetModal(); setShowModal(true); }}>
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
    menuBtn: {
      padding: 8,
    },
    logoImage: {
      height: 40,
      width: 160,
    },
    ghostBtn: {
      padding: 8,
    },
    iconButton: {
      padding: 4,
    },
    dateHeader: {
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
      flexDirection: "row",
      gap: 12,
    },
    metricItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceVariant + "80",
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
      borderBottomColor: colors.outlineVariant + "33",
    },
    taskBlock: {
      position: "absolute",
      left: 0,
      right: 0,
      padding: 12,
      borderRadius: ROUNDNESS.md,
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
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
    breakBlock: {
      backgroundColor: colors.surfaceVariant,
      borderLeftWidth: 3,
      borderLeftColor: colors.tertiary,
    },
    walkBlock: {
      backgroundColor: colors.secondaryContainer,
      borderLeftWidth: 4,
      borderLeftColor: colors.secondary,
    },
    habitBlock: {
      backgroundColor: colors.primaryContainer + "40",
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    taskLocation: {
      fontFamily: FONTS.body,
      fontSize: 10,
      marginTop: 2,
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
      width: 10,
      height: 10,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: colors.surface,
      padding: SPACING.lg,
      borderTopLeftRadius: ROUNDNESS.xl,
      borderTopRightRadius: ROUNDNESS.xl,
      maxHeight: "80%",
    },
    modalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 18,
      color: colors.onSurface,
      marginBottom: SPACING.md,
    },
    modalField: {
      marginBottom: SPACING.md,
    },
    modalFieldRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: SPACING.md,
    },
    modalFieldSmall: {
      flex: 1,
    },
    modalLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.onSurfaceVariant,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: ROUNDNESS.sm,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      paddingVertical: 12,
      paddingHorizontal: 12,
      color: colors.onSurface,
      fontFamily: FONTS.body,
      fontSize: 14,
    },
    modalTypeRow: {
      flexDirection: "row",
      gap: 8,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 10,
      alignItems: "center",
      borderRadius: ROUNDNESS.sm,
      backgroundColor: colors.surfaceVariant,
    },
    typeOptionActive: {
      backgroundColor: colors.primary,
    },
    typeOptionText: {
      fontFamily: FONTS.label,
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    typeOptionTextActive: {
      color: colors.onPrimary,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: SPACING.sm,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: ROUNDNESS.md,
      alignItems: "center",
    },
    modalCancelButton: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    modalSaveButton: {
      backgroundColor: colors.primary,
    },
    modalCancelText: {
      fontFamily: FONTS.label,
      color: colors.onSurface,
    },
    modalSaveText: {
      fontFamily: FONTS.label,
      color: colors.onPrimary,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    emptyCalendar: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 100,
    },
    emptyText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurfaceVariant,
    },
  });
