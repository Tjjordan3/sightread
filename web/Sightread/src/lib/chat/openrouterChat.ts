import { buildTranscript, type ChatAIService, type ChatMessage } from "./types";
import { VisionAIError } from "../vision/types";

export function createOpenRouterChatService(
  apiKey: string,
  model: string,
): ChatAIService {
  return {
    async chat(messages: ChatMessage[], attachedImageBase64?: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const content: Array<Record<string, unknown>> = [
        { type: "text", text: buildTranscript(messages) },
      ];
      if (attachedImageBase64) {
        content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${attachedImageBase64}`,
          },
        });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Sightread",
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new VisionAIError(
          data?.error?.message ?? `OpenRouter request failed (${response.status})`,
          response.status,
        );
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new VisionAIError("Empty response from OpenRouter.");
      return text;
    },
  };
}
