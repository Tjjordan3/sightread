/**
 * Tavily web search proxy — keeps TAVILY_API_KEY on the server (not in the browser).
 * IIS rewrites /api/search -> http://127.0.0.1:8789/search
 *
 * Set environment variable: TAVILY_API_KEY=your_key_from_app.tavily.com
 */
import http from "node:http";
import https from "node:https";

const HOST = process.env.SEARCH_PROXY_HOST ?? "127.0.0.1";
const PORT = Number(process.env.SEARCH_PROXY_PORT ?? 8789);
const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
const MAX_SEARCH_QUERY_LENGTH = 500;
const MAX_BODY_BYTES = 8_192;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

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

function tavilySearch(query, num = 5) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      query,
      max_results: num,
      search_depth: "basic",
    });
    const req = https.request(
      {
        hostname: "api.tavily.com",
        path: "/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TAVILY_API_KEY}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error(
              `Tavily search failed (${res.statusCode}):`,
              raw.slice(0, 500),
            );
            reject(new Error("Upstream search failed"));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    writeJson(res, 200, {
      ok: true,
      service: "sightread-search-proxy",
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/search") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("POST /search");
    return;
  }

  const rate = consumeRateLimit(`search:${clientKey(req)}`);
  if (!rate.allowed) {
    writeJson(
      res,
      429,
      { error: "Too many requests" },
      { "Retry-After": String(rate.retryAfterSec) },
    );
    return;
  }

  if (!TAVILY_API_KEY) {
    writeJson(res, 503, {
      error: "Search service unavailable",
    });
    return;
  }

  try {
    const raw = await readBody(req, MAX_BODY_BYTES);
    const { query } = JSON.parse(raw.toString("utf8"));
    if (!query || typeof query !== "string" || !query.trim()) {
      writeJson(res, 400, { error: "Missing query" });
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
      writeJson(res, 400, {
        error: `Query too long (max ${MAX_SEARCH_QUERY_LENGTH} characters)`,
      });
      return;
    }

    const data = await tavilySearch(trimmed, 5);
    const results = (data.results ?? []).slice(0, 5).map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.content ?? "",
    }));

    writeJson(res, 200, { query: trimmed, results });
  } catch (err) {
    if (err?.status === 413) {
      writeJson(res, 413, { error: "Request body too large" });
      return;
    }
    console.error("Search proxy error:", err);
    writeJson(res, 502, {
      error: "Search service unavailable",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sightread search proxy: http://${HOST}:${PORT}`);
  console.log(
    TAVILY_API_KEY
      ? "Tavily API key loaded."
      : "WARNING: set TAVILY_API_KEY environment variable.",
  );
});
