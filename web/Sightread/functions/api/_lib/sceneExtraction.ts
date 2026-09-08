/**
 * Shared Gemini scene-extraction helpers for /api/vision/scene.
 * Keep schema fields aligned with src/lib/scene/schema.ts.
 */

export const SCENE_MODEL = "gemini-3.5-flash-lite";

export const SCENE_EXTRACTION_PROMPT = `Extract a structured accessibility scene description from this camera frame.
Return ONLY JSON matching the schema.
Rules:
- summary: 1-2 short spoken-friendly sentences.
- objects: notable items with rough azimuthDeg (-180 left … 0 ahead … 180 right), elevationDeg, optional distanceM in meters, confidence 0..1.
- textInView: readable text / signs (empty if none).
- hazards: obstacles or risks for a visually impaired walker.
- peopleCount: count only; do not identify individuals.
- environment.indoorOutdoor / lighting / pathClear as best estimates.
- navigationHints: short actionable hints (may be empty).
- Set capturedAt to the current ISO-8601 time if unknown.`;

export const SCENE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    capturedAt: { type: "string" },
    summary: { type: "string" },
    objects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          azimuthDeg: { type: "number" },
          elevationDeg: { type: "number" },
          distanceM: { type: ["number", "null"] },
          confidence: { type: "number" },
        },
        required: [
          "id",
          "label",
          "azimuthDeg",
          "elevationDeg",
          "distanceM",
          "confidence",
        ],
      },
    },
    textInView: { type: "array", items: { type: "string" } },
    hazards: { type: "array", items: { type: "string" } },
    peopleCount: { type: "number" },
    environment: {
      type: "object",
      properties: {
        indoorOutdoor: {
          type: "string",
          enum: ["indoor", "outdoor", "unknown"],
        },
        lighting: {
          type: "string",
          enum: ["bright", "dim", "dark", "unknown"],
        },
        pathClear: { type: ["boolean", "null"] },
      },
      required: ["indoorOutdoor", "lighting", "pathClear"],
    },
    navigationHints: { type: "array", items: { type: "string" } },
  },
  required: [
    "capturedAt",
    "summary",
    "objects",
    "textInView",
    "hazards",
    "peopleCount",
    "environment",
    "navigationHints",
  ],
} as const;

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

export function resolveGeminiApiKey(
  serverKey: string | undefined,
  authorization: string | null,
): { ok: true; apiKey: string; source: "server" | "client" } | { ok: false; error: string } {
  const fromServer = serverKey?.trim() ?? "";
  if (fromServer) {
    return { ok: true, apiKey: fromServer, source: "server" };
  }
  const fromClient = parseBearerToken(authorization);
  if (fromClient) {
    return { ok: true, apiKey: fromClient, source: "client" };
  }
  return {
    ok: false,
    error:
      "No Gemini API key configured. Set GEMINI_API_KEY as a Pages secret or send Authorization: Bearer <key>.",
  };
}

export function validateVisionImageBase64(
  imageBase64: unknown,
  maxChars: number,
): { ok: true; imageBase64: string } | { ok: false; error: string } {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return { ok: false, error: "Missing imageBase64" };
  }
  const trimmed = imageBase64.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing imageBase64" };
  }
  // Allow data-URL prefix from some clients.
  const raw = trimmed.includes(",")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  if (raw.length > maxChars) {
    return { ok: false, error: "Image too large" };
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    return { ok: false, error: "Invalid imageBase64 encoding" };
  }
  return { ok: true, imageBase64: raw.replace(/\s+/g, "") };
}

export async function callGeminiSceneExtraction(
  apiKey: string,
  imageBase64: string,
): Promise<{ ok: true; scene: unknown } | { ok: false; status: number; error: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${SCENE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
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
                  data: imageBase64,
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
  } catch {
    return { ok: false, status: 502, error: "Upstream Gemini unavailable" };
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status >= 400 && response.status < 600 ? response.status : 502,
      error: data.error?.message ?? `Gemini request failed (${response.status})`,
    };
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return { ok: false, status: 502, error: "Empty response from Gemini" };
  }

  try {
    const scene = JSON.parse(text) as unknown;
    if (!scene || typeof scene !== "object") {
      return { ok: false, status: 502, error: "Invalid scene JSON from Gemini" };
    }
    return { ok: true, scene };
  } catch {
    return { ok: false, status: 502, error: "Could not parse scene JSON from Gemini" };
  }
}
