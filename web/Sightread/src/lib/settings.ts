import { getPromptPreset } from "./promptPresets";

export type AIProvider = "gemini" | "openai" | "groq";

export interface Settings {
  provider: AIProvider;
  selectedPromptId: string;
  analysisIntervalSec: number;
  isAIEnabled: boolean;
  isTTSEnabled: boolean;
  speakChatReplies: boolean;
  geminiApiKey: string;
  openAIApiKey: string;
  groqApiKey: string;
}

const STORAGE_KEY = "sightread_settings";

const DEFAULTS: Settings = {
  provider: "gemini",
  selectedPromptId: "scene",
  analysisIntervalSec: 3,
  isAIEnabled: true,
  isTTSEnabled: false,
  speakChatReplies: true,
  geminiApiKey: "",
  openAIApiKey: "",
  groqApiKey: "",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...parsed,
      analysisIntervalSec: Math.min(
        10,
        Math.max(2, parsed.analysisIntervalSec ?? DEFAULTS.analysisIntervalSec),
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function hasApiKeyForProvider(
  settings: Settings,
  provider: AIProvider = settings.provider,
): boolean {
  switch (provider) {
    case "gemini":
      return settings.geminiApiKey.trim().length > 0;
    case "openai":
      return settings.openAIApiKey.trim().length > 0;
    case "groq":
      return settings.groqApiKey.trim().length > 0;
  }
}

export function getSelectedPrompt(settings: Settings) {
  return getPromptPreset(settings.selectedPromptId);
}

export function getApiKey(settings: Settings): string {
  switch (settings.provider) {
    case "gemini":
      return settings.geminiApiKey;
    case "openai":
      return settings.openAIApiKey;
    case "groq":
      return settings.groqApiKey;
  }
}
