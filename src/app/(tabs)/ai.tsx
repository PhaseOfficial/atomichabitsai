import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Settings, Mic, Send, Bot, Terminal } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '@/src/constants/Theme';
import { callAiAssistant } from '@/src/lib/ai';
import { useTheme } from '@/src/hooks/useTheme';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

export default function AIScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      time: '10:02 AM',
      text: "SYSTEM_INITIALIZED. Analyzing biometric and schedule data... Optimization window identified between 10:00 and 12:00. Recommendation: Execute DEEP_WORK protocol."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await callAiAssistant(inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
        <TouchableOpacity style={styles.ghostBtn}>
          <Settings size={20} color={colors.primary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.chatContainer} 
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.systemStatus}>
          <Terminal size={14} color={colors.outline} />
          <Text style={styles.systemStatusText}>CONNECTION_SECURE // BATSIR_AI_NODE_01</Text>
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
              message.sender === 'user' ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.aiBubble, { borderColor: colors.outline + '26', backgroundColor: colors.surface }]
            ]}>
              <Text style={[
                styles.messageText,
                message.sender === 'user' ? { color: colors.onPrimary } : { color: colors.primary }
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
            <Text style={styles.loadingText}>PROCESSING_QUERY...</Text>
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
          {['OPTIMIZE_SCHEDULE', 'REINFORCE_HABITS', 'EXECUTE_SPRINT', 'IDENTITY_AUDIT'].map((suggestion) => (
            <TouchableOpacity 
              key={suggestion} 
              style={[styles.suggestionButton, { borderColor: colors.outline + '26' }]}
              onPress={() => setInputText(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.inputBarContainer, { borderColor: colors.primary }]}>
          <TextInput
            style={[styles.input, { color: colors.primary }]}
            placeholder="ENTER_COMMAND..."
            placeholderTextColor={colors.outline + '80'}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: colors.primary }]} 
            onPress={handleSend}
          >
            <Send size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '26',
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
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 40,
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
    justifyContent: 'center',
  },
  systemStatusText: {
    fontFamily: FONTS.label,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1,
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
    padding: 16,
    borderWidth: 1,
  },
  aiBubble: {
  },
  userBubble: {
    borderWidth: 0,
  },
  messageText: {
    fontFamily: FONTS.label,
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: colors.outline,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.lg,
  },
  loadingText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 1,
  },
  inputSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline + '26',
    paddingBottom: 110, 
  },
  suggestionsScroll: {
    paddingVertical: SPACING.md,
  },
  suggestionsContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  suggestionButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    padding: 4,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.label,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
