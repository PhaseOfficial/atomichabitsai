import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Play, Pause, SkipForward, SkipBack, Timer, CheckSquare, Square, Zap } from 'lucide-react-native';
import { COLORS, SPACING, FONTS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';

export default function SprintScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(1499); // 24:59

  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity style={styles.ghostBtn}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Sprint Timer Section */}
        <View style={styles.timerSection}>
          <Text style={styles.labelCaps}>CURRENT_SPRINT / ACTIVE</Text>
          <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>
          
          <View style={styles.timerControls}>
            <TouchableOpacity style={styles.controlBtn}>
              <SkipBack size={24} color={colors.primary} strokeWidth={1.5} />
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

            <TouchableOpacity style={styles.controlBtn}>
              <SkipForward size={24} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Progress */}
        <View style={styles.progressSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.dataLabel}>DAILY_SPRINT_GOAL</Text>
            <Text style={styles.dataValueSmall}>3 / 8</Text>
          </View>
          <View style={styles.technicalBarBg}>
            <View style={[styles.technicalBarFill, { width: '37.5%', backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Sprint Strategy */}
        <View style={styles.strategyGrid}>
          <View style={[styles.strategyCard, styles.borderRight, styles.borderBottom]}>
            <Text style={styles.dataLabel}>WORK_INTERVAL</Text>
            <Text style={styles.dataValueMd}>25:00</Text>
          </View>
          <View style={[styles.strategyCard, styles.borderBottom]}>
            <Text style={styles.dataLabel}>BREAK_INTERVAL</Text>
            <Text style={styles.dataValueMd}>05:00</Text>
          </View>
        </View>

        {/* Task Queue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SPRINT_TASK_QUEUE</Text>
        </View>
        <View style={styles.taskQueue}>
          <View style={[styles.activeTask, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
            <View style={styles.taskHeader}>
              <Zap size={14} color={colors.primary} />
              <Text style={[styles.activeLabel, { color: colors.primary }]}>CURRENTLY_PROCESSING</Text>
            </View>
            <Text style={[styles.activeTaskTitle, { color: colors.primary }]}>Interface Refinement: Tonal Layering</Text>
            <Text style={styles.taskSubtitle}>ESTIMATED_REMAINING: 12:40</Text>
          </View>

          <View style={[styles.taskItem, { borderColor: colors.outline + '1A', backgroundColor: colors.surface }]}>
            <View style={[styles.checkbox, { borderColor: colors.outlineVariant }]} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.taskTitle, { color: colors.primary }]}>TYPOGRAPHY_HIERARCHY_AUDIT</Text>
              <View style={[styles.tagContainer, { backgroundColor: colors.outline + '1A' }]}>
                <Text style={styles.tagText}>HIGH_PRIORITY</Text>
              </View>
            </View>
            <Text style={[styles.taskStatusLabel, { color: colors.primary }]}>QUEUED</Text>
          </View>

          <View style={[styles.taskItem, { borderColor: colors.outline + '1A', backgroundColor: colors.surface }]}>
            <View style={[styles.checkbox, { borderColor: colors.outlineVariant }]} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.taskTitle, { color: colors.primary }]}>REFACTOR_NAVIGATION_SHELL</Text>
              <View style={[styles.tagContainer, { backgroundColor: colors.outline + '1A' }]}>
                <Text style={styles.tagText}>TECHNICAL_DEBT</Text>
              </View>
            </View>
            <Text style={[styles.taskStatusLabel, { color: colors.primary }]}>QUEUED</Text>
          </View>
        </View>

        {/* Deep Work Insight */}
        <View style={[styles.insightCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.labelCapsLight}>DEEP_WORK_INSIGHT</Text>
          <Text style={[styles.insightQuote, { color: colors.onPrimary }]}>
            {"\""}The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.{"\""}
          </Text>
          <View style={styles.insightFooter}>
            <Zap size={14} color={colors.onPrimary} />
            <Text style={[styles.insightStrategy, { color: colors.onPrimary + 'B3' }]}>STRATEGY: Monastic focus protocol engaged.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  ghostBtn: {
    padding: 4,
  },
  timerSection: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
  },
  labelCaps: {
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.outline,
    marginBottom: SPACING.lg,
  },
  timerDisplay: {
    fontSize: 84,
    fontFamily: FONTS.labelSm,
    color: colors.primary,
    letterSpacing: -2,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxl,
    marginTop: SPACING.xl,
  },
  controlBtn: {
    padding: 10,
  },
  playBtn: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
    backgroundColor: colors.background,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  dataLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.outline,
  },
  dataValueSmall: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: colors.primary,
  },
  technicalBarBg: {
    height: 4,
    backgroundColor: colors.outline + '1A',
  },
  technicalBarFill: {
    height: '100%',
  },
  strategyGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
    backgroundColor: colors.surface,
  },
  strategyCard: {
    padding: SPACING.lg,
    flex: 1,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.outline + '26',
  },
  borderBottom: {
    borderBottomWidth: 0,
  },
  dataValueMd: {
    fontSize: 24,
    fontFamily: FONTS.labelSm,
    color: colors.primary,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 2,
  },
  taskQueue: {
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  activeTask: {
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: 4,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activeLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    letterSpacing: 1,
  },
  activeTaskTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    marginBottom: 4,
  },
  taskSubtitle: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.outline,
    marginTop: 2,
  },
  taskStatusLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
  },
  taskTitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  tagContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  tagText: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  insightCard: {
    margin: SPACING.lg,
    padding: SPACING.xl,
  },
  labelCapsLight: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: SPACING.sm,
  },
  insightQuote: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    lineHeight: 24,
  },
  insightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  insightStrategy: {
    fontFamily: FONTS.label,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
