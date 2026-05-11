import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform, FlatList } from 'react-native';
import { FONTS, SPACING, ROUNDNESS } from '@/src/constants/Theme';
import { getLocalDateString } from '@/src/lib/date-utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  colors: any;
}

export const CalendarStrip: React.FC<CalendarStripProps> = ({ selectedDate, onDateSelect, colors }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Constants for scroll calculation
  const ITEM_WIDTH = 55;
  const GAP = 12;

  // Scroll to selected date on mount and when selectedDate changes
  useEffect(() => {
    // We want the selected item (index 7 in our 15-day range) to be centered
    // Since we generate days centered around selectedDate, it's always at index 7
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        // Approximate centering logic
        // Each item + gap is ~67px. 7 items before = 469px.
        // We want to scroll so the 8th item is in the middle of the screen.
        scrollRef.current.scrollTo({
          x: (7 * (ITEM_WIDTH + GAP)) - 100, // Offset to bring it toward center
          animated: true
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Generate days centered around selectedDate
  const days = useMemo(() => {
    const result = [];
    const centerDate = new Date(selectedDate + 'T00:00:00'); // Ensure local time
    if (isNaN(centerDate.getTime())) return [];

    const start = new Date(centerDate);
    start.setDate(centerDate.getDate() - 7);

    for (let i = 0; i < 15; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = getLocalDateString(d);
      result.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate().toString(),
        isToday: dateStr === getLocalDateString(new Date()),
      });
    }
    return result;
  }, [selectedDate]);

  const handleDatePress = (date: string) => {
    onDateSelect(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openPicker = () => {
    setShowPicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.stripWithButton}>
        <TouchableOpacity 
          onPress={openPicker}
          style={[styles.pickerBtn, { backgroundColor: colors.surfaceVariant + '4D', borderColor: colors.outlineVariant + '33' }]}
        >
          <CalendarIcon size={20} color={colors.primary} />
        </TouchableOpacity>

        <ScrollView 
          ref={scrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.container}
        >
          {days.map((day) => {
            const isSelected = day.date === selectedDate;
            
            return (
              <TouchableOpacity
                key={day.date}
                onPress={() => handleDatePress(day.date)}
                activeOpacity={0.8}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.dayName,
                  isSelected ? { color: colors.onPrimary, fontFamily: FONTS.labelSm } : { color: colors.outline }
                ]}>
                  {day.dayName.toUpperCase()}
                </Text>
                
                <View style={[
                  styles.dayNumContainer,
                  isSelected && { borderWidth: 1, borderColor: colors.onPrimary + '80' }
                ]}>
                  <Text style={[
                    styles.dayNum,
                    isSelected ? { color: colors.onPrimary } : { color: colors.onSurface }
                  ]}>
                    {day.dayNum}
                  </Text>
                </View>
                
                {day.isToday && !isSelected && (
                  <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <DatePickerModal 
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        selectedDate={selectedDate}
        onSelect={(date) => {
          onDateSelect(date);
          setShowPicker(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        colors={colors}
      />
    </View>
  );
};

const DatePickerModal = ({ visible, onClose, selectedDate, onSelect, colors }: any) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate + 'T00:00:00'));

  useEffect(() => {
    if (visible) {
      setViewDate(new Date(selectedDate + 'T00:00:00'));
    }
  }, [visible, selectedDate]);

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of month
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + offset);
    setViewDate(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Select Date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navIconBtn}>
              <ChevronLeft size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.onSurface }]}>{monthName}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navIconBtn}>
              <ChevronRight size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={[styles.weekDayText, { color: colors.outline }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {daysInMonth.map((date, i) => {
              if (!date) return <View key={i} style={styles.calendarDayCell} />;
              
              const dateStr = getLocalDateString(date);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === getLocalDateString(new Date());

              return (
                <TouchableOpacity 
                  key={i} 
                  style={[
                    styles.calendarDayCell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 20 }
                  ]}
                  onPress={() => onSelect(dateStr)}
                >
                  <Text style={[
                    styles.calendarDayText,
                    { color: isSelected ? colors.onPrimary : colors.onSurface },
                    isToday && !isSelected && { color: colors.primary, fontFamily: FONTS.labelSm }
                  ]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity 
            style={[styles.todayBtn, { borderColor: colors.primary + '4D' }]} 
            onPress={() => onSelect(getLocalDateString(new Date()))}
          >
            <Text style={[styles.todayBtnText, { color: colors.primary }]}>GO TO TODAY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingVertical: SPACING.md,
    backgroundColor: 'transparent',
  },
  stripWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.lg,
  },
  pickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  container: {
    paddingRight: SPACING.lg,
    gap: 12,
    alignItems: 'center',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 30,
    minWidth: 55,
  },
  dayName: {
    fontFamily: FONTS.label,
    fontSize: 10,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dayNumContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  dayNum: {
    fontFamily: FONTS.headline,
    fontSize: 15,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
  },
  closeBtn: {
    padding: 4,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: ROUNDNESS.md,
    padding: 4,
  },
  navIconBtn: {
    padding: 10,
  },
  monthLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: FONTS.label,
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xl,
  },
  calendarDayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontFamily: FONTS.body,
    fontSize: 15,
  },
  todayBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: ROUNDNESS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 13,
    letterSpacing: 1,
  }
});
