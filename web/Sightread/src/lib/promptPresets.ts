export type PromptMode = "auto" | "manual";

export interface PromptPreset {
  id: string;
  title: string;
  prompt: string;
}

export const AUTO_PROMPT_ID = "auto";

export const AUTO_VISION_PROMPT =
  "You are helping a visually impaired user understand their surroundings. In a few short, spoken-friendly sentences: describe the scene, read any important visible text, note hazards or obstacles, and mention anything useful for getting around. Be concise and practical.";

const PROMPT_KEYWORDS: { id: string; patterns: RegExp[] }[] = [
  {
    id: "navigation",
    patterns: [
      /\b(navigat|direction|which way|turn left|turn right|street sign|crosswalk|intersection)\b/i,
    ],
  },
  {
    id: "accessibility",
    patterns: [/\b(read|text|menu|label|sign says|what does it say)\b/i],
  },
  {
    id: "safety",
    patterns: [/\b(safe|hazard|obstacle|curb|trip|danger|watch out)\b/i],
  },
  {
    id: "shopping",
    patterns: [/\b(price|product|shelf|buy|store|grocery|tag)\b/i],
  },
  {
    id: "social",
    patterns: [/\b(people|person|crowd|how many)\b/i],
  },
  {
    id: "scene",
    patterns: [/\b(describe|what am i looking at|what's in front|what is in front)\b/i],
  },
];

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "scene",
    title: "Describe scene",
    prompt:
      "Describe what I am looking at in 2 sentences. Be specific about objects and any visible text.",
  },
  {
    id: "navigation",
    title: "Navigation",
    prompt:
      "Identify street signs, storefront names, and suggest which direction I should turn if relevant.",
  },
  {
    id: "accessibility",
    title: "Read text",
    prompt:
      "Read any visible text in a clear, spoken-friendly way: menus, labels, and signs.",
  },
  {
    id: "safety",
    title: "Safety check",
    prompt:
      "Flag hazards in my field of view: obstacles, curbs, vehicles, or uneven ground.",
  },
  {
    id: "shopping",
    title: "Shopping",
    prompt:
      "Identify products on shelves and any visible price tags you can read.",
  },
  {
    id: "social",
    title: "Scene context",
    prompt:
      "How many people are in view and describe the general scene context. Do not identify individuals.",
  },
];

export function getPromptPreset(id: string): PromptPreset {
  return PROMPT_PRESETS.find((p) => p.id === id) ?? PROMPT_PRESETS[0];
}

export function inferPromptIdFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  for (const { id, patterns } of PROMPT_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(trimmed))) return id;
  }
  return null;
}

export interface ResolvedVisionPrompt {
  id: string;
  title: string;
  prompt: string;
  inferred: boolean;
}

export function resolveVisionPrompt(
  mode: PromptMode,
  selectedPromptId: string,
  context?: { userText?: string },
): ResolvedVisionPrompt {
  if (mode === "manual") {
    const preset = getPromptPreset(selectedPromptId);
    return {
      id: preset.id,
      title: preset.title,
      prompt: preset.prompt,
      inferred: false,
    };
  }

  const inferredId = context?.userText
    ? inferPromptIdFromText(context.userText)
    : null;
  if (inferredId) {
    const preset = getPromptPreset(inferredId);
    return {
      id: preset.id,
      title: preset.title,
      prompt: preset.prompt,
      inferred: true,
    };
  }

  return {
    id: AUTO_PROMPT_ID,
    title: "Smart",
    prompt: AUTO_VISION_PROMPT,
    inferred: false,
  };
}
