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

/** Groq does not support vision + tools on the same request. */
const GROQ_TOOL_MODEL = "llama-3.3-70b-versatile";

type ApiMessage = Record<string, unknown>;

export interface OpenAICompatibleOptions {
  /** Use a model that supports tools (e.g. Groq switches off the vision model). */
  toolUse?: boolean;
}

export function supportsWebSearchTools(provider: AIProvider): boolean {
  return (
    provider === "openai" ||
    provider === "groq" ||
    provider === "openrouter" ||
    provider === "nvidia"
  );
}

export function stripImageUrlsForToolUse(
  provider: AIProvider,
  messages: ApiMessage[],
): ApiMessage[] {
  if (provider !== "groq") return messages;

  return messages.map((message) => {
    const { content } = message;
    if (!Array.isArray(content)) return message;

    const blocks = content.filter(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: string }).type !== "image_url",
    );

    if (blocks.length === 0) {
      return {
        ...message,
        content:
          "(Image was attached but cannot be sent with web search on Groq.)",
      };
    }

    if (
      blocks.length === 1 &&
      (blocks[0] as { type?: string }).type === "text"
    ) {
      return { ...message, content: (blocks[0] as { text: string }).text };
    }

    return { ...message, content: blocks };
  });
}

export function getOpenAICompatibleConfig(
  settings: Settings,
  options?: OpenAICompatibleOptions,
): OpenAICompatibleConfig {
  const apiKey = getApiKeyForProvider(settings);
  const groqModel =
    options?.toolUse && settings.provider === "groq"
      ? GROQ_TOOL_MODEL
      : MODELS.groq!;
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
        model: groqModel,
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
        url: resolveNvidiaUrl(),
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
