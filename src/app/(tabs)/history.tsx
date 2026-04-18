import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings, 
  Menu, 
  History as HistoryIcon, 
  Layout, 
  Copy, 
  ListTodo,
  CheckCircle2,
  Clock
} from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { useData } from '@/src/hooks/useData';
import { performMutation } from '@/src/lib/sync';
import { getLocalDateString } from '@/src/lib/date-utils';
import * as Haptics from 'expo-haptics';

type TabType = 'History' | 'Repository';
type FilterType = 'Day' | 'Week' | 'Month' | 'Year';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
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

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<TabType>('History');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Month');

  const userId = user?.id || 'guest';
  const today = getLocalDateString();

  // 1. Fetch Completed Tasks History
  const { data: completedTasks, loading: tasksLoading, refresh: refreshTasks } = useData<Task>(
    `SELECT * FROM tasks 
     WHERE (user_id = ? OR user_id IS NULL) 
     AND status = 'done' 
     ORDER BY updated_at DESC LIMIT 200`,
    [userId]
  );

  // 2. Fetch Past Schedules
  const { data: pastSchedules, loading: schedulesLoading, refresh: refreshSchedules } = useData<{date: string, time_blocks: string}>(
    `SELECT date, time_blocks FROM schedules 
     WHERE (user_id = ? OR user_id IS NULL) 
     AND date <= ?
     ORDER BY date DESC`,
    [userId, today]
  );

  // Filtering Logic
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const allHistory = pastSchedules.flatMap(s => {
      try {
        const blocks = JSON.parse(s.time_blocks) as any[];
        return blocks.map(b => ({ ...b, date: s.date }));
      } catch { return []; }
    }).filter(b => b.type !== 'break' && b.task !== 'Break');

    return allHistory.filter(item => {
      const itemDate = new Date(item.date);
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
      
      if (activeFilter === 'Day') return diffDays <= 0;
      if (activeFilter === 'Week') return diffDays <= 7;
      if (activeFilter === 'Month') return diffDays <= 31;
      if (activeFilter === 'Year') return diffDays <= 365;
      return true;
    });
  }, [pastSchedules, activeFilter]);

  const filteredInventory = useMemo(() => {
    const now = new Date();
    return completedTasks.filter(task => {
      const taskDate = new Date(task.updated_at);
      const diffTime = now.getTime() - taskDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
      
      if (activeFilter === 'Day') return diffDays <= 0;
      if (activeFilter === 'Week') return diffDays <= 7;
      if (activeFilter === 'Month') return diffDays <= 31;
      if (activeFilter === 'Year') return diffDays <= 365;
      return true;
    });
  }, [completedTasks, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      refreshTasks();
      refreshSchedules();
    }, [refreshTasks, refreshSchedules])
  );

  const handleReuseTask = async (task: Task | ScheduleBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const title = 'task' in task ? task.task : task.title;
    const todos = 'todos' in task ? (typeof task.todos === 'string' ? task.todos : JSON.stringify(task.todos)) : '[]';
    const tag = 'tag' in task ? task.tag : 'Reused';

    Alert.alert(
      "Reuse Task",
      `Clone "${title}" to your active rotation?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "To Inventory", 
          onPress: async () => {
            try {
              await performMutation('tasks', 'INSERT', {
                id: Math.random().toString(36).substring(7),
                user_id: userId,
                title: title,
                status: 'todo',
                estimated_sessions: 1,
                completed_sessions: 0,
                tag: tag,
                todos: todos,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) { console.error(e); }
          }
        },
        {
          text: "To Schedule",
          onPress: () => {
            handleReuseToInventoryAndSchedule(title, tag, todos);
          }
        }
      ]
    );
  };

  const handleReuseToInventoryAndSchedule = async (title: string, tag: string, todos: string) => {
    try {
      const taskId = Math.random().toString(36).substring(7);
      
      // 1. Create the task record
      await performMutation('tasks', 'INSERT', {
        id: taskId,
        user_id: userId,
        title: title,
        status: 'todo',
        estimated_sessions: 1,
        completed_sessions: 0,
        tag: tag,
        todos: todos,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Automatically Add to Today's Schedule
      const db = await (await import('@/src/db/database')).getDb();
      const existingSchedule = await db.getFirstAsync<{id: string, time_blocks: string}>(
        "SELECT id, time_blocks FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
        [today, userId]
      );

      let blocks = [];
      let scheduleId = Math.random().toString(36).substring(7);
      
      if (existingSchedule) {
        try {
          blocks = JSON.parse(existingSchedule.time_blocks);
          scheduleId = existingSchedule.id;
        } catch (e) { blocks = []; }
      }

      // Helper to find a gap (reusing logic from add-task.tsx)
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };
      const toTimeString = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      let currentStart = toMinutes("09:00");
      const duration = 25; // Default focus duration
      const sortedBlocks = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
      
      for (const block of sortedBlocks) {
        const blockStart = toMinutes(block.start);
        if (blockStart >= currentStart + duration) break;
        currentStart = Math.max(currentStart, toMinutes(block.end));
      }

      const newBlock = {
        start: toTimeString(currentStart),
        end: toTimeString(currentStart + duration),
        task: title,
        type: 'deep-work',
        todos: JSON.parse(todos),
        task_id: taskId
      };

      const updatedBlocks = [...blocks, newBlock].sort((a, b) => a.start.localeCompare(b.start));

      await performMutation('schedules', existingSchedule ? 'UPDATE' : 'INSERT', {
        id: scheduleId,
        user_id: userId,
        date: today,
        time_blocks: JSON.stringify(updatedBlocks)
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Redirect to Calendar so user can edit the block
      router.push('/(tabs)/calendar');
    } catch (e) { 
      console.error(e); 
      Alert.alert("Error", "Failed to reuse task and update schedule.");
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/menu')}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image source={require('@/assets/images/Artboard 1 logo.png')} style={styles.logoImage} tintColor={colors.primary} resizeMode="contain" />
          </View>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'History' && styles.activeTab]} 
            onPress={() => { setActiveTab('History'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <HistoryIcon size={18} color={activeTab === 'History' ? colors.primary : colors.outline} />
            <Text style={[styles.tabText, activeTab === 'History' && { color: colors.primary }]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Repository' && styles.activeTab]} 
            onPress={() => { setActiveTab('Repository'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Layout size={18} color={activeTab === 'Repository' ? colors.primary : colors.outline} />
            <Text style={[styles.tabText, activeTab === 'Repository' && { color: colors.primary }]}>Inventory</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            {/* Filter Bar */}
            <View style={styles.filterRow}>
              {['Day', 'Week', 'Month', 'Year'].map(f => (
                <TouchableOpacity 
                  key={f} 
                  style={[styles.filterBtn, activeFilter === f && { backgroundColor: colors.primary + '1A', borderColor: colors.primary }]}
                  onPress={() => setActiveFilter(f as FilterType)}
                >
                  <Text style={[styles.filterText, activeFilter === f && { color: colors.primary, fontFamily: FONTS.labelSm }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'History' ? (
              <View style={styles.historyList}>
                {schedulesLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
                  filteredHistory.length > 0 ? filteredHistory.map((block, idx) => (
                    <TouchableOpacity key={idx} style={styles.historyCard} onPress={() => handleReuseTask(block)}>
                      <View style={styles.cardHeader}>
                        <View style={styles.dateBadge}>
                          <Text style={styles.dateText}>{block.date === today ? 'TODAY' : block.date}</Text>
                        </View>
                        <Text style={styles.timeRange}>{block.start} - {block.end}</Text>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.taskTitle}>{block.task}</Text>
                        <View style={styles.cardActions}>
                          <Copy size={16} color={colors.primary} />
                          <Text style={styles.reuseText}>REUSE</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.emptyState}>
                      <Clock size={40} color={colors.outlineVariant} />
                      <Text style={styles.emptyText}>No historical data for this period.</Text>
                    </View>
                  )
                )}
              </View>
            ) : (
              <View style={styles.inventoryList}>
                 {tasksLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
                   filteredInventory.length > 0 ? filteredInventory.map(task => (
                     <TouchableOpacity key={task.id} style={styles.inventoryCard} onPress={() => handleReuseTask(task)}>
                       <View style={styles.inventoryMain}>
                         <View style={[styles.tagBadge, { backgroundColor: colors.secondaryContainer }]}>
                           <Text style={[styles.tagText, { color: colors.onSecondaryContainer }]}>{task.tag || 'General'}</Text>
                         </View>
                         <Text style={styles.inventoryTitle}>{task.title}</Text>
                         <Text style={styles.inventoryMeta}>Completed {getLocalDateString(new Date(task.updated_at))}</Text>
                       </View>
                       <View style={styles.reuseIconBtn}>
                         <Copy size={20} color={colors.primary} />
                       </View>
                     </TouchableOpacity>
                   )) : (
                     <View style={styles.emptyState}>
                       <CheckCircle2 size={48} color={colors.outlineVariant} strokeWidth={1} />
                       <Text style={styles.emptyText}>No completed tasks for this period.</Text>
                     </View>
                   )
                 )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.background,
    height: 60,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  logoImage: { height: 40, width: 160 },
  menuBtn: { padding: 8 },
  ghostBtn: { padding: 8 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '33',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xl,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
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
    borderColor: colors.outlineVariant + '33',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    color: colors.onSurface,
    flex: 1,
    marginRight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '1A',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  inventoryMain: { flex: 1 },
  tagBadge: {
    alignSelf: 'flex-start',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
