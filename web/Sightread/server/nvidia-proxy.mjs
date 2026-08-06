/**
 * Local NVIDIA proxy for IIS (no ARR required).
 * IIS rewrites /api/nvidia/* -> http://127.0.0.1:8788/v1/*
 *
 * Only POST /v1/chat/completions is forwarded (bounded body size).
 */
import http from "node:http";
import https from "node:https";

const HOST = process.env.NVIDIA_PROXY_HOST ?? "127.0.0.1";
const PORT = Number(process.env.NVIDIA_PROXY_PORT ?? 8788);
const UPSTREAM = "integrate.api.nvidia.com";
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ALLOWED_PATH = "/v1/chat/completions";

const rateBuckets = new Map();

function consumeRateLimit(key) {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now >= entry.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Request body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function writeJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function clientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/v1/health")) {
    writeJson(res, 200, { ok: true, service: "sightread-nvidia-proxy" });
    return;
  }

  if (req.method === "OPTIONS") {
    // Same-origin via IIS rewrite — no CORS needed.
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== ALLOWED_PATH) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. POST to /v1/chat/completions");
    return;
  }

  const rate = consumeRateLimit(`nvidia:${clientKey(req)}`);
  if (!rate.allowed) {
    writeJson(
      res,
      429,
      { error: { message: "Too many requests" } },
      { "Retry-After": String(rate.retryAfterSec) },
    );
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    writeJson(res, 401, { error: { message: "Missing Authorization header" } });
    return;
  }

  try {
    const body = await readBody(req, MAX_BODY_BYTES);
    const upstreamReq = https.request(
      {
        hostname: UPSTREAM,
        path: ALLOWED_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
          "Content-Length": body.length,
        },
      },
      (upstreamRes) => {
        const chunks = [];
        upstreamRes.on("data", (chunk) => chunks.push(chunk));
        upstreamRes.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          res.writeHead(upstreamRes.statusCode ?? 502, {
            "Content-Type":
              upstreamRes.headers["content-type"] ?? "application/json",
            "Content-Length": responseBody.length,
          });
          res.end(responseBody);
        });
      },
    );

    upstreamReq.on("error", (err) => {
      console.error("NVIDIA upstream error:", err);
      writeJson(res, 502, {
        error: { message: "Upstream error" },
      });
    });

    upstreamReq.setTimeout(120_000, () => {
      upstreamReq.destroy(new Error("Upstream timeout"));
    });

    upstreamReq.write(body);
    upstreamReq.end();
  } catch (err) {
    if (err?.status === 413) {
      writeJson(res, 413, { error: { message: "Request body too large" } });
      return;
    }
    writeJson(res, 500, {
      error: { message: "Proxy error" },
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sightread NVIDIA proxy: http://${HOST}:${PORT}`);
  console.log("Health check: GET /health");
  console.log("IIS should rewrite /api/nvidia/* to this service.");
});
