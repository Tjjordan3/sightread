/**
 * Local NVIDIA proxy for IIS (no ARR required).
 * IIS rewrites /api/nvidia/* -> http://127.0.0.1:8788/v1/*
 */
import http from "node:http";
import https from "node:https";

const HOST = process.env.NVIDIA_PROXY_HOST ?? "127.0.0.1";
const PORT = Number(process.env.NVIDIA_PROXY_PORT ?? 8788);
const UPSTREAM = "integrate.api.nvidia.com";

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

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/v1/health")) {
    writeJson(res, 200, { ok: true, service: "sightread-nvidia-proxy" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || !req.url?.startsWith("/v1/")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. POST to /v1/chat/completions");
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    writeJson(res, 401, { error: { message: "Missing Authorization header" } });
    return;
  }

  try {
    const body = await readBody(req);
    const upstreamReq = https.request(
      {
        hostname: UPSTREAM,
        path: req.url,
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
      writeJson(res, 502, {
        error: { message: `Upstream error: ${err.message}` },
      });
    });

    upstreamReq.setTimeout(120_000, () => {
      upstreamReq.destroy(new Error("Upstream timeout"));
    });

    upstreamReq.write(body);
    upstreamReq.end();
  } catch (err) {
    writeJson(res, 500, {
      error: {
        message: err instanceof Error ? err.message : "Proxy error",
      },
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sightread NVIDIA proxy: http://${HOST}:${PORT}`);
  console.log("Health check: GET /health");
  console.log("IIS should rewrite /api/nvidia/* to this service.");
});
