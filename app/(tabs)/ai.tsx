import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Settings, Mic, Send, Bot, Terminal } from 'lucide-react-native';
import { COLORS, SPACING, ROUNDNESS, FONTS } from '../../src/constants/Theme';
import { callAiAssistant } from '../../src/lib/ai';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
}

export default function AIScreen() {
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
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputText.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await callAiAssistant(userMessage.text, 'user-123');
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.message || response.text || "ERROR: UNKNOWN_RESPONSE_FORMAT",
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: "ERROR: CONNECTION_FAILURE. REATTEMPT_MANDATORY.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>RB</Text>
          </View>
          <Text style={styles.logoText}>RCS BATSIRAI</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Settings size={20} color={COLORS.primary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={styles.statusBadge}>
            <Terminal size={14} color={COLORS.primary} />
            <Text style={styles.statusText}>{isLoading ? 'PROCESSING_REQUEST...' : 'BATSIR_AI / READY'}</Text>
          </View>
        </View>

        {messages.map((message) => (
          <View key={message.id} style={styles.messageBlock}>
            <View style={styles.messageHeader}>
              <Text style={message.sender === 'ai' ? styles.aiName : styles.userName}>
                {message.sender === 'ai' ? 'BATSIR_SYSTEM' : 'USER_ALPHA'}
              </Text>
              <Text style={styles.messageTime}>{message.time}</Text>
            </View>
            <View style={[styles.technicalBlock, message.sender === 'user' && styles.userTechnicalBlock]}>
              <Text style={[styles.messageText, message.sender === 'user' && { color: '#fff' }]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>FETCHING_DATA...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Input Section */}
      <View style={styles.inputSection}>
        {/* Suggested Prompts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll} contentContainerStyle={styles.suggestionsContent}>
          {['UPDATE_SCHEDULE', 'IDENTITY_CHECK', 'SYSTEM_SUMMARY'].map((prompt, i) => (
            <TouchableOpacity key={i} style={styles.suggestionButton} onPress={() => setInputText(prompt)}>
              <Text style={styles.suggestionText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBarContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="INPUT_COMMAND_HERE..." 
            placeholderTextColor={COLORS.outline}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isLoading}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(119, 119, 119, 0.15)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontFamily: FONTS.label,
    fontSize: 12,
  },
  logoText: {
    fontSize: 14,
    fontFamily: FONTS.labelSm,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  iconButton: {
    padding: 4,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  statusContainer: {
    marginBottom: SPACING.xl,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    gap: 8,
  },
  statusText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  messageBlock: {
    marginBottom: SPACING.xl,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  aiName: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  userName: {
    fontFamily: FONTS.labelSm,
    fontSize: 9,
    color: COLORS.outline,
    letterSpacing: 1.5,
  },
  messageTime: {
    fontFamily: FONTS.label,
    fontSize: 8,
    color: COLORS.outline,
  },
  technicalBlock: {
    backgroundColor: '#fff',
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(119, 119, 119, 0.15)',
  },
  userTechnicalBlock: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  messageText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.primary,
    lineHeight: 22,
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
    color: COLORS.outline,
    letterSpacing: 1,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(119, 119, 119, 0.15)',
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
    borderColor: 'rgba(119, 119, 119, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    fontFamily: FONTS.label,
    fontSize: 10,
    color: COLORS.outline,
    letterSpacing: 0.5,
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 4,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.label,
    fontSize: 14,
    color: COLORS.primary,
    paddingHorizontal: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});