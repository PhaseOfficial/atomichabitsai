import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { performMutation } from "@/src/lib/sync";
import { getDb } from "@/src/db/database";
import { useRouter } from "expo-router";
import {
    Clock,
    Menu,
    Plus,
    Settings,
    Target,
    Zap,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    ListTodo,
    Sparkles,
    Calendar as CalendarIcon,
    MapPin,
    History as HistoryIcon
} from "lucide-react-native";
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
    Animated,
    PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getLocalDateString } from "@/src/lib/date-utils";
import { TimeInput } from "@/src/components/ui/TimeInput";

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
  type?: "deep-work" | "sleep" | "walk" | "default" | "break" | "chores";
  todos?: { id: string; text: string; completed: boolean }[];
  task_id?: string;
};

const TIME_MARKERS = Array.from({ length: 24 }, (_, index) => {
  const hour = index.toString().padStart(2, "0");
  return `${hour}:00`;
});

const parseTimeString = (time: string) => {
  const [hours = "0", minutes = "0"] = time.split(":");
  return { hours: Number(hours), minutes: Number(minutes) };
};

const getTimeOffset = (time: string, hourHeight: number) => {
  const { hours, minutes } = parseTimeString(time);
  return hours * hourHeight + (minutes * hourHeight) / 60;
};

