import {
  getPromptPreset,
  resolveVisionPrompt,
  type PromptMode,
  type ResolvedVisionPrompt,
} from "./promptPresets";
import {
  getAIAccessHint,
  hasAIAccess,
  hasLocalApiKey,
  isBackendConfigured,
  usesBackendRoute,
} from "./ai/access";

export type AIProvider = "gemini" | "openai" | "groq";
export type ApiAccessMode = "local" | "backend" | "auto";

export interface Settings {
  provider: AIProvider;
  promptMode: PromptMode;
  selectedPromptId: string;
  analysisIntervalSec: number;
  isAIEnabled: boolean;
  isTTSEnabled: boolean;
  speakChatReplies: boolean;
  alwaysListening: boolean;
  wakeWordEnabled: boolean;
  silenceTimeoutMs: number;
  apiAccessMode: ApiAccessMode;
  /** @deprecated use apiAccessMode */
  useBackend?: boolean;
  backendUrl: string;
  backendToken: string;
  geminiApiKey: string;
  openAIApiKey: string;
  groqApiKey: string;
}

const STORAGE_KEY = "sightread_settings";

const CONCEPT_BACKEND_DEFAULT =
  import.meta.env.VITE_CONCEPT_BACKEND_DEFAULT === "true";

const DEFAULTS: Settings = {
  provider: "gemini",
  promptMode: "auto",
  selectedPromptId: "scene",
  analysisIntervalSec: 3,
  isAIEnabled: true,
  isTTSEnabled: false,
  speakChatReplies: true,
  alwaysListening: false,
  wakeWordEnabled: false,
  silenceTimeoutMs: 1200,
  apiAccessMode: CONCEPT_BACKEND_DEFAULT ? "auto" : "local",
  backendUrl: import.meta.env.VITE_CONCEPT_BACKEND_URL ?? "http://localhost:8787",
  backendToken: import.meta.env.VITE_CONCEPT_BACKEND_TOKEN ?? "",
  geminiApiKey: "",
  openAIApiKey: "",
  groqApiKey: "",
};

function parseApiAccessMode(parsed: Partial<Settings>): ApiAccessMode {
  if (
    parsed.apiAccessMode === "local" ||
    parsed.apiAccessMode === "backend" ||
    parsed.apiAccessMode === "auto"
  ) {
    return parsed.apiAccessMode;
  }
  if (parsed.useBackend) return "backend";
  return DEFAULTS.apiAccessMode;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...parsed,
      apiAccessMode: parseApiAccessMode(parsed),
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

export {
  getAIAccessHint,
  hasAIAccess,
  hasLocalApiKey,
  isBackendConfigured,
  usesBackendRoute,
};

/** @deprecated use hasAIAccess */
export function isBackendMode(settings: Settings): boolean {
  return settings.apiAccessMode === "backend" && isBackendConfigured(settings);
}

/** @deprecated use hasAIAccess */
export function hasApiKeyForProvider(
  settings: Settings,
  provider: AIProvider = settings.provider,
): boolean {
  return hasAIAccess(settings, provider);
}

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
  switch (settings.provider) {
    case "gemini":
      return settings.geminiApiKey;
    case "openai":
      return settings.openAIApiKey;
    case "groq":
      return settings.groqApiKey;
  }
}
