import { describe, expect, it } from "vitest";
import {
  parseSceneJsonText,
  parseSceneState,
  type SceneState,
} from "./schema";

const validScene: SceneState = {
  capturedAt: "2026-09-08T12:00:00.000Z",
  summary: "A hallway with a chair on the left.",
  objects: [
    {
      id: "chair-1",
      label: "chair",
      azimuthDeg: -35,
      elevationDeg: -10,
      distanceM: 1.2,
      confidence: 0.9,
    },
  ],
  textInView: ["EXIT"],
  hazards: ["chair in path"],
  peopleCount: 0,
  environment: {
    indoorOutdoor: "indoor",
    lighting: "bright",
    pathClear: false,
  },
  navigationHints: ["step left around the chair"],
};

describe("parseSceneState", () => {
  it("accepts a well-formed scene", () => {
    expect(parseSceneState(validScene)).toMatchObject({
      summary: validScene.summary,
      peopleCount: 0,
      environment: { indoorOutdoor: "indoor" },
    });
  });

  it("rejects missing summary", () => {
    expect(parseSceneState({ ...validScene, summary: "" })).toBeNull();
    expect(parseSceneState({ objects: [] })).toBeNull();
  });

  it("clamps azimuth and confidence", () => {
    const parsed = parseSceneState({
      ...validScene,
      objects: [
        {
          id: "x",
          label: "door",
          azimuthDeg: 400,
          elevationDeg: -200,
          distanceM: null,
          confidence: 2,
        },
      ],
    });
    expect(parsed?.objects[0]).toMatchObject({
      azimuthDeg: 180,
      elevationDeg: -90,
      confidence: 1,
    });
  });

  it("fills capturedAt when missing", () => {
    const rest = { ...validScene };
    delete (rest as { capturedAt?: string }).capturedAt;
    const parsed = parseSceneState(rest);
    expect(parsed?.capturedAt).toMatch(/^\d{4}-/);
  });
});

describe("parseSceneJsonText", () => {
  it("parses raw JSON text", () => {
    expect(parseSceneJsonText(JSON.stringify(validScene))?.summary).toBe(
      validScene.summary,
    );
  });

  it("recovers JSON embedded in prose", () => {
    const wrapped = `Here you go:\n${JSON.stringify(validScene)}\nThanks`;
    expect(parseSceneJsonText(wrapped)?.peopleCount).toBe(0);
  });

  it("returns null for garbage", () => {
    expect(parseSceneJsonText("not json")).toBeNull();
  });
});
