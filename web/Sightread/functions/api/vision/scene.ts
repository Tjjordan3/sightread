/**
 * Cloudflare Pages Function: Tier-1 scene extraction
 * Handles: POST /api/vision/scene, GET /api/vision/scene (health)
 *
 * Prefer Pages secret GEMINI_API_KEY (never ship in Capacitor binaries).
 * If unset, accept Authorization: Bearer <client-key> (BYOK).
 *
 * Compliance: do not log image payloads or API keys.
 */

import {
  MAX_VISION_BODY_BYTES,
  MAX_VISION_IMAGE_BASE64_CHARS,
  VISION_RATE_LIMIT,
  clientRateLimitKey,
  consumeRateLimit,
  isSameOriginRequest,
} from "../_lib/guards";
import {
  callGeminiSceneExtraction,
  resolveGeminiApiKey,
  validateVisionImageBase64,
} from "../_lib/sceneExtraction";

interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method === "GET") {
    return Response.json({
      ok: true,
      service: "sightread-vision-scene",
      model: "gemini-3.5-flash-lite",
      serverKeyConfigured: Boolean(env.GEMINI_API_KEY?.trim()),
    });
  }

  if (request.method !== "POST") {
    return new Response("POST /api/vision/scene", { status: 405 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = consumeRateLimit(
    clientRateLimitKey(request, "vision"),
    VISION_RATE_LIMIT.max,
    VISION_RATE_LIMIT.windowMs,
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

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_VISION_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const key = resolveGeminiApiKey(
    env.GEMINI_API_KEY,
    request.headers.get("Authorization"),
  );
  if (!key.ok) {
    return Response.json({ error: key.error }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Reject oversized bodies even when Content-Length was missing/wrong.
  const approxSize = JSON.stringify(body).length;
  if (approxSize > MAX_VISION_BODY_BYTES) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }

  const { imageBase64: rawImage } = body as { imageBase64?: unknown };
  const validated = validateVisionImageBase64(
    rawImage,
    MAX_VISION_IMAGE_BASE64_CHARS,
  );
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const result = await callGeminiSceneExtraction(
    key.apiKey,
    validated.imageBase64,
  );
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ok: true,
    scene: result.scene,
    keySource: key.source,
  });
};
