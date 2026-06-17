import { buildTranscript, type ChatAIService, type ChatMessage } from "./types";
import { VisionAIError } from "../vision/types";

const MODEL = "gpt-4o-mini";

export function createOpenAIChatService(apiKey: string): ChatAIService {
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
            detail: "low",
          },
        });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
          data?.error?.message ?? `OpenAI request failed (${response.status})`,
          response.status,
        );
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new VisionAIError("Empty response from OpenAI.");
      return text;
    },
  };
}
