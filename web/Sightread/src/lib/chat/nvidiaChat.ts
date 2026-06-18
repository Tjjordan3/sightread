import { nvidiaChatCompletion, readNvidiaResponse } from "../nvidia/request";
import { buildTranscript, type ChatMessage } from "./types";

export function createNvidiaChatService(
  apiKey: string,
  model: string,
  proxyPath?: string,
) {
  return {
    async chat(messages: ChatMessage[], attachedImageBase64?: string): Promise<string> {
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

      const response = await nvidiaChatCompletion(
        apiKey,
        {
          model,
          max_tokens: 400,
          messages: [{ role: "user", content }],
        },
        proxyPath,
      );
      return readNvidiaResponse(response);
    },
  };
}
