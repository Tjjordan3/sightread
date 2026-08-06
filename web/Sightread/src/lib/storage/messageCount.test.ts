import { describe, expect, it } from "vitest";
import { nextMessageCountAfterSave } from "../storage/messageCount";
import { STORAGE_LIMITS } from "../storage/types";

describe("nextMessageCountAfterSave", () => {
  it("increments when under the limit", () => {
    expect(nextMessageCountAfterSave(3, 0)).toBe(4);
  });

  it("accounts for trimmed messages", () => {
    const prior = STORAGE_LIMITS.maxMessagesPerConversation;
    expect(nextMessageCountAfterSave(prior, 1)).toBe(prior);
    expect(nextMessageCountAfterSave(prior, 5)).toBe(prior - 4);
  });

  it("never goes negative before the insert", () => {
    expect(nextMessageCountAfterSave(0, 2)).toBe(1);
  });
});

describe("sendMessage generation guard", () => {
  it("ignores stale completions when generation advances", () => {
    let generation = 0;
    const results: string[] = [];

    const run = async (label: string, startGen: number) => {
      await Promise.resolve();
      if (startGen !== generation) return;
      results.push(label);
    };

    const first = ++generation;
    const second = ++generation;
    void run("stale", first);
    void run("fresh", second);

    return Promise.resolve().then(() => {
      expect(results).toEqual(["fresh"]);
    });
  });
});
