import { VisionAIError } from "../vision/types";
import type { AIProvider, Settings } from "../settings";
import { isBackendConfigured } from "../ai/access";

function getClientApiKeys(settings: Settings) {
  return {
    groq: settings.groqApiKey.trim() || undefined,
    gemini: settings.geminiApiKey.trim() || undefined,
    openai: settings.openAIApiKey.trim() || undefined,
  };
}

export interface BackendMeta {
  service: string;
  version: string;
  routes: Record<string, string>;
  features: Record<string, boolean>;
  providers: { server: string[]; supportsClientKeys: boolean };
}

export interface BackendProviders {
  server: AIProvider[];
  client: AIProvider[];
  available: AIProvider[];
}

function backendBaseUrl(settings: Settings): string {
  return settings.backendUrl.replace(/\/$/, "");
}

function authHeaders(settings: Settings): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.backendToken.trim()}`,
  };
}

async function backendFetch<T>(
  settings: Settings,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${backendBaseUrl(settings)}${path}`, {
    ...init,
    headers: {
      ...authHeaders(settings),
      ...init?.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new VisionAIError(
      data.error ?? `Backend request failed (${response.status})`,
      response.status,
    );
  }

  return data as T;
}

export async function fetchBackendHealth(settings: Settings) {
  const response = await fetch(`${backendBaseUrl(settings)}/health`);
  return response.json();
}

export async function fetchBackendMeta(settings: Settings): Promise<BackendMeta> {
  return backendFetch<BackendMeta>(settings, "/v1/meta");
}

export async function fetchBackendProviders(
  settings: Settings,
): Promise<BackendProviders> {
  return backendFetch<BackendProviders>(settings, "/v1/providers", {
    method: "POST",
    body: JSON.stringify({ apiKeys: getClientApiKeys(settings) }),
  });
}

export async function backendChat(
  settings: Settings,
  provider: AIProvider,
  messages: Array<{ role: "user" | "assistant"; text: string }>,
  imageBase64?: string,
): Promise<string> {
  const data = await backendFetch<{ text: string }>(settings, "/v1/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      provider,
      messages,
      imageBase64,
      apiKeys: getClientApiKeys(settings),
    }),
  });
  if (!data.text?.trim()) {
    throw new VisionAIError("Empty response from backend.");
  }
  return data.text;
}

export async function backendVision(
  settings: Settings,
  provider: AIProvider,
  prompt: string,
  imageBase64: string,
): Promise<string> {
  const data = await backendFetch<{ text: string }>(settings, "/v1/ai/vision", {
    method: "POST",
    body: JSON.stringify({
      provider,
      prompt,
      imageBase64,
      apiKeys: getClientApiKeys(settings),
    }),
  });
  if (!data.text?.trim()) {
    throw new VisionAIError("Empty response from backend.");
  }
  return data.text;
}

export async function backendResolvePrompt(
  settings: Settings,
  input: {
    promptMode: Settings["promptMode"];
    selectedPromptId: string;
    userText?: string;
  },
) {
  return backendFetch<{ prompt: { id: string; title: string; prompt: string } }>(
    settings,
    "/v1/prompts/resolve",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function backendListConversations(settings: Settings) {
  return backendFetch<{ conversations: unknown[] }>(settings, "/v1/conversations");
}

export async function backendCreateConversation(
  settings: Settings,
  title?: string,
) {
  return backendFetch<{ conversation: unknown }>(settings, "/v1/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function backendDeleteConversation(
  settings: Settings,
  conversationId: string,
) {
  return backendFetch<{ ok: boolean }>(
    settings,
    `/v1/conversations/${conversationId}`,
    { method: "DELETE" },
  );
}

export async function backendListMessages(
  settings: Settings,
  conversationId: string,
) {
  return backendFetch<{ conversation: unknown; messages: unknown[] }>(
    settings,
    `/v1/conversations/${conversationId}/messages`,
  );
}

export async function backendAppendMessage(
  settings: Settings,
  conversationId: string,
  message: {
    role: "user" | "assistant";
    text: string;
    imageBase64?: string;
  },
) {
  return backendFetch<{ message: unknown }>(
    settings,
    `/v1/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(message),
    },
  );
}

export function canReachBackend(settings: Settings): boolean {
  return isBackendConfigured(settings);
}
