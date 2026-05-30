import {
    createGreetingMessage,
    fetchChatHistory,
} from "@/src/services/chatService";
import { ChatMessage } from "@/src/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";

export function useChatHistory(userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setStableMessages = useCallback(
    (action: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessages((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const appendMessage = useCallback(
    (next: ChatMessage | ChatMessage[]) => {
      setStableMessages((prev) => {
        const nextMessages = Array.isArray(next) ? next : [next];
        // Prepend so the newest messages are at index 0
        return [...nextMessages.reverse(), ...prev];
      });
    },
    [setStableMessages],
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setStableMessages((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [setStableMessages],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setStableMessages([createGreetingMessage()]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const history = await fetchChatHistory(userId);
      if (history.length > 0) {
        setStableMessages(history);
      } else {
        setStableMessages([createGreetingMessage()]);
      }
      setError(null);
    } catch (err) {
      console.error("Chat history fetch failed:", err);
      setError(err as Error);
      setStableMessages([createGreetingMessage()]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, setStableMessages]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    messages,
    messagesRef,
    isLoading,
    error,
    appendMessage,
    updateMessage,
    refresh,
  };
}
