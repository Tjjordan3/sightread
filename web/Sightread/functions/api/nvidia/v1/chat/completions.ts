import {
  MAX_NVIDIA_BODY_BYTES,
  NVIDIA_RATE_LIMIT,
  clientRateLimitKey,
  consumeRateLimit,
  isSameOriginRequest,
} from "../../../_lib/guards";

const UPSTREAM = "https://integrate.api.nvidia.com/v1/chat/completions";

export const onRequestOptions: PagesFunction = async () => {
  // Same-origin SPA does not need CORS; reject cross-origin preflights.
  return new Response(null, { status: 204 });
};

export const onRequestPost: PagesFunction = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return Response.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  const rate = consumeRateLimit(
    clientRateLimitKey(context.request, "nvidia"),
    NVIDIA_RATE_LIMIT.max,
    NVIDIA_RATE_LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return Response.json(
      { error: { message: "Too many requests" } },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const authorization = context.request.headers.get("Authorization");
  if (!authorization) {
    return Response.json(
      { error: { message: "Missing Authorization header" } },
      { status: 401 },
    );
  }

  const contentLength = Number(context.request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_NVIDIA_BODY_BYTES) {
    return Response.json(
      { error: { message: "Request body too large" } },
      { status: 413 },
    );
  }

  try {
    const body = await context.request.arrayBuffer();
    if (body.byteLength > MAX_NVIDIA_BODY_BYTES) {
      return Response.json(
        { error: { message: "Request body too large" } },
        { status: 413 },
      );
    }

    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body,
    });

    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("NVIDIA proxy upstream error:", err);
    return Response.json(
      { error: { message: "Upstream error" } },
      { status: 502 },
    );
  }
};
