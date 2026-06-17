import type { ChatAIService, ChatMessage } from "../chat/types";
import {
  getApiKey,
  type Settings,
} from "../settings";
import { usesBackendRoute } from "../ai/access";
import { backendChat } from "../backend/client";
import { createGeminiChatService } from "../chat/geminiChat";
import { createGroqChatService } from "../chat/groqChat";
import { createOpenAIChatService } from "../chat/openaiChat";
import { VisionAIError } from "../vision/types";

function createLocalChatService(settings: Settings): ChatAIService {
  const apiKey = getApiKey(settings);
  switch (settings.provider) {
    case "gemini":
      return createGeminiChatService(apiKey);
    case "openai":
      return createOpenAIChatService(apiKey);
    case "groq":
      return createGroqChatService(apiKey);
  }
}

function createRemoteChatService(settings: Settings): ChatAIService {
  return {
    async chat(messages: ChatMessage[], attachedImageBase64?: string) {
      const turns = messages.map((m) => ({ role: m.role, text: m.text }));
      return backendChat(settings, settings.provider, turns, attachedImageBase64);
    },
  };
}

export function createChatService(settings: Settings): ChatAIService {
  const local = createLocalChatService(settings);
  const remote = createRemoteChatService(settings);

  if (settings.apiAccessMode === "local") {
    return local;
  }

  if (settings.apiAccessMode === "backend") {
    return remote;
  }

  return {
    async chat(messages, attachedImageBase64) {
      if (usesBackendRoute(settings)) {
        try {
          return await remote.chat(messages, attachedImageBase64);
        } catch (err) {
          const apiKey = getApiKey(settings).trim();
          if (!apiKey) throw err;
          try {
            return await local.chat(messages, attachedImageBase64);
          } catch (localErr) {
            const backendMsg =
              err instanceof Error ? err.message : "Backend chat failed.";
            const localMsg =
              localErr instanceof Error ? localErr.message : "Local chat failed.";
            throw new VisionAIError(
              `Backend failed (${backendMsg}). Local fallback also failed (${localMsg}).`,
            );
          }
        }
      }
      return local.chat(messages, attachedImageBase64);
    },
  };
}
