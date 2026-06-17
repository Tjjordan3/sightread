import type { AIProvider } from "../settings";
import { createGeminiVisionService } from "./geminiVision";
import { createGroqVisionService } from "./groqVision";
import { createOpenAIVisionService } from "./openaiVision";
import type { VisionAIService } from "./types";

export { VisionAIError } from "./types";

export function createVisionService(
  provider: AIProvider,
  apiKey: string,
): VisionAIService {
  switch (provider) {
    case "gemini":
      return createGeminiVisionService(apiKey);
    case "openai":
      return createOpenAIVisionService(apiKey);
    case "groq":
      return createGroqVisionService(apiKey);
  }
}
