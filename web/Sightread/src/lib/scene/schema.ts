/** Strict accessibility-oriented scene JSON for Tier-1 extraction. */

export const SCENE_MODEL = "gemini-3.5-flash-lite";

export type IndoorOutdoor = "indoor" | "outdoor" | "unknown";
export type Lighting = "bright" | "dim" | "dark" | "unknown";

export interface SceneObject {
  id: string;
  label: string;
  /** Horizontal angle relative to camera forward; -180..180 (negative = left). */
  azimuthDeg: number;
  elevationDeg: number;
  distanceM: number | null;
  confidence: number;
}

export interface SceneEnvironment {
  indoorOutdoor: IndoorOutdoor;
  lighting: Lighting;
  pathClear: boolean | null;
}

export interface SceneState {
  capturedAt: string;
  summary: string;
  objects: SceneObject[];
  textInView: string[];
  hazards: string[];
  peopleCount: number;
  environment: SceneEnvironment;
  navigationHints: string[];
}

/** Gemini structured-output responseSchema (OpenAPI 3.0 subset). */
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

const INDOOR_OUTDOOR = new Set<string>(["indoor", "outdoor", "unknown"]);
const LIGHTING = new Set<string>(["bright", "dim", "dark", "unknown"]);

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseObject(raw: unknown, index: number): SceneObject | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label.trim() : "";
  if (!label) return null;
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : `obj-${index + 1}`;
  const distanceM =
    o.distanceM === null || o.distanceM === undefined
      ? null
      : typeof o.distanceM === "number" && Number.isFinite(o.distanceM)
        ? Math.max(0, o.distanceM)
        : null;
  return {
    id,
    label,
    azimuthDeg: clamp(asNumber(o.azimuthDeg), -180, 180),
    elevationDeg: clamp(asNumber(o.elevationDeg), -90, 90),
    distanceM,
    confidence: clamp(asNumber(o.confidence, 0.5), 0, 1),
  };
}

/**
 * Validate and normalize model JSON into SceneState.
 * Returns null if the payload is not usable.
 */
export function parseSceneState(raw: unknown): SceneState | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  if (!summary) return null;

  const envRaw =
    data.environment && typeof data.environment === "object"
      ? (data.environment as Record<string, unknown>)
      : {};
  const indoorOutdoor = INDOOR_OUTDOOR.has(String(envRaw.indoorOutdoor))
    ? (envRaw.indoorOutdoor as IndoorOutdoor)
    : "unknown";
  const lighting = LIGHTING.has(String(envRaw.lighting))
    ? (envRaw.lighting as Lighting)
    : "unknown";
  const pathClear =
    typeof envRaw.pathClear === "boolean"
      ? envRaw.pathClear
      : envRaw.pathClear === null
        ? null
        : null;

  const objects = Array.isArray(data.objects)
    ? data.objects
        .map((item, i) => parseObject(item, i))
        .filter((item): item is SceneObject => item != null)
    : [];

  const capturedAt =
    typeof data.capturedAt === "string" && data.capturedAt.trim()
      ? data.capturedAt.trim()
      : new Date().toISOString();

  return {
    capturedAt,
    summary,
    objects,
    textInView: asStringArray(data.textInView),
    hazards: asStringArray(data.hazards),
    peopleCount: Math.max(0, Math.round(asNumber(data.peopleCount))),
    environment: { indoorOutdoor, lighting, pathClear },
    navigationHints: asStringArray(data.navigationHints),
  };
}

export function parseSceneJsonText(text: string): SceneState | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return parseSceneState(JSON.parse(trimmed));
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return parseSceneState(JSON.parse(trimmed.slice(start, end + 1)));
      } catch {
        return null;
      }
    }
    return null;
  }
}
