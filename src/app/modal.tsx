import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, ThemeMode } from '@/src/hooks/useTheme';
import { AccentKey } from '@/src/constants/Theme';
import { Check, X, Moon, Sun, Monitor, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useAuth } from '../hooks/useAuth';

export default function SettingsModal() {
  const { colors, accentKey, updateAccent, availableAccents, themeMode, updateThemeMode } = useTheme();
  const { signOut, user } = useAuth();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
              <Text style={styles.menuItemText}>{user?.email || 'Guest User'}</Text>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <LogOut size={18} color={colors.error} />
                <Text style={[styles.menuItemValue, { color: colors.error }]}>Sign Out</Text>
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
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Cloud Sync Status</Text>
              <Text style={styles.menuItemValue}>Connected</Text>
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
    marginBottom: 8,
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
