import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Link as LinkIcon, Type, Sparkles } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { performMutation } from '@/src/lib/sync';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

export default function AddShortcutScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title || !url) {
      Alert.alert('Error', 'Please provide both a title and a URL');
      return;
    }

    setLoading(true);
    try {
      await performMutation('shortcuts', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        user_id: user?.id || 'guest',
        title,
        url: url.startsWith('http') ? url : `https://${url}`,
        icon: 'sparkles',
      });
      router.back();
    } catch (error) {
      console.error('Failed to save shortcut:', error);
      Alert.alert('Error', 'Failed to save shortcut');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Shortcut</Text>
            <TouchableOpacity onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Save size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SHORTCUT DETAILS</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DISPLAY NAME</Text>
                <View style={styles.inputWrapper}>
                  <Type size={20} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Project Dashboard"
                    placeholderTextColor={colors.outline}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>URL OR APP LINK</Text>
                <View style={styles.inputWrapper}>
                  <LinkIcon size={20} color={colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. linear.app/my-team"
                    placeholderTextColor={colors.outline}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Shortcuts will appear in your Ecosystem Tools section for quick access to your external workspaces.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    gap: SPACING.lg,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryContainer + '40',
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    marginTop: SPACING.xxl,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
});
