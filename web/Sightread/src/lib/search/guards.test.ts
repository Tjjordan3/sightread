import { describe, expect, it, beforeEach } from "vitest";
import {
  MAX_SEARCH_QUERY_LENGTH,
  MAX_VISION_IMAGE_BASE64_CHARS,
  VISION_RATE_LIMIT,
  consumeRateLimit,
  getRequestOrigin,
  isSameOriginRequest,
  resetRateLimitsForTests,
  validateSearchQuery,
} from "../../../functions/api/_lib/guards";
import {
  parseBearerToken,
  resolveGeminiApiKey,
  validateVisionImageBase64,
} from "../../../functions/api/_lib/sceneExtraction";

describe("validateSearchQuery", () => {
  it("rejects missing or blank queries", () => {
    expect(validateSearchQuery(undefined).ok).toBe(false);
    expect(validateSearchQuery("").ok).toBe(false);
    expect(validateSearchQuery("   ").ok).toBe(false);
  });

  it("trims valid queries", () => {
    const result = validateSearchQuery("  hello world  ");
    expect(result).toEqual({ ok: true, query: "hello world" });
  });

  it("rejects oversized queries", () => {
    const result = validateSearchQuery("x".repeat(MAX_SEARCH_QUERY_LENGTH + 1));
    expect(result.ok).toBe(false);
  });
});

describe("isSameOriginRequest", () => {
  it("allows matching Origin", () => {
    const request = new Request("https://sightread.example/api/search", {
      method: "POST",
      headers: { Origin: "https://sightread.example" },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects cross-origin POSTs", () => {
    const request = new Request("https://sightread.example/api/search", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("allows GET health checks without Origin", () => {
    const request = new Request("https://sightread.example/api/search", {
      method: "GET",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects POST without Origin", () => {
    const request = new Request("https://sightread.example/api/search", {
      method: "POST",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("reads origin from Referer when Origin is absent", () => {
    const request = new Request("https://sightread.example/api/search", {
      method: "POST",
      headers: { Referer: "https://sightread.example/agent" },
    });
    expect(getRequestOrigin(request)).toBe("https://sightread.example");
    expect(isSameOriginRequest(request)).toBe(true);
  });
});

describe("consumeRateLimit", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it("allows up to max requests in the window", () => {
    expect(consumeRateLimit("ip:1", 2, 60_000, 1_000).allowed).toBe(true);
    expect(consumeRateLimit("ip:1", 2, 60_000, 1_001).allowed).toBe(true);
    expect(consumeRateLimit("ip:1", 2, 60_000, 1_002).allowed).toBe(false);
  });

  it("resets after the window", () => {
    expect(consumeRateLimit("ip:2", 1, 1_000, 0).allowed).toBe(true);
    expect(consumeRateLimit("ip:2", 1, 1_000, 500).allowed).toBe(false);
    expect(consumeRateLimit("ip:2", 1, 1_000, 1_000).allowed).toBe(true);
  });

  it("enforces vision rate limit defaults", () => {
    for (let i = 0; i < VISION_RATE_LIMIT.max; i++) {
      expect(
        consumeRateLimit(
          "vision:1",
          VISION_RATE_LIMIT.max,
          VISION_RATE_LIMIT.windowMs,
          i,
        ).allowed,
      ).toBe(true);
    }
    expect(
      consumeRateLimit(
        "vision:1",
        VISION_RATE_LIMIT.max,
        VISION_RATE_LIMIT.windowMs,
        VISION_RATE_LIMIT.max,
      ).allowed,
    ).toBe(false);
  });
});

describe("vision scene key + image guards", () => {
  it("parses Bearer tokens", () => {
    expect(parseBearerToken("Bearer abc")).toBe("abc");
    expect(parseBearerToken("bearer xyz")).toBe("xyz");
    expect(parseBearerToken("Token abc")).toBeNull();
  });

  it("prefers server GEMINI_API_KEY over client", () => {
    const result = resolveGeminiApiKey("server-key", "Bearer client-key");
    expect(result).toEqual({
      ok: true,
      apiKey: "server-key",
      source: "server",
    });
  });

  it("falls back to client Bearer when server key missing", () => {
    const result = resolveGeminiApiKey("", "Bearer client-key");
    expect(result).toEqual({
      ok: true,
      apiKey: "client-key",
      source: "client",
    });
  });

  it("errors when no key is available", () => {
    expect(resolveGeminiApiKey(undefined, null).ok).toBe(false);
  });

  it("validates imageBase64 size and encoding", () => {
    expect(validateVisionImageBase64("abcd", 10)).toEqual({
      ok: true,
      imageBase64: "abcd",
    });
    expect(
      validateVisionImageBase64("data:image/jpeg;base64,abcd", 10),
    ).toEqual({ ok: true, imageBase64: "abcd" });
    expect(
      validateVisionImageBase64(
        "x".repeat(MAX_VISION_IMAGE_BASE64_CHARS + 1),
        MAX_VISION_IMAGE_BASE64_CHARS,
      ).ok,
    ).toBe(false);
    expect(validateVisionImageBase64("!!!", 10).ok).toBe(false);
  });
});
