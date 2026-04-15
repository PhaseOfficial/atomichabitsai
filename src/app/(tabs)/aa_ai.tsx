import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Send, Sparkles, User } from 'lucide-react-native';
import { COLORS, SPACING, FONTS, ROUNDNESS } from '@/src/constants/Theme';
import { callAiAssistant } from '@/src/lib/ai';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'expo-router';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

export default function AIScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const userId = user?.id || 'guest';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "Good morning. I've analyzed your schedule for today. You have a peak focus window starting in 15 minutes. Would you like to prepare for a Deep Work session?"
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
      const response = await callAiAssistant(messageText, userId);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: typeof response === 'string' ? response : response.message || "I'm processing that request now.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <View style={styles.avatarPlaceholder}>
                <Image 
                  source={require('@/assets/images/icon.png')} 
                  style={styles.avatarLogo} 
                  resizeMode="contain"
                />
              </View>
              <Image 
                source={require('@/assets/images/Artboard 1 logo.png')} 
                style={[styles.logoImage, { tintColor: colors.primary }]} 
                resizeMode="contain" 
              />
            </View>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/modal')}>
              <Settings size={20} color={colors.primary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer} 
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.assistantStatus}>
              <Sparkles size={16} color={colors.primary} />
              <Text style={styles.statusText}>BatsirAI Assistant Active</Text>
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
                </View>
                <Text style={styles.messageTime}>{message.time}</Text>
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
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
                'Optimize my schedule', 
                'Start focus session', 
                'Analyze my habits', 
                'How is my progress?'
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
                placeholder="Message BatsirAI Assistant..."
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
    padding: SPACING.lg,
    backgroundColor: colors.background,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: ROUNDNESS.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: {
    width: 24,
    height: 24,
  },
  logoImage: {
    height: 32,
    width: 120,
  },
  ghostBtn: {
    padding: 4,
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
