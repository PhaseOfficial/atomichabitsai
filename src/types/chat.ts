export type ChatRole = "user" | "assistant";
export type ChatStatus = "sending" | "sent" | "error" | "streaming";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: ChatStatus;
  action?: string;
}
