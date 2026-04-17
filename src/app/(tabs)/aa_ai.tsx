import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Send, Sparkles, User, Menu, CheckCircle2, RefreshCcw } from 'lucide-react-native';
import { COLORS, SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { callAiAssistant } from '@/src/lib/ai';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useData } from '@/src/hooks/useData';
import { syncWithSupabase } from '@/src/lib/sync';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
  action?: string;
}

export default function AIScreen() {
  const { colors, identityAnchor } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const userId = user?.id || 'guest';

  // Fetch context to pass to AI
  const { data: habits } = useData<{title: string, current_streak: number, two_minute_version: string}>(
    'SELECT title, current_streak, two_minute_version FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)',
    [userId]
  );

  const habitContext = useMemo(() => {
    if (habits.length === 0) return "User has no active habits yet.";
    return "Current Habits:\n" + habits.map(h => `- ${h.title} (Streak: ${h.current_streak}, 2-min: ${h.two_minute_version})`).join('\n');
  }, [habits]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "I'm Batsirai, your Habit Architect. I can help you build consistency, audit your schedule, or refine your 'Two-Minute' versions. How can we find your flow today?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text: string = inputText) => {
    const messageText = text.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Include context in the prompt for the AI assistant
      const contextualPrompt = `Context: I am ${identityAnchor}. ${habitContext}\n\nUser Message: ${messageText}`;
      
      const response = await callAiAssistant(contextualPrompt, userId);
      
      let aiText = "I've processed your request.";
      let actionExecuted = undefined;

      if (response && typeof response === 'object') {
        if (response.success) {
          actionExecuted = response.action;
          if (actionExecuted === 'CREATE_HABIT') {
             aiText = `I've architected a new habit for you: "${response.data?.[0]?.title || 'New Habit'}". It's been added to your dashboard.`;
             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
             syncWithSupabase();
          } else if (actionExecuted === 'ADD_LOG') {
             aiText = "Success. I've logged that session for you. Every vote counts.";
             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
             syncWithSupabase();
          } else {
             aiText = response.message || "Action executed successfully.";
          }
        } else {
          aiText = response.error || "I encountered an issue executing that action.";
        }
      } else if (typeof response === 'string') {
        aiText = response;
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: actionExecuted
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting to the system. Please try again in a moment.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/menu');
          }}>
            <Menu size={24} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/Artboard 1 logo.png')} 
              style={[styles.logoImage, { tintColor: colors.primary }]} 
              resizeMode="contain" 
            />
          </View>

          <TouchableOpacity style={styles.ghostBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/modal');
          }}>
            <Settings size={20} color={colors.primary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer} 
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.assistantStatus}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={styles.statusText}>Architect Mode Active</Text>
            </View>

            {messages.map((message) => (
              <View 
                key={message.id} 
                style={[
                  styles.messageWrapper, 
                  message.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.aiBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    message.sender === 'user' ? { color: colors.onPrimary } : { color: colors.onSurface }
                  ]}>
                    {message.text}
                  </Text>
                  {message.action && (
                    <View style={styles.actionBadge}>
                      <CheckCircle2 size={12} color={message.sender === 'user' ? colors.onPrimary : colors.primary} />
                      <Text style={[styles.actionText, { color: message.sender === 'user' ? colors.onPrimary : colors.primary }]}>
                        {message.action.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.messageTime}>{message.time}</Text>
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Architecting response...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputSection}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsContent}
            >
              {[
                'Audit my habits', 
                'Suggest a 2-min version', 
                'Log my workout', 
                'Help me build a morning routine'
              ].map((suggestion) => (
                <TouchableOpacity 
                  key={suggestion} 
                  style={styles.suggestionButton}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inputBarContainer}>
              <TextInput
                style={styles.input}
                placeholder="Message your Architect..."
                placeholderTextColor={colors.onSurfaceVariant + '80'}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                multiline={false}
              />
              <TouchableOpacity 
                style={[styles.sendButton, { backgroundColor: colors.primary }]} 
                onPress={() => handleSend()}
              >
                <Send size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.background,
    height: 60,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  menuBtn: {
    padding: 8,
  },
  logoImage: {
    height: 40,
    width: 160,
  },
  ghostBtn: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: SPACING.lg,
    paddingBottom: 20,
  },
  assistantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
    justifyContent: 'center',
    backgroundColor: colors.primary + '1A',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: ROUNDNESS.full,
    alignSelf: 'center',
  },
  statusText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.primary,
  },
  messageWrapper: {
    marginBottom: SPACING.lg,
    maxWidth: '85%',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageBubble: {
    padding: 14,
    borderRadius: ROUNDNESS.lg,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '4D',
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
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontFamily: FONTS.label,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  messageTime: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  inputSection: {
    backgroundColor: colors.surface,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  suggestionsScroll: {
    paddingVertical: SPACING.md,
  },
  suggestionsContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: colors.surfaceVariant + '80',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '33',
  },
  suggestionText: {
    fontFamily: FONTS.labelSm,
    fontSize: 11,
    color: colors.onSurface,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant + '80',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
