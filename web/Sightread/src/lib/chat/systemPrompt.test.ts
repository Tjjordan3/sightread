import { describe, expect, it } from "vitest";
import {
  BASE_AGENT_SYSTEM_PROMPT,
  buildAgentSystemPrompt,
} from "../chat/systemPrompt";
import type { SceneState } from "../scene/schema";

const scene: SceneState = {
  capturedAt: "2026-09-08T12:00:00.000Z",
  summary: "Desk with a laptop.",
  objects: [
    {
      id: "laptop",
      label: "laptop",
      azimuthDeg: 10,
      elevationDeg: -5,
      distanceM: 0.8,
      confidence: 0.95,
    },
  ],
  textInView: [],
  hazards: [],
  peopleCount: 0,
  environment: {
    indoorOutdoor: "indoor",
    lighting: "dim",
    pathClear: true,
  },
  navigationHints: [],
};

describe("buildAgentSystemPrompt", () => {
  it("returns the base prompt when scene is missing", () => {
    expect(buildAgentSystemPrompt(null)).toBe(BASE_AGENT_SYSTEM_PROMPT);
    expect(buildAgentSystemPrompt(undefined)).toBe(BASE_AGENT_SYSTEM_PROMPT);
  });

  it("injects scene JSON into the system prompt", () => {
    const prompt = buildAgentSystemPrompt(scene);
    expect(prompt.startsWith(BASE_AGENT_SYSTEM_PROMPT)).toBe(true);
    expect(prompt).toContain("Current visual scene");
    expect(prompt).toContain('"label":"laptop"');
    expect(prompt).toContain(scene.summary);
  });
});
