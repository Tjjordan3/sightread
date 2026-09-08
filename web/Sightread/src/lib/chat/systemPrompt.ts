import type { SceneState } from "../scene/schema";

export const BASE_AGENT_SYSTEM_PROMPT =
  "You are Sightread, a helpful AI vision assistant. When you use web search results, cite sources inline like [1], [2] matching the result numbers. Be concise, accurate, and accessibility-friendly. Prefer short spoken-friendly answers when helping someone understand their surroundings.";

/**
 * Build the conversational system prompt for this turn, injecting the latest
 * Tier-1 scene JSON when available (may be stale relative to the user utterance).
 */
export function buildAgentSystemPrompt(
  scene: SceneState | null | undefined,
): string {
  if (!scene) return BASE_AGENT_SYSTEM_PROMPT;
  return (
    `${BASE_AGENT_SYSTEM_PROMPT}\n\n` +
    "Current visual scene (JSON from the camera pipeline; may be slightly stale — " +
    "treat it as ground truth for what was recently seen unless the user attaches a newer image):\n" +
    JSON.stringify(scene)
  );
}
