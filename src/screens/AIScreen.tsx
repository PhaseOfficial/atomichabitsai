import ChatHeader from "@/src/components/chat/ChatHeader";
import ChatInput from "@/src/components/chat/ChatInput";
import MessageBubble from "@/src/components/chat/MessageBubble";
import SuggestionChips from "@/src/components/chat/SuggestionChips";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { FONTS, ROUNDNESS, SPACING, ThemeColors } from "@/src/constants/Theme";
import { useAIChat } from "@/src/hooks/useAIChat";
import { useAuth } from "@/src/hooks/useAuth";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import { useHabitSummary } from "@/src/hooks/useHabitSummary";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { useTheme } from "@/src/hooks/useTheme";
import { ChatMessage } from "@/src/types/chat";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    ActivityIndicator,
    FlatList,
    InteractionManager,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const INITIAL_SUGGESTIONS = [
  "Audit my habits",
  "Suggest a 2-min version",
  "Log my workout",
  "Help me build a morning routine",
] as const;

interface AIScreenProps {
  colors: ThemeColors;
}

const AIScreen = () => {
  const { colors, identityAnchor } = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  useRequireAuth(user, authLoading);

  const router = useRouter();
  const [inputText, setInputText] = useState("");

  const userId = user?.id ?? null;
  const { habitContext } = useHabitSummary(userId ?? "guest");
  const {
    messages,
    messagesRef,
    isLoading: isHistoryLoading,
    appendMessage,
    updateMessage,
  } = useChatHistory(userId);

  const { isSending, sendMessage } = useAIChat({
    userId,
    identityAnchor,
    habitContext,
    messagesRef,
    appendMessage,
    updateMessage,
  });

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isUserScrolling = useRef(false);

  const staticStyles = styles;

  const scrollToBottom = useCallback(() => {
    if (isUserScrolling.current) return;
    InteractionManager.runAfterInteractions(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputText).trim();
      if (!content) return;
      setInputText("");
      await sendMessage(content);
    },
    [inputText, sendMessage],
  );

  const navigateMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/menu");
  }, [router]);

  const navigateSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/modal");
  }, [router]);

  const onSuggestionPress = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        isUser={item.role === "user"}
        colors={colors}
      />
    ),
    [colors],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const onScroll = useCallback(({ nativeEvent }) => {
    isUserScrolling.current = nativeEvent.contentOffset.y > 0;
  }, []);

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <View
        style={[
          staticStyles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary colors={colors}>
      <View
        style={[staticStyles.container, { backgroundColor: colors.background }]}
      >
        <SafeAreaView style={staticStyles.safeArea} edges={["top"]}>
          <ChatHeader
            colors={colors}
            onMenuPress={navigateMenu}
            onSettingsPress={navigateSettings}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={staticStyles.keyboardView}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={staticStyles.chatContentWrapper}>
              <View
                style={[
                  staticStyles.assistantStatus,
                  { backgroundColor: colors.primary + "1A" },
                ]}
              >
                <Sparkles size={16} color={colors.primary} />
                <Text
                  style={[staticStyles.statusText, { color: colors.primary }]}
                >
                  Architect Mode Active
                </Text>
              </View>

              {isHistoryLoading ? (
                <View style={staticStyles.historyLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[
                      staticStyles.historyLoadingText,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Retrieving conversation...
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={keyExtractor}
                  inverted
                  contentContainerStyle={staticStyles.chatContainer}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={12}
                  maxToRenderPerBatch={8}
                  windowSize={10}
                  removeClippedSubviews
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  ListFooterComponent={
                    <View style={staticStyles.flatListFooter} />
                  }
                />
              )}
            </View>

            <SuggestionChips
              colors={colors}
              onSuggestionPress={onSuggestionPress}
            />
            <ChatInput
              inputText={inputText}
              onChangeText={setInputText}
              onSend={() => handleSend()}
              placeholder="Message your Architect..."
              colors={colors}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  chatContentWrapper: {
    flex: 1,
  },
  chatContainer: {
    padding: SPACING.lg,
    paddingBottom: 20,
  },
  assistantStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.xl,
    justifyContent: "center",
    backgroundColor: "rgba(52, 144, 220, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: ROUNDNESS.full,
    alignSelf: "center",
  },
  statusText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
  },
  historyLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  historyLoadingText: {
    fontFamily: FONTS.label,
    fontSize: 13,
  },
  flatListFooter: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AIScreen;
