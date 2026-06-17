import { getApiKey, type Settings } from "../settings";
import { createAnthropicChatService } from "./anthropicChat";
import { createGeminiChatService } from "./geminiChat";
import { createGroqChatService } from "./groqChat";
import { createMistralChatService } from "./mistralChat";
import { createOpenAIChatService } from "./openaiChat";
import { createOpenRouterChatService } from "./openrouterChat";
import type { ChatAIService } from "./types";

export type { ChatMessage, ChatRole } from "./types";

export function createChatService(settings: Settings): ChatAIService {
  const apiKey = getApiKey(settings);
  switch (settings.provider) {
    case "gemini":
      return createGeminiChatService(apiKey);
    case "openai":
      return createOpenAIChatService(apiKey);
    case "groq":
      return createGroqChatService(apiKey);
    case "anthropic":
      return createAnthropicChatService(apiKey);
    case "mistral":
      return createMistralChatService(apiKey);
    case "openrouter":
      return createOpenRouterChatService(apiKey, settings.openrouterModel);
  }
}
