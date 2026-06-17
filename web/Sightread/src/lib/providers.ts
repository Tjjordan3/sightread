import type { Settings } from "./settings";

export type AIProvider =
  | "gemini"
  | "openai"
  | "groq"
  | "anthropic"
  | "mistral"
  | "openrouter"
  | "nvidia";

export interface ProviderDefinition {
  id: AIProvider;
  label: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyHint: string;
  getKey: (settings: Settings) => string;
}

export const AI_PROVIDERS: ProviderDefinition[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    keyLabel: "Gemini API key",
    keyPlaceholder: "From Google AI Studio",
    keyHint: "aistudio.google.com",
    getKey: (s) => s.geminiApiKey,
  },
  {
    id: "openai",
    label: "OpenAI",
    keyLabel: "OpenAI API key",
    keyPlaceholder: "sk-…",
    keyHint: "platform.openai.com",
    getKey: (s) => s.openAIApiKey,
  },
  {
    id: "groq",
    label: "Groq",
    keyLabel: "Groq API key",
    keyPlaceholder: "gsk_…",
    keyHint: "console.groq.com",
    getKey: (s) => s.groqApiKey,
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    keyLabel: "Anthropic API key",
    keyPlaceholder: "sk-ant-…",
    keyHint: "console.anthropic.com",
    getKey: (s) => s.anthropicApiKey,
  },
  {
    id: "mistral",
    label: "Mistral",
    keyLabel: "Mistral API key",
    keyPlaceholder: "…",
    keyHint: "console.mistral.ai",
    getKey: (s) => s.mistralApiKey,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyLabel: "OpenRouter API key",
    keyPlaceholder: "sk-or-…",
    keyHint: "openrouter.ai — one key for many models",
    getKey: (s) => s.openrouterApiKey,
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    keyLabel: "NVIDIA API key",
    keyPlaceholder: "nvapi-…",
    keyHint: "build.nvidia.com — free developer API",
    getKey: (s) => s.nvidiaApiKey,
  },
];

export function getProviderDefinition(id: AIProvider): ProviderDefinition {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

export function hasApiKeyForProvider(
  settings: Settings,
  provider: AIProvider = settings.provider,
): boolean {
  return getProviderDefinition(provider).getKey(settings).trim().length > 0;
}
