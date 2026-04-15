import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Play, CheckCircle2, Plus, Activity, BarChart2, Mail, CreditCard } from 'lucide-react-native';
import { COLORS, SPACING, FONTS } from '@/src/constants/Theme';
import { useData } from '@/src/hooks/useData';

export default function DashboardScreen() {
  const { data: habitStats, loading: habitsLoading } = useData<{count: number}>('SELECT COUNT(*) as count FROM habits WHERE is_active = 1');
  const today = new Date().toISOString().split('T')[0];
  const { data: logStats, loading: logsLoading } = useData<{count: number}>('SELECT COUNT(DISTINCT habit_id) as count FROM logs WHERE date(logged_at) = ?', [today]);

  const activeHabits = habitStats?.[0]?.count || 0;
  const completedToday = logStats?.[0]?.count || 0;

  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = COLORS[colorScheme as keyof typeof COLORS];

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
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
                style={[styles.logoImage, { tintColor: themeColors.primary }]} 
                resizeMode="contain" 
              />
            </View>
            <TouchableOpacity style={styles.ghostBtn}>
              <Settings size={20} color={themeColors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Text style={styles.labelCaps}>SYSTEM_STATUS / ACTIVE</Text>
            <Text style={styles.greetingText}>ALEX_B / Welcome to the Archival Interface.</Text>
          </View>

          {/* Grid-based Catalog Layout - Edge to Edge */}
          <View style={styles.catalogGrid}>
            {/* Stats Card 1 */}
            <View style={[styles.catalogCard, styles.borderRight, styles.borderBottom]}>
              <Text style={styles.dataLabel}>ACTIVE_HABITS</Text>
              <Text style={styles.dataValue}>{habitsLoading ? '...' : activeHabits}</Text>
            </View>
            
            {/* Stats Card 2 */}
            <View style={[styles.catalogCard, styles.borderBottom]}>
              <Text style={styles.dataLabel}>COMPLETED_TODAY</Text>
              <Text style={styles.dataValue}>{logsLoading ? '...' : completedToday}</Text>
            </View>

            {/* Focus Card - Span 2 columns */}
            <View style={[styles.catalogCard, styles.spanFull, styles.borderBottom, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.dataLabel, { color: themeColors.onPrimary }]}>CURRENT_FOCUS</Text>
              <Text style={[styles.catalogHeadline, { color: themeColors.onPrimary }]}>Deep Work: Interface Refinement</Text>
              <Text style={[styles.catalogDesc, { color: themeColors.onPrimary + 'B3' }]}>
                Typography hierarchy and tonal layering transitions for mobile navigation.
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.starkBtn}>
                  <Text style={styles.starkBtnText}>RESUME_SESSION</Text>
                  <Play size={14} color={themeColors.primary} fill={themeColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Reading Progress */}
            <View style={[styles.catalogCard, styles.spanFull, styles.borderBottom]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.dataLabel}>READING_PROGRESS</Text>
                  <Text style={styles.catalogHeadlineSm}>Building a Second Brain</Text>
                </View>
                <Text style={styles.dataValueMd}>65%</Text>
              </View>
              <View style={styles.technicalBarBg}>
                <View style={[styles.technicalBarFill, { width: '65%', backgroundColor: themeColors.primary }]} />
              </View>
            </View>

            {/* Keystone Habits */}
            <View style={[styles.catalogCard, styles.spanFull]}>
              <Text style={styles.dataLabel}>KEYSTONE_HABITS / {completedToday} OF {activeHabits}</Text>
              <View style={styles.habitList}>
                <HabitItem title="Morning Meditation" done={completedToday > 0} themeColors={themeColors} />
                <HabitItem title="Deep Work Session" done={completedToday > 1} themeColors={themeColors} />
                <HabitItem title="20min Evening Walk" done={false} themeColors={themeColors} />
              </View>
            </View>
          </View>

          {/* Management Deck */}
          <View style={styles.managementContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MANAGEMENT_DECK</Text>
            </View>
            <View style={styles.managementGrid}>
              <ToolCard icon={<Activity size={18} color={themeColors.primary} />} label="GOOGLE_ADS" themeColors={themeColors} />
              <ToolCard icon={<BarChart2 size={18} color={themeColors.primary} />} label="FACEBOOK" themeColors={themeColors} />
              <ToolCard icon={<Activity size={18} color={themeColors.primary} />} label="ANALYTICS" themeColors={themeColors} />
              <ToolCard icon={<Mail size={18} color={themeColors.primary} />} label="INBOX" themeColors={themeColors} />
              <ToolCard icon={<CreditCard size={18} color={themeColors.primary} />} label="FINANCE" themeColors={themeColors} />
              <ToolCard icon={<Plus size={18} color={themeColors.primary} />} label="ADD_TOOL" themeColors={themeColors} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HabitItem({ title, done, themeColors }: { title: string; done: boolean; themeColors: any }) {
  return (
    <View style={stylesHabit.habitItem}>
      <View style={[stylesHabit.checkbox, { borderColor: themeColors.primary }, done && { backgroundColor: themeColors.primary }]}>
        {done && <CheckCircle2 size={14} color={themeColors.onPrimary} />}
      </View>
      <Text style={[stylesHabit.habitText, { color: themeColors.primary }, done && { color: themeColors.outline, textDecorationLine: 'line-through' }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const stylesHabit = StyleSheet.create({
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitText: {
    fontFamily: FONTS.label,
    fontSize: 13,
  },
});

function ToolCard({ icon, label, themeColors }: { icon: React.ReactNode; label: string; themeColors: any }) {
  return (
    <TouchableOpacity style={[stylesTool.toolCard, { borderColor: themeColors.outline + '1A' }]}>
      {icon}
      <Text style={[stylesTool.toolLabel, { color: themeColors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const stylesTool = StyleSheet.create({
  toolCard: {
    width: '33.33%',
    padding: SPACING.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
  },
  toolLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

const createStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.outline + '26',
    backgroundColor: themeColors.background,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: themeColors.primaryContainer,
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
  ghostBtn: {
    padding: 4,
  },
  greetingContainer: {
    padding: SPACING.lg,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.outline + '26',
  },
  labelCaps: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    color: themeColors.outline,
  },
  greetingText: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    marginTop: SPACING.xs,
    color: themeColors.primary,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: themeColors.background,
  },
  catalogCard: {
    padding: SPACING.lg,
    width: '50%',
  },
  spanFull: {
    width: '100%',
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: themeColors.outline + '26',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: themeColors.outline + '26',
  },
  dataLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: themeColors.outline,
    marginBottom: SPACING.xs,
  },
  dataValue: {
    fontSize: 36,
    fontFamily: FONTS.labelSm,
    color: themeColors.primary,
  },
  dataValueMd: {
    fontSize: 24,
    fontFamily: FONTS.labelSm,
    color: themeColors.primary,
  },
  catalogHeadline: {
    fontFamily: FONTS.headline,
    fontSize: 28,
    lineHeight: 32,
    marginBottom: SPACING.sm,
  },
  catalogHeadlineSm: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    color: themeColors.primary,
  },
  catalogDesc: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  actionRow: {
    flexDirection: 'row',
  },
  starkBtn: {
    backgroundColor: themeColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starkBtnText: {
    color: themeColors.primary,
    fontFamily: FONTS.labelSm,
    fontSize: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  technicalBarBg: {
    height: 4,
    backgroundColor: themeColors.outline + '1A',
  },
  technicalBarFill: {
    height: '100%',
  },
  habitList: {
    marginTop: SPACING.md,
    gap: 12,
  },
  managementContainer: {
    backgroundColor: themeColors.surface,
    flex: 1,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: themeColors.outline,
    letterSpacing: 2,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 0,
    borderTopWidth: 1,
    borderTopColor: themeColors.outline + '26',
  },
});
