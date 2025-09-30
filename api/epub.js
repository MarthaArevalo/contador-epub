// api/epub.js — Upstash Redis (REST) en Edge Runtime, leyendo JSON {result:...}
export const config = { runtime: "edge" };

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  // Lee variables con cualquiera de los nombres comunes
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

  // Diagnóstico opcional
  if (action === "diag") {
    return new Response(
      JSON.stringify({
        runtime: "edge",
        hasUrl: Boolean(url),
        hasToken: Boolean(token),
        urlPreview: url ? url.slice(0, 30) + "..." : null,
      }),
      { status: 200, headers }
    );
  }

  if (!url || !token) {
    return new Response(JSON.stringify({ value: 0, note: "upstash-env-missing" }), { status: 200, headers });
  }

  const KEY = "las_marginadas_hijas_de_eva:descargas_epub";

  try {
    if (action === "hit") {
      // INCR key → { result: <nuevo_valor> }
      const incr = await fetch(`${url}/incr/${encodeURIComponent(KEY)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await incr.json().catch(() => ({}));
      const value = Number(j?.result);
      if (!Number.isFinite(value)) throw new Error(`Bad incr result: ${JSON.stringify(j)}`);
      return new Response(JSON.stringify({ value }), { status: 200, headers });
    }

    // action === "get": { result: <valor_o_null> }
    const getRes = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let j = await getRes.json().catch(() => ({}));
    let current = j?.result;

    if (current === null || current === undefined || current === "") {
      // Si no existe, inicializa a 0: { result: "OK" }
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
    return new Response(JSON.stringify({ value: Number.isFinite(value) ? value : 0 }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ value: 0, note: "upstash-fallback", err: String(e) }), {
      status: 200,
      headers,
    });
  }
}
