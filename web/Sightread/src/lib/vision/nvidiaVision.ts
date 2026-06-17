import { VisionAIError, type VisionAIService } from "./types";

const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export function createNvidiaVisionService(
  apiKey: string,
  model: string,
): VisionAIService {
  return {
    async analyze(jpegBase64: string, prompt: string): Promise<string> {
      if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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
          data?.error?.message ?? `NVIDIA API request failed (${response.status})`,
          response.status,
        );
      }

      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new VisionAIError("Empty response from NVIDIA API.");
      return text;
    },
  };
}
