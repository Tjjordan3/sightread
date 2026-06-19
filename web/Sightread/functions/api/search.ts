/**
 * Cloudflare Pages Function: Tavily search proxy
 * Replaces Serper for production. Handles: POST /api/search
 *
 * Add in Cloudflare Dashboard → Settings → Environment variables:
 *   TAVILY_API_KEY = your key from app.tavily.com  (mark as Secret)
 */

interface Env {
  TAVILY_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (request.method === "GET") {
    return Response.json({
      ok: true,
      service: "sightread-search-proxy",
      configured: !!env.TAVILY_API_KEY,
    });
  }

  if (request.method !== "POST") {
    return new Response("POST /api/search", { status: 405 });
  }

  if (!env.TAVILY_API_KEY) {
    return Response.json(
      { error: "TAVILY_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { query } = body as { query?: string };
  if (!query || typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  const tavilyResponse = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: query.trim(),
      max_results: 5,
      search_depth: "basic",
    }),
  });

  const data = await tavilyResponse.json() as {
    results?: { title: string; url: string; content: string }[];
  };

  const results = (data.results ?? []).slice(0, 5).map((item) => ({
    title: item.title ?? "",
    url: item.url ?? "",
    snippet: item.content ?? "",
  }));

  return Response.json(
    { query: query.trim(), results },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
};
