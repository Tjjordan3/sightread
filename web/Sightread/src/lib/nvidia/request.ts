import { VisionAIError } from "../vision/types";

const DEFAULT_PROXY_PATH = "/api/nvidia/v1/chat/completions";

export function resolveNvidiaUrl(proxyPath = DEFAULT_PROXY_PATH): string {
  if (proxyPath.startsWith("http://") || proxyPath.startsWith("https://")) {
    return proxyPath;
  }
  const path = proxyPath.startsWith("/") ? proxyPath : `/${proxyPath}`;
  return `${window.location.origin}${path}`;
}

export function resolveNvidiaHealthUrl(proxyPath = DEFAULT_PROXY_PATH): string {
  return resolveNvidiaUrl(proxyPath).replace(/\/chat\/completions\/?$/, "/health");
}

export async function nvidiaChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  proxyPath = DEFAULT_PROXY_PATH,
): Promise<Response> {
  if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

  let response: Response;
  try {
    response = await fetch(resolveNvidiaUrl(proxyPath), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const isNetwork =
      err instanceof TypeError &&
      (err.message === "Failed to fetch" || err.message.includes("NetworkError"));
    throw new VisionAIError(
      isNetwork
        ? "Could not reach /api/nvidia on your server. Run scripts\\start-nvidia-proxy.cmd (or npm run nvidia-proxy), redeploy web.config, then try again."
        : err instanceof Error
          ? err.message
          : "NVIDIA request failed.",
    );
  }

  return response;
}

export async function testNvidiaProxy(proxyPath = DEFAULT_PROXY_PATH): Promise<void> {
  let response: Response;
  try {
    response = await fetch(resolveNvidiaHealthUrl(proxyPath));
  } catch {
    throw new VisionAIError(
      "NVIDIA proxy is not reachable. On the server, run scripts\\start-nvidia-proxy.cmd and ensure web.config is deployed.",
    );
  }

  if (!response.ok) {
    throw new VisionAIError(
      `NVIDIA proxy health check failed (${response.status}). Is npm run nvidia-proxy running?`,
      response.status,
    );
  }
}

export async function readNvidiaResponse(response: Response): Promise<string> {
  const rawText = await response.text();
  let data: {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    const snippet = rawText.replace(/\s+/g, " ").trim().slice(0, 160);
    const hint =
      response.status === 404
        ? " Proxy not found — run start-nvidia-proxy.cmd on the server and redeploy web.config."
        : response.status === 502
          ? " Bad gateway — is the NVIDIA proxy running on port 8788?"
          : "";
    throw new VisionAIError(
      `NVIDIA proxy returned non-JSON (${response.status}): ${snippet || "empty response"}.${hint}`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new VisionAIError(
      data?.error?.message ?? `NVIDIA API request failed (${response.status})`,
      response.status,
    );
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new VisionAIError("Empty response from NVIDIA API.");
  return text;
}

export async function testNvidiaConnection(
  apiKey: string,
  model: string,
  proxyPath = DEFAULT_PROXY_PATH,
): Promise<string> {
  await testNvidiaProxy(proxyPath);
  const response = await nvidiaChatCompletion(
    apiKey,
    {
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with the word ok." }],
    },
    proxyPath,
  );
  return readNvidiaResponse(response);
}
