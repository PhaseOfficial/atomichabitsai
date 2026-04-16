import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Play, CheckCircle2, Activity, BarChart2, Mail, CreditCard, Sparkles, Plus, Globe, Trash2, Menu } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useData } from '@/src/hooks/useData';
import { useTheme } from '@/src/hooks/useTheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { performMutation } from '@/src/lib/sync';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const { colors, focusGoal } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || 'guest';
  const today = new Date().toISOString().split('T')[0];

  const { data: habitStats, loading: habitsLoading } = useData<{count: number}>(
    'SELECT COUNT(*) as count FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)', 
    [userId]
  );
  
  const { data: logStats, loading: logsLoading } = useData<{count: number}>(
    'SELECT COUNT(DISTINCT l.habit_id) as count FROM logs l JOIN habits h ON l.habit_id = h.id WHERE date(l.logged_at) = ? AND (h.user_id = ? OR h.user_id IS NULL)', 
    [today, userId]
  );

  const { data: sessionStats } = useData<{count: number}>(
    "SELECT SUM(completed_sessions) as count FROM tasks WHERE (user_id = ? OR user_id IS NULL) AND date(updated_at) = date('now')",
    [userId]
  );

  const { data: habits, loading: listLoading, refresh: refreshHabits } = useData<{id: string, title: string, is_done_today: number}>(
    `SELECT h.id, h.title, 
     (SELECT COUNT(*) FROM logs l WHERE l.habit_id = h.id AND date(l.logged_at) = date('now')) as is_done_today
     FROM habits h 
     WHERE h.is_active = 1 AND (h.user_id = ? OR h.user_id IS NULL) LIMIT 3`,
    [userId]
  );

  const { data: shortcuts, loading: shortcutsLoading, refresh: refreshShortcuts } = useData<{id: string, title: string, url: string, icon: string}>(
    'SELECT * FROM shortcuts WHERE user_id = ? OR user_id IS NULL',
    [userId]
  );

  const { data: identitySettings } = useData<{value: string}>(
    "SELECT value FROM settings WHERE key = 'identity_anchor'",
    []
  );

  const { data: latestTask } = useData<{title: string}>(
    "SELECT title FROM tasks WHERE (user_id = ? OR user_id IS NULL) AND status != 'done' ORDER BY updated_at DESC LIMIT 1",
    [userId]
  );

  const identityAnchor = identitySettings?.[0]?.value || 'The Disciplined Creator';
  const currentFocus = latestTask?.[0]?.title || 'Daily Discipline';

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshHabits();
      refreshShortcuts();
    }, [])
  );

  const handleToggleHabit = async (habitId: string, isDone: boolean) => {
    if (isDone) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await performMutation("logs", "INSERT", {
        id: Math.random().toString(36).substring(7),
        habit_id: habitId,
        status: "completed",
        logged_at: new Date().toISOString(),
      });
      refreshHabits();
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  };

  const activeHabits = habitStats?.[0]?.count || 0;
  const completedToday = logStats?.[0]?.count || 0;
  const sessionsDone = sessionStats?.[0]?.count || 0;
  const userName = user?.email ? user.email.split('@')[0] : 'Guest';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const isLoading = habitsLoading || logsLoading || listLoading || shortcutsLoading;

  const handleOpenLink = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', "Don't know how to open this URL: " + url);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while trying to open the link');
    }
  };

  const handleDeleteShortcut = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Shortcut",
      "Are you sure you want to remove this shortcut?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await performMutation('shortcuts', 'DELETE', { id });
              refreshShortcuts();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete shortcut');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuBtn} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/menu');
            }}
          >
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/Artboard 1 logo.png')} 
              style={[styles.logoImage, { tintColor: colors.primary }]} 
              resizeMode="contain" 
            />
          </View>

          <TouchableOpacity 
            style={styles.ghostBtn} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/modal');
            }}
          >
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.labelCaps}>DAILY OVERVIEW</Text>
            <Text style={styles.greetingText}>{greeting}, {userName}. Let's find your flow today.</Text>
          </View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={[styles.statCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/hh_habits');
                }}
              >
                <Text style={styles.statLabel}>Active Habits</Text>
                <Text style={styles.statValue}>{isLoading ? '...' : activeHabits}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, { borderLeftColor: colors.secondary, borderLeftWidth: 4 }]} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/calendar');
                }}
              >
                <Text style={styles.statLabel}>Done Today</Text>
                <Text style={styles.statValue}>{isLoading ? '...' : completedToday}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Current Focus Card */}
          <View style={styles.focusContainer}>
            <View style={styles.focusCard}>
              <View style={styles.focusHeader}>
                <View style={styles.focusIconBg}>
                  <Sparkles size={20} color={colors.onPrimary} />
                </View>
                <Text style={styles.focusBadge}>{identityAnchor.toUpperCase()}</Text>
              </View>
              <Text style={styles.focusTitle}>{currentFocus}</Text>
              <Text style={styles.focusDesc}>
                Refining your presence through focused intention and consistent action.
              </Text>
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/sprint');
                }}
              >
                <Text style={styles.primaryBtnText}>Resume Session</Text>
                <Play size={16} color={colors.primary} fill={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Focus Capacity Slider */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FOCUS CAPACITY</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${Math.min((sessionsDone / focusGoal) * 100, 100)}%`, backgroundColor: colors.primary }]} />
                <View style={[styles.sliderThumb, { left: `${Math.min((sessionsDone / focusGoal) * 100, 100)}%`, borderColor: colors.primary, backgroundColor: colors.surface }]} />
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLevel}>{sessionsDone} sessions done</Text>
                <Text style={styles.sliderLevel}>Goal: {focusGoal}</Text>
              </View>
            </View>
          </View>

          {/* Keystone Habits */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Daily Habits</Text>
              <View style={styles.rowAlign}>
                <TouchableOpacity 
                  style={{ marginRight: 16 }} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/add-habit');
                  }}
                >
                  <Plus size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/hh_habits');
                  }}
                >
                  <Text style={styles.sectionSubtitle}>View All</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : habits.length > 0 ? (
              <View style={styles.habitList}>
                {habits.map(habit => (
                  <HabitItem 
                    key={habit.id} 
                    title={habit.title} 
                    done={habit.is_done_today > 0} 
                    colors={colors} 
                    onToggle={() => handleToggleHabit(habit.id, habit.is_done_today > 0)}
                  />
                ))}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emptyStateCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/add-habit');
                }}
              >
                <Plus size={24} color={colors.primary} />
                <Text style={styles.emptyStateText}>Create your first habit to start tracking</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tools / Shortcuts */}
          <View style={styles.toolsContainer}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>ECOSYSTEM TOOLS</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/add-shortcut');
                }}
              >
                <Plus size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.toolsGrid}>
              {shortcuts.length > 0 ? (
                shortcuts.map(shortcut => (
                  <ToolCard 
                    key={shortcut.id}
                    icon={<Globe size={20} color={colors.primary} />} 
                    label={shortcut.title} 
                    colors={colors}
                    onPress={() => handleOpenLink(shortcut.url)}
                    onDelete={() => handleDeleteShortcut(shortcut.id)}
                  />
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateTextSmall}>No shortcuts added yet.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


function HabitItem({ title, done, colors, onToggle }: { title: string; done: boolean; colors: any; onToggle: () => void }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={stylesHabit.habitItem} onPress={onToggle}>
      <View style={[stylesHabit.checkbox, { borderColor: colors.primary }, done && { backgroundColor: colors.primary }]}>
        {done && <CheckCircle2 size={14} color={colors.onPrimary} />}
      </View>
      <Text style={[stylesHabit.habitText, { color: colors.onSurface }, done && { color: colors.onSurfaceVariant, textDecorationLine: 'line-through' }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const stylesHabit = StyleSheet.create({
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitText: {
    fontFamily: FONTS.body,
    fontSize: 16,
  },
});

function ToolCard({ icon, label, colors, onPress, onDelete }: { icon: React.ReactNode; label: string; colors: any; onPress?: () => void; onDelete?: () => void }) {
  return (
    <View style={stylesTool.container}>
      <TouchableOpacity 
        style={[stylesTool.toolCard, { backgroundColor: colors.surfaceVariant }]}
        onPress={onPress || (() => Alert.alert('External Tool', `Launching integrated ${label} dashboard.`))}
      >
        <View style={[stylesTool.iconContainer, { backgroundColor: colors.surface }]}>{icon}</View>
        <Text style={[stylesTool.toolLabel, { color: colors.onSurface }]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity style={[stylesTool.deleteBtn, { backgroundColor: colors.error + '1A' }]} onPress={onDelete}>
          <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const stylesTool = StyleSheet.create({
  container: {
    width: '47%',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  toolCard: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 6,
    borderRadius: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: ROUNDNESS.md,
  },
  toolLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

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
  greetingContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  labelCaps: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.primary,
    marginBottom: 4,
  },
  greetingText: {
    fontFamily: FONTS.headline,
    fontSize: 28,
    color: colors.onSurface,
    lineHeight: 34,
  },
  statsContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  statLabel: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontFamily: FONTS.headline,
    color: colors.onSurface,
  },
  focusContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  focusCard: {
    backgroundColor: colors.primary,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.xl,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  focusIconBg: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: ROUNDNESS.md,
  },
  focusBadge: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  focusTitle: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: colors.onPrimary,
    marginBottom: 8,
  },
  focusDesc: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: colors.onPrimary,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: colors.onPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: ROUNDNESS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: colors.primary,
    fontFamily: FONTS.labelSm,
    fontSize: 14,
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
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: colors.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.md,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderContainer: {
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 4,
    position: 'relative',
    marginBottom: 12,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  sliderThumb: {
    width: 20, height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -6,
    marginLeft: -10,
    borderWidth: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLevel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  habitList: {
    gap: 4,
  },
  toolsContainer: {
    padding: SPACING.lg,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyStateContainer: {
    width: '100%',
    padding: SPACING.lg,
    backgroundColor: colors.surfaceVariant + '4D',
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  emptyStateTextSmall: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  emptyStateCard: {    backgroundColor: colors.surface,
    padding: SPACING.xl,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  emptyStateText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
