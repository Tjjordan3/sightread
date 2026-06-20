export type ChatRole = "user" | "assistant";

/** Same shape as search API results — shared with SourceLinks and vision. */
export type { SearchCitation as ChatCitation } from "../search/tavilyClient";
import type { SearchCitation as ChatCitation } from "../search/tavilyClient";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  imagePreviewUrl?: string;
  attachedImageBytes?: number;
  citations?: ChatCitation[];
}

export interface ChatReply {
  text: string;
  citations?: ChatCitation[];
}

export interface ChatAIService {
  chat(
    messages: ChatMessage[],
    attachedImageBase64?: string,
  ): Promise<ChatReply>;
}

function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .slice(-20)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n");
}

export { buildTranscript };
