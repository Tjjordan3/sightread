/**
 * Fallback NVIDIA proxy when IIS ARR reverse-proxy is not available.
 * Listens on 127.0.0.1:8788 and forwards /v1/* to integrate.api.nvidia.com.
 *
 * Point IIS rewrite to: http://127.0.0.1:8788/v1/{R:1}
 * Or run behind Tailscale only on the server (not recommended for phones).
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

const server = http.createServer(async (req, res) => {
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
    res.end("Not found");
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Missing Authorization header");
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
        const headers = { ...upstreamRes.headers };
        delete headers["transfer-encoding"];
        res.writeHead(upstreamRes.statusCode ?? 502, headers);
        upstreamRes.pipe(res);
      },
    );

    upstreamReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Upstream error: ${err.message}`);
    });

    upstreamReq.write(body);
    upstreamReq.end();
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(err instanceof Error ? err.message : "Proxy error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NVIDIA proxy listening on http://${HOST}:${PORT}`);
  console.log("Forward IIS /api/nvidia/* to this service if ARR is unavailable.");
});
