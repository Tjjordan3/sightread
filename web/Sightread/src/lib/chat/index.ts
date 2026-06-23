import {
  formatSearchResultsForTool,
  webSearch,
  type SearchCitation,
} from "../search/tavilyClient";
import { sanitizeCitations } from "../safeUrl";
import { getApiKey, type Settings } from "../settings";
import { VisionAIError } from "../vision/types";
import {
  getOpenAICompatibleConfig,
  stripImageUrlsForToolUse,
  supportsWebSearchTools,
} from "./openaiConfig";
import type { ChatAIService, ChatMessage, ChatReply } from "./types";
import { createAnthropicChatService } from "./anthropicChat";
import { createGeminiChatService } from "./geminiChat";
import { createGroqChatService } from "./groqChat";
import { createMistralChatService } from "./mistralChat";
import { createNvidiaChatService } from "./nvidiaChat";
import { createOpenAIChatService } from "./openaiChat";
import { createOpenRouterChatService } from "./openrouterChat";

const WEB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "Search the web for up-to-date information. Use when the user asks about current events, prices, news, or facts you are unsure about.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT =
  "You are Sightread, a helpful AI agent. When you use web search results, cite sources inline like [1], [2] matching the result numbers. Be concise and accurate.";

type ApiMessage = Record<string, unknown>;

function toApiMessages(
  messages: ChatMessage[],
  attachedImageBase64?: string,
): ApiMessage[] {
  const api: ApiMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  const history = messages.slice(-20);

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    const isLast = i === history.length - 1;

    if (msg.role === "user" && isLast && attachedImageBase64) {
      api.push({
        role: "user",
        content: [
          { type: "text", text: msg.text },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${attachedImageBase64}`,
              detail: "low",
            },
          },
        ],
      });
    } else {
      api.push({ role: msg.role, content: msg.text });
    }
  }

  return api;
}

function dedupeCitations(citations: SearchCitation[]): SearchCitation[] {
  const seen = new Set<string>();
  return sanitizeCitations(citations).filter((c) => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

async function runToolAgentChat(
  settings: Settings,
  messages: ChatMessage[],
  attachedImageBase64?: string,
): Promise<ChatReply> {
  const apiKey = getApiKey(settings);
  if (!apiKey.trim()) throw new VisionAIError("Add API key in Settings.");

  const { url, model, extraHeaders } = getOpenAICompatibleConfig(settings, {
    toolUse: true,
  });
  const apiMessages = stripImageUrlsForToolUse(
    settings.provider,
    toApiMessages(messages, attachedImageBase64),
  );
  const allCitations: SearchCitation[] = [];

  for (let round = 0; round < 3; round++) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: apiMessages,
        tools: [WEB_SEARCH_TOOL],
        tool_choice: "auto",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new VisionAIError(
        data?.error?.message ?? `Chat request failed (${response.status})`,
        response.status,
      );
    }

    const choice = data?.choices?.[0]?.message;
    if (!choice) throw new VisionAIError("Empty response from model.");

    try {
      const toolCalls = choice.tool_calls as
        | Array<{
            id: string;
            function: { name: string; arguments: string };
          }>
        | undefined;

      if (toolCalls?.length) {
        apiMessages.push({
          role: "assistant",
          content: choice.content ?? "",
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          if (call.function.name !== "web_search") continue;
          let query = "";
          try {
            const args = JSON.parse(call.function.arguments) as {
              query?: string;
            };
            query = args.query?.trim() ?? "";
          } catch {
            query = "";
          }

          let toolContent = "Invalid search query.";
          if (query) {
            try {
              const results = await webSearch(query);
              allCitations.push(...results);
              toolContent = formatSearchResultsForTool(results);
            } catch (err) {
              toolContent =
                err instanceof Error ? err.message : "Search failed.";
            }
          }

          apiMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: toolContent,
          });
        }
        continue;
      }
    } catch (err) {
      throw new VisionAIError(
        err instanceof VisionAIError
          ? err.message
          : "Could not parse web search tool response from the model.",
      );
    }

    const text = (choice.content as string | undefined)?.trim();
    if (!text) throw new VisionAIError("Empty response from model.");

    return {
      text,
      citations: dedupeCitations(allCitations),
    };
  }

  throw new VisionAIError("Web search took too many steps.");
}

function wrapLegacy(
  chat: (messages: ChatMessage[], attachedImageBase64?: string) => Promise<string>,
): ChatAIService {
  return {
    async chat(messages, attachedImageBase64) {
      const text = await chat(messages, attachedImageBase64);
      return { text };
    },
  };
}

function createLegacyChatService(settings: Settings): ChatAIService {
  const apiKey = getApiKey(settings);
  switch (settings.provider) {
    case "gemini":
      return wrapLegacy(createGeminiChatService(apiKey).chat);
    case "openai":
      return wrapLegacy(createOpenAIChatService(apiKey).chat);
    case "groq":
      return wrapLegacy(createGroqChatService(apiKey).chat);
    case "anthropic":
      return wrapLegacy(createAnthropicChatService(apiKey).chat);
    case "mistral":
      return wrapLegacy(createMistralChatService(apiKey).chat);
    case "openrouter":
      return wrapLegacy(
        createOpenRouterChatService(apiKey, settings.openrouterModel).chat,
      );
    case "nvidia":
      return wrapLegacy(
        createNvidiaChatService(apiKey, settings.nvidiaModel).chat,
      );
  }
}

export function createChatService(settings: Settings): ChatAIService {
  if (settings.webSearchEnabled) {
    if (!supportsWebSearchTools(settings.provider)) {
      return {
        async chat() {
          throw new VisionAIError(
            "Web search requires OpenAI, Groq, OpenRouter, or NVIDIA. Change provider or disable web search.",
          );
        },
      };
    }
    return {
      async chat(messages, attachedImageBase64) {
        return runToolAgentChat(settings, messages, attachedImageBase64);
      },
    };
  }
  return createLegacyChatService(settings);
}

export type { ChatCitation, ChatMessage, ChatReply, ChatRole } from "./types";
