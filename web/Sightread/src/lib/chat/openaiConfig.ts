import type { AIProvider } from "../providers";
import { resolveNvidiaUrl } from "../nvidia/request";
import type { Settings } from "../settings";

export interface OpenAICompatibleConfig {
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

const MODELS: Partial<Record<AIProvider, string>> = {
  openai: "gpt-4o-mini",
  groq: "meta-llama/llama-4-scout-17b-16e-instruct",
};

export function supportsWebSearchTools(provider: AIProvider): boolean {
  return (
    provider === "openai" ||
    provider === "groq" ||
    provider === "openrouter" ||
    provider === "nvidia"
  );
}

export function getOpenAICompatibleConfig(
  settings: Settings,
): OpenAICompatibleConfig {
  const apiKey = getApiKeyForProvider(settings);
  switch (settings.provider) {
    case "openai":
      return {
        url: "https://api.openai.com/v1/chat/completions",
        apiKey,
        model: MODELS.openai!,
      };
    case "groq":
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        model: MODELS.groq!,
      };
    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        model: settings.openrouterModel,
        extraHeaders: {
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
          "X-Title": "Sightread",
        },
      };
    case "nvidia":
      return {
        url: resolveNvidiaUrl(settings.nvidiaProxyPath),
        apiKey,
        model: settings.nvidiaModel,
      };
    default:
      throw new Error(`Provider ${settings.provider} does not support web search tools.`);
  }
}

function getApiKeyForProvider(settings: Settings): string {
  switch (settings.provider) {
    case "openai":
      return settings.openAIApiKey;
    case "groq":
      return settings.groqApiKey;
    case "openrouter":
      return settings.openrouterApiKey;
    case "nvidia":
      return settings.nvidiaApiKey;
    default:
      return "";
  }
}
