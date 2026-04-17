import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useData } from "@/src/hooks/useData";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuth } from "@/src/hooks/useAuth";
import { performMutation } from "@/src/lib/sync";
import { Heart, PlusCircle, Settings, Sparkles, Menu, Trash2, Zap, RotateCcw } from "lucide-react-native";
import React, { useMemo, useCallback } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import * as Haptics from 'expo-haptics';

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

  const {
    data: habits,
    loading,
    error,
    refresh,
  } = useData<Habit>(
    `SELECT h.*, 
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at) = date('now')) as is_done_today,
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at) = date('now', '-1 day')) as is_done_yesterday
     FROM habits h 
     WHERE h.is_active = 1 AND (h.user_id = ? OR h.user_id IS NULL)`, 
    [userId]
  );

  const { data: matrixLogs } = useData<{date: string}>(
    "SELECT date(logged_at) as date FROM logs l JOIN habits h ON l.habit_id = h.id WHERE (h.user_id = ? OR h.user_id IS NULL) AND date(logged_at) > date('now', '-28 days')",
    [userId]
  );

  const votesToday = useMemo(() => {
    return habits.filter(h => h.is_done_today > 0).length;
  }, [habits]);

  const matrixCells = useMemo(() => {
    const cells = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasLog = matrixLogs.some(l => l.date === dateStr);
      cells.push({ date: dateStr, active: hasLog });
    }
    return cells;
  }, [matrixLogs]);

  const globalStreak = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    return Math.max(...habits.map(h => h.current_streak || 0));
  }, [habits]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleToggleHabit = async (habit: Habit) => {
    try {
      if (habit.is_done_today > 0) return;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await performMutation("logs", "INSERT", {
        id: Math.random().toString(36).substring(7),
        habit_id: habit.id,
        status: "completed",
        logged_at: new Date().toISOString(),
      });
      refresh();
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  const handleAddHabit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-habit');
  };

  const handleDeleteHabit = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Habit",
      "Are you sure you want to remove this habit and all its history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await performMutation('habits', 'DELETE', { id });
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
          <TouchableOpacity style={styles.menuBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/menu');
          }}>
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

          <TouchableOpacity style={styles.ghostBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/modal');
          }}>
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
            <Text style={styles.label}>ATOMIC PRINCIPLES / IDENTITY</Text>
            <Text style={styles.headline}>{identityAnchor}</Text>
            <Text style={styles.subheadline}>
              "Every action you take is a vote for the type of person you wish to become."
            </Text>

            <View style={styles.focusCard}>
              <View style={styles.focusIconContainer}>
                <Zap size={20} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.focusLabel, { color: colors.onPrimary + "B3" }]}>
                  VOTES CAST TODAY
                </Text>
                <View style={styles.voteBarContainer}>
                   <View style={[styles.voteBarFill, { width: habits.length > 0 ? `${(votesToday / habits.length) * 100}%` : '0%', backgroundColor: colors.onPrimary }]} />
                </View>
              </View>
              <Text style={[styles.voteCount, { color: colors.onPrimary }]}>{votesToday}/{habits.length}</Text>
            </View>
          </View>

          {/* Consistency Matrix */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONSISTENCY MATRIX (28 DAYS)</Text>
            <View style={styles.matrixContainer}>
              <View style={styles.matrixGrid}>
                {matrixCells.map((cell, i) => (
                  <View
                    key={i}
                    style={[
                      styles.matrixCell,
                      {
                        backgroundColor: cell.active 
                          ? colors.primary 
                          : colors.surfaceVariant,
                        opacity: cell.active ? 0.8 : 1
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.matrixFooter}>
                 <Text style={styles.matrixSubtitle}>Current Streak: {globalStreak} days</Text>
              </View>
            </View>
          </View>

          {/* Habit Inventory */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Votes</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddHabit}
              >
                <PlusCircle size={16} color={colors.primary} />
                <Text style={styles.addButtonText}>NEW HABIT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.habitList}>
              {habits.length > 0 ? (
                habits.map((habit) => {
                  const isRecovery = habit.is_done_yesterday === 0 && habit.is_done_today === 0;
                  return (
                    <View key={habit.id} style={styles.habitItem}>
                      <TouchableOpacity
                        style={[
                          styles.habitCheck,
                          habit.is_done_today > 0 && {
                            backgroundColor: colors.primary,
                          },
                        ]}
                        onPress={() => handleToggleHabit(habit)}
                      >
                        {habit.is_done_today > 0 && (
                          <View style={[styles.innerCheck, { backgroundColor: colors.onPrimary }]} />
                        )}
                      </TouchableOpacity>
                      <View style={styles.habitContent}>
                        <View style={styles.habitTitleRow}>
                          <Text style={styles.habitName}>{habit.title}</Text>
                          {isRecovery && (
                            <View style={[styles.tag, { backgroundColor: colors.error + '1A' }]}>
                              <Text style={[styles.tagText, { color: colors.error }]}>
                                NEVER MISS TWICE
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.habitDescription}>
                          I will {habit.title.toLowerCase()} at {habit.preferred_time || 'any time'} in {habit.location || 'my usual spot'}.
                        </Text>
                        {habit.two_minute_version && (
                          <Text style={styles.twoMinText}>
                            2-min version: {habit.two_minute_version}
                          </Text>
                        )}
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.deleteBtn} 
                        onPress={() => handleDeleteHabit(habit.id)}
                      >
                        <Trash2 size={16} color={colors.error} opacity={0.5} />
                      </TouchableOpacity>

                      <View style={styles.streakContainer}>
                        <Text style={styles.streakLabel}>STREAK</Text>
                        <Text style={styles.streakValue}>{habit.current_streak || 0}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <TouchableOpacity 
                  style={styles.emptyStateCard}
                  onPress={handleAddHabit}
                >
                  <PlusCircle size={24} color={colors.primary} />
                  <Text style={styles.emptyStateText}>No habits found. Cast your first vote today.</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
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
    iconButton: {
      padding: 4,
    },
    identityHeader: {
      padding: SPACING.lg,
      backgroundColor: colors.surface,
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
      fontSize: 32,
      color: colors.onSurface,
      marginBottom: SPACING.xs,
    },
    subheadline: {
      fontFamily: FONTS.body,
      fontSize: 15,
      color: colors.onSurfaceVariant,
      lineHeight: 22,
      marginBottom: SPACING.lg,
    },
    focusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.md,
      gap: SPACING.md,
    },
    focusIconContainer: {
      width: 40,
      height: 40,
      borderRadius: ROUNDNESS.md,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    focusLabel: {
      fontFamily: FONTS.label,
      fontSize: 9,
      letterSpacing: 1,
    },
    voteBarContainer: {
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 2,
      marginTop: 6,
      overflow: 'hidden',
    },
    voteBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    voteCount: {
      fontFamily: FONTS.headline,
      fontSize: 20,
    },
    section: {
      padding: SPACING.lg,
    },
    sectionLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.outline,
      letterSpacing: 1.5,
      marginBottom: SPACING.md,
    },
    matrixContainer: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    matrixGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: 'center',
    },
    matrixCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
    },
    matrixFooter: {
      marginTop: SPACING.md,
      alignItems: 'center',
    },
    matrixSubtitle: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.primary,
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
    habitItem: {
      backgroundColor: colors.surface,
      padding: SPACING.md,
      borderRadius: ROUNDNESS.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    habitCheck: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.primary,
      padding: 2,
    },
    innerCheck: {
      flex: 1,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
    habitContent: {
      flex: 1,
    },
    habitTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginBottom: 2,
    },
    habitName: {
      fontFamily: FONTS.labelSm,
      fontSize: 15,
      color: colors.onSurface,
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 8,
      fontFamily: FONTS.labelSm,
    },
    habitDescription: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    twoMinText: {
      fontFamily: FONTS.body,
      fontSize: 11,
      color: colors.primary,
      marginTop: 2,
      fontStyle: 'italic',
    },
    deleteBtn: {
      padding: 8,
    },
    streakContainer: {
      alignItems: "flex-end",
    },
    streakLabel: {
      fontFamily: FONTS.label,
      fontSize: 8,
      color: colors.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    streakValue: {
      fontFamily: FONTS.labelSm,
      fontSize: 16,
      color: colors.primary,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
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
