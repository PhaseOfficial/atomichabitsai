import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList,
  Platform 
} from 'react-native';
import { Clock, X, Check } from 'lucide-react-native';
import { FONTS, ROUNDNESS, SPACING } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import * as Haptics from 'expo-haptics';

interface TimeInputProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
}

export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, label }) => {
  const { colors } = useTheme();
  const [tempValue, setTempValue] = useState(value);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const formatTime = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/\D/g, '');
    
    if (cleaned.length === 0) return '';
    
    let hours = '00';
    let minutes = '00';
    
    if (cleaned.length === 1) {
      hours = cleaned.padStart(2, '0');
    } else if (cleaned.length === 2) {
      hours = cleaned;
    } else if (cleaned.length === 3) {
      hours = cleaned.slice(0, 1).padStart(2, '0');
      minutes = cleaned.slice(1);
    } else {
      hours = cleaned.slice(0, 2);
      minutes = cleaned.slice(2, 4);
    }
    
    let h = parseInt(hours);
    let m = parseInt(minutes);
    
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleBlur = () => {
    const formatted = formatTime(tempValue);
    if (formatted) {
      setTempValue(formatted);
      onChange(formatted);
    } else {
      setTempValue(value);
    }
  };

  // Dial Picker Logic
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const [selectedHour, setSelectedHour] = useState(value.split(':')[0] || '08');
  const [selectedMinute, setSelectedMinute] = useState(value.split(':')[1] || '00');

  const openPicker = () => {
    setSelectedHour(value.split(':')[0] || '08');
    setSelectedMinute(value.split(':')[1] || '00');
    setShowPicker(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmPicker = () => {
    const newTime = `${selectedHour}:${selectedMinute}`;
    onChange(newTime);
    setTempValue(newTime);
    setShowPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.outline }]}>{label}</Text>}
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.outlineVariant + '4D' }]}>
        <TouchableOpacity onPress={openPicker}>
          <Clock size={20} color={colors.primary} style={styles.inputIcon} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.onSurface }]}
          value={tempValue}
          onChangeText={setTempValue}
          onBlur={handleBlur}
          placeholder="00:00"
          placeholderTextColor={colors.outline}
          keyboardType="number-pad"
          maxLength={5}
        />
      </View>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.dialWrapper}>
                <Text style={[styles.dialLabel, { color: colors.outline }]}>HOUR</Text>
                <FlatList
                  data={HOURS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.dialItem, selectedHour === item && { backgroundColor: colors.primaryContainer }]}
                      onPress={() => {
                        setSelectedHour(item);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.dialText, { color: selectedHour === item ? colors.primary : colors.onSurface }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.dialList}
                />
              </View>

              <Text style={[styles.separator, { color: colors.onSurface }]}>:</Text>

              <View style={styles.dialWrapper}>
                <Text style={[styles.dialLabel, { color: colors.outline }]}>MIN</Text>
                <FlatList
                  data={MINUTES}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={40}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[styles.dialItem, selectedMinute === item && { backgroundColor: colors.primaryContainer }]}
                      onPress={() => {
                        setSelectedMinute(item);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.dialText, { color: selectedMinute === item ? colors.primary : colors.onSurface }]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.dialList}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={confirmPicker}
            >
              <Check size={20} color={colors.onPrimary} />
              <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontFamily: FONTS.body,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: ROUNDNESS.xl,
    borderTopRightRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    height: 200,
    marginBottom: SPACING.xl,
  },
  dialWrapper: {
    alignItems: 'center',
    width: 80,
  },
  dialLabel: {
    fontFamily: FONTS.label,
    fontSize: 10,
    marginBottom: 8,
  },
  dialList: {
    height: 160,
    width: '100%',
  },
  dialItem: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ROUNDNESS.sm,
  },
  dialText: {
    fontFamily: FONTS.labelSm,
    fontSize: 20,
  },
  separator: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    marginTop: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: ROUNDNESS.full,
  },
  confirmBtnText: {
    fontFamily: FONTS.labelSm,
    fontSize: 16,
  },
});
