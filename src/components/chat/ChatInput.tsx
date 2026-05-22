import { FONTS, ROUNDNESS, SPACING, ThemeColors } from "@/src/constants/Theme";
import { Send } from "lucide-react-native";
import React, { useMemo } from "react";
import {
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface ChatInputProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  colors: ThemeColors;
}

const ChatInput = ({
  inputText,
  onChangeText,
  onSend,
  placeholder,
  colors,
}: ChatInputProps) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.inputSection}>
      <View style={styles.inputBarContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant + "80"}
          value={inputText}
          onChangeText={onChangeText}
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline={false}
          accessibilityLabel="Chat input"
          accessibilityHint="Type a message for the Habit Architect"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={onSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Send size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputSection: {
      backgroundColor: colors.surface,
      paddingBottom: Platform.OS === "ios" ? 10 : 20,
    },
    inputBarContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      marginHorizontal: SPACING.lg,
      borderRadius: ROUNDNESS.xl,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "80",
      padding: 4,
      marginBottom: 10,
    },
    input: {
      flex: 1,
      fontFamily: FONTS.body,
      fontSize: 15,
      paddingHorizontal: 16,
      height: 48,
      color: colors.onSurface,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default React.memo(ChatInput);
