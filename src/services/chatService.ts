import { supabase } from "@/src/lib/supabase";
import { ChatMessage } from "@/src/types/chat";

const createUniqueId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const createUserMessage = (content: string): ChatMessage => ({
  id: createUniqueId(),
  role: "user",
  content,
  createdAt: Date.now(),
  status: "sent",
});

export const createAssistantMessage = (
  content: string,
  status: ChatMessage["status"] = "sending",
): ChatMessage => ({
  id: createUniqueId(),
  role: "assistant",
  content,
  createdAt: Date.now(),
  status,
});

export const createGreetingMessage = (): ChatMessage => ({
  id: "welcome-architect",
  role: "assistant",
  content:
    "I'm Batsirai, your Habit Architect. I can help you build consistency, audit your schedule, or refine your 'Two-Minute' versions. How can we find your flow today?",
  createdAt: Date.now(),
  status: "sent",
});

export const mapChatRecordToMessage = (record: any): ChatMessage => ({
  id: record.id || createUniqueId(),
  role: record.sender === "ai" ? "assistant" : "user",
  content: record.text || "",
  createdAt: record.created_at
    ? new Date(record.created_at).getTime()
    : Date.now(),
  status: "sent",
  action: record.action,
});

export const fetchChatHistory = async (
  userId: string,
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapChatRecordToMessage);
};

export const saveChatMessage = async (
  userId: string,
  message: ChatMessage,
): Promise<void> => {
  const sender = message.role === "assistant" ? "ai" : "user";
  const payload = {
    user_id: userId,
    sender,
    text: message.content,
    created_at: new Date(message.createdAt).toISOString(),
  };

  const { error } = await supabase.from("chat_messages").insert(payload);

  if (error) {
    console.warn("Failed to persist chat message", error);
    throw error;
  }
};

export const serializeHistoryMessage = (message: ChatMessage) => ({
  role: message.role,
  content: message.content,
});
