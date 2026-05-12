import { SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { Pencil, Plus, Trash2 } from "lucide-react-native";
import React, { useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated from "react-native-reanimated";

interface Note {
  id: string;
  page: number;
  content: string;
  timestamp: string;
  color?: string;
}

interface NotesPanelProps {
  currentPage: number;
  notes: Note[];
  animatedStyle: any;
  onAddNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export default function NotesPanel({
  currentPage,
  notes,
  animatedStyle,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: NotesPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentPageNotes = notes.filter((note) => note.page === currentPage);

  return (
    <Animated.View style={[styles.notesPanel, animatedStyle]}>
      <View style={styles.notesHeader}>
        <Text style={styles.notesTitle}>Notes for Page {currentPage}</Text>
        <TouchableOpacity onPress={onAddNote}>
          <Plus size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.notesList}>
        {currentPageNotes.map((note) => (
          <View key={note.id} style={styles.noteItem}>
            <View style={styles.noteContent}>
              <Text style={styles.noteText}>{note.content}</Text>
              <Text style={styles.noteTimestamp}>
                {new Date(note.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.noteActions}>
              <TouchableOpacity onPress={() => onEditNote(note)}>
                <Pencil size={16} color={colors.outline} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteNote(note.id)}>
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {currentPageNotes.length === 0 && (
          <Text style={styles.noNotesText}>No notes for this page</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    notesPanel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceVariant,
      zIndex: 50,
    },
    notesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceVariant,
    },
    notesTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.onSurface,
    },
    notesList: {
      maxHeight: 200,
    },
    noteItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceVariant,
    },
    noteContent: {
      flex: 1,
      marginRight: SPACING.md,
    },
    noteText: {
      fontSize: 13,
      color: colors.onSurface,
      marginBottom: SPACING.xs,
    },
    noteTimestamp: {
      fontSize: 10,
      color: colors.outline,
    },
    noteActions: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    noNotesText: {
      fontSize: 12,
      color: colors.outline,
      textAlign: "center",
      paddingVertical: SPACING.lg,
    },
  });
