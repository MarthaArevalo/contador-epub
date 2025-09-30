// api/epub.js — Edge Runtime (fetch siempre disponible)
export const config = { runtime: "edge" };

export default async function handler(req) {
  const NS  = "las_marginadas_hijas_de_eva";
  const KEY = "descargas_epub";
  const BASE = "https://api.countapi.xyz";

  // CORS + no cache
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "get").toLowerCase();

    if (action === "get") {
      let r = await fetch(`${BASE}/get/${NS}/${KEY}`);
      if (r.status === 404) {
        await fetch(`${BASE}/create?namespace=${encodeURIComponent(NS)}&key=${encodeURIComponent(KEY)}&value=0`);
        r = await fetch(`${BASE}/get/${NS}/${KEY}`);
      }
      const j = await r.json();
      return new Response(JSON.stringify({ value: Number(j?.value) || 0 }), { status: 200, headers });
    }

    if (action === "hit") {
      const r = await fetch(`${BASE}/hit/${NS}/${KEY}`);
      const j = await r.json();
      return new Response(JSON.stringify({ value: Number(j?.value) || 0 }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: "bad action" }), { status: 400, headers });
  } catch (e) {
    // Si algo falla, devolvemos un fallback (sin romper CORS)
    return new Response(JSON.stringify({ value: 0, note: "fallback" }), { status: 200, headers });
  }
}
