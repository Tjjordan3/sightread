interface Env {
  SERPER_API_KEY?: string;
}

interface SerperOrganic {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganic[];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = context.env.SERPER_API_KEY ?? "";
  return Response.json({
    ok: true,
    service: "sightread-search-proxy",
    configured: key.length > 0,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const serperKey = context.env.SERPER_API_KEY ?? "";
  if (!serperKey) {
    return Response.json(
      { error: "SERPER_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  try {
    const payload = (await context.request.json()) as { query?: string };
    const query = payload.query?.trim();
    if (!query) {
      return Response.json({ error: "Missing query" }, { status: 400 });
    }

    const serperResponse = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperKey,
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!serperResponse.ok) {
      const text = await serperResponse.text();
      return Response.json(
        { error: text || `Serper error (${serperResponse.status})` },
        { status: 502 },
      );
    }

    const data = (await serperResponse.json()) as SerperResponse;
    const results = (data.organic ?? []).slice(0, 5).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? "",
      snippet: item.snippet ?? "",
    }));

    return Response.json({ query, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return Response.json({ error: message }, { status: 502 });
  }
};
