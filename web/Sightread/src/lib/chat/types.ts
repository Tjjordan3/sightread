export type ChatRole = "user" | "assistant";

export interface ChatCitation {
  title: string;
  url: string;
  snippet?: string;
}

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
