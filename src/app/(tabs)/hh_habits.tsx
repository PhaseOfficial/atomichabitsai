import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuth } from "@/src/hooks/useAuth";
import { performMutation } from "@/src/lib/sync";
import { recalculateAllStreaks } from "@/src/lib/habit-logic";
import { 
  PlusCircle, 
  Settings, 
  Sparkles, 
  Menu, 
  Trash2, 
  X, 
  Save, 
  Clock, 
  MapPin, 
  Flame, 
  Check, 
  ChevronRight, 
  History,
  Calendar as CalendarIcon
} from "lucide-react-native";
import React, { useMemo, useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getLocalDateString } from "@/src/lib/date-utils";
import * as Haptics from 'expo-haptics';
import { useRouter, useFocusEffect } from "expo-router";
import { TimeInput } from "@/src/components/ui/TimeInput";

interface Habit {
  id: string;
  title: string;
  frequency: string;
  is_active: number;
  is_done_today: number;
  is_done_yesterday: number;
  current_streak: number;
  max_streak: number;
  preferred_time: string;
  location: string;
  two_minute_version: string;
}

export default function HabitsScreen() {
  const { colors, identityAnchor } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const userId = user?.id || 'guest';
  const today = getLocalDateString();

  const {
    data: habits,
    loading,
    refresh,
  } = useData<Habit>(
    `SELECT h.*, 
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at, 'localtime') = date('now', 'localtime')) as is_done_today,
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at, 'localtime') = date('now', 'localtime', '-1 day')) as is_done_yesterday
     FROM habits h 
     WHERE h.is_active = 1 AND (h.user_id = ? OR h.user_id IS NULL)
     ORDER BY h.preferred_time ASC`, 
    [userId]
  );

  const { data: matrixLogs } = useData<{date: string, count: number}>(
    "SELECT date(logged_at, 'localtime') as date, COUNT(*) as count FROM logs GROUP BY date ORDER BY date DESC LIMIT 28",
    []
  );

  const matrixCells = useMemo(() => {
    const cells = [];
    const habitCount = habits.length || 1;
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);

      const logEntry = matrixLogs.find(l => l.date === dateStr);
      const completionCount = logEntry ? logEntry.count : 0;
      const intensity = Math.min(completionCount / habitCount, 1);

      cells.push({ 
        date: dateStr, 
        intensity,
        isToday: i === 0
      });
    }
    return cells;
  }, [matrixLogs, habits.length]);

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editGateway, setEditGateway] = useState("");

  const dailySummary = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter(h => h.is_done_today > 0).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [habits]);

  const aiNudge = useMemo(() => {
    const fallingOff = habits.find(h => h.current_streak > 0 && h.is_done_today === 0 && h.is_done_yesterday === 0);
    if (fallingOff) {
      return {
        message: `Your ${fallingOff.current_streak}-day streak for "${fallingOff.title}" is at risk. Use your gateway version: "${fallingOff.two_minute_version || 'Just start for 2 minutes'}" to keep it alive!`,
        type: 'warning'
      };
    }
    if (dailySummary.percentage === 100 && habits.length > 0) {
      return {
        message: "Perfect day! Every action is a vote for the person you wish to become.",
        type: 'success'
      };
    }
    return null;
  }, [habits, dailySummary]);

  useFocusEffect(
    useCallback(() => {
      recalculateAllStreaks(userId).then(() => {
        refresh();
      });
    }, [userId, refresh])
  );

  const handleToggleHabit = async (habit: Habit) => {
    try {
      const isDone = habit.is_done_today > 0;
      if (isDone) {
        const db = await (await import('@/src/db/database')).getDb();
        await db.runAsync(
          "DELETE FROM logs WHERE habit_id = ? AND date(logged_at, 'localtime') = date('now', 'localtime')",
          [habit.id]
        );
      } else {
        await performMutation("logs", "INSERT", {
          id: Math.random().toString(36).substring(7),
          habit_id: habit.id,
          status: "completed",
          logged_at: new Date().toISOString(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  const handleOpenEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditTime(habit.preferred_time || "");
    setEditLocation(habit.location || "");
    setEditGateway(habit.two_minute_version || "");
  };

  const handleSaveEdit = async () => {
    if (!editingHabit || !editTitle.trim()) return;
    
    try {
      await performMutation('habits', 'UPDATE', {
        id: editingHabit.id,
        title: editTitle,
        preferred_time: editTime,
        location: editLocation,
        two_minute_version: editGateway,
        updated_at: new Date().toISOString()
      });
      setEditingHabit(null);
      refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Failed to update habit");
    }
  };

  const backfillYesterday = async () => {
    if (!editingHabit) return;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await performMutation('logs', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        habit_id: editingHabit.id,
        status: 'completed',
        logged_at: yesterday.toISOString()
      });
      Alert.alert("Success", "Logged for yesterday.");
      refresh();
    } catch (e) { console.error(e); }
  };

  const handleDeleteHabit = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Habit",
      "Are you sure you want to remove this habit?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await performMutation('habits', 'DELETE', { id });
              setEditingHabit(null);
              refresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          }
        }
      ]
    );
  };

  if (loading && habits.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/menu')}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/Artboard 1 logo.png')} 
              style={styles.logoImage} 
              tintColor={colors.primary}
              resizeMode="contain" 
            />
          </View>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Identity Header */}
          <View style={styles.identityHeader}>
            <Text style={styles.label}>ATOMIC PRINCIPLES</Text>
            <Text style={styles.headline}>{identityAnchor}</Text>
          </View>

          {/* Consistency Matrix */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONSISTENCY MATRIX (28 DAYS)</Text>
            <View style={styles.matrixContainer}>
              <View style={styles.matrixGrid}>
                {matrixCells.map((cell, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.matrixCell, 
                      { 
                        backgroundColor: cell.intensity > 0 ? colors.primary : colors.surfaceVariant,
                        opacity: cell.intensity > 0 
                          ? 0.3 + (cell.intensity * 0.7)
                          : 1,
                        borderColor: cell.isToday ? colors.primary : 'transparent',
                        borderWidth: cell.isToday ? 1.5 : 0
                      }
                    ]} 
                  />
                ))}
              </View>
              <View style={styles.matrixLegend}>
                <Text style={styles.legendText}>LESS</Text>
                <View style={[styles.matrixCell, { backgroundColor: colors.surfaceVariant, marginHorizontal: 4 }]} />
                <View style={[styles.matrixCell, { backgroundColor: colors.primary, opacity: 0.5, marginHorizontal: 4 }]} />
                <View style={[styles.matrixCell, { backgroundColor: colors.primary, marginHorizontal: 4 }]} />
                <Text style={styles.legendText}>MORE</Text>
              </View>
            </View>
          </View>

          {/* Daily Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryInfo}>
              <View>
                <Text style={styles.summaryTitle}>Today's Progress</Text>
                <Text style={styles.summarySubtitle}>
                  {dailySummary.completed} of {dailySummary.total} habits completed
                </Text>
              </View>
              <View style={styles.percentageCircle}>
                <Text style={styles.percentageText}>{dailySummary.percentage}%</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${dailySummary.percentage}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>

          {/* AI Nudge Section */}
          {aiNudge && (
            <View style={[styles.nudgeCard, { backgroundColor: aiNudge.type === 'warning' ? colors.error + '1A' : colors.primary + '1A' }]}>
              <Sparkles size={18} color={aiNudge.type === 'warning' ? colors.error : colors.primary} />
              <Text style={[styles.nudgeText, { color: aiNudge.type === 'warning' ? colors.error : colors.onSurface }]}>
                {aiNudge.message}
              </Text>
            </View>
          )}

          {/* Habits List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Votes</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-habit')}
              >
                <PlusCircle size={16} color={colors.primary} />
                <Text style={styles.addButtonText}>NEW HABIT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.habitList}>
              {habits.map((habit) => {
                const isDone = habit.is_done_today > 0;
                const isRecovery = habit.is_done_yesterday === 0 && !isDone;
                const streakProgress = Math.min((habit.current_streak / 30) * 100, 100);
                
                return (
                  <View key={habit.id} style={styles.habitItemWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.habitCard,
                        isDone && { borderColor: colors.primary + '4D', backgroundColor: colors.primary + '08' },
                      ]}
                      onPress={() => handleToggleHabit(habit)}
                      onLongPress={() => handleOpenEdit(habit)}
                    >
                      <View style={styles.habitMain}>
                        <View style={[styles.checkBtn, isDone && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          {isDone && <Check size={16} color={colors.onPrimary} strokeWidth={3} />}
                        </View>
                        
                        <View style={styles.habitInfo}>
                          <View style={styles.habitTitleRow}>
                            <Text style={[styles.habitTitle, isDone && { color: colors.outline, textDecorationLine: 'line-through' }]}>
                              {habit.title}
                            </Text>
                            {isRecovery && (
                              <View style={[styles.recoveryTag, { backgroundColor: colors.error + '1A' }]}>
                                <Text style={[styles.recoveryTagText, { color: colors.error }]}>NEVER MISS TWICE</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.habitMeta}>
                            <View style={styles.metaItem}>
                              <Clock size={12} color={colors.outline} />
                              <Text style={styles.metaText}>{habit.preferred_time || "08:00"}</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Flame size={12} color={habit.current_streak > 0 ? '#FF6B00' : colors.outline} />
                              <Text style={[styles.metaText, habit.current_streak > 0 && { color: '#FF6B00', fontFamily: FONTS.labelSm }]}>
                                {habit.current_streak} DAY STREAK
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity onPress={() => handleOpenEdit(habit)} style={styles.settingsBtn}>
                          <Settings size={20} color={colors.outlineVariant} />
                        </TouchableOpacity>
                      </View>

                      {/* Streak Progress Bar */}
                      <View style={styles.streakBarContainer}>
                        <View style={[styles.streakBarFill, { width: `${streakProgress}%`, backgroundColor: habit.current_streak > 0 ? '#FF6B00' : colors.outlineVariant }]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Detailed Matrix Shortcut */}
          <TouchableOpacity 
            style={styles.historyCard}
            onPress={() => router.push('/calendar')}
          >
            <History size={20} color={colors.primary} />
            <Text style={styles.historyText}>View detailed consistency matrix</Text>
            <ChevronRight size={20} color={colors.outline} />
          </TouchableOpacity>
        </ScrollView>

        {/* Edit Habit Modal */}
        <Modal
          visible={!!editingHabit}
          animationType="slide"
          transparent
          onRequestClose={() => setEditingHabit(null)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Adjust Habit</Text>
                <TouchableOpacity onPress={() => setEditingHabit(null)}>
                  <X size={24} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>TITLE</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Habit title"
                    placeholderTextColor={colors.outline}
                  />
                </View>

                <View style={styles.modalField}>
                  <TimeInput
                    label="PREFERRED TIME"
                    value={editTime}
                    onChange={setEditTime}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>LOCATION / ANCHOR</Text>
                  <View style={styles.inputIconWrapper}>
                    <MapPin size={18} color={colors.primary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modalInput, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      value={editLocation}
                      onChangeText={setEditLocation}
                      placeholder="e.g. In the kitchen"
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>GATEWAY VERSION (2 MIN)</Text>
                  <TextInput 
                    style={styles.modalInput} 
                    value={editGateway} 
                    onChangeText={setEditGateway} 
                    placeholder="e.g. Put on running shoes"
                    placeholderTextColor={colors.outline}
                  />
                </View>

                <View style={styles.adjustmentSection}>
                  <Text style={styles.modalLabel}>MISSED A DAY?</Text>
                  <TouchableOpacity style={styles.backfillBtn} onPress={backfillYesterday}>
                    <CalendarIcon size={18} color={colors.primary} />
                    <Text style={styles.backfillText}>Mark completed for yesterday</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: colors.error + '1A' }]}
                  onPress={() => handleDeleteHabit(editingHabit!.id)}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Save size={20} color={colors.onPrimary} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    identityHeader: {
      padding: SPACING.lg,
      backgroundColor: colors.surface,
    },
    matrixContainer: {
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    matrixGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    matrixCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
    },
    matrixLegend: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      justifyContent: "flex-end",
    },
    legendText: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.outline,
    },
    label: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.primary,
      letterSpacing: 1.5,
      marginBottom: SPACING.xs,
    },
    headline: {
      fontFamily: FONTS.headline,
      fontSize: 28,
      color: colors.onSurface,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
      margin: SPACING.lg,
      marginTop: 0,
    },
    summaryInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    summaryTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 16,
      color: colors.onSurface,
    },
    summarySubtitle: {
      fontFamily: FONTS.body,
      fontSize: 13,
      color: colors.outline,
      marginTop: 2,
    },
    percentageCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    percentageText: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.primary,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    nudgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: ROUNDNESS.md,
      gap: 12,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    nudgeText: {
      flex: 1,
      fontFamily: FONTS.body,
      fontSize: 13,
      lineHeight: 18,
    },
    section: {
      paddingHorizontal: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontFamily: FONTS.headline,
      fontSize: 24,
      color: colors.onSurface,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addButtonText: {
      color: colors.primary,
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      letterSpacing: 0.5,
    },
    habitList: {
      gap: SPACING.md,
    },
    habitItemWrapper: {
      width: '100%',
    },
    habitCard: {
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
    },
    habitMain: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    habitInfo: {
      flex: 1,
    },
    habitTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    habitTitle: {
      fontFamily: FONTS.labelSm,
      fontSize: 17,
      color: colors.onSurface,
    },
    recoveryTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    recoveryTagText: {
      fontSize: 8,
      fontFamily: FONTS.labelSm,
    },
    habitMeta: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.outline,
    },
    settingsBtn: {
      padding: 8,
    },
    streakBarContainer: {
      height: 3,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 1.5,
      marginTop: 12,
      overflow: 'hidden',
    },
    streakBarFill: {
      height: '100%',
      borderRadius: 1.5,
    },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant + '4D',
      padding: 16,
      borderRadius: ROUNDNESS.md,
      gap: 12,
      margin: SPACING.lg,
      marginTop: SPACING.xl,
    },
    historyText: {
      flex: 1,
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurface,
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
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    modalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 20,
      color: colors.onSurface,
    },
    modalBody: {
      marginBottom: SPACING.lg,
    },
    modalField: {
      marginBottom: SPACING.lg,
    },
    modalLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
      letterSpacing: 1,
      marginBottom: 8,
    },
    modalInput: {
      backgroundColor: colors.surfaceVariant + '4D',
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      padding: 12,
      color: colors.onSurface,
      fontFamily: FONTS.body,
      fontSize: 15,
    },
    inputIconWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant + '4D',
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    inputIcon: {
      paddingHorizontal: 12,
    },
    adjustmentSection: {
      marginTop: SPACING.md,
      paddingTop: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '33',
      marginBottom: 20,
    },
    backfillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '10',
      padding: 16,
      borderRadius: ROUNDNESS.md,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.primary + '33',
    },
    backfillText: {
      fontFamily: FONTS.labelSm,
      fontSize: 14,
      color: colors.primary,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: SPACING.xl,
      paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    modalBtn: {
      padding: 14,
      borderRadius: ROUNDNESS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    saveBtnText: {
      fontFamily: FONTS.labelSm,
      color: colors.onPrimary,
      fontSize: 15,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
  });
