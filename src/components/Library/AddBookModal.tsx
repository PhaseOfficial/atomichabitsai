import { ROUNDNESS, SPACING } from "@/src/constants/Theme";
import { useTheme } from "@/src/hooks/useTheme";
import { Upload, X } from "lucide-react-native";
import React from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface AddBookModalProps {
  visible: boolean;
  onClose: () => void;
  bookTitle: string;
  onTitleChange: (text: string) => void;
  bookAuthor: string;
  onAuthorChange: (text: string) => void;
  totalPages: string;
  onPagesChange: (text: string) => void;
  loading: boolean;
  onAddBook: () => void;
}

export default function AddBookModal({
  visible,
  onClose,
  bookTitle,
  onTitleChange,
  bookAuthor,
  onAuthorChange,
  totalPages,
  onPagesChange,
  loading,
  onAddBook,
}: AddBookModalProps) {
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
    modalLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.outline,
      marginBottom: SPACING.sm,
      letterSpacing: 0.5,
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
      marginVertical: SPACING.md,
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
            <Text style={styles.modalTitle}>Add New Book</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>TITLE</Text>
              <TextInput
                style={styles.modalInput}
                value={bookTitle}
                onChangeText={onTitleChange}
                placeholder="Book Title"
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>AUTHOR</Text>
              <TextInput
                style={styles.modalInput}
                value={bookAuthor}
                onChangeText={onAuthorChange}
                placeholder="Author Name"
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>TOTAL PAGES</Text>
              <TextInput
                style={styles.modalInput}
                value={totalPages}
                onChangeText={onPagesChange}
                keyboardType="numeric"
                placeholder="Total pages"
                placeholderTextColor={colors.outline}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={onAddBook}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Upload size={20} color={colors.onPrimary} />
                  <Text style={styles.primaryBtnText}>Add to Library</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
