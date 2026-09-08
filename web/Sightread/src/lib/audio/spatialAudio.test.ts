import { describe, expect, it } from "vitest";
import { azimuthToPosition } from "./spatialAudio";

describe("azimuthToPosition", () => {
  it("places forward objects on -Z", () => {
    const pos = azimuthToPosition(0, 0, 2);
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.y).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(-2, 5);
  });

  it("places right-side objects on +X", () => {
    const pos = azimuthToPosition(90, 0, 1);
    expect(pos.x).toBeCloseTo(1, 5);
    expect(pos.z).toBeCloseTo(0, 5);
  });
});
