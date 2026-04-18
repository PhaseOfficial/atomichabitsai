import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, AppState, TextInput, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useData } from '@/src/hooks/useData';
import { performMutation } from '@/src/lib/sync';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, Play, Pause, RotateCcw, Zap, CheckCircle2, Plus, Menu, ListTodo, Check, ChevronRight, Calendar, X, Coffee } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getLocalDateString } from '@/src/lib/date-utils';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  estimated_sessions: number;
  completed_sessions: number;
  tag: string;
  todos?: string; // JSON string
}

interface Schedule {
  id: string;
  time_blocks: string;
}

interface TimeBlock {
  start: string;
  end: string;
  task: string;
  type?: string;
  todos?: { id: string; text: string; completed: boolean }[];
}

export default function SprintScreen() {
  const { colors, focusGoal, sprintDuration } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || 'guest';
  const today = getLocalDateString();

  // Timer State
  const [manualBlock, setManualBlock] = useState<TimeBlock | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(sprintDuration * 60); 

  // Modal State
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [selectedTaskForTodo, setSelectedTaskForTodo] = useState<Task | null>(null);
  const [newTodoText, setNewTodoText] = useState("");

  const appState = useRef(AppState.currentState);

  const { data: tasks, loading, refresh: refreshTasks } = useData<Task>(
    "SELECT * FROM tasks WHERE (user_id = ? OR user_id IS NULL) AND status != 'done' ORDER BY created_at DESC",
    [userId]
  );

  const { data: schedules, refresh: refreshSchedule } = useData<Schedule>(
    "SELECT * FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
    [today, userId]
  );

  const { data: completedToday, refresh: refreshLogs } = useData<{count: number}>(
    "SELECT COUNT(*) as count FROM logs WHERE date(logged_at, 'localtime') = date('now', 'localtime') AND status = 'completed'",
    []
  );

  const allBlocks = useMemo(() => {
    if (!schedules.length) return [];
    try {
      return JSON.parse(schedules[0].time_blocks) as TimeBlock[];
    } catch { return []; }
  }, [schedules]);

  const autoActiveBlock = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return allBlocks.find(b => {
      const [startH, startM] = b.start.split(':').map(Number);
      const [endH, endM] = b.end.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return currentMinutes >= start && currentMinutes <= end;
    });
  }, [allBlocks]);

  const activeTimeBlock = manualBlock || autoActiveBlock;

  const activeTask = useMemo(() => {
    return tasks.find(t => t.status === 'doing') || tasks[0];
  }, [tasks]);

  const refresh = useCallback(() => {
    refreshTasks();
    refreshSchedule();
    refreshLogs();
  }, [refreshTasks, refreshSchedule, refreshLogs]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Background timer sync
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        if (isActive && targetEndTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
          setSeconds(remaining);
          if (remaining === 0) {
            handleSessionComplete();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, targetEndTime]);

  const handleToggleTimer = () => {
    if (!isActive) {
      // Starting/Resuming
      const duration = timerMode === 'focus' ? sprintDuration * 60 : 5 * 60;
      const newTarget = Date.now() + (seconds > 0 ? seconds : duration) * 1000;
      setTargetEndTime(newTarget);
      setIsActive(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      // Pausing
      setIsActive(false);
      setTargetEndTime(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    if (!activeTimeBlock || !schedules[0]) return;
    
    try {
      const updatedBlocks = allBlocks.map(b => {
        if (b.start === activeTimeBlock.start && b.task === activeTimeBlock.task) {
          const updatedTodos = b.todos?.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
          const updatedBlock = { ...b, todos: updatedTodos };
          if (manualBlock && manualBlock.start === b.start && manualBlock.task === b.task) {
            setManualBlock(updatedBlock);
          }
          return updatedBlock;
        }
        return b;
      });

      await performMutation('schedules', 'UPDATE', {
        id: schedules[0].id,
        time_blocks: JSON.stringify(updatedBlocks)
      });
      refreshSchedule();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error('Failed to toggle block todo', e);
    }
  };

  // Only initialize timer once or when sprintDuration changes while inactive
  useEffect(() => {
    if (!isActive && timerMode === 'focus') {
      setSeconds(sprintDuration * 60);
    }
  }, [sprintDuration, timerMode]); 

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    setTargetEndTime(null);
    
    if (timerMode === 'focus') {
      try {
        await performMutation('logs', 'INSERT', {
          id: Math.random().toString(36).substring(7),
          habit_id: 'focus-session', 
          status: 'completed',
          logged_at: new Date().toISOString()
        });

        if (activeTask) {
          await performMutation('tasks', 'UPDATE', {
            id: activeTask.id,
            completed_sessions: (activeTask.completed_sessions || 0) + 1,
            updated_at: new Date().toISOString()
          });
        }

        refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Transition to Break
        setTimerMode('break');
        const breakSecs = 5 * 60;
        setSeconds(breakSecs);
        setIsActive(true);
        setTargetEndTime(Date.now() + breakSecs * 1000);
        
        Alert.alert('Session Complete', 'Focus session logged! Starting break.');
      } catch (e) {
        console.error('Failed to complete session', e);
      }
    } else {
      // Break complete -> Shift to next task
      setTimerMode('focus');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // If we have a next block coming up, we can "jump" to it or just reset to default focus duration
      setSeconds(sprintDuration * 60);
      
      // If the manual block was finished, clear it to let auto-detection find the next one
      if (manualBlock) {
        setManualBlock(null);
      }
      
      Alert.alert('Break Over', 'Time to dive into the next task.');
    }
  };

  const handleExtendSession = async (mins: number = 10) => {
    const additionalSecs = mins * 60;
    setSeconds(prev => prev + additionalSecs);
    if (isActive && targetEndTime) {
      setTargetEndTime(targetEndTime + additionalSecs * 1000);
    }
    
    // If we're extending a scheduled block, we should try to update the schedule end time too
    if (activeTimeBlock && schedules[0]) {
      try {
        const [h, m] = activeTimeBlock.end.split(':').map(Number);
        const newEndMins = h * 60 + m + mins;
        const newEndStr = `${String(Math.floor(newEndMins / 60)).padStart(2, '0')}:${String(newEndMins % 60).padStart(2, '0')}`;
        
        const updatedBlocks = allBlocks.map(b => {
          if (b.start === activeTimeBlock.start && b.task === activeTimeBlock.task) {
            const updated = { ...b, end: newEndStr };
            if (manualBlock) setManualBlock(updated);
            return updated;
          }
          return b;
        });

        await performMutation('schedules', 'UPDATE', {
          id: schedules[0].id,
          time_blocks: JSON.stringify(updatedBlocks)
        });
        refreshSchedule();
      } catch (e) { console.error("Failed to extend schedule block", e); }
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleTaskTodoToggle = async (taskId: string, todoId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const currentTodos = task.todos ? JSON.parse(task.todos) : [];
      const updatedTodos = currentTodos.map((t: any) => 
        t.id === todoId ? { ...t, completed: !t.completed } : t
      );

      await performMutation('tasks', 'UPDATE', {
        id: taskId,
        todos: JSON.stringify(updatedTodos),
        updated_at: new Date().toISOString()
      });
      refreshTasks();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error('Failed to toggle task todo', e);
    }
  };

  const handleAddTaskTodo = async () => {
    if (!selectedTaskForTodo || !newTodoText.trim()) return;

    try {
      const currentTodos = selectedTaskForTodo.todos ? JSON.parse(selectedTaskForTodo.todos) : [];
      const newTodo = {
        id: Math.random().toString(36).substring(7),
        text: newTodoText.trim(),
        completed: false
      };
      
      const updatedTodos = [...currentTodos, newTodo];

      await performMutation('tasks', 'UPDATE', {
        id: selectedTaskForTodo.id,
        todos: JSON.stringify(updatedTodos),
        updated_at: new Date().toISOString()
      });
      
      setNewTodoText("");
      refreshTasks();
      // Update local state to show change in modal immediately
      setSelectedTaskForTodo({
        ...selectedTaskForTodo,
        todos: JSON.stringify(updatedTodos)
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error('Failed to add task todo', e);
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
    setManualBlock(null);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    let newStatus: 'todo' | 'doing' | 'done' = 'todo';
    if (task.status === 'todo') newStatus = 'doing';
    else if (task.status === 'doing') newStatus = 'done';

    try {
      await performMutation('tasks', 'UPDATE', {
        id: task.id,
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      refresh();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                onPress={handleToggleTimer}
              >
                {isActive ? (
                  <Pause size={32} color={colors.onPrimary} fill={colors.onPrimary} />
                ) : (
                  <Play size={32} color={colors.onPrimary} fill={colors.onPrimary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.controlBtn} 
                onPress={() => handleExtendSession(10)}
                disabled={timerMode === 'break'}
              >
                <Plus size={24} color={timerMode === 'break' ? colors.outlineVariant : colors.onSurfaceVariant} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            {timerMode === 'focus' && (
              <Text style={styles.extendLabel}>+10 MIN</Text>
            )}
          </View>

          {/* Current Schedule Focus */}
          {activeTimeBlock && (
            <View style={styles.section}>
              <View style={[styles.activeBlockCard, manualBlock && { borderColor: colors.tertiary, backgroundColor: colors.tertiary + '0D' }]}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowAlign}>
                    <ListTodo size={18} color={manualBlock ? colors.tertiary : colors.primary} />
                    <Text style={[styles.activeBlockLabel, manualBlock && { color: colors.tertiary }]}>
                      {manualBlock ? 'MANUAL FOCUS' : 'CURRENT SCHEDULE'}
                    </Text>
                  </View>
                  <Text style={styles.activeBlockTime}>{activeTimeBlock.start} - {activeTimeBlock.end}</Text>
                </View>
                
                <View style={styles.rowBetween}>
                  <Text style={styles.activeBlockTitle}>{activeTimeBlock.task}</Text>
                  <TouchableOpacity 
                    style={[styles.subtaskBtn, { backgroundColor: (manualBlock ? colors.tertiary : colors.primary) + '1A' }]}
                    onPress={() => {
                      const task = tasks.find(t => t.title === activeTimeBlock.task);
                      if (task) {
                        setSelectedTaskForTodo(task);
                        setShowTodoModal(true);
                      } else {
                        Alert.alert("No Task Found", "This schedule block isn't linked to a task inventory item yet.");
                      }
                    }}
                  >
                    <ListTodo size={14} color={manualBlock ? colors.tertiary : colors.primary} />
                    <Text style={[styles.subtaskBtnText, { color: manualBlock ? colors.tertiary : colors.primary }]}>SUB-TASKS</Text>
                  </TouchableOpacity>
                </View>
                
                {activeTimeBlock.todos && activeTimeBlock.todos.length > 0 && (
                  <View style={styles.activeTodoList}>
                    {activeTimeBlock.todos.map(todo => (
                      <TouchableOpacity 
                        key={todo.id} 
                        style={styles.activeTodoItem}
                        onPress={() => handleToggleTodo(todo.id)}
                      >
                        <View style={[
                          styles.todoCheck, 
                          { borderColor: manualBlock ? colors.tertiary : colors.primary },
                          todo.completed && { backgroundColor: manualBlock ? colors.tertiary : colors.primary }
                        ]}>
                          {todo.completed && <Check size={12} color={colors.onPrimary} />}
                        </View>
                        <Text style={[
                          styles.activeTodoText,
                          todo.completed && { textDecorationLine: 'line-through', color: colors.onSurfaceVariant }
                        ]}>
                          {todo.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {manualBlock && (
                  <TouchableOpacity style={styles.clearManualBtn} onPress={() => setManualBlock(null)}>
                    <Text style={[styles.clearManualText, { color: colors.tertiary }]}>Restore Automatic Schedule</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Schedule Browser */}
          {allBlocks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TODAY'S SCHEDULE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleRow}>
                {allBlocks.map((block, idx) => {
                  const isCurrent = activeTimeBlock?.start === block.start && activeTimeBlock?.task === block.task;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[
                        styles.scheduleBlockCard, 
                        { backgroundColor: colors.surface },
                        isCurrent && { 
                          borderColor: colors.primary, 
                          borderWidth: 2,
                          backgroundColor: colors.primary + '0D', // Very light tint
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                          elevation: 5,
                        }
                      ]}
                      onPress={() => {
                        setManualBlock(block);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.blockTimeText, isCurrent && { color: colors.primary, fontFamily: FONTS.labelSm }]}>{block.start}</Text>
                      <Text style={[styles.blockTaskText, isCurrent && { color: colors.primary, fontFamily: FONTS.labelSm }]} numberOfLines={1}>{block.task}</Text>
                      {isCurrent && (
                        <View style={styles.focusIndicator}>
                           <Zap size={8} color={colors.onPrimary} fill={colors.onPrimary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

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
              <Text style={styles.sectionTitle}>Task Inventory</Text>
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

        {/* Task Todo Modal */}
        <Modal visible={showTodoModal} transparent animationType="slide">
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Sub-tasks</Text>
                  <Text style={styles.modalSubtitle}>{selectedTaskForTodo?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowTodoModal(false)}>
                  <X size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <View style={styles.todoInputRow}>
                <TextInput
                  style={styles.modalInput}
                  value={newTodoText}
                  onChangeText={setNewTodoText}
                  placeholder="Add a step..."
                  placeholderTextColor={colors.outline}
                  onSubmitEditing={handleAddTaskTodo}
                />
                <TouchableOpacity 
                  style={[styles.addTodoBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddTaskTodo}
                >
                  <Plus size={20} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalTodoList} showsVerticalScrollIndicator={false}>
                {selectedTaskForTodo?.todos ? (
                  JSON.parse(selectedTaskForTodo.todos).map((todo: any) => (
                    <View key={todo.id} style={styles.modalTodoItem}>
                      <TouchableOpacity 
                        onPress={() => handleTaskTodoToggle(selectedTaskForTodo.id, todo.id)}
                        style={[
                          styles.modalTodoCheck, 
                          { borderColor: colors.primary },
                          todo.completed && { backgroundColor: colors.primary }
                        ]}
                      >
                        {todo.completed && <Check size={12} color={colors.onPrimary} />}
                      </TouchableOpacity>
                      <Text style={[
                        styles.modalTodoText,
                        todo.completed && { textDecorationLine: 'line-through', color: colors.outline }
                      ]}>
                        {todo.text}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTodos}>
                    <ListTodo size={40} color={colors.outlineVariant} strokeWidth={1} />
                    <Text style={styles.emptyTodosText}>Break down this task into smaller steps.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  extendLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.primary,
    marginTop: 8,
    letterSpacing: 1,
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
  activeBlockCard: {
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '0D',
  },
  activeBlockLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
    marginLeft: 8,
  },
  activeBlockTime: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  activeBlockTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
    marginTop: 8,
    marginBottom: SPACING.md,
    flex: 1,
  },
  subtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subtaskBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  activeTodoList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '33',
    paddingTop: SPACING.md,
  },
  activeTodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  todoCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTodoText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurface,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  scheduleRow: {
    gap: 12,
    paddingRight: SPACING.lg,
  },
  scheduleBlockCard: {
    width: 120,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  blockTimeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.primary,
    marginBottom: 4,
  },
  blockTaskText: {
    fontFamily: FONTS.labelSm,
    fontSize: 13,
    color: colors.onSurface,
  },
  clearManualBtn: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + '33',
    alignItems: 'center',
  },
  clearManualText: {
    fontFamily: FONTS.label,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: ROUNDNESS.xl,
    borderTopRightRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  todoInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  modalInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surfaceVariant + '4D',
    borderRadius: ROUNDNESS.md,
    paddingHorizontal: 16,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  addTodoBtn: {
    width: 48,
    height: 48,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTodoList: {
    marginBottom: SPACING.xl,
  },
  modalTodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '1A',
  },
  modalTodoCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTodoText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurface,
    flex: 1,
  },
  emptyTodos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTodosText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    textAlign: 'center',
  },
});