const getBlockHeight = (start: string, end: string, hourHeight: number) => {
  const startTime = parseTimeString(start);
  const endTime = parseTimeString(end);
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  return Math.max(hourHeight * 0.4, ((endMinutes - startMinutes) * hourHeight) / 60);
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

function processCluster(cluster: any[], result: any[]) {
  const columns: any[][] = [];
  cluster.forEach(block => {
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const lastInCol = columns[i][columns[i].length - 1];
      if (block.start >= lastInCol.end) {
        columns[i].push(block);
        block.column = i;
        placed = true;
        break;
      }
    }
    if (!placed) {
      block.column = columns.length;
      columns.push([block]);
    }
  });
  
  cluster.forEach(block => {
    block.totalCols = columns.length;
    result.push(block);
  });
}

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
  const router = useRouter();

  const userId = user?.id || "guest";
  const today = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  
  const [showModal, setShowModal] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  
  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [blockType, setBlockType] = useState<"event" | "deep-work" | "walk" | "break">("event");
  const [blockLocation, setBlockLocation] = useState("");
  const [blockDescription, setBlockDescription] = useState("");
  const [blockTodos, setBlockTodos] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newTodoText, setNewTodoText] = useState("");

  const {
    data: schedules,
    loading: schedulesLoading,
    refresh: refreshSchedule,
  } = useData<Schedule>(
    "SELECT * FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
    [selectedDate, userId],
  );

  const {
    data: habits,
    loading: habitsLoading,
    refresh: refreshHabits,
  } = useData<Habit>(
    `SELECT h.id, h.title, h.preferred_time, h.location,
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at, 'localtime') = date('now', 'localtime')) as is_done_today
     FROM habits h 
     WHERE h.is_active = 1 AND (h.user_id = ? OR h.user_id IS NULL)`,
    [userId],
  );

  const { data: tasks } = useData<{id: string, title: string, todos: string}>(
    "SELECT id, title, todos FROM tasks WHERE (user_id = ? OR user_id IS NULL)",
    [userId]
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
    const blocks: any[] = displayBlocks.map(block => {
      // Find matching task in inventory
      const linkedTask = tasks.find(t => t.id === block.task_id || t.title === block.task);
      if (linkedTask) {
        return {
          ...block,
          task_id: linkedTask.id,
          // Use inventory todos as source of truth if available
          todos: linkedTask.todos ? JSON.parse(linkedTask.todos) : block.todos
        };
      }
      return block;
    });

    // Only show habits if viewing TODAY
    if (selectedDate === today) {
      habits.forEach((habit) => {
        if (habit.preferred_time) {
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
    }

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
  }, [displayBlocks, habits, selectedDate]);

  const hourHeight = useMemo(() => {
    const maxCols = Math.max(1, ...combinedBlocks.map(b => b.totalCols || 1));
    const density = combinedBlocks.length;
    
    if (maxCols > 1) return 220; 
    if (density > 10) return 180;
    if (density > 5) return 140;
    return 120;
  }, [combinedBlocks]);

  const styles = useMemo(() => createStyles(colors, hourHeight), [colors, hourHeight]);

  const changeDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEditBlock = (block: any, index: number) => {
    if (block.isHabit) {
      router.push('/hh_habits');
      return;
    }
    
    const originalIndex = rawTimeBlocks.findIndex(b => b.start === block.start && b.task === block.task);
    setEditingBlockIndex(originalIndex);
    setBlockTitle(block.task);
    setBlockStart(block.start);
    setBlockEnd(block.end);
    setBlockType(block.type || "event");
    setBlockLocation(block.location || "");
    setBlockDescription(block.description || "");
    setBlockTodos(block.todos || []);
    setShowModal(true);
  };

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo = {
      id: Math.random().toString(36).substring(7),
      text: newTodoText.trim(),
      completed: false
    };
    setBlockTodos([...blockTodos, newTodo]);
    setNewTodoText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleTodo = (id: string) => {
    setBlockTodos(blockTodos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeTodo = (id: string) => {
    setBlockTodos(blockTodos.filter(t => t.id !== id));
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
      todos: blockTodos.length > 0 ? blockTodos : undefined,
    };

    if (editingBlockIndex !== null && editingBlockIndex !== -1) {
      nextBlocks[editingBlockIndex] = newBlock;
    } else {
      nextBlocks.push(newBlock);
    }

    nextBlocks.sort((a, b) => a.start.localeCompare(b.start));

    const schedule = schedules?.[0];
    try {
      if (schedule) {
        await performMutation("schedules", "UPDATE", {
          id: schedule.id,
          user_id: schedule.user_id || userId,
          date: selectedDate,
          time_blocks: JSON.stringify(nextBlocks),
        });
      } else {
        await performMutation("schedules", "INSERT", {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          date: selectedDate,
          time_blocks: JSON.stringify(nextBlocks),
        });
      }

      // If it's a deep-work block, ensure it exists in tasks
      if (blockType === "deep-work") {
        const db = await getDb();
        const existingTask = await db.getFirstAsync<{id: string, todos: string}>(
          "SELECT id, todos FROM tasks WHERE title = ? AND (user_id = ? OR user_id IS NULL)",
          [blockTitle.trim(), userId]
        );

        const duration = toMinutes(blockEnd) - toMinutes(blockStart);
        const estimated = Math.max(1, Math.ceil(duration / sprintDuration));

        if (existingTask) {
          // Update sessions and merge todos if needed
          await performMutation("tasks", "UPDATE", {
            id: existingTask.id,
            estimated_sessions: estimated,
            todos: JSON.stringify(blockTodos.length > 0 ? blockTodos : JSON.parse(existingTask.todos || '[]')),
            updated_at: new Date().toISOString()
          });
        } else {
          // Create new task
          await performMutation("tasks", "INSERT", {
            id: Math.random().toString(36).substring(7),
            user_id: userId,
            title: blockTitle.trim(),
            status: 'todo',
            estimated_sessions: estimated,
            completed_sessions: 0,
            tag: 'Deep Work',
            todos: JSON.stringify(blockTodos),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      setShowModal(false);
      resetModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Failed to save block/task", e);
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
            date: selectedDate,
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
    setBlockTodos([]);
    setNewTodoText("");
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

  const upcomingTasks = useMemo(() => {
    const nowMinutes = toMinutes(new Date().toTimeString().slice(0, 5));
    return combinedBlocks
      .filter(b => toMinutes(b.start) >= nowMinutes && b.type !== 'break' && b.type !== 'habit')
      .slice(0, 3);
  }, [combinedBlocks]);

  const aiSuggestion = useMemo(() => {
    if (selectedDate !== today) return null;
    
    const nowMinutes = toMinutes(new Date().toTimeString().slice(0, 5));
    const fallenBehind = combinedBlocks.find(b => {
      const endMins = toMinutes(b.end);
      const isDone = b.todos?.every((t: any) => t.completed) ?? false;
      return endMins < nowMinutes && !isDone && b.type === 'deep-work';
    });

    if (fallenBehind) {
      return {
        message: `You missed your "${fallenBehind.task}" slot. Should I find a 15m catch-up window at the next gap?`,
        type: 'recovery',
        action: 'SCHEDULE CATCH-UP'
      };
    }
    return null;
  }, [combinedBlocks, selectedDate, today]);

  const handleCatchUp = async () => {
    // Find first gap of 15 mins
    const nowMinutes = toMinutes(new Date().toTimeString().slice(0, 5));
    let current = Math.max(nowMinutes, toMinutes("09:00"));
    const sorted = [...rawTimeBlocks].sort((a, b) => a.start.localeCompare(b.start));
    
    for (const b of sorted) {
      const bStart = toMinutes(b.start);
      if (bStart >= current + 20) {
        break;
      }
      current = Math.max(current, toMinutes(b.end));
    }

    const catchUpBlock: TimeBlock = {
      start: toTimeString(current + 5),
      end: toTimeString(current + 20),
      task: "AI Recovery: Catch-up",
      type: "deep-work"
    };

    const nextBlocks = [...rawTimeBlocks, catchUpBlock].sort((a, b) => a.start.localeCompare(b.start));
    
    try {
      const schedule = schedules[0];
      await performMutation("schedules", schedule ? "UPDATE" : "INSERT", {
        id: schedule?.id || Math.random().toString(36).substring(7),
        user_id: userId,
        date: selectedDate,
        time_blocks: JSON.stringify(nextBlocks)
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { console.error(e); }
  };

  // Rollover Logic: Carry forward incomplete tasks from yesterday
  const isRollingOver = useRef(false);
  useEffect(() => {
    const checkRollover = async () => {
      // Only run if we are looking at TODAY and schedules are loaded
      if (isRollingOver.current || schedulesLoading || selectedDate !== today) return;
      
      isRollingOver.current = true;
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        const db = await getDb();
        
        // Check if we've already rolled over today (prevent duplicates)
        const todaySchedule = schedules[0];
        const todayBlocks: TimeBlock[] = todaySchedule ? JSON.parse(todaySchedule.time_blocks) : [];
        const alreadyCarried = todayBlocks.some(b => b.task.includes('[CARRIED]'));
        
        if (alreadyCarried) return;

        // Fetch yesterday's schedule
        const prevSchedule = await db.getFirstAsync<Schedule>(
          "SELECT * FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
          [yesterdayStr, userId]
        );

        if (prevSchedule) {
          const prevBlocks = JSON.parse(prevSchedule.time_blocks) as TimeBlock[];
          
          // Find incomplete deep-work or event blocks
          const incompleteBlocks = prevBlocks.filter(b => {
            const hasIncompleteTodos = b.todos && b.todos.some(t => !t.completed);
            const isDeepWork = b.type === 'deep-work';
            return (hasIncompleteTodos || isDeepWork) && b.task !== "Break";
          }).map(b => ({
            ...b,
            task: `[CARRIED] ${b.task.replace('[CARRIED] ', '')}`,
            // Move to a morning slot today
            start: "09:00", 
            end: "10:00"
          }));

          if (incompleteBlocks.length > 0) {
            const updatedBlocks = [...todayBlocks, ...incompleteBlocks].sort((a, b) => a.start.localeCompare(b.start));
            
            await performMutation("schedules", todaySchedule ? "UPDATE" : "INSERT", {
              id: todaySchedule?.id || Math.random().toString(36).substring(7),
              user_id: userId,
              date: today,
              time_blocks: JSON.stringify(updatedBlocks),
            });
            
            refreshSchedule();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Tasks Carried Over", `Carried forward ${incompleteBlocks.length} items from yesterday.`);
          }
        }
      } catch (e) {
        console.error("Rollover failed", e);
      }
    };
    
    checkRollover();
  }, [schedules.length, schedulesLoading, selectedDate, today]);

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
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/history')}>
              <HistoryIcon size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push("/modal")}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.dateHeader}>
            <View style={styles.dateInfo}>
              <View style={styles.dayNavRow}>
                 <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navBtn}>
                   <ChevronLeft size={20} color={colors.primary} />
                 </TouchableOpacity>
                 <Text style={styles.dayLabel}>
                   {selectedDate === today ? "TODAY" : new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
                 </Text>
                 <TouchableOpacity onPress={() => changeDay(1)} style={styles.navBtn}>
                   <ChevronRight size={20} color={colors.primary} />
                 </TouchableOpacity>
              </View>
              <Text style={styles.dateLabel}>
                {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}><Target size={14} color={colors.secondary} /><Text style={styles.metricValue}>{stats.adherence}</Text></View>
              <View style={styles.metricItem}><Zap size={14} color={colors.primary} /><Text style={styles.metricValue}>{stats.votes}</Text></View>
              <View style={styles.metricItem}><Clock size={14} color={colors.tertiary} /><Text style={styles.metricValue}>{stats.focusHours}h</Text></View>
            </View>
          </View>

          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <View style={styles.aiNudgeContainer}>
              <View style={[styles.aiNudgeCard, { backgroundColor: colors.primary + '1A' }]}>
                <Sparkles size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiNudgeText}>{aiSuggestion.message}</Text>
                  <TouchableOpacity style={styles.aiNudgeAction} onPress={handleCatchUp}>
                    <Text style={styles.aiNudgeActionText}>{aiSuggestion.action}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Upcoming Tasks Summary */}
          {upcomingTasks.length > 0 && (
            <View style={styles.upcomingSection}>
              <Text style={styles.sectionLabel}>NEXT UP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRow}>
                {upcomingTasks.map((task, i) => (
                  <TouchableOpacity key={i} style={styles.upcomingCard} onPress={() => handleEditBlock(task, -1)}>
                    <View style={styles.upcomingTimeRow}>
                      <Clock size={12} color={colors.primary} />
                      <Text style={styles.upcomingTime}>{task.start}</Text>
                    </View>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>{task.task}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.timelineWrapper}>
            <View style={styles.timeColumn}>
              {TIME_MARKERS.map((time, index) => (
                <View key={index} style={styles.timeSlot}><Text style={styles.timeText}>{time}</Text></View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              <View style={styles.gridLines}>
                {TIME_MARKERS.map((_, index) => (
                  <View key={index} style={[styles.gridLine, { height: hourHeight }]} />
                ))}
              </View>

              {combinedBlocks.map((block, index) => {
                const top = getTimeOffset(block.start, hourHeight);
                const height = getBlockHeight(block.start, block.end, hourHeight);
                const blockStyle = block.type === "deep-work" ? styles.deepWorkBlock : 
                                   block.type === "break" ? styles.breakBlock :
                                   block.type === "habit" ? [styles.habitBlock, block.isDone && { opacity: 0.6 }] :
                                   styles.defaultBlock;

                const completedTodos = block.todos?.filter((t: any) => t.completed).length || 0;
                const totalTodos = block.todos?.length || 0;

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
                    <View>
                      <Text style={[styles.blockLabel, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurfaceVariant }]}>
                        {block.type?.toUpperCase() || "EVENT"}
                      </Text>
                      <Text style={[styles.taskTitle, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurface }]} numberOfLines={1}>
                        {block.task}
                      </Text>
                      {totalTodos > 0 && (
                        <View style={styles.todoProgress}>
                          <Text style={[styles.todoText, { color: block.type === "deep-work" ? colors.onPrimary : colors.primary }]}>
                            {completedTodos}/{totalTodos} points
                          </Text>
                        </View>
                      )}
                    </View>
                    {block.description && (
                      <Text style={[styles.taskLocation, { color: block.type === "deep-work" ? colors.onPrimary : colors.onSurfaceVariant }]} numberOfLines={1}>
                        • {block.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {selectedDate === today && (
                <View style={[styles.currentTimeLine, { top: getTimeOffset(new Date().toTimeString().slice(0, 5), hourHeight) }]}>
                  <View style={[styles.timeDot, { backgroundColor: colors.tertiary }]} />
                  <View style={[styles.line, { backgroundColor: colors.tertiary }]} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <Modal visible={showModal} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => { setShowModal(false); resetModal(); }}
                  style={styles.modalTopBtn}
                >
                  <Text style={[styles.modalCancelText, { color: colors.outline }]}>Cancel</Text>
                </TouchableOpacity>

                <Text style={styles.modalTitle}>
                  {editingBlockIndex !== null ? "Edit Block" : "Add Block"}
                </Text>

                <TouchableOpacity 
                  onPress={handleSaveBlock}
                  style={[styles.modalSaveTopBtn, { backgroundColor: colors.primary }]}
                >
                  <Check size={18} color={colors.onPrimary} />
                  <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>Save</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {editingBlockIndex !== null && (
                  <TouchableOpacity 
                    style={[styles.deleteBtnInline, { borderColor: colors.error + '33' }]} 
                    onPress={handleDeleteBlock}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete this block</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>WHAT ARE YOU DOING?</Text>
                  <TextInput style={styles.modalInput} value={blockTitle} onChangeText={setBlockTitle} placeholder="Activity title" placeholderTextColor={colors.outline} />
                </View>

                <View style={styles.timeAdjustmentRow}>
                  <View style={styles.timeField}>
                    <TimeInput
                      label="START"
                      value={blockStart}
                      onChange={setBlockStart}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <TimeInput
                      label="END"
                      value={blockEnd}
                      onChange={setBlockEnd}
                    />
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>BLOCK TYPE</Text>
                  <View style={styles.modalTypeRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {[
                        { id: "event", label: "Event", icon: CalendarIcon },
                        { id: "deep-work", label: "Deep Work", icon: Zap },
                        { id: "chores", label: "Chores", icon: Target },
                        { id: "walk", label: "Walk", icon: MapPin },
                        { id: "break", label: "Break", icon: Clock },
                      ].map((item) => {
                        const isSelected = blockType === item.id;
                        const IconComp = item.icon;
                        return (
                          <TouchableOpacity 
                            key={item.id} 
                            style={[
                              styles.typeChip, 
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]} 
                            onPress={() => setBlockType(item.id as any)}
                          >
                            <IconComp size={14} color={isSelected ? colors.onPrimary : colors.primary} />
                            <Text style={[styles.typeChipText, isSelected && { color: colors.onPrimary }]}>{item.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>SUB-TASKS (POINTS)</Text>
                  <View style={styles.todoInputRow}>
                    <TextInput 
                      style={[styles.modalInput, { flex: 1 }]} 
                      value={newTodoText} 
                      onChangeText={setNewTodoText} 
                      placeholder="Add a point..." 
                      placeholderTextColor={colors.outline}
                      onSubmitEditing={handleAddTodo}
                    />
                    <TouchableOpacity style={[styles.addTodoBtn, { backgroundColor: colors.primary }]} onPress={handleAddTodo}>
                      <Plus size={20} color={colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.todoList}>
                    {blockTodos.map(todo => (
                      <View key={todo.id} style={styles.todoItem}>
                        <TouchableOpacity 
                          onPress={() => toggleTodo(todo.id)}
                          style={[styles.todoCheck, { borderColor: colors.primary }, todo.completed && { backgroundColor: colors.primary }]}
                        >
                          {todo.completed && <Check size={12} color={colors.onPrimary} />}
                        </TouchableOpacity>
                        <Text style={[styles.todoLabel, { color: colors.onSurface }, todo.completed && { textDecorationLine: 'line-through', color: colors.outline }]}>
                          {todo.text}
                        </Text>
                        <TouchableOpacity onPress={() => removeTodo(todo.id)}>
                          <X size={14} color={colors.outline} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>NOTES</Text>
                  <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={blockDescription} onChangeText={setBlockDescription} placeholder="Additional notes..." placeholderTextColor={colors.outline} multiline />
                </View>
                
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>LOCATION</Text>
                  <TextInput style={styles.modalInput} value={blockLocation} onChangeText={setBlockLocation} placeholder="Where?" placeholderTextColor={colors.outline} />
                </View>
              </ScrollView>
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

const createStyles = (colors: any, hourHeight: number) =>
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
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
    dayNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 2,
    },
    navBtn: {
      padding: 4,
      backgroundColor: colors.primary + '1A',
      borderRadius: 4,
    },
    dayLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 12,
      color: colors.primary,
      letterSpacing: 1.5,
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
      height: hourHeight,
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
      minHeight: hourHeight * 24,
    },
    gridLines: {
      ...StyleSheet.absoluteFillObject,
    },
    gridLine: {
      height: hourHeight,
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
    habitBlock: {
      backgroundColor: colors.primaryContainer + "40",
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    choresBlock: {
      backgroundColor: colors.secondaryContainer + "40",
      borderLeftWidth: 4,
      borderLeftColor: colors.secondary,
    },
    taskLocation: {
      fontFamily: FONTS.body,
      fontSize: 10,
      marginTop: 2,
    },
    todoProgress: {
      marginTop: 4,
    },
    todoText: {
      fontFamily: FONTS.label,
      fontSize: 10,
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
      bottom: 80,
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
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xl,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '33',
    },
    modalTopBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    modalSaveTopBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: ROUNDNESS.full,
    },
    modalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 18,
      color: colors.onSurface,
    },
    deleteBtnInline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      marginBottom: SPACING.lg,
    },
    deleteBtnText: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
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
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      paddingVertical: 12,
      paddingHorizontal: 12,
      color: colors.onSurface,
      fontFamily: FONTS.body,
      fontSize: 14,
    },
    timeAdjustmentRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: SPACING.md,
    },
    timeField: {
      flex: 1,
    },
    modalTypeRow: {
      flexDirection: "row",
      marginTop: 4,
    },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: ROUNDNESS.full,
      backgroundColor: colors.surfaceVariant + '4D',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    typeChipText: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    todoInputRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    addTodoBtn: {
      width: 48,
      height: 48,
      borderRadius: ROUNDNESS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todoList: {
      gap: 8,
    },
    todoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceVariant + '4D',
      padding: 10,
      borderRadius: ROUNDNESS.sm,
    },
    todoCheck: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todoLabel: {
      flex: 1,
      fontFamily: FONTS.body,
      fontSize: 14,
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
    aiNudgeContainer: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    aiNudgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: ROUNDNESS.lg,
      gap: 12,
    },
    aiNudgeText: {
      fontFamily: FONTS.body,
      fontSize: 13,
      color: colors.onSurface,
      lineHeight: 18,
    },
    aiNudgeAction: {
      marginTop: 8,
    },
    aiNudgeActionText: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
      letterSpacing: 1,
    },
    upcomingSection: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    upcomingRow: {
      gap: 12,
      paddingRight: SPACING.lg,
    },
    upcomingCard: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: ROUNDNESS.md,
      width: 140,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
    },
    upcomingTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    upcomingTime: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.primary,
    },
    upcomingTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 13,
      color: colors.onSurface,
    },
  });
