// api/epub.js — Persistente con Upstash/Redis (Edge Runtime) + compat nombres de variables
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

  // Lee variables con cualquiera de los nombres comunes (KV_* o UPSTASH_*)
  // Edge Runtime soporta process.env; Deno.env por compat.
  const getEnv = (k) =>
    (typeof process !== "undefined" && process.env?.[k]) ||
    (typeof Deno !== "undefined" && Deno.env.get(k));

  const url =
    getEnv("KV_REST_API_URL") ||
    getEnv("UPSTASH_REDIS_REST_URL") ||
    getEnv("REDIS_REST_URL") || // por si alguna integración alternativa
    null;

  const token =
    getEnv("KV_REST_API_TOKEN") ||
    getEnv("UPSTASH_REDIS_REST_TOKEN") ||
    getEnv("REDIS_REST_TOKEN") ||
    null;

  // Ruta de diagnóstico opcional: /api/epub?action=diag
  const u = new URL(req.url);
  const action = (u.searchParams.get("action") || "get").toLowerCase();
  if (action === "diag") {
    return new Response(
      JSON.stringify({
        runtime: "edge",
        hasUrl: Boolean(url),
        hasToken: Boolean(token),
        urlPreview: url ? url.slice(0, 30) + "..." : null,
        note: "Si hasUrl o hasToken es false, revisa Environment Variables en Vercel.",
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
      // INCR key y devuelve el nuevo valor (texto plano)
      const incr = await fetch(`${url}/incr/${encodeURIComponent(KEY)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!incr.ok) {
        const t = await incr.text();
        throw new Error(`Upstash incr failed: ${incr.status} ${t}`);
      }
      const valText = await incr.text();
      const value = Number(valText);
      return new Response(JSON.stringify({ value: Number.isFinite(value) ? value : 0 }), { status: 200, headers });
    }

    // action === "get": lee el valor; si no existe, inicializa en 0
    const getRes = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let bodyText = await getRes.text(); // puede venir vacío si no existe

    if (!bodyText) {
      const setRes = await fetch(`${url}/set/${encodeURIComponent(KEY)}/0`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!setRes.ok) {
        const t = await setRes.text();
        throw new Error(`Upstash set failed: ${setRes.status} ${t}`);
      }
      bodyText = "0";
    }

    const value = Number(bodyText);
    return new Response(JSON.stringify({ value: Number.isFinite(value) ? value : 0 }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ value: 0, note: "upstash-fallback", err: String(e) }), {
      status: 200,
      headers,
    });
  }
}
