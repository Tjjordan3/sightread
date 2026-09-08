import { getApiKey, type Settings } from "../settings";
import { VisionAIError } from "../vision/types";
import {
  SCENE_EXTRACTION_PROMPT,
  SCENE_MODEL,
  SCENE_RESPONSE_SCHEMA,
  parseSceneJsonText,
  parseSceneState,
  type SceneState,
} from "./schema";

async function extractViaProxy(
  jpegBase64: string,
  clientApiKey?: string,
): Promise<SceneState> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientApiKey?.trim()) {
    headers.Authorization = `Bearer ${clientApiKey.trim()}`;
  }

  const response = await fetch("/api/vision/scene", {
    method: "POST",
    headers,
    body: JSON.stringify({ imageBase64: jpegBase64 }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    scene?: unknown;
  };

  if (!response.ok) {
    throw new VisionAIError(
      data.error ?? `Scene extraction failed (${response.status})`,
      response.status,
    );
  }

  const scene = parseSceneState(data.scene);
  if (!scene) {
    throw new VisionAIError("Invalid scene JSON from server.");
  }
  return scene;
}

async function extractDirectGemini(
  jpegBase64: string,
  apiKey: string,
): Promise<SceneState> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${SCENE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SCENE_EXTRACTION_PROMPT },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: jpegBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCENE_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new VisionAIError(
      data?.error?.message ?? `Gemini scene request failed (${response.status})`,
      response.status,
    );
  }

  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  const scene = parseSceneJsonText(text);
  if (!scene) {
    throw new VisionAIError("Empty or invalid scene JSON from Gemini.");
  }
  return scene;
}

/**
 * Tier-1 scene extraction: prefer same-origin proxy (server key or forwarded BYOK),
 * fall back to direct Gemini when the proxy is unavailable and a Gemini key exists.
 */
export async function extractSceneFromJpeg(
  jpegBase64: string,
  settings: Settings,
): Promise<SceneState> {
  const geminiKey = settings.geminiApiKey.trim() || getApiKey(settings);

  try {
    return await extractViaProxy(
      jpegBase64,
      settings.geminiApiKey.trim() || undefined,
    );
  } catch (err) {
    const status = err instanceof VisionAIError ? err.statusCode : undefined;
    const message = err instanceof Error ? err.message : "";

    // Proxy missing / not configured → BYOK direct call when possible.
    if (
      (status === 503 || status === 404 || message.includes("Failed to fetch")) &&
      geminiKey
    ) {
      return extractDirectGemini(jpegBase64, geminiKey);
    }

    // Proxy asks for client key
    if (status === 401 && geminiKey) {
      try {
        return await extractViaProxy(jpegBase64, geminiKey);
      } catch {
        return extractDirectGemini(jpegBase64, geminiKey);
      }
    }

    throw err;
  }
}
