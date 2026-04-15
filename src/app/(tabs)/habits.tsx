import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Settings, Sparkles, CheckCircle2, PlusCircle, CheckCircle, CheckCheck, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '@/src/constants/Theme';
import { useData } from '@/src/hooks/useData';
import { performMutation } from '@/src/lib/sync';
import { useTheme } from '@/src/hooks/useTheme';

const { width } = Dimensions.get('window');

interface Habit {
  id: string;
  title: string;
  frequency: string;
  is_active: number; 
}

export default function HabitsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: habits, loading, error, refresh } = useData<Habit>('SELECT * FROM habits WHERE is_active = 1');
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  const handleToggleHabit = async (habitId: string) => {
    try {
      await performMutation('logs', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        habit_id: habitId,
        status: 'completed',
        logged_at: new Date().toISOString(),
      });
      refresh();
    } catch (err) {
      console.error('Failed to log habit:', err);
    }
  };

  const handleAddHabit = async () => {
    const title = 'New Habit ' + Math.floor(Math.random() * 1000);
    try {
      await performMutation('habits', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        user_id: 'user-123',
        title,
        frequency: 'daily',
        is_active: 1,
      });
      refresh();
    } catch (err) {
      console.error('Failed to add habit:', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>DATABASE_ERROR: {error.message}</Text>
        <TouchableOpacity onPress={refresh} style={styles.starkBtn}>
          <Text style={styles.starkBtnText}>RETRY_SYNC</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Navigation Bar */}
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
        <TouchableOpacity style={styles.iconButton}>
          <Settings size={20} color={colors.primary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Identity Header */}
      <View style={styles.identityHeader}>
        <Text style={styles.label}>ARCHIVAL_FOUNDATION</Text>
        <Text style={styles.headline}>Identity Construction</Text>
        <Text style={styles.subheadline}>Systemic growth through identity-based reinforcement protocols.</Text>
        
        <View style={styles.focusCard}>
          <View style={styles.focusIconContainer}>
            <Sparkles size={20} color={colors.onPrimary} />
          </View>
          <View>
            <Text style={[styles.focusLabel, { color: colors.onPrimary + '99' }]}>CURRENT_IDENTITY_PROTOCOL</Text>
            <Text style={[styles.focusValue, { color: colors.onPrimary }]}>The Disciplined Reader</Text>
          </View>
        </View>
      </View>

      {/* Identity Cards (Archive Brut Style) */}
      <View style={styles.bentoGrid}>
        <View style={styles.primaryIdentityCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>CORE_IDENTITY</Text>
          </View>
          <Text style={styles.identityQuote}>{"\""}I prioritize deep knowledge over superficial distraction.{"\""}</Text>
          <View style={styles.identityFooter}>
            <Text style={styles.identityFooterText}>STREAK_STABILITY: 12_DAYS</Text>
          </View>
        </View>

        <View style={styles.secondaryIdentityCard}>
          <View>
            <Text style={styles.cardTitle}>PHYSICAL_RESTORATION</Text>
            <Text style={styles.cardQuote}>{"\""}I treat my body with technical precision.{"\""}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.technicalRhythm}>
              <View style={[styles.rhythmBit, styles.rhythmBitActive]} />
              <View style={[styles.rhythmBit, styles.rhythmBitActive]} />
              <View style={[styles.rhythmBit, styles.rhythmBitActive]} />
              <View style={styles.rhythmBit} />
              <View style={styles.rhythmBit} />
            </View>
            <Text style={styles.activeStatus}>STATUS_ACTIVE</Text>
          </View>
        </View>
      </View>

      {/* Burnout Alert Section - Archival Red */}
      <View style={[styles.alertCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.alertIconContainer, { borderColor: colors.onPrimary + '4D' }]}>
          <AlertTriangle size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: colors.onPrimary }]}>ALERT / BURNOUT_DETECTION</Text>
          <Text style={[styles.alertDescription, { color: colors.onPrimary + 'CC' }]}>Protocol deviation detected. 4 missed cycles in 24h window.</Text>
        </View>
        <TouchableOpacity style={[styles.redStarkBtn, { backgroundColor: colors.onPrimary }]}>
          <Text style={[styles.redStarkBtnText, { color: colors.primary }]}>INITIATE_RECOVERY</Text>
        </TouchableOpacity>
      </View>

      {/* Keystone Habits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Habit Inventory</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddHabit}>
            <PlusCircle size={16} color={colors.primary} />
            <Text style={styles.addButtonText}>ADD_ENTRY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.habitList}>
          {habits.map((habit) => (
            <View key={habit.id} style={styles.habitItem}>
              <TouchableOpacity style={[styles.habitCheck, habit.is_active === 0 && { backgroundColor: colors.primary }]} onPress={() => handleToggleHabit(habit.id)}>
                <View style={styles.innerCheck} />
              </TouchableOpacity>
              <View style={styles.habitContent}>
                <View style={styles.habitTitleRow}>
                  <Text style={styles.habitName}>{habit.title.toUpperCase()}</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{habit.frequency.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.habitQuote}>PROTOCOL: CONSISTENCY_REINFORCEMENT</Text>
              </View>
              <View style={styles.streakContainer}>
                <Text style={styles.streakLabel}>STREAK</Text>
                <Text style={styles.streakValue}>--</Text>
              </View>
            </View>
          ))}
          {habits.length === 0 && (
            <Text style={styles.emptyText}>EMPTY_REGISTRY: Add habits to begin.</Text>
          )}
        </View>
      </View>

      {/* Weekly Rhythm */}
      <View style={styles.rhythmCard}>
        <Text style={styles.cardTitle}>ARCHIVAL_RHYTHM</Text>
        <View style={styles.chart}>
          {[
            { day: 'M', h: '60%' },
            { day: 'T', h: '85%' },
            { day: 'W', h: '100%', active: true },
            { day: 'T', h: '20%' },
            { day: 'F', h: '15%' },
            { day: 'S', h: '10%' },
            { day: 'S', h: '5%' },
          ].map((item, index) => (
            <View key={index} style={styles.chartCol}>
              <View style={[styles.chartBar, { height: item.h, backgroundColor: item.active ? colors.primary : colors.outline + '1A' }]} />
              <Text style={[styles.chartDay, item.active && styles.chartDayActive]}>{item.day}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>COMPLETION_RATE</Text>
            <Text style={styles.progressValue}>78%</Text>
          </View>
          <View style={styles.technicalBarBg}>
            <View style={[styles.technicalBarFill, { width: '78%' }]} />
          </View>
        </View>

        <Text style={styles.rhythmFooter}>NOTE: Automating behaviors reduces cognitive overhead. T-14 days to habit crystallization.</Text>
        <TouchableOpacity style={styles.ghostFullBtn}>
          <Text style={styles.ghostFullBtnText}>ACCESS_DEEP_ANALYTICS</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
  identityHeader: {
    padding: SPACING.lg,
    backgroundColor: colors.surface,
  },
  label: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  headline: {
    fontFamily: FONTS.headline,
    fontSize: 36,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  subheadline: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.outline,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  focusIconContainer: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    letterSpacing: 1,
  },
  focusValue: {
    fontFamily: FONTS.headline,
    fontSize: 16,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.outline + '26',
  },
  primaryIdentityCard: {
    backgroundColor: colors.primary,
    padding: SPACING.lg,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.onPrimary + '1A',
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.onPrimary + '4D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 8,
    fontFamily: FONTS.label,
    letterSpacing: 1.5,
  },
  identityQuote: {
    color: colors.onPrimary,
    fontSize: 28,
    fontFamily: FONTS.headline,
    lineHeight: 34,
  },
  identityFooter: {
    marginTop: SPACING.lg,
  },
  identityFooterText: {
    color: colors.onPrimary + '80',
    fontSize: 9,
    fontFamily: FONTS.label,
    letterSpacing: 1,
  },
  secondaryIdentityCard: {
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
  },
  cardTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.outline,
    marginBottom: SPACING.xs,
  },
  cardQuote: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  technicalRhythm: {
    flexDirection: 'row',
    gap: 4,
  },
  rhythmBit: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.outline + '1A',
  },
  rhythmBitActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activeStatus: {
    color: colors.primary,
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1,
  },
  alertCard: {
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    letterSpacing: 1,
  },
  alertDescription: {
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  redStarkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redStarkBtnText: {
    fontSize: 9,
    fontFamily: FONTS.labelSm,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 28,
    color: colors.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: colors.primary,
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  habitList: {
    gap: 1,
    backgroundColor: colors.outline + '26',
  },
  habitItem: {
    backgroundColor: colors.surface,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  habitCheck: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 3,
  },
  innerCheck: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  habitContent: {
    flex: 1,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  habitName: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: colors.primary,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.outline + '1A',
    paddingHorizontal: 4,
  },
  tagText: {
    fontSize: 7,
    fontFamily: FONTS.label,
    color: colors.outline,
  },
  habitQuote: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  streakContainer: {
    alignItems: 'flex-end',
  },
  streakLabel: {
    fontFamily: FONTS.label,
    fontSize: 7,
    color: colors.outline,
    letterSpacing: 1,
  },
  streakValue: {
    fontFamily: FONTS.labelSm,
    fontSize: 18,
    color: colors.primary,
  },
  rhythmCard: {
    margin: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.outline + '26',
    padding: SPACING.lg,
  },
  chart: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginVertical: SPACING.lg,
    gap: 8,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBar: {
    width: '100%',
  },
  chartDay: {
    fontSize: 9,
    fontFamily: FONTS.label,
    color: colors.outline,
  },
  chartDayActive: {
    color: colors.primary,
    fontFamily: FONTS.labelSm,
  },
  progressSection: {
    marginTop: SPACING.md,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: FONTS.label,
    letterSpacing: 1,
    color: colors.outline,
  },
  progressValue: {
    fontSize: 10,
    fontFamily: FONTS.labelSm,
    color: colors.primary,
  },
  technicalBarBg: {
    height: 4,
    backgroundColor: colors.outline + '0D',
  },
  technicalBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  rhythmFooter: {
    marginTop: SPACING.lg,
    fontSize: 10,
    fontFamily: FONTS.body,
    color: colors.outline,
    fontStyle: 'italic',
    lineHeight: 16,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline + '0D',
  },
  ghostFullBtn: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 10,
    alignItems: 'center',
  },
  ghostFullBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontFamily: FONTS.label,
    marginBottom: SPACING.md,
  },
  starkBtn: {
    padding: 12,
    backgroundColor: colors.primary,
  },
  starkBtnText: {
    color: colors.onPrimary,
    fontFamily: FONTS.labelSm,
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.outline,
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    backgroundColor: colors.surface,
  },
});
