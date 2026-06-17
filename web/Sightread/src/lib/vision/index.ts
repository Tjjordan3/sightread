import type { AIProvider } from "../settings";
import { createGeminiVisionService } from "./geminiVision";
import { createOpenAIVisionService } from "./openaiVision";
import type { VisionAIService } from "./types";

export { VisionAIError } from "./types";

export function createVisionService(
  provider: AIProvider,
  apiKey: string,
): VisionAIService {
  return provider === "gemini"
    ? createGeminiVisionService(apiKey)
    : createOpenAIVisionService(apiKey);
}
