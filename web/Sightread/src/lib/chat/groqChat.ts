import { buildTranscript, type ChatMessage } from "./types";
import { VisionAIError } from "../vision/types";

const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export function createGroqChatService(apiKey: string) {
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

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
          data?.error?.message ?? `Groq request failed (${response.status})`,
          response.status,
        );
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new VisionAIError("Empty response from Groq.");
      return text;
    },
  };
}
