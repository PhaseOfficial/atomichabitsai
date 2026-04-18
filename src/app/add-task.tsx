import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Type, Tag, Target } from 'lucide-react-native';
import { SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { useTheme } from '@/src/hooks/useTheme';
import { performMutation } from '@/src/lib/sync';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { getDb } from '@/src/db/database';
import * as Haptics from 'expo-haptics';

import { getLocalDateString } from '@/src/lib/date-utils';

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toTimeString = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function AddTaskScreen() {
  const { colors, sprintDuration } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [sessions, setSessions] = useState('1');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please provide a title for your task');
      return;
    }

    const estSessions = parseInt(sessions) || 1;
    const taskId = Math.random().toString(36).substring(7);
    const userId = user?.id || 'guest';
    const today = getLocalDateString();

    setLoading(true);
    try {
      // 1. Save the Task
      await performMutation('tasks', 'INSERT', {
        id: taskId,
        user_id: userId,
        title: title.trim(),
        status: 'todo',
        estimated_sessions: estSessions,
        completed_sessions: 0,
        tag: tag.trim() || 'General',
        todos: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Automatically Add to Schedule
      const db = await getDb();
      const existingSchedule = await db.getFirstAsync<{id: string, time_blocks: string}>(
        "SELECT id, time_blocks FROM schedules WHERE date = ? AND (user_id = ? OR user_id IS NULL)",
        [today, userId]
      );

      let blocks = [];
      let scheduleId = Math.random().toString(36).substring(7);
      
      if (existingSchedule) {
        try {
          blocks = JSON.parse(existingSchedule.time_blocks);
          scheduleId = existingSchedule.id;
        } catch (e) { blocks = []; }
      }

      // Find first available slot after 9 AM
      let currentStart = toMinutes("09:00");
      const duration = sprintDuration;
      
      const sortedBlocks = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
      
      for (const block of sortedBlocks) {
        const blockStart = toMinutes(block.start);
        if (blockStart >= currentStart + duration) {
          break;
        }
        currentStart = Math.max(currentStart, toMinutes(block.end));
      }

      const newBlock = {
        start: toTimeString(currentStart),
        end: toTimeString(currentStart + duration),
        task: title.trim(),
        type: 'deep-work',
        todos: []
      };

      const updatedBlocks = [...blocks, newBlock].sort((a, b) => a.start.localeCompare(b.start));

      await performMutation('schedules', existingSchedule ? 'UPDATE' : 'INSERT', {
        id: scheduleId,
        user_id: userId,
        date: today,
        time_blocks: JSON.stringify(updatedBlocks)
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to save task/schedule:', error);
      Alert.alert('Error', 'Failed to save task');
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
            <Text style={styles.headerTitle}>New Task</Text>
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
