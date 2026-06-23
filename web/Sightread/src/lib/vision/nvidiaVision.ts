import { nvidiaChatCompletion, readNvidiaResponse } from "../nvidia/request";
import { type VisionAIService } from "./types";

export function createNvidiaVisionService(
  apiKey: string,
  model: string,
): VisionAIService {
  return {
    async analyze(jpegBase64: string, prompt: string): Promise<string> {
      const response = await nvidiaChatCompletion(apiKey, {
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
      });
      return readNvidiaResponse(response);
    },
  };
}
