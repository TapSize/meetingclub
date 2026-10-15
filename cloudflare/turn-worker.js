const TURN_TTL_SECONDS = 86400;

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";

    if (url.pathname !== "/turn-credentials") {
      return jsonResponse({ error: "Not found" }, 404);
    }
    if (!allowedOrigin || origin !== allowedOrigin) {
      return jsonResponse({ error: "Origin not allowed" }, 403);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }
    if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) {
      return jsonResponse({ error: "TURN Worker is not configured" }, 500, corsHeaders);
    }

    try {
      const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.TURN_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ttl: TURN_TTL_SECONDS })
      });

      if (!response.ok) {
        return jsonResponse({ error: "Cloudflare could not issue TURN credentials" }, 502, corsHeaders);
      }

      const credentials = await response.json();
      if (!Array.isArray(credentials.iceServers) || credentials.iceServers.length === 0) {
        return jsonResponse({ error: "Cloudflare returned no ICE servers" }, 502, corsHeaders);
      }

      return jsonResponse(credentials, 200, corsHeaders);
    } catch {
      return jsonResponse({ error: "TURN credentials service is unavailable" }, 502, corsHeaders);
    }
  }
};
