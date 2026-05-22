import { supabase } from './supabase';

export interface AIMessage {
  text: string;
  sender: 'user' | 'ai';
}

export const callAiAssistant = async (messages: AIMessage[], systemPrompt?: string) => {
  try {
    // Supabase client automatically includes the session JWT in the Authorization header
    // if a session exists and AsyncStorage is configured.
    const { data, error } = await supabase.functions.invoke('chat-ai', {
      body: { messages, systemPrompt },
    });

    if (error) {
      console.error('Supabase Function Error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('AI Assistant Error:', error);
    throw error;
  }
};
