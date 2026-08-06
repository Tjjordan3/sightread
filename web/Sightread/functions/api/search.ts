/**
 * Cloudflare Pages Function: Tavily search proxy
 * Handles: POST /api/search
 *
 * Secret (Cloudflare Dashboard → Settings → Environment variables):
 *   TAVILY_API_KEY = your key from app.tavily.com  (mark as Secret)
 *
 * Locked to same-origin requests with per-IP rate limiting so the server
 * key cannot be burned from arbitrary websites.
 */

import {
  SEARCH_RATE_LIMIT,
  clientRateLimitKey,
  consumeRateLimit,
  isSameOriginRequest,
  validateSearchQuery,
} from "./_lib/guards";

interface Env {
  TAVILY_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    // Same-origin SPA does not need CORS; reject cross-origin preflights.
    return new Response(null, { status: 204 });
  }

  if (request.method === "GET") {
    return Response.json({ ok: true, service: "sightread-search-proxy" });
  }

  if (request.method !== "POST") {
    return new Response("POST /api/search", { status: 405 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    clientRateLimitKey(request, "search"),
    SEARCH_RATE_LIMIT.max,
    SEARCH_RATE_LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  if (!env.TAVILY_API_KEY) {
    return Response.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query: rawQuery } = body as { query?: string };
  const validated = validateSearchQuery(rawQuery);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  let tavilyResponse: Response;
  try {
    tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: validated.query,
        max_results: 5,
        search_depth: "basic",
      }),
    });
  } catch (err) {
    console.error("Tavily request failed:", err);
    return Response.json(
      { error: "Search service unavailable" },
      { status: 502 },
    );
  }

  if (!tavilyResponse.ok) {
    const detail = await tavilyResponse.text();
    console.error(
      `Tavily search failed (${tavilyResponse.status}):`,
      detail.slice(0, 500),
    );
    return Response.json(
      { error: "Search service unavailable" },
      { status: 502 },
    );
  }

  let data: { results?: { title: string; url: string; content: string }[] };
  try {
    data = (await tavilyResponse.json()) as typeof data;
  } catch (err) {
    console.error("Tavily response parse error:", err);
    return Response.json(
      { error: "Search service unavailable" },
      { status: 502 },
    );
  }

  const results = (data.results ?? []).slice(0, 5).map((item) => ({
    title: item.title ?? "",
    url: item.url ?? "",
    snippet: item.content ?? "",
  }));

  return Response.json({ query: validated.query, results });
};
