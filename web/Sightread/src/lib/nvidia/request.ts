import { VisionAIError } from "../vision/types";

const DEFAULT_PROXY_PATH = "/api/nvidia/v1/chat/completions";

export function resolveNvidiaUrl(proxyPath = DEFAULT_PROXY_PATH): string {
  if (proxyPath.startsWith("http://") || proxyPath.startsWith("https://")) {
    return proxyPath;
  }
  const path = proxyPath.startsWith("/") ? proxyPath : `/${proxyPath}`;
  return `${window.location.origin}${path}`;
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
        ? "Could not reach the NVIDIA proxy. Deploy web.config (IIS rewrite) or run npm run nvidia-proxy on your server — NVIDIA blocks direct browser calls."
        : err instanceof Error
          ? err.message
          : "NVIDIA request failed.",
    );
  }

  return response;
}

export async function readNvidiaResponse(response: Response): Promise<string> {
  let data: { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
  try {
    data = await response.json();
  } catch {
    throw new VisionAIError(
      response.ok
        ? "Invalid response from NVIDIA proxy."
        : `NVIDIA proxy error (${response.status}). Check IIS rewrite or nvidia-proxy.`,
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
