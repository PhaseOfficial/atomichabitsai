import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Sparkles, Calendar, Repeat, Clock } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { performMutation } from '@/src/lib/sync';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

const FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const TIME_PRESETS = [
  { label: 'Morning', time: '08:00' },
  { label: 'Noon', time: '12:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '22:00' },
];

export default function AddHabitScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [preferredTime, setPreferredTime] = useState('08:00');
  const [weekendFlexibility, setWeekendFlexibility] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Error', 'Please provide a title for your habit');
      return;
    }

    setLoading(true);
    try {
      await performMutation('habits', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        user_id: user?.id || 'guest',
        title,
        frequency,
        preferred_time: preferredTime,
        weekend_flexibility: weekendFlexibility ? 1 : 0,
        is_active: 1,
      });
      router.back();
    } catch (error) {
      console.error('Failed to save habit:', error);
      Alert.alert('Error', 'Failed to save habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Habit</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Save size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HABIT DETAILS</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHAT IS THE HABIT?</Text>
              <View style={styles.inputWrapper}>
                <Sparkles size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Morning Meditation"
                  placeholderTextColor={colors.outline}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHEN SHOULD THIS HAPPEN?</Text>
              <View style={styles.inputWrapper}>
                <Clock size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  placeholderTextColor={colors.outline}
                  value={preferredTime}
                  onChangeText={setPreferredTime}
                />
              </View>
              <View style={styles.presetsGrid}>
                {TIME_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.time}
                    style={[
                      styles.presetBtn,
                      preferredTime === p.time && { backgroundColor: colors.primaryContainer }
                    ]}
                    onPress={() => setPreferredTime(p.time)}
                  >
                    <Text style={[
                      styles.presetText,
                      preferredTime === p.time && { color: colors.primary, fontFamily: FONTS.labelSm }
                    ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FREQUENCY</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.frequencyOption,
                      frequency === f.value && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setFrequency(f.value)}
                  >
                    <Repeat size={16} color={frequency === f.value ? colors.onPrimary : colors.onSurfaceVariant} />
                    <Text style={[
                      styles.frequencyText,
                      frequency === f.value && { color: colors.onPrimary, fontFamily: FONTS.labelSm }
                    ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <View style={styles.rowAlign}>
                  <Calendar size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.switchTitle}>Weekend Flexibility</Text>
                </View>
                <Text style={styles.switchDesc}>Allow skipping on weekends without breaking streaks.</Text>
              </View>
              <Switch
                value={weekendFlexibility}
                onValueChange={setWeekendFlexibility}
                trackColor={{ false: colors.surfaceVariant, true: colors.primary + '80' }}
                thumbColor={weekendFlexibility ? colors.primary : colors.outline}
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              "Small changes, remarkable results." Start small and be consistent.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '4D',
  },
  headerTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    gap: SPACING.xl,
  },
  sectionLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.outline,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
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
    color: colors.onSurface,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.sm,
    backgroundColor: colors.surfaceVariant + '4D',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  presetText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  frequencyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  frequencyText: {
    fontFamily: FONTS.label,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
  },
  switchContent: {
    flex: 1,
    paddingRight: 16,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  switchTitle: {
    fontFamily: FONTS.headline,
    fontSize: 16,
    color: colors.onSurface,
  },
  switchDesc: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.primaryContainer + '40',
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  infoText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
