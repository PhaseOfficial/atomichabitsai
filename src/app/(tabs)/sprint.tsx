import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Play, Pause, RotateCcw, Zap, CheckCircle2, Plus, Menu } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useData } from '@/src/hooks/useData';
import { performMutation } from '@/src/lib/sync';
import { useRouter, useFocusEffect } from 'expo-router';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  estimated_sessions: number;
  completed_sessions: number;
  tag: string;
}

export default function SprintScreen() {
  const { colors, focusGoal, sprintDuration } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || 'guest';

  const { data: tasks, loading, refresh } = useData<Task>(
    "SELECT * FROM tasks WHERE (user_id = ? OR user_id IS NULL) AND status != 'done' ORDER BY created_at DESC",
    [userId]
  );

  const { data: completedToday } = useData<{count: number}>(
    "SELECT COUNT(*) as count FROM tasks WHERE (user_id = ? OR user_id IS NULL) AND status = 'done' AND date(updated_at) = date('now')",
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(sprintDuration * 60); 
  const activeTask = tasks.find(t => t.status === 'doing') || tasks[0];

  useEffect(() => {
    if (!isActive) {
      setSeconds(sprintDuration * 60);
    }
  }, [sprintDuration, isActive]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      handleSessionComplete();
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    setSeconds(sprintDuration * 60);
    
    if (activeTask) {
      try {
        await performMutation('tasks', 'UPDATE', {
          id: activeTask.id,
          completed_sessions: (activeTask.completed_sessions || 0) + 1,
          updated_at: new Date().toISOString()
        });
        refresh();
        Alert.alert('Session Complete', `Great work on "${activeTask.title}"! Take a short break.`);
      } catch (e) {
        console.error('Failed to update task progress', e);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(sprintDuration * 60);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'todo' ? 'doing' : 'done';
    try {
      await performMutation('tasks', 'UPDATE', {
        id: task.id,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      refresh();
    } catch (e) {
      console.error('Failed to update task status', e);
    }
  };

  const sessionsDone = completedToday?.[0]?.count || 0;
  const sessionGoal = focusGoal;

  if (loading && tasks.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/menu')}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/Artboard 1 logo.png')} 
              style={[styles.logoImage, { tintColor: colors.primary }]} 
              resizeMode="contain" 
            />
          </View>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Timer Section */}
          <View style={styles.timerSection}>
            <Text style={styles.labelCaps}>FOCUSED SPRINT</Text>
            <View style={styles.timerDisplayContainer}>
              <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>
            </View>
            
            <View style={styles.timerControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={handleReset}>
                <RotateCcw size={24} color={colors.onSurfaceVariant} strokeWidth={1.5} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.playBtn, { backgroundColor: colors.primary }]} 
                onPress={() => setIsActive(!isActive)}
              >
                {isActive ? (
                  <Pause size={32} color={colors.onPrimary} fill={colors.onPrimary} />
                ) : (
                  <Play size={32} color={colors.onPrimary} fill={colors.onPrimary} />
                )}
              </TouchableOpacity>

              <View style={styles.controlBtnPlaceholder} />
            </View>
          </View>

          {/* Session Progress */}
          <View style={styles.section}>
            <View style={styles.progressCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.dataLabel}>DAILY FOCUS GOAL</Text>
                <Text style={styles.dataValueSmall}>{sessionsDone} / {sessionGoal}</Text>
              </View>
              <View style={styles.technicalBarBg}>
                <View style={[styles.technicalBarFill, { width: `${Math.min((sessionsDone / sessionGoal) * 100, 100)}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.progressHint}>
                {sessionsDone >= sessionGoal 
                  ? "Daily goal achieved! You're in peak flow." 
                  : `Complete ${sessionGoal - sessionsDone} more sessions to reach your daily target.`}
              </Text>
            </View>
          </View>

          {/* Task Queue */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Up Next</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-task')}>
                <Plus size={18} color={colors.primary} />
                <Text style={styles.addBtnText}>ADD TASK</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.taskQueue}>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TouchableOpacity 
                    key={task.id} 
                    style={[
                      styles.taskItem, 
                      task.status === 'doing' && { backgroundColor: colors.primary + '1A', borderColor: colors.primary }
                    ]}
                    onPress={() => handleToggleTaskStatus(task)}
                  >
                    <View style={[
                      styles.checkbox, 
                      { borderColor: colors.outlineVariant },
                      task.status === 'doing' && { borderColor: colors.primary, backgroundColor: colors.primary + '33' }
                    ]}>
                      {task.status === 'doing' && <Zap size={14} color={colors.primary} fill={colors.primary} />}
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={[
                        styles.taskTitle,
                        task.status === 'doing' && { fontFamily: FONTS.labelSm, color: colors.primary }
                      ]}>
                        {task.title}
                      </Text>
                      <View style={styles.taskMeta}>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{task.tag}</Text>
                        </View>
                        <Text style={styles.sessionCount}>
                          {task.completed_sessions}/{task.estimated_sessions} sessions
                        </Text>
                      </View>
                    </View>
                    {task.status === 'doing' && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity 
                  style={styles.emptyStateCard}
                  onPress={() => router.push('/add-task')}
                >
                  <Plus size={24} color={colors.primary} />
                  <Text style={styles.emptyStateText}>No tasks in your queue. Add something to focus on.</Text>
                </TouchableOpacity>
              )}
            </View>
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
  scrollContent: {
    paddingBottom: 40,
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
  timerSection: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  labelCaps: {
    fontFamily: FONTS.labelSm,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: SPACING.xl,
  },
  timerDisplayContainer: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 8,
    borderColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDisplay: {
    fontSize: 72,
    fontFamily: FONTS.labelSm,
    color: colors.onSurface,
    letterSpacing: -1,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  controlBtn: {
    padding: 12,
    borderRadius: ROUNDNESS.full,
    backgroundColor: colors.surfaceVariant,
  },
  controlBtnPlaceholder: {
    width: 48,
  },
  playBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  section: {
    padding: SPACING.lg,
  },
  progressCard: {
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  dataLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  dataValueSmall: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    color: colors.primary,
  },
  technicalBarBg: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  technicalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    marginTop: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: colors.onSurface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  taskQueue: {
    gap: 12,
    marginTop: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    marginLeft: 12,
    flex: 1,
  },
  taskTitle: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  sessionCount: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: colors.onPrimary,
    fontFamily: FONTS.labelSm,
    fontSize: 9,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    padding: SPACING.xl,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
