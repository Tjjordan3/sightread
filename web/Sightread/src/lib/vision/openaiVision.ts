import { VisionAIError, type VisionAIService } from "./types";

const MODEL = "gpt-4o-mini";

export function createOpenAIVisionService(apiKey: string): VisionAIService {
  return {
    async analyze(jpegBase64: string, prompt: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${jpegBase64}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
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
