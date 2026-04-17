import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeMode } from '@/src/hooks/useTheme';
import { AccentKey } from '@/src/constants/Theme';
import { Check, X, Moon, Sun, Monitor, LogOut, Target, Clock, RefreshCw, Save, Edit3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useAuth } from '../hooks/useAuth';
import { syncWithSupabase, pullFromServer } from '../lib/sync';

export default function SettingsModal() {
  const { 
    colors, accentKey, updateAccent, availableAccents, 
    themeMode, updateThemeMode, 
    focusGoal, updateFocusGoal,
    sprintDuration, updateSprintDuration,
    displayName, updateDisplayName,
  } = useTheme();

  const [newName, setNewName] = useState(displayName);
  const [newGoal, setNewGoal] = useState(focusGoal.toString());
  const [newSprintDuration, setNewSprintDuration] = useState(sprintDuration.toString());
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  const accountDirty = newName.trim() !== displayName.trim();
  const goalsDirty =
    newGoal.trim() !== focusGoal.toString() ||
    newSprintDuration.trim() !== sprintDuration.toString();

  useEffect(() => {
    setNewName(displayName);
    if (!isEditingAccount) setIsEditingAccount(false);
  }, [displayName]);

  useEffect(() => {
    setNewGoal(focusGoal.toString());
    if (!isEditingGoals) setIsEditingGoals(false);
  }, [focusGoal]);

  useEffect(() => {
    setNewSprintDuration(sprintDuration.toString());
    if (!isEditingGoals) setIsEditingGoals(false);
  }, [sprintDuration]);

  const handleEditAccount = () => {
    setIsEditingAccount(true);
  };

  const handleEditGoals = () => {
    setIsEditingGoals(true);
  };

  const { signOut, user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [syncing, setSyncing] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleSaveAccount = async () => {
    if (!accountDirty) return;
    try {
      await updateDisplayName(newName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Display name updated.");
    } catch (e) {
      console.error("Save account failed", e);
      Alert.alert("Save Error", "Unable to save your display name.");
    }
  };

  const handleSaveGoals = async () => {
    if (!goalsDirty) return;
    const goalNum = parseInt(newGoal, 10);
    const sprintNum = parseInt(newSprintDuration, 10);

    if (isNaN(goalNum) || isNaN(sprintNum)) {
      Alert.alert("Invalid input", "Please enter valid numbers for your productivity goals.");
      return;
    }

    try {
      await updateFocusGoal(goalNum);
      await updateSprintDuration(sprintNum);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Productivity goals updated.");
    } catch (e) {
      console.error("Save goals failed", e);
      Alert.alert("Save Error", "Unable to save your productivity goals.");
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncWithSupabase();
      await pullFromServer();
      Alert.alert("Sync Complete", "All data and preferences are up to date.");
    } catch (e) {
      console.error("Manual sync failed", e);
      Alert.alert("Sync Error", "Could not reach the cloud. Check your connection.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.accountInfo}>
              <View style={styles.accountDetails}>
                <Text style={styles.menuItemText}>{user?.email || 'Guest User'}</Text>
                <Text style={styles.menuItemValue}>{displayName || 'No display name set'}</Text>
              </View>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <LogOut size={18} color={colors.error} />
                <Text style={[styles.menuItemValue, { color: colors.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}> 
              <Text style={styles.inputLabel}>DISPLAY NAME</Text>
              <TextInput
                style={[styles.input, !isEditingAccount && styles.inputDisabled]}
                value={newName}
                onChangeText={(text) => setNewName(text)}
                placeholder="e.g. James Clear"
                placeholderTextColor={colors.outline}
                editable={isEditingAccount}
              />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleEditAccount}
                disabled={isEditingAccount}
              >
                <Edit3 size={16} color={colors.onSurface} />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  accountDirty && isEditingAccount && styles.actionBtnActive,
                ]}
                onPress={handleSaveAccount}
                disabled={!accountDirty || !isEditingAccount}
              >
                <Save
                  size={16}
                  color={accountDirty && isEditingAccount ? colors.onPrimary : colors.outline}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    accountDirty && isEditingAccount && styles.actionBtnTextActive,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRODUCTIVITY GOALS</Text>
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
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleEditGoals}
                disabled={isEditingGoals}
              >
                <Edit3 size={16} color={colors.onSurface} />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  goalsDirty && isEditingGoals && styles.actionBtnActive,
                ]}
                onPress={handleSaveGoals}
                disabled={!goalsDirty || !isEditingGoals}
              >
                <Save
                  size={16}
                  color={goalsDirty && isEditingGoals ? colors.onPrimary : colors.outline}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    goalsDirty && isEditingGoals && styles.actionBtnTextActive,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>APPEARANCE</Text>
            <Text style={styles.sectionTitle}>Theme Mode</Text>
            <Text style={styles.sectionDesc}>Select how Batsirai should appear on your device.</Text>
            
            <View style={styles.themeToggleGrid}>
              <ThemeOption 
                mode="light" 
                currentMode={themeMode} 
                onSelect={updateThemeMode} 
                icon={<Sun size={20} color={themeMode === 'light' ? colors.onPrimary : colors.onSurfaceVariant} />}
                label="Light"
                colors={colors}
              />
              <ThemeOption 
                mode="dark" 
                currentMode={themeMode} 
                onSelect={updateThemeMode} 
                icon={<Moon size={20} color={themeMode === 'dark' ? colors.onPrimary : colors.onSurfaceVariant} />}
                label="Dark"
                colors={colors}
              />
              <ThemeOption 
                mode="system" 
                currentMode={themeMode} 
                onSelect={updateThemeMode} 
                icon={<Monitor size={20} color={themeMode === 'system' ? colors.onPrimary : colors.onSurfaceVariant} />}
                label="System"
                colors={colors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VISUAL STYLE</Text>
            <Text style={styles.sectionTitle}>Accent Color</Text>
            <Text style={styles.sectionDesc}>Choose a color that matches your flow state.</Text>

            <View style={styles.accentGrid}>
              {(Object.keys(availableAccents) as AccentKey[]).map((key) => {
                const accent = availableAccents[key];
                const isSelected = accentKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.accentCard,
                      isSelected && { borderColor: colors.primary, borderWidth: 2 }
                    ]}
                    onPress={() => updateAccent(key)}
                  >
                    <View style={[styles.accentPreview, { backgroundColor: accent.primary }]}>
                      {isSelected && <Check size={20} color="#fff" />}
                    </View>
                    <Text style={[
                      styles.accentLabel,
                      isSelected && { color: colors.primary, fontFamily: FONTS.labelSm }
                    ]} numberOfLines={1}>
                      {accent.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SYSTEM</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleManualSync} disabled={syncing}>
              <Text style={styles.menuItemText}>Cloud Sync Status</Text>
              <View style={styles.syncRow}>
                {syncing && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
                <Text style={styles.menuItemValue}>{syncing ? "Syncing..." : "Connected"}</Text>
                {!syncing && <RefreshCw size={14} color={colors.outline} style={{ marginLeft: 8 }} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Reset Database</Text>
              <Text style={[styles.menuItemValue, { color: colors.error }]}>Clear Local Data</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.versionText}>Batsirai Productivity Planner v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ThemeOption({ mode, currentMode, onSelect, icon, label, colors }: { 
  mode: ThemeMode; 
  currentMode: ThemeMode; 
  onSelect: (mode: ThemeMode) => void;
  icon: React.ReactNode;
  label: string;
  colors: any;
}) {
  const isSelected = mode === currentMode;
  return (
    <TouchableOpacity 
      style={[
        themeStyles.option, 
        { backgroundColor: colors.surface },
        isSelected && { backgroundColor: colors.primary }
      ]}
      onPress={() => onSelect(mode)}
    >
      {icon}
      <Text style={[
        themeStyles.label, 
        { color: colors.onSurfaceVariant },
        isSelected && { color: colors.onPrimary, fontFamily: FONTS.labelSm }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const themeStyles = StyleSheet.create({
  option: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ROUNDNESS.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    fontFamily: FONTS.label,
    fontSize: 12,
  }
});

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
  title: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: colors.onSurface,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: ROUNDNESS.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalTitle: {
    fontFamily: FONTS.headline,
    fontSize: 14,
    color: colors.onSurface,
  },
  goalDesc: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  goalInput: {
    width: 50,
    height: 40,
    backgroundColor: colors.surfaceVariant + '4D',
    borderRadius: ROUNDNESS.sm,
    textAlign: 'center',
    fontFamily: FONTS.labelSm,
    color: colors.primary,
    fontSize: 16,
  },
  accountDetails: {
    flex: 1,
  },
  inputGroup: {
    marginTop: SPACING.md,
    gap: 8,
  },
  inputLabel: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
    borderRadius: ROUNDNESS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    fontFamily: FONTS.body,
    color: colors.onSurface,
  },
  actionRow: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: ROUNDNESS.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontFamily: FONTS.label,
    color: colors.onSurface,
    fontSize: 14,
  },
  actionBtnTextActive: {
    color: colors.onPrimary,
  },
  themeToggleGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  accentCard: {
    width: '31.5%',
    backgroundColor: colors.surface,
    padding: SPACING.sm,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  accentPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLabel: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '4D',
  },
  menuItemText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: colors.onSurface,
  },
  menuItemValue: {
    fontFamily: FONTS.label,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: 40,
  },
  versionText: {
    fontFamily: FONTS.label,
    fontSize: 12,
    color: colors.outline,
  },
});
