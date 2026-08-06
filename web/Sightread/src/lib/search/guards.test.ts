import { describe, expect, it, beforeEach } from "vitest";
import {
  MAX_SEARCH_QUERY_LENGTH,
  consumeRateLimit,
  getRequestOrigin,
  isSameOriginRequest,
  resetRateLimitsForTests,
  validateSearchQuery,
} from "../../../functions/api/_lib/guards";

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
});
