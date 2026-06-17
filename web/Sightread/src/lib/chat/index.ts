import type { AIProvider } from "../settings";
import { createGeminiChatService } from "./geminiChat";
import { createGroqChatService } from "./groqChat";
import { createOpenAIChatService } from "./openaiChat";
import type { ChatAIService } from "./types";

export type { ChatMessage, ChatRole } from "./types";

export function createChatService(
  provider: AIProvider,
  apiKey: string,
): ChatAIService {
  switch (provider) {
    case "gemini":
      return createGeminiChatService(apiKey);
    case "openai":
      return createOpenAIChatService(apiKey);
    case "groq":
      return createGroqChatService(apiKey);
  }
}
