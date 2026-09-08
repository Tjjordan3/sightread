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
import {
  SETTINGS_STORAGE_KEY,
  readSettingsRawSync,
  writeSettingsRawSync,
} from "./capacitor/preferencesStore";

export type { AIProvider };

export interface Settings {
  provider: AIProvider;
  theme: ThemeSetting;
  openrouterModel: string;
  nvidiaModel: string;
  promptMode: PromptMode;
  selectedPromptId: string;
  analysisIntervalSec: number;
  visionManualOnly: boolean;
  isAIEnabled: boolean;
  isTTSEnabled: boolean;
  /** Tier-1 async JSON scene extraction (Gemini 3.5 Flash-Lite). */
  sceneExtractionEnabled: boolean;
  /** Pan TTS toward scene objects when announcing hazards/objects. */
  spatialAudioEnabled: boolean;
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
  nvidiaApiKey: string;
  webSearchEnabled: boolean;
}

const DEFAULTS: Settings = {
  provider: "gemini",
  theme: "auto",
  openrouterModel: "google/gemini-2.0-flash-001",
  nvidiaModel: "meta/llama-3.2-11b-vision-instruct",
  promptMode: "auto",
  selectedPromptId: "scene",
  analysisIntervalSec: 10,
  visionManualOnly: false,
  isAIEnabled: true,
  isTTSEnabled: false,
  sceneExtractionEnabled: true,
  spatialAudioEnabled: false,
  speakChatReplies: false,
  alwaysListening: false,
  wakeWordEnabled: false,
  silenceTimeoutMs: 1200,
  geminiApiKey: "",
  openAIApiKey: "",
  groqApiKey: "",
  anthropicApiKey: "",
  mistralApiKey: "",
  openrouterApiKey: "",
  nvidiaApiKey: "",
  webSearchEnabled: false,
};

const VALID_PROVIDERS = new Set<string>([
  "gemini",
  "openai",
  "groq",
  "anthropic",
  "mistral",
  "openrouter",
  "nvidia",
]);

const VALID_THEMES = new Set<string>(["light", "dark", "auto"]);

function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw) as Partial<Settings> & {
      nvidiaProxyPath?: string;
    };
    const { nvidiaProxyPath: _legacyProxyPath, ...rest } = parsed;
    void _legacyProxyPath;
    const provider = VALID_PROVIDERS.has(rest.provider ?? "")
      ? (parsed.provider as AIProvider)
      : DEFAULTS.provider;
    const theme = VALID_THEMES.has(rest.theme ?? "")
      ? (rest.theme as ThemeSetting)
      : DEFAULTS.theme;
    return {
      ...DEFAULTS,
      ...rest,
      provider,
      theme,
      promptMode: rest.promptMode === "manual" ? "manual" : "auto",
      visionManualOnly: rest.visionManualOnly === true,
      sceneExtractionEnabled: rest.sceneExtractionEnabled !== false,
      spatialAudioEnabled: rest.spatialAudioEnabled === true,
      analysisIntervalSec: Math.min(
        30,
        Math.max(5, rest.analysisIntervalSec ?? DEFAULTS.analysisIntervalSec),
      ),
      silenceTimeoutMs: Math.min(
        3000,
        Math.max(600, rest.silenceTimeoutMs ?? DEFAULTS.silenceTimeoutMs),
      ),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function loadSettings(): Settings {
  return parseSettings(readSettingsRawSync());
}

export function saveSettings(settings: Settings): void {
  writeSettingsRawSync(JSON.stringify(settings));
}

export { hasApiKeyForProvider, SETTINGS_STORAGE_KEY };

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
