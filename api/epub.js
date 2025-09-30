// api/epub.js — Upstash Redis (REST) Edge Runtime con soporte SVG
export const config = { runtime: "edge" };

export default async function handler(req) {
  const headersJSON = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
  const headersSVG = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "image/svg+xml; charset=utf-8",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headersJSON });

  const getEnv = (k) =>
    (typeof process !== "undefined" && process.env?.[k]) ||
    (typeof Deno !== "undefined" && Deno.env.get(k));

  const url =
    getEnv("KV_REST_API_URL") ||
    getEnv("UPSTASH_REDIS_REST_URL") ||
    getEnv("REDIS_REST_URL") ||
    null;

  const token =
    getEnv("KV_REST_API_TOKEN") ||
    getEnv("UPSTASH_REDIS_REST_TOKEN") ||
    getEnv("REDIS_REST_TOKEN") ||
    null;

  const u = new URL(req.url);
  const action = (u.searchParams.get("action") || "get").toLowerCase();
  const format = (u.searchParams.get("format") || "json").toLowerCase();
  const KEY = "las_marginadas_hijas_de_eva:descargas_epub";

  if (!url || !token) {
    if (format === "svg") {
      return new Response(svgNumber(0), { status: 200, headers: headersSVG });
    }
    return new Response(JSON.stringify({ value: 0, note: "upstash-env-missing" }), { status: 200, headers: headersJSON });
  }

  try {
    if (action === "hit") {
      const incr = await fetch(`${url}/incr/${encodeURIComponent(KEY)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await incr.json().catch(() => ({}));
      const value = Number(j?.result);
      if (!Number.isFinite(value)) throw new Error(`Bad incr result: ${JSON.stringify(j)}`);
      return respond(value, format, headersJSON, headersSVG);
    }

    // action === "get"
    const getRes = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let j = await getRes.json().catch(() => ({}));
    let current = j?.result;

    if (current === null || current === undefined || current === "") {
      const setRes = await fetch(`${url}/set/${encodeURIComponent(KEY)}/0`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!setRes.ok) {
        const txt = await setRes.text();
        throw new Error(`set failed: ${setRes.status} ${txt}`);
      }
      current = 0;
    }

    const value = Number(current);
    return respond(Number.isFinite(value) ? value : 0, format, headersJSON, headersSVG);
  } catch (e) {
    if (format === "svg") {
      return new Response(svgNumber(0), { status: 200, headers: headersSVG });
    }
    return new Response(JSON.stringify({ value: 0, note: "upstash-fallback", err: String(e) }), {
      status: 200,
      headers: headersJSON,
    });
  }
}

function respond(value, format, headersJSON, headersSVG) {
  if (format === "svg") {
    return new Response(svgNumber(value), { status: 200, headers: headersSVG });
  }
  return new Response(JSON.stringify({ value }), { status: 200, headers: headersJSON });
}

// SVG simple que emula texto verde en pantalla
function svgNumber(n) {
  const txt = String(n);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="200" viewBox="0 0 260 200">
  <rect width="100%" height="100%" fill="none"/>
  <g filter="url(#g)">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="monospace" font-size="48" fill="#00ff00">
      ${escapeXml(txt)}
    </text>
  </g>
  <defs>
    <filter id="g">
      <feGaussianBlur stdDeviation="0.6"/>
    </filter>
  </defs>
</svg>`.trim();
}

function escapeXml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
