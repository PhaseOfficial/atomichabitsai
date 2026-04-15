import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { Settings, Play, CheckCircle2, Circle, Plus, Activity, BarChart2, Mail, CreditCard } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '@/src/constants/Theme';
import { useData } from '@/src/hooks/useData';

export default function DashboardScreen() {
  const { data: habitStats, loading: habitsLoading } = useData<{count: number}>('SELECT COUNT(*) as count FROM habits WHERE is_active = 1');
  const today = new Date().toISOString().split('T')[0];
  const { data: logStats, loading: logsLoading } = useData<{count: number}>('SELECT COUNT(DISTINCT habit_id) as count FROM logs WHERE date(logged_at) = ?', [today]);

  const activeHabits = habitStats?.[0]?.count || 0;
  const completedToday = logStats?.[0]?.count || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>RB</Text>
            </View>
            <Text style={styles.logo}>RCS BATSIRAI</Text>
          </View>
          <TouchableOpacity style={styles.ghostBtn}>
            <Settings size={20} color={COLORS.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.labelCaps}>SYSTEM_STATUS / ACTIVE</Text>
          <Text style={styles.greetingText}>ALEX_B / Welcome to the Archival Interface.</Text>
        </View>

        {/* Grid-based Catalog Layout */}
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
          <View style={[styles.catalogCard, styles.spanFull, styles.borderBottom, { backgroundColor: COLORS.primary }]}>
            <Text style={[styles.dataLabel, { color: '#fff' }]}>CURRENT_FOCUS</Text>
            <Text style={[styles.catalogHeadline, { color: '#fff' }]}>Deep Work: Interface Refinement</Text>
            <Text style={styles.catalogDesc}>
              Typography hierarchy and tonal layering transitions for mobile navigation.
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.starkBtn}>
                <Text style={styles.starkBtnText}>RESUME_SESSION</Text>
                <Play size={14} color={COLORS.primary} fill={COLORS.primary} />
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
              <View style={[styles.technicalBarFill, { width: '65%' }]} />
            </View>
          </View>

          {/* Keystone Habits */}
          <View style={[styles.catalogCard, styles.spanFull]}>
            <Text style={styles.dataLabel}>KEYSTONE_HABITS / {completedToday} OF {activeHabits}</Text>
            <View style={styles.habitList}>
              <HabitItem title="Morning Meditation" done={completedToday > 0} />
              <HabitItem title="Deep Work Session" done={completedToday > 1} />
              <HabitItem title="20min Evening Walk" done={false} />
            </View>
          </View>
        </View>

        {/* Management Deck */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MANAGEMENT_DECK</Text>
        </View>
        <View style={styles.managementGrid}>
          <ToolCard icon={<Activity size={18} color={COLORS.primary} />} label="GOOGLE_ADS" />
          <ToolCard icon={<BarChart2 size={18} color={COLORS.primary} />} label="FACEBOOK" />
          <ToolCard icon={<Activity size={18} color={COLORS.primary} />} label="ANALYTICS" />
          <ToolCard icon={<Mail size={18} color={COLORS.primary} />} label="INBOX" />
          <ToolCard icon={<CreditCard size={18} color={COLORS.primary} />} label="FINANCE" />
          <ToolCard icon={<Plus size={18} color={COLORS.primary} />} label="ADD_TOOL" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HabitItem({ title, done }: { title: string; done: boolean }) {
  return (
    <View style={styles.habitItem}>
      <View style={[styles.checkbox, done && styles.checkboxChecked]}>
        {done && <CheckCircle2 size={14} color="#fff" />}
      </View>
      <Text style={[styles.habitText, done && styles.habitTextDone]}>{title.toUpperCase()}</Text>
    </View>
  );
}

function ToolCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <TouchableOpacity style={styles.toolCard}>
      {icon}
      <Text style={styles.toolLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.15)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontFamily: FONTS.label,
    fontSize: 12,
  },
  logo: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  ghostBtn: {
    padding: 4,
  },
  greetingContainer: {
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  labelCaps: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.outline,
  },
  greetingText: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    marginTop: SPACING.xs,
    color: COLORS.primary,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 119, 119, 0.15)',
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
    borderRightColor: 'rgba(119, 119, 119, 0.15)',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.15)',
  },
  dataLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
  },
  dataValue: {
    fontSize: 36,
    fontFamily: FONTS.labelSm,
    color: COLORS.primary,
  },
  dataValueMd: {
    fontSize: 24,
    fontFamily: FONTS.labelSm,
    color: COLORS.primary,
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
    color: COLORS.primary,
  },
  catalogDesc: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  actionRow: {
    flexDirection: 'row',
  },
  starkBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starkBtnText: {
    color: COLORS.primary,
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
    backgroundColor: 'rgba(119, 119, 119, 0.1)',
  },
  technicalBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  habitList: {
    marginTop: SPACING.md,
    gap: 12,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  habitText: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: COLORS.primary,
  },
  habitTextDone: {
    color: COLORS.outline,
    textDecorationLine: 'line-through',
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: COLORS.outline,
    letterSpacing: 2,
  },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.lg / 2,
  },
  toolCard: {
    width: '33.33%',
    padding: SPACING.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(119, 119, 119, 0.1)',
  },
  toolLabel: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});