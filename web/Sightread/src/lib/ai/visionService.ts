import {
  getApiKey,
  type Settings,
} from "../settings";
import { usesBackendRoute } from "./access";
import { backendVision } from "../backend/client";
import { createGeminiVisionService } from "../vision/geminiVision";
import { createGroqVisionService } from "../vision/groqVision";
import { createOpenAIVisionService } from "../vision/openaiVision";
import type { VisionAIService } from "../vision/types";
import { VisionAIError } from "../vision/types";

function createLocalVisionService(settings: Settings): VisionAIService {
  const apiKey = getApiKey(settings);
  switch (settings.provider) {
    case "gemini":
      return createGeminiVisionService(apiKey);
    case "openai":
      return createOpenAIVisionService(apiKey);
    case "groq":
      return createGroqVisionService(apiKey);
  }
}

function createRemoteVisionService(settings: Settings): VisionAIService {
  return {
    async analyze(jpegBase64, prompt) {
      return backendVision(settings, settings.provider, prompt, jpegBase64);
    },
  };
}

export function createVisionService(settings: Settings): VisionAIService {
  const local = createLocalVisionService(settings);
  const remote = createRemoteVisionService(settings);

  if (settings.apiAccessMode === "local") {
    return local;
  }

  if (settings.apiAccessMode === "backend") {
    return remote;
  }

  return {
    async analyze(jpegBase64, prompt) {
      if (usesBackendRoute(settings)) {
        try {
          return await remote.analyze(jpegBase64, prompt);
        } catch (err) {
          const apiKey = getApiKey(settings).trim();
          if (!apiKey) throw err;
          try {
            return await local.analyze(jpegBase64, prompt);
          } catch (localErr) {
            const backendMsg =
              err instanceof Error ? err.message : "Backend vision failed.";
            const localMsg =
              localErr instanceof Error ? localErr.message : "Local vision failed.";
            throw new VisionAIError(
              `Backend failed (${backendMsg}). Local fallback also failed (${localMsg}).`,
            );
          }
        }
      }
      return local.analyze(jpegBase64, prompt);
    },
  };
}
