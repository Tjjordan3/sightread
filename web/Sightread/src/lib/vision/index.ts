import { getApiKey, type Settings } from "../settings";
import { createAnthropicVisionService } from "./anthropicVision";
import { createGeminiVisionService } from "./geminiVision";
import { createGroqVisionService } from "./groqVision";
import { createMistralVisionService } from "./mistralVision";
import { createNvidiaVisionService } from "./nvidiaVision";
import { createOpenAIVisionService } from "./openaiVision";
import { createOpenRouterVisionService } from "./openrouterVision";
import type { VisionAIService } from "./types";

export { VisionAIError } from "./types";

export function createVisionService(settings: Settings): VisionAIService {
  const apiKey = getApiKey(settings);
  switch (settings.provider) {
    case "gemini":
      return createGeminiVisionService(apiKey);
    case "openai":
      return createOpenAIVisionService(apiKey);
    case "groq":
      return createGroqVisionService(apiKey);
    case "anthropic":
      return createAnthropicVisionService(apiKey);
    case "mistral":
      return createMistralVisionService(apiKey);
    case "openrouter":
      return createOpenRouterVisionService(apiKey, settings.openrouterModel);
    case "nvidia":
      return createNvidiaVisionService(apiKey, settings.nvidiaModel);
  }
}
