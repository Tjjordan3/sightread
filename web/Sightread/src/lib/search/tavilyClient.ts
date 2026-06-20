import { VisionAIError } from "../vision/types";

export interface SearchCitation {
  title: string;
  url: string;
  snippet?: string;
}

const SEARCH_URL = "/api/search";

export async function webSearch(query: string): Promise<SearchCitation[]> {
  let response: Response;
  try {
    response = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
  } catch {
    throw new VisionAIError(
      "Could not reach the search proxy. Run scripts\\start-search-proxy.cmd on the server with SERPER_API_KEY set.",
    );
  }

  const data = (await response.json()) as {
    error?: string;
    results?: SearchCitation[];
  };

  if (!response.ok) {
    throw new VisionAIError(
      data.error ?? `Search proxy error (${response.status})`,
      response.status,
    );
  }

  return data.results ?? [];
}

export function formatSearchResultsForTool(results: SearchCitation[]): string {
  if (results.length === 0) return "No results found.";
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`,
    )
    .join("\n\n");
}
