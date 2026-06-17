import type { AIProvider } from "../settings";
import { createGeminiChatService } from "./geminiChat";
import { createOpenAIChatService } from "./openaiChat";
import type { ChatAIService } from "./types";

export type { ChatMessage, ChatRole } from "./types";

export function createChatService(
  provider: AIProvider,
  apiKey: string,
): ChatAIService {
  return provider === "gemini"
    ? createGeminiChatService(apiKey)
    : createOpenAIChatService(apiKey);
}
