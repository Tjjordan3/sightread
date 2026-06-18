/**
 * Serper web search proxy — keeps SERPER_API_KEY on the server (not in the browser).
 * IIS rewrites /api/search -> http://127.0.0.1:8789/search
 *
 * Set environment variable: SERPER_API_KEY=your_key_from_serper.dev
 */
import http from "node:http";
import https from "node:https";

const HOST = process.env.SEARCH_PROXY_HOST ?? "127.0.0.1";
const PORT = Number(process.env.SEARCH_PROXY_PORT ?? 8789);
const SERPER_API_KEY = process.env.SERPER_API_KEY ?? "";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function serperSearch(query, num = 5) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ q: query, num });
    const req = https.request(
      {
        hostname: "google.serper.dev",
        path: "/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": SERPER_API_KEY,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
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
      configured: SERPER_API_KEY.length > 0,
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/search") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("POST /search");
    return;
  }

  if (!SERPER_API_KEY) {
    writeJson(res, 503, {
      error: "SERPER_API_KEY is not set on the server.",
    });
    return;
  }

  try {
    const raw = await readBody(req);
    const { query } = JSON.parse(raw.toString("utf8"));
    if (!query || typeof query !== "string" || !query.trim()) {
      writeJson(res, 400, { error: "Missing query" });
      return;
    }

    const data = await serperSearch(query.trim(), 5);
    const results = (data.organic ?? []).slice(0, 5).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? "",
      snippet: item.snippet ?? "",
    }));

    writeJson(res, 200, { query: query.trim(), results });
  } catch (err) {
    writeJson(res, 502, {
      error: err instanceof Error ? err.message : "Search failed",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sightread search proxy: http://${HOST}:${PORT}`);
  console.log(
    SERPER_API_KEY
      ? "Serper API key loaded."
      : "WARNING: set SERPER_API_KEY environment variable.",
  );
});
