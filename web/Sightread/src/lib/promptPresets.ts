export interface PromptPreset {
  id: string;
  title: string;
  prompt: string;
}

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
