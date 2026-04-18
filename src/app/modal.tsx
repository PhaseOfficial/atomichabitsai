import { AccentKey, FONTS, ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { ThemeMode, useTheme } from "@/src/hooks/useTheme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
    Check,
    Clock,
    Edit3,
    LogOut,
    Monitor,
    Moon,
    RefreshCw,
    Save,
    Sun,
    Target,
    X,
    Shield,
    Database,
    Fingerprint
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { pullFromServer, syncWithSupabase } from "../lib/sync";

export default function SettingsModal() {
  const {
    colors,
    accentKey,
    updateAccent,
    availableAccents,
    themeMode,
    updateThemeMode,
    focusGoal,
    updateFocusGoal,
    sprintDuration,
    updateSprintDuration,
    displayName,
    updateDisplayName,
    identityAnchor,
    updateIdentityAnchor,
  } = useTheme();

  const [newName, setNewName] = useState(displayName);
  const [newIdentity, setNewIdentity] = useState(identityAnchor);
  const [newGoal, setNewGoal] = useState(focusGoal.toString());
  const [newSprintDuration, setNewSprintDuration] = useState(
    sprintDuration.toString(),
  );
  
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  const accountDirty = newName.trim() !== displayName.trim();
  const identityDirty = newIdentity.trim() !== identityAnchor.trim();
  const goalsDirty =
    newGoal.trim() !== focusGoal.toString() ||
    newSprintDuration.trim() !== sprintDuration.toString();

  const { signOut, user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [syncing, setSyncing] = useState(false);

  const handleSaveIdentity = async () => {
    if (!identityDirty) return;
    try {
      await updateIdentityAnchor(newIdentity);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingIdentity(false);
    } catch (e) {
      Alert.alert("Error", "Unable to save identity anchor.");
    }
  };

  const handleSaveAccount = async () => {
    if (!accountDirty) return;
    try {
      await updateDisplayName(newName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingAccount(false);
    } catch (e) {
      Alert.alert("Error", "Unable to save display name.");
    }
  };

  const handleSaveGoals = async () => {
    if (!goalsDirty) return;
    const goalNum = parseInt(newGoal, 10);
    const sprintNum = parseInt(newSprintDuration, 10);

    if (isNaN(goalNum) || isNaN(sprintNum)) {
      Alert.alert("Error", "Please enter valid numbers.");
      return;
    }

    try {
      await updateFocusGoal(goalNum);
      await updateSprintDuration(sprintNum);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingGoals(false);
    } catch (e) {
      Alert.alert("Error", "Unable to save goals.");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await syncWithSupabase();
      await pullFromServer();
      Alert.alert("Cloud Sync Successful", "Your flow is now synchronized across all devices.");
    } catch (e) {
      Alert.alert("Sync Error", "Could not connect to the cloud architect.");
    } finally {
      setSyncing(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "Hard Reset", 
      "This will clear all local data. Cloud data will remain safe. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            Alert.alert("Reset Complete", "Local data has been purged.");
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>System Configuration</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
            >
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Identity Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                 <Fingerprint size={16} color={colors.primary} />
                 <Text style={styles.sectionLabel}>IDENTITY PRINCIPLE</Text>
              </View>
              <Text style={styles.sectionDesc}>
                This is the "Identity Anchor" that guides your habits. Define who you are becoming.
              </Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.input,
                    { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
                    !isEditingIdentity && styles.inputDisabled,
                  ]}
                  value={newIdentity}
                  onChangeText={setNewIdentity}
                  placeholder="I am the type of person who..."
                  placeholderTextColor={colors.outline}
                  editable={isEditingIdentity}
                  multiline
                />
              </View>
              <View style={styles.actionRow}>
                {!isEditingIdentity ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingIdentity(true)}>
                    <Edit3 size={16} color={colors.onSurface} />
                    <Text style={styles.actionBtnText}>Refine Identity</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setIsEditingIdentity(false); setNewIdentity(identityAnchor); }}>
                      <X size={16} color={colors.error} />
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, identityDirty && styles.actionBtnActive]} 
                      onPress={handleSaveIdentity}
                      disabled={!identityDirty}
                    >
                      <Save size={16} color={identityDirty ? colors.onPrimary : colors.outline} />
                      <Text style={[styles.actionBtnText, identityDirty && styles.actionBtnTextActive]}>Save Anchor</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                 <Shield size={16} color={colors.primary} />
                 <Text style={styles.sectionLabel}>ACCOUNT SECURITY</Text>
              </View>
              <View style={styles.accountInfo}>
                <View style={styles.accountDetails}>
                  <Text style={styles.menuItemText}>{user?.email || "Guest User"}</Text>
                  <TextInput
                    style={[styles.nameInput, !isEditingAccount && styles.inputDisabled]}
                    value={newName}
                    onChangeText={setNewName}
                    editable={isEditingAccount}
                    placeholder="Your display name"
                  />
                </View>
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                  <LogOut size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.actionRow}>
                 {!isEditingAccount ? (
                   <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingAccount(true)}>
                     <Edit3 size={16} color={colors.onSurface} />
                     <Text style={styles.actionBtnText}>Update Profile</Text>
                   </TouchableOpacity>
                 ) : (
                   <TouchableOpacity 
                    style={[styles.actionBtn, accountDirty && styles.actionBtnActive]} 
                    onPress={handleSaveAccount}
                    disabled={!accountDirty}
                  >
                    <Save size={16} color={accountDirty ? colors.onPrimary : colors.outline} />
                    <Text style={[styles.actionBtnText, accountDirty && styles.actionBtnTextActive]}>Save Profile</Text>
                  </TouchableOpacity>
                 )}
              </View>
            </View>

            {/* Productivity Goals */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                 <Target size={16} color={colors.primary} />
                 <Text style={styles.sectionLabel}>PRODUCTIVITY ARCHITECTURE</Text>
              </View>
              <View style={styles.goalRow}>
                <View style={styles.goalInfo}>
                  <Target size={20} color={colors.primary} />
                  <View>
                    <Text style={styles.goalTitle}>Daily Focus Goal</Text>
                    <Text style={styles.goalDesc}>Number of sessions per day</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.goalInput, !isEditingGoals && styles.inputDisabled]}
                  value={newGoal}
                  onChangeText={setNewGoal}
                  keyboardType="number-pad"
                  editable={isEditingGoals}
                />
              </View>
              <View style={styles.goalRow}>
                <View style={styles.goalInfo}>
                  <Clock size={20} color={colors.primary} />
                  <View>
                    <Text style={styles.goalTitle}>Sprint Duration</Text>
                    <Text style={styles.goalDesc}>Minutes per session</Text>
                  </View>
                </View>
                <TextInput
                  style={[styles.goalInput, !isEditingGoals && styles.inputDisabled]}
                  value={newSprintDuration}
                  onChangeText={setNewSprintDuration}
                  keyboardType="number-pad"
                  editable={isEditingGoals}
                />
              </View>
              <View style={styles.actionRow}>
                {!isEditingGoals ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditingGoals(true)}>
                    <Edit3 size={16} color={colors.onSurface} />
                    <Text style={styles.actionBtnText}>Modify Goals</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionBtn, goalsDirty && styles.actionBtnActive]} 
                    onPress={handleSaveGoals}
                    disabled={!goalsDirty}
                  >
                    <Save size={16} color={goalsDirty ? colors.onPrimary : colors.outline} />
                    <Text style={[styles.actionBtnText, goalsDirty && styles.actionBtnTextActive]}>Apply Goals</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Visual Style */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>VISUAL INTERFACE</Text>
              <View style={styles.themeToggleGrid}>
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.themeOption,
                      themeMode === mode && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      updateThemeMode(mode);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    {mode === 'light' ? <Sun size={20} color={themeMode === mode ? colors.onPrimary : colors.onSurfaceVariant} /> :
                     mode === 'dark' ? <Moon size={20} color={themeMode === mode ? colors.onPrimary : colors.onSurfaceVariant} /> :
                     <Monitor size={20} color={themeMode === mode ? colors.onPrimary : colors.onSurfaceVariant} />}
                    <Text style={[styles.themeLabel, themeMode === mode && { color: colors.onPrimary }]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.accentGrid}>
                {(Object.keys(availableAccents) as AccentKey[]).map((key) => {
                  const accent = availableAccents[key];
                  const isSelected = accentKey === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.accentCard, isSelected && { borderColor: colors.primary, borderWidth: 2 }]}
                      onPress={() => {
                        updateAccent(key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View style={[styles.accentPreview, { backgroundColor: accent.primary }]}>
                        {isSelected && <Check size={20} color="#fff" />}
                      </View>
                      <Text style={[styles.accentLabel, isSelected && { color: colors.primary, fontFamily: FONTS.labelSm }]} numberOfLines={1}>
                        {accent.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* System & Sync */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                 <Database size={16} color={colors.primary} />
                 <Text style={styles.sectionLabel}>CORE ENGINE</Text>
              </View>
              <View style={styles.systemCard}>
                <TouchableOpacity style={styles.systemItem} onPress={handleManualSync} disabled={syncing}>
                  <View style={styles.systemItemInfo}>
                    <Text style={styles.menuItemText}>Cloud Architecture Sync</Text>
                    <Text style={styles.menuItemValue}>Last verified: Just now</Text>
                  </View>
                  {syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.systemItem} onPress={handleResetData}>
                  <View style={styles.systemItemInfo}>
                    <Text style={styles.menuItemText}>Purge Local Cache</Text>
                    <Text style={styles.menuItemValue}>Hard reset database</Text>
                  </View>
                  <Database size={18} color={colors.error} opacity={0.7} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.versionText}>Batsirai Productivity Planner v1.2.0</Text>
              <Text style={styles.versionText}>Engineered for Focus</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    title: {
      fontFamily: FONTS.headline,
      fontSize: 22,
      color: colors.onSurface,
    },
    closeBtn: {
      padding: 4,
    },
    content: {
      padding: SPACING.lg,
    },
    section: {
      marginBottom: SPACING.xxl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    sectionLabel: {
      fontFamily: FONTS.labelSm,
      fontSize: 11,
      color: colors.primary,
      letterSpacing: 1.5,
    },
    sectionDesc: {
      fontFamily: FONTS.body,
      fontSize: 13,
      color: colors.onSurfaceVariant,
      lineHeight: 18,
      marginBottom: 12,
    },
    accountInfo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    accountDetails: {
      flex: 1,
    },
    nameInput: {
      fontFamily: FONTS.labelSm,
      fontSize: 15,
      color: colors.primary,
      marginTop: 4,
    },
    signOutBtn: {
      padding: 8,
    },
    inputGroup: {
      gap: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      borderRadius: ROUNDNESS.md,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontFamily: FONTS.body,
      color: colors.onSurface,
      fontSize: 15,
    },
    inputDisabled: {
      opacity: 0.6,
      backgroundColor: colors.surfaceVariant + '40',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: ROUNDNESS.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "80",
    },
    actionBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnText: {
      fontFamily: FONTS.label,
      color: colors.onSurface,
      fontSize: 13,
    },
    actionBtnTextActive: {
      color: colors.onPrimary,
    },
    goalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      padding: 14,
      borderRadius: ROUNDNESS.lg,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
    },
    goalInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    goalTitle: {
      fontFamily: FONTS.headline,
      fontSize: 15,
      color: colors.onSurface,
    },
    goalDesc: {
      fontFamily: FONTS.body,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    goalInput: {
      width: 60,
      height: 40,
      backgroundColor: colors.surfaceVariant + "80",
      borderRadius: ROUNDNESS.sm,
      textAlign: "center",
      fontFamily: FONTS.labelSm,
      color: colors.primary,
      fontSize: 18,
    },
    themeToggleGrid: {
      flexDirection: "row",
      gap: 10,
      marginBottom: SPACING.xl,
    },
    themeOption: {
      flex: 1,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: ROUNDNESS.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      gap: 8,
    },
    themeLabel: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.onSurfaceVariant,
    },
    accentGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    accentCard: {
      width: "31%",
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    accentPreview: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    accentLabel: {
      fontFamily: FONTS.label,
      fontSize: 11,
      color: colors.onSurfaceVariant,
    },
    systemCard: {
      backgroundColor: colors.surface,
      borderRadius: ROUNDNESS.lg,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "33",
      overflow: 'hidden',
    },
    systemItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + "33",
    },
    systemItemInfo: {
      flex: 1,
    },
    menuItemText: {
      fontFamily: FONTS.body,
      fontSize: 15,
      color: colors.onSurface,
    },
    menuItemValue: {
      fontFamily: FONTS.label,
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginTop: 2,
    },
    footer: {
      alignItems: "center",
      marginTop: SPACING.xl,
      paddingBottom: 60,
    },
    versionText: {
      fontFamily: FONTS.label,
      fontSize: 11,
      color: colors.outline,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
  });
