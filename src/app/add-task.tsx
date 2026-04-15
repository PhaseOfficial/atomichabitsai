import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Type, Tag, Target } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { performMutation } from '@/src/lib/sync';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';

export default function AddTaskScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [sessions, setSessions] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Error', 'Please provide a title for your task');
      return;
    }

    const estSessions = parseInt(sessions) || 1;

    setLoading(true);
    try {
      await performMutation('tasks', 'INSERT', {
        id: Math.random().toString(36).substring(7),
        user_id: user?.id || 'guest',
        title,
        status: 'todo',
        estimated_sessions: estSessions,
        completed_sessions: 0,
        tag: tag || 'General',
      });
      router.back();
    } catch (error) {
      console.error('Failed to save task:', error);
      Alert.alert('Error', 'Failed to save task');
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
          <Text style={styles.headerTitle}>New Task</Text>
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
            <Text style={styles.sectionLabel}>TASK DETAILS</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHAT ARE YOU WORKING ON?</Text>
              <View style={styles.inputWrapper}>
                <Type size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Audit Typography Hierarchy"
                  placeholderTextColor={colors.outline}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TAG / CATEGORY</Text>
              <View style={styles.inputWrapper}>
                <Tag size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Design, Coding, Admin"
                  placeholderTextColor={colors.outline}
                  value={tag}
                  onChangeText={setTag}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ESTIMATED SESSIONS (25m each)</Text>
              <View style={styles.inputWrapper}>
                <Target size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.outline}
                  value={sessions}
                  onChangeText={setSessions}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Break large tasks into small, actionable chunks to maintain flow and momentum.
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
    textAlign: 'center',
    lineHeight: 20,
  },
});
