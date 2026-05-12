import { ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { Save, X } from "lucide-react-native";
import React from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface NoteEditorModalProps {
  visible: boolean;
  onClose: () => void;
  currentPage: number;
  currentNote: string;
  onNoteChange: (text: string) => void;
  onSave: () => void;
  isEditing: boolean;
}

export default function NoteEditorModal({
  visible,
  onClose,
  currentPage,
  currentNote,
  onNoteChange,
  onSave,
  isEditing,
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      maxHeight: "90%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: ROUNDNESS.lg,
      borderTopRightRadius: ROUNDNESS.lg,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceVariant,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.onSurface,
    },
    modalField: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    noteInput: {
      minHeight: 120,
      textAlignVertical: "top",
      paddingTop: SPACING.md,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      borderRadius: ROUNDNESS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      fontSize: 14,
      color: colors.onSurface,
      backgroundColor: colors.background,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: ROUNDNESS.md,
      gap: SPACING.sm,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Note" : `Add Note - Page ${currentPage}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalField}>
            <TextInput
              style={[styles.modalInput, styles.noteInput]}
              value={currentNote}
              onChangeText={onNoteChange}
              placeholder="Write your note here..."
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={onSave}>
            <Save size={20} color={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>
              {isEditing ? "Update Note" : "Save Note"}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
