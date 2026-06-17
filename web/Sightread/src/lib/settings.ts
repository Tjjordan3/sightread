import { getPromptPreset } from "./promptPresets";

export type AIProvider = "gemini" | "openai";

export interface Settings {
  provider: AIProvider;
  selectedPromptId: string;
  analysisIntervalSec: number;
  isAIEnabled: boolean;
  isTTSEnabled: boolean;
  geminiApiKey: string;
  openAIApiKey: string;
}

const STORAGE_KEY = "sightread_settings";

const DEFAULTS: Settings = {
  provider: "gemini",
  selectedPromptId: "scene",
  analysisIntervalSec: 3,
  isAIEnabled: true,
  isTTSEnabled: false,
  geminiApiKey: "",
  openAIApiKey: "",
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
  return provider === "gemini"
    ? settings.geminiApiKey.trim().length > 0
    : settings.openAIApiKey.trim().length > 0;
}

export function getSelectedPrompt(settings: Settings) {
  return getPromptPreset(settings.selectedPromptId);
}

export function getApiKey(settings: Settings): string {
  return settings.provider === "gemini"
    ? settings.geminiApiKey
    : settings.openAIApiKey;
}
