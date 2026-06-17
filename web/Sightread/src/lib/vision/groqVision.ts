import { VisionAIError, type VisionAIService } from "./types";

const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export function createGroqVisionService(apiKey: string): VisionAIService {
  return {
    async analyze(jpegBase64: string, prompt: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
