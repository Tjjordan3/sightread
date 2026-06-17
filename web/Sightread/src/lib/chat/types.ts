export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  imagePreviewUrl?: string;
  attachedImageBytes?: number;
}

export interface ChatAIService {
  chat(messages: ChatMessage[], attachedImageBase64?: string): Promise<string>;
}

function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .slice(-20)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`)
    .join("\n");
}

export { buildTranscript };
