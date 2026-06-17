import {
  getPromptPreset,
  resolveVisionPrompt,
  type PromptMode,
  type ResolvedVisionPrompt,
} from "./promptPresets";
import {
  type AIProvider,
  getProviderDefinition,
  hasApiKeyForProvider,
} from "./providers";
import type { ThemeSetting } from "./theme";

export type { AIProvider };

export interface Settings {
  provider: AIProvider;
  theme: ThemeSetting;
  openrouterModel: string;
  promptMode: PromptMode;
  selectedPromptId: string;
  analysisIntervalSec: number;
  isAIEnabled: boolean;
  isTTSEnabled: boolean;
  speakChatReplies: boolean;
  alwaysListening: boolean;
  wakeWordEnabled: boolean;
  silenceTimeoutMs: number;
  geminiApiKey: string;
  openAIApiKey: string;
  groqApiKey: string;
  anthropicApiKey: string;
  mistralApiKey: string;
  openrouterApiKey: string;
}

const STORAGE_KEY = "sightread_settings";

const DEFAULTS: Settings = {
  provider: "gemini",
  theme: "auto",
  openrouterModel: "google/gemini-2.0-flash-001",
  promptMode: "auto",
  selectedPromptId: "scene",
  analysisIntervalSec: 3,
  isAIEnabled: true,
  isTTSEnabled: false,
  speakChatReplies: true,
  alwaysListening: false,
  wakeWordEnabled: false,
  silenceTimeoutMs: 1200,
  geminiApiKey: "",
  openAIApiKey: "",
  groqApiKey: "",
  anthropicApiKey: "",
  mistralApiKey: "",
  openrouterApiKey: "",
};

const VALID_PROVIDERS = new Set<string>([
  "gemini",
  "openai",
  "groq",
  "anthropic",
  "mistral",
  "openrouter",
]);

const VALID_THEMES = new Set<string>(["light", "dark", "auto"]);

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const provider = VALID_PROVIDERS.has(parsed.provider ?? "")
      ? (parsed.provider as AIProvider)
      : DEFAULTS.provider;
    const theme = VALID_THEMES.has(parsed.theme ?? "")
      ? (parsed.theme as ThemeSetting)
      : DEFAULTS.theme;
    return {
      ...DEFAULTS,
      ...parsed,
      provider,
      theme,
      promptMode: parsed.promptMode === "manual" ? "manual" : "auto",
      analysisIntervalSec: Math.min(
        10,
        Math.max(2, parsed.analysisIntervalSec ?? DEFAULTS.analysisIntervalSec),
      ),
      silenceTimeoutMs: Math.min(
        3000,
        Math.max(600, parsed.silenceTimeoutMs ?? DEFAULTS.silenceTimeoutMs),
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export { hasApiKeyForProvider };

export function getSelectedPrompt(settings: Settings) {
  return getPromptPreset(settings.selectedPromptId);
}

export function getVisionPrompt(
  settings: Settings,
  context?: { userText?: string },
): ResolvedVisionPrompt {
  return resolveVisionPrompt(
    settings.promptMode,
    settings.selectedPromptId,
    context,
  );
}

export function getApiKey(settings: Settings): string {
  return getProviderDefinition(settings.provider).getKey(settings);
}
