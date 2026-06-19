const UPSTREAM = "https://integrate.api.nvidia.com/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction = async (context) => {
  const authorization = context.request.headers.get("Authorization");
  if (!authorization) {
    return Response.json(
      { error: { message: "Missing Authorization header" } },
      { status: 401 },
    );
  }

  try {
    const body = await context.request.text();
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body,
    });

    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proxy error";
    return Response.json({ error: { message: `Upstream error: ${message}` } }, { status: 502 });
  }
};
