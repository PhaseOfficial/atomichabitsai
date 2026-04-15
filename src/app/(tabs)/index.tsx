import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Play, CheckCircle2, Activity, BarChart2, Mail, CreditCard, Sparkles, Plus, Globe, Trash2 } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useData } from '@/src/hooks/useData';
import { useTheme } from '@/src/hooks/useTheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { performMutation } from '@/src/lib/sync';

export default function DashboardScreen() {
  const { colors } = useTheme();
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

  const { data: habits, loading: listLoading, refresh: refreshHabits } = useData<{id: string, title: string}>(
    'SELECT id, title FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL) LIMIT 3',
    [userId]
  );

  const { data: shortcuts, loading: shortcutsLoading, refresh: refreshShortcuts } = useData<{id: string, title: string, url: string, icon: string}>(
    'SELECT * FROM shortcuts WHERE user_id = ? OR user_id IS NULL',
    [userId]
  );

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshHabits();
      refreshShortcuts();
    }, [])
  );

  const activeHabits = habitStats?.[0]?.count || 0;
  const completedToday = logStats?.[0]?.count || 0;
  const userName = user?.email ? user.email.split('@')[0] : 'Guest';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const isLoading = habitsLoading || logsLoading || listLoading || shortcutsLoading;

  const handleOpenLink = async (url: string) => {
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarPlaceholder}>
                <Image 
                  source={require('@/assets/images/icon.png')} 
                  style={styles.avatarLogo} 
                  resizeMode="contain"
                />
              </View>
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
                onPress={() => router.push('/hh_habits')}
              >
                <Text style={styles.statLabel}>Active Habits</Text>
                <Text style={styles.statValue}>{isLoading ? '...' : activeHabits}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statCard, { borderLeftColor: colors.secondary, borderLeftWidth: 4 }]} 
                onPress={() => router.push('/calendar')}
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
                <Text style={styles.focusBadge}>CURRENT FOCUS</Text>
              </View>
              <Text style={styles.focusTitle}>Deep Work: Design Refinement</Text>
              <Text style={styles.focusDesc}>
                Refining the tonal layering and typography hierarchy for a more serene experience.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/sprint')}>
                <Text style={styles.primaryBtnText}>Resume Session</Text>
                <Play size={16} color={colors.primary} fill={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Keystone Habits */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Daily Rituals</Text>
              <TouchableOpacity onPress={() => router.push('/hh_habits')}>
                <Text style={styles.sectionSubtitle}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : habits.length > 0 ? (
              <View style={styles.habitList}>
                {habits.map(habit => (
                  <HabitItem key={habit.id} title={habit.title} done={false} colors={colors} />
                ))}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emptyStateCard}
                onPress={() => router.push('/hh_habits')}
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
              <TouchableOpacity onPress={() => router.push('/add-shortcut')}>
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
                <>
                  <ToolCard icon={<Activity size={20} color={colors.primary} />} label="Analytics" colors={colors} />
                  <ToolCard icon={<BarChart2 size={20} color={colors.primary} />} label="Performance" colors={colors} />
                  <ToolCard icon={<Mail size={20} color={colors.primary} />} label="Inbox" colors={colors} />
                  <ToolCard icon={<CreditCard size={20} color={colors.primary} />} label="Finance" colors={colors} />
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HabitItem({ title, done, colors }: { title: string; done: boolean; colors: any }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={stylesHabit.habitItem} onPress={() => router.push('/hh_habits')}>
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
    padding: SPACING.lg,
    backgroundColor: colors.background,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: ROUNDNESS.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: {
    width: 24,
    height: 24,
  },
  logoImage: {
    height: 32,
    width: 120,
  },
  ghostBtn: {
    padding: 4,
  },
  greetingContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
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
    width: 20,
    height: 20,
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
    marginTop: 10,
  },
  emptyStateText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
