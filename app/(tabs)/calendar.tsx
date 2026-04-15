import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Settings, Plus, Heart, Sun, MoreHorizontal, Utensils, Footprints } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '../../src/constants/Theme';
import { useData } from '../../src/hooks/useData';
import { performMutation } from '../../src/lib/sync';

const { width } = Dimensions.get('window');

const TIME_MARKERS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

interface TimeBlock {
  start: string;
  end: string;
  task: string;
  type?: 'sleep' | 'routine' | 'deep-work' | 'lunch' | 'meeting' | 'walk';
  description?: string;
}

interface Schedule {
  id: string;
  date: string;
  time_blocks: string; 
}

export default function CalendarScreen() {
  const today = new Date().toISOString().split('T')[0];
  const { data: schedules, loading, error, refresh } = useData<Schedule>('SELECT * FROM schedules WHERE date = ?', [today]);

  const timeBlocks = useMemo(() => {
    if (schedules && schedules.length > 0) {
      try {
        return JSON.parse(schedules[0].time_blocks) as TimeBlock[];
      } catch (e) {
        console.error('Failed to parse time blocks:', e);
        return [];
      }
    }
    return [];
  }, [schedules]);

  const handleUpdateTimeBlock = async () => {
    if (!schedules || schedules.length === 0) {
      try {
        await performMutation('schedules', 'INSERT', {
          id: Math.random().toString(36).substring(7),
          user_id: 'user-123',
          date: today,
          time_blocks: JSON.stringify([{ start: '09:00', end: '10:30', task: 'New Task', type: 'routine' }])
        });
        refresh();
      } catch (err) {
        console.error('Failed to create schedule:', err);
      }
    } else {
      const updatedBlocks = [...timeBlocks, { start: '16:00', end: '17:00', task: 'Added Task', type: 'walk' }];
      try {
        await performMutation('schedules', 'UPDATE', {
          id: schedules[0].id,
          time_blocks: JSON.stringify(updatedBlocks)
        });
        refresh();
      } catch (err) {
        console.error('Failed to update schedule:', err);
      }
    }
  };

  const getTimeOffset = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const startHour = 8;
    return (hours - startHour) * 80 + (minutes / 60) * 80;
  };

  const getBlockHeight = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const durationInMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return (durationInMinutes / 60) * 80;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Top Navigation Bar */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>RB</Text>
            </View>
            <Text style={styles.logoText}>RCS BATSIRAI</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Settings size={20} color={COLORS.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Date Header */}
        <View style={styles.dateHeader}>
          <View>
            <Text style={styles.dayLabel}>SCHEDULE_LOG / {new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</Text>
            <Text style={styles.dateLabel}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={styles.toggleButtonActive}>
              <Text style={styles.toggleTextActive}>DAY_VIEW</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleButton}>
              <Text style={styles.toggleText}>WEEK_VIEW</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline Grid */}
        <View style={styles.timelineContainer}>
          {/* Time Markers */}
          <View style={styles.timeMarkers}>
            {TIME_MARKERS.map((time, index) => (
              <View key={index} style={styles.timeMarkerRow}>
                <Text style={styles.timeText}>{time}</Text>
              </View>
            ))}
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {/* Grid Horizontal Lines */}
            <View style={styles.gridLines}>
              {TIME_MARKERS.map((_, index) => (
                <View key={index} style={styles.gridLine} />
              ))}
            </View>

            {/* Dynamic Task Blocks */}
            {timeBlocks.map((block, index) => {
              const top = getTimeOffset(block.start);
              const height = getBlockHeight(block.start, block.end);
              
              let blockStyle = styles.defaultBlock;
              if (block.type === 'deep-work') blockStyle = styles.deepWorkBlock;
              if (block.type === 'sleep' || block.type === 'walk') blockStyle = styles.priorityBlock;

              return (
                <View key={index} style={[styles.taskBlock, blockStyle, { top, height }]}>
                  <View style={styles.taskHeader}>
                    <View>
                      <Text style={styles.dataLabel}>BLOCK_ID: {index.toString().padStart(2, '0')}</Text>
                      <Text style={[styles.taskTitle, block.type === 'deep-work' && { color: '#fff' }]}>{block.task.toUpperCase()}</Text>
                      {block.description && <Text style={[styles.taskDesc, block.type === 'deep-work' && { color: 'rgba(255,255,255,0.7)' }]}>{block.description}</Text>}
                    </View>
                  </View>
                  <View style={styles.blockFooter}>
                    <Text style={[styles.taskTime, block.type === 'deep-work' && { color: 'rgba(255,255,255,0.8)' }]}>{block.start} > {block.end}</Text>
                    {block.type === 'deep-work' && <Text style={styles.statusBadge}>ACTIVE_REINFORCEMENT</Text>}
                  </View>
                </View>
              );
            })}

            {timeBlocks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>NULL_SCHEDULE_DATA</Text>
              </View>
            )}

            {/* Current Time Indicator */}
            <View style={[styles.currentTimeIndicator, { top: getTimeOffset(new Date().toTimeString().slice(0, 5)) }]}>
              <View style={styles.indicatorLine} />
              <View style={styles.indicatorLabel}>
                <Text style={styles.indicatorText}>REAL_TIME</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleUpdateTimeBlock}>
        <Plus size={24} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 150,
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
  logoText: {
    fontSize: 14,
    fontFamily: FONTS.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  iconButton: {
    padding: 4,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },
  dayLabel: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.outline,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  dateLabel: {
    fontFamily: FONTS.headline,
    fontSize: 48,
    color: COLORS.primary,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleButtonActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.outline,
  },
  toggleTextActive: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: '#fff',
  },
  timelineContainer: {
    flexDirection: 'row',
    paddingRight: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 119, 119, 0.15)',
  },
  timeMarkers: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: 'rgba(119, 119, 119, 0.15)',
  },
  timeMarkerRow: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  timeText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.outline,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    minHeight: 1040,
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.05)',
  },
  taskBlock: {
    position: 'absolute',
    left: 8,
    right: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'space-between',
  },
  dataLabel: {
    fontFamily: FONTS.label,
    fontSize: 7,
    letterSpacing: 1,
    color: COLORS.outline,
    marginBottom: 2,
  },
  taskTitle: {
    fontFamily: FONTS.labelSm,
    fontSize: 14,
    color: COLORS.primary,
  },
  taskDesc: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.outline,
    marginTop: 2,
  },
  defaultBlock: {
    backgroundColor: '#fff',
  },
  deepWorkBlock: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priorityBlock: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.tertiary,
  },
  blockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTime: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: COLORS.outline,
  },
  statusBadge: {
    fontFamily: FONTS.label,
    fontSize: 7,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.tertiary,
  },
  indicatorLabel: {
    backgroundColor: COLORS.tertiary,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  indicatorText: {
    color: '#fff',
    fontFamily: FONTS.label,
    fontSize: 7,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.outline,
    fontFamily: FONTS.label,
    fontSize: 10,
    letterSpacing: 2,
  },
});