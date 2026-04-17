import { FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/hooks/useTheme";
import { useData } from "@/src/hooks/useData";
import { performMutation } from "@/src/lib/sync";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
    Calendar,
    Clock,
    Repeat,
    Save,
    Sparkles,
    X,
    MapPin,
    Anchor,
    ChevronDown,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FREQUENCIES = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const TIME_PRESETS = [
  { label: "Morning", time: "08:00" },
  { label: "Noon", time: "12:00" },
  { label: "Evening", time: "18:00" },
  { label: "Night", time: "22:00" },
];

export default function AddHabitScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const userId = user?.id || 'guest';
  const { data: existingHabits } = useData<{id: string, title: string}>(
    'SELECT id, title FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)', 
    [userId]
  );

  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [location, setLocation] = useState("");
  const [twoMinuteVersion, setTwoMinuteVersion] = useState("");
  const [anchorHabitId, setAnchorHabitId] = useState<string | null>(null);
  const [weekendFlexibility, setWeekendFlexibility] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);

  const selectedAnchor = useMemo(() => 
    existingHabits.find(h => h.id === anchorHabitId), 
    [existingHabits, anchorHabitId]
  );

  const handleSave = async () => {
    if (!title) {
      Alert.alert("Error", "Please provide a title for your habit");
      return;
    }

    setLoading(true);
    try {
      await performMutation("habits", "INSERT", {
        id: Math.random().toString(36).substring(7),
        user_id: userId,
        title,
        frequency,
        preferred_time: preferredTime,
        location: location,
        two_minute_version: twoMinuteVersion,
        anchor_habit_id: anchorHabitId,
        weekend_flexibility: weekendFlexibility ? 1 : 0,
        is_active: 1,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to save habit:", error);
      Alert.alert("Error", "Failed to save habit");
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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HABIT ARCHITECT</Text>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHAT IS THE HABIT?</Text>
              <View style={styles.inputWrapper}>
                <Sparkles
                  size={20}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Meditate"
                  placeholderTextColor={colors.outline}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/* Implementation Intentions: Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHERE WILL YOU DO IT? (LOCATION)</Text>
              <View style={styles.inputWrapper}>
                <MapPin
                  size={20}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My study, the gym, on the sofa"
                  placeholderTextColor={colors.outline}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Small Start: Two-Minute Version */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>THE TWO-MINUTE VERSION (START SMALL)</Text>
              <View style={styles.inputWrapper}>
                <Sparkles
                  size={20}
                  color={colors.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Close my eyes for 1 minute"
                  placeholderTextColor={colors.outline}
                  value={twoMinuteVersion}
                  onChangeText={setTwoMinuteVersion}
                />
              </View>
              <Text style={styles.hintText}>"Optimize for the starting line, not the finish line."</Text>
            </View>

            {/* Habit Stacking: Anchor Habit */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>STACK IT: AFTER I...</Text>
              <TouchableOpacity 
                style={styles.inputWrapper}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAnchorModal(true);
                }}
              >
                <Anchor
                  size={20}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 14 }]}>
                  {selectedAnchor ? selectedAnchor.title : "Choose an anchor habit"}
                </Text>
                <ChevronDown size={20} color={colors.outline} />
              </TouchableOpacity>
            </View>

            {/* Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHAT TIME?</Text>
              <View style={styles.inputWrapper}>
                <Clock
                  size={20}
                  color={colors.outline}
                  style={styles.inputIcon}
                />
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
                      preferredTime === p.time && {
                        backgroundColor: colors.primaryContainer,
                      },
                    ]}
                    onPress={() => setPreferredTime(p.time)}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        preferredTime === p.time && {
                          color: colors.primary,
                          fontFamily: FONTS.labelSm,
                        },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Frequency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FREQUENCY</Text>
              <View style={styles.frequencyGrid}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    style={[
                      styles.frequencyOption,
                      frequency === f.value && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                    onPress={() => setFrequency(f.value)}
                  >
                    <Repeat
                      size={16}
                      color={
                        frequency === f.value
                          ? colors.onPrimary
                          : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.frequencyText,
                        frequency === f.value && {
                          color: colors.onPrimary,
                          fontFamily: FONTS.labelSm,
                        },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Weekend Flexibility */}
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <View style={styles.rowAlign}>
                  <Calendar
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.switchTitle}>Weekend Flexibility</Text>
                </View>
                <Text style={styles.switchDesc}>
                  Allow skipping on weekends without breaking streaks.
                </Text>
              </View>
              <Switch
                value={weekendFlexibility}
                onValueChange={setWeekendFlexibility}
                trackColor={{
                  false: colors.surfaceVariant,
                  true: colors.primary + "80",
                }}
                thumbColor={
                  weekendFlexibility ? colors.primary : colors.outline
                }
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              "Every action you take is a vote for the type of person you wish to become."
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Anchor Habit Modal */}
      <Modal
        visible={showAnchorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAnchorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Anchor Habit</Text>
              <TouchableOpacity onPress={() => setShowAnchorModal(false)}>
                <X size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.anchorList}>
              <TouchableOpacity 
                style={[styles.anchorItem, !anchorHabitId && { backgroundColor: colors.primaryContainer }]}
                onPress={() => {
                  setAnchorHabitId(null);
                  setShowAnchorModal(false);
                }}
              >
                <Text style={[styles.anchorItemText, !anchorHabitId && { color: colors.primary, fontFamily: FONTS.labelSm }]}>
                  No Anchor (Independent)
                </Text>
              </TouchableOpacity>
              {existingHabits.map((habit) => (
                <TouchableOpacity 
                  key={habit.id}
                  style={[styles.anchorItem, anchorHabitId === habit.id && { backgroundColor: colors.primaryContainer }]}
                  onPress={() => {
                    setAnchorHabitId(habit.id);
                    setShowAnchorModal(false);
                  }}
                >
                  <Text style={[styles.anchorItemText, anchorHabitId === habit.id && { color: colors.primary, fontFamily: FONTS.labelSm }]}>
                    {habit.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "4D",
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
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
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
    hintText: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      fontStyle: 'italic',
      marginTop: 2,
    },
    presetsGrid: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    presetBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: ROUNDNESS.sm,
      backgroundColor: colors.surfaceVariant + "4D",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    presetText: {
      fontFamily: FONTS.label,
      fontSize: 10,
      color: colors.onSurfaceVariant,
    },
    frequencyGrid: {
      flexDirection: "row",
      gap: 10,
    },
    frequencyOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      borderRadius: ROUNDNESS.md,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    frequencyText: {
      fontFamily: FONTS.label,
      fontSize: 13,
      color: colors.onSurfaceVariant,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      padding: SPACING.lg,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
    },
    switchContent: {
      flex: 1,
      paddingRight: 16,
    },
    rowAlign: {
      flexDirection: "row",
      alignItems: "center",
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
      backgroundColor: colors.primaryContainer + "40",
      padding: SPACING.lg,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.primaryContainer,
      marginTop: SPACING.xxl,
      alignItems: "center",
    },
    infoText: {
      fontFamily: FONTS.body,
      fontSize: 14,
      color: colors.onSurfaceVariant,
      fontStyle: "italic",
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: ROUNDNESS.xl,
      borderTopRightRadius: ROUNDNESS.xl,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '4D',
    },
    modalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 18,
      color: colors.onSurface,
    },
    anchorList: {
      padding: SPACING.md,
    },
    anchorItem: {
      padding: SPACING.lg,
      borderRadius: ROUNDNESS.lg,
      marginBottom: 8,
    },
    anchorItemText: {
      fontFamily: FONTS.body,
      fontSize: 16,
      color: colors.onSurface,
    },
  });
