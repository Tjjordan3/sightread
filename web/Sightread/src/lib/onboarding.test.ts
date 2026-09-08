import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasOnboarded, markOnboarded } from "./onboarding";

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const localStorageMock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  vi.stubGlobal("localStorage", localStorageMock);
}

describe("onboarding helpers", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  it("starts as not onboarded", () => {
    expect(hasOnboarded()).toBe(false);
  });

  it("markOnboarded persists across reads", () => {
    markOnboarded();
    expect(hasOnboarded()).toBe(true);
    expect(localStorage.getItem("sightread_has_onboarded")).toBe("true");
  });

  it("survives storage failures without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage);

    expect(hasOnboarded()).toBe(false);
    expect(() => markOnboarded()).not.toThrow();
  });
});
