import TypingIndicator from "@/src/components/chat/TypingIndicator";
import { FONTS, ROUNDNESS, SPACING, ThemeColors } from "@/src/constants/Theme";
import { ChatMessage } from "@/src/types/chat";
import { formatTime } from "@/src/utils/formatTime";
import { CheckCircle2 } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  colors: ThemeColors;
}

const MessageBubble = ({ message, isUser, colors }: MessageBubbleProps) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const actionLabel = message.action?.replace(/_/g, " ");
  const isSending = message.status === "sending";
  const hasError = message.status === "error";

  return (
    <View
      style={[
        styles.messageWrapper,
        isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {isSending ? (
          <TypingIndicator colors={colors} />
        ) : (
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
            ]}
          >
            {message.content}
          </Text>
        )}

        {actionLabel ? (
          <View style={styles.actionBadge}>
            <CheckCircle2
              size={12}
              color={isUser ? colors.onPrimary : colors.primary}
            />
            <Text
              style={[
                styles.actionText,
                { color: isUser ? colors.onPrimary : colors.primary },
              ]}
            >
              {actionLabel}
            </Text>
          </View>
        ) : null}

        {hasError ? (
          <Text style={styles.errorText} accessibilityRole="text">
            Unable to generate response. Tap send again.
          </Text>
        ) : null}
      </View>

      <Text style={styles.messageTime}>{formatTime(message.createdAt)}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    messageWrapper: {
      marginBottom: SPACING.lg,
      maxWidth: "85%",
    },
    aiMessageWrapper: {
      alignSelf: "flex-start",
    },
    userMessageWrapper: {
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    messageBubble: {
      padding: 14,
      borderRadius: ROUNDNESS.lg,
    },
    aiBubble: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outlineVariant + "4D",
      borderTopLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 4,
    },
    messageText: {
      fontFamily: FONTS.body,
      fontSize: 15,
      lineHeight: 22,
    },
    aiText: {
      color: colors.onSurface,
    },
    userText: {
      color: colors.onPrimary,
    },
    actionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 8,
      backgroundColor: "rgba(0,0,0,0.05)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    actionText: {
      fontFamily: FONTS.label,
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    messageTime: {
      fontFamily: FONTS.label,
      fontSize: 9,
      color: colors.onSurfaceVariant,
      marginTop: 6,
    },
    errorText: {
      marginTop: 10,
      fontFamily: FONTS.label,
      fontSize: 11,
      color: colors.error,
    },
  });

const areEqual = (prev: MessageBubbleProps, next: MessageBubbleProps) =>
  prev.message.id === next.message.id &&
  prev.message.content === next.message.content &&
  prev.message.status === next.message.status &&
  prev.message.action === next.message.action &&
  prev.isUser === next.isUser &&
  prev.colors.primary === next.colors.primary &&
  prev.colors.surface === next.colors.surface &&
  prev.colors.onSurface === next.colors.onSurface;

export default React.memo(MessageBubble, areEqual);
