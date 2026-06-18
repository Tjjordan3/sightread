import { buildTranscript, type ChatMessage } from "./types";
import { VisionAIError } from "../vision/types";

const MODEL = "gemini-2.0-flash";

export function createGeminiChatService(apiKey: string) {
  return {
    async chat(messages: ChatMessage[], attachedImageBase64?: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const parts: Array<Record<string, unknown>> = [
        { text: buildTranscript(messages) },
      ];
      if (attachedImageBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: attachedImageBase64,
          },
        });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new VisionAIError(
          data?.error?.message ?? `Gemini request failed (${response.status})`,
          response.status,
        );
      }

      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim();
      if (!text) throw new VisionAIError("Empty response from Gemini.");
      return text;
    },
  };
}
