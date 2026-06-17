import type { AIProvider, Settings } from "../settings";

export type ApiAccessMode = "local" | "backend" | "auto";

export function isBackendConfigured(settings: Settings): boolean {
  return (
    settings.backendUrl.trim().length > 0 &&
    settings.backendToken.trim().length > 0
  );
}

export function usesBackendRoute(settings: Settings): boolean {
  return settings.apiAccessMode !== "local" && isBackendConfigured(settings);
}

export function hasLocalApiKey(
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

export function hasAIAccess(
  settings: Settings,
  provider: AIProvider = settings.provider,
): boolean {
  switch (settings.apiAccessMode) {
    case "local":
      return hasLocalApiKey(settings, provider);
    case "backend":
      return isBackendConfigured(settings);
    case "auto":
      return isBackendConfigured(settings) || hasLocalApiKey(settings, provider);
  }
}

export function getAIAccessHint(settings: Settings): string {
  switch (settings.apiAccessMode) {
    case "local":
      return "Add an API key in Settings for the selected provider.";
    case "backend":
      return "Configure backend URL and device token in Settings.";
    case "auto":
      return "Configure backend access or add a local API key in Settings.";
  }
}

export function getClientApiKeys(settings: Settings) {
  return {
    groq: settings.groqApiKey.trim() || undefined,
    gemini: settings.geminiApiKey.trim() || undefined,
    openai: settings.openAIApiKey.trim() || undefined,
  };
}
