import { buildSystemPrompt, callAiAssistant } from "@/src/services/aiService";
import {
    createAssistantMessage,
    createUserMessage,
    saveChatMessage,
    serializeHistoryMessage,
} from "@/src/services/chatService";
import { ChatMessage } from "@/src/types/chat";
import type { MutableRefObject } from "react";
import { useCallback, useState } from "react";

interface UseAIChatProps {
  userId: string | null;
  identityAnchor: string;
  habitContext: string;
  messagesRef: MutableRefObject<ChatMessage[]>;
  appendMessage: (message: ChatMessage | ChatMessage[]) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
}

export function useAIChat({
  userId,
  identityAnchor,
  habitContext,
  messagesRef,
  appendMessage,
  updateMessage,
}: UseAIChatProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (rawText: string) => {
      console.log("[useAIChat] sendMessage started", { rawText });
      const content = rawText.trim();
      if (!content) return;
      if (!userId) {
        console.warn("[useAIChat] No userId found");
        setError(new Error("Authentication required to chat."));
        return;
      }

      const userMessage = createUserMessage(content);
      const pendingAssistantMessage = createAssistantMessage("", "sending");
      
      console.log("[useAIChat] Appending user and pending messages");
      appendMessage([userMessage, pendingAssistantMessage]);
      
      const systemPrompt = buildSystemPrompt(identityAnchor, habitContext);
      setIsSending(true);
      setError(null);

      const conversation = [...[...messagesRef.current].reverse(), userMessage].map(
        serializeHistoryMessage,
      );
      console.log("[useAIChat] Prepared conversation length:", conversation.length);

      try {
        await saveChatMessage(userId, userMessage);
        console.log("[useAIChat] User message saved to DB");
      } catch (saveError) {
        console.warn("[useAIChat] Unable to persist user message:", saveError);
      }

      try {
        console.log("[useAIChat] Calling AI Assistant...");
        const response = await callAiAssistant(conversation, systemPrompt);
        console.log("[useAIChat] AI Response received", { hasReply: !!response.reply });
        
        const reply =
          response.reply ??
          "I'm here to help — let's try again with a clearer request.";

        updateMessage(pendingAssistantMessage.id, {
          content: reply,
          status: "sent",
          createdAt: Date.now(),
        });
        console.log("[useAIChat] Updated UI with AI reply");

        try {
          await saveChatMessage(userId, {
            ...pendingAssistantMessage,
            content: reply,
            status: "sent",
            createdAt: Date.now(),
          });
          console.log("[useAIChat] AI response saved to DB");
        } catch (saveError) {
          console.warn("[useAIChat] Unable to persist assistant response:", saveError);
        }
      } catch (aiError) {
        console.error("[useAIChat] AI Error:", aiError);
        const fallback =
          "I'm sorry, I'm having trouble connecting to the system. Please try again in a moment.";
        updateMessage(pendingAssistantMessage.id, {
          content: fallback,
          status: "error",
          createdAt: Date.now(),
        });
        setError(aiError as Error);
      } finally {
        setIsSending(false);
        console.log("[useAIChat] sendMessage finished");
      }
    },
    [
      appendMessage,
      habitContext,
      identityAnchor,
      messagesRef,
      updateMessage,
      userId,
    ],
  );

  return { isSending, sendMessage, error };
}
