import { buildTranscript, type ChatMessage } from "./types";
import { VisionAIError } from "../vision/types";

const MODEL = "claude-3-5-haiku-latest";

export function createAnthropicChatService(apiKey: string) {
  return {
    async chat(messages: ChatMessage[], attachedImageBase64?: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const content: Array<Record<string, unknown>> = [
        { type: "text", text: buildTranscript(messages) },
      ];
      if (attachedImageBase64) {
        content.unshift({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: attachedImageBase64,
          },
        });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 400,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new VisionAIError(
          data?.error?.message ?? `Anthropic request failed (${response.status})`,
          response.status,
        );
      }

      const text = (data?.content ?? [])
        .filter((block: { type?: string }) => block.type === "text")
        .map((block: { text?: string }) => block.text ?? "")
        .join("")
        .trim();
      if (!text) throw new VisionAIError("Empty response from Anthropic.");
      return text;
    },
  };
}
