import { supabase } from './supabase';

export const callAiAssistant = async (prompt: string, userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { prompt, userId },
    });

    if (error) throw error;
    
    // Once remote data is updated via the AI Assistant,
    // we should sync it back to local SQLite if online.
    // This is handled by a separate sync process or a manual trigger.
    return data;
  } catch (error) {
    console.error('AI Assistant Error:', error);
    throw error;
  }
};
