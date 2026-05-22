import { supabase } from "@/src/lib/supabase";
import { ChatRole } from "@/src/types/chat";

export interface AiAssistantResponse {
  reply?: string;
  error?: string;
}

export const buildSystemPrompt = (
  identityAnchor: string,
  habitContext: string,
) =>
  `You are Batsirai, a Habit Architect and productivity coach.
Your tone is encouraging, professional, and insightful.
User Profile: I am ${identityAnchor}.
User Progress: ${habitContext}

Always provide actionable advice based on Atomic Habits principles (e.g., 2-minute rule, habit stacking).`;

export const callAiAssistant = async (
  messages: Array<{ role: ChatRole; content: string }>,
  systemPrompt: string,
  onToken?: (token: string) => void,
): Promise<AiAssistantResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke("chat-ai", {
      body: { messages, systemPrompt },
    });

    if (error) {
      console.error("Supabase Function Error:", error);
      throw error;
    }

    if (typeof data === "object" && data !== null) {
      return data as AiAssistantResponse;
    }

    return { error: "Invalid AI response format." };
  } catch (err) {
    console.error("AI Assistant Error:", err);
    if (onToken) {
      onToken(String(err));
    }
    throw err;
  }
};
