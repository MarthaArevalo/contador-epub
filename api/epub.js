// api/epub.js — Proxy persistente a CountAPI (recomendado)
export default async function handler(req, res) {
  const NS  = "las_marginadas_hijas_de_eva";  // tu namespace
  const KEY = "descargas_epub";               // tu clave
  const BASE = "https://api.countapi.xyz";

  // CORS para poder llamarlo desde Neocities
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const action = (req.query.action || "get").toLowerCase();

  try {
    if (action === "get") {
      let r = await fetch(`${BASE}/get/${NS}/${KEY}`);
      if (r.status === 404) {
        await fetch(`${BASE}/create?namespace=${encodeURIComponent(NS)}&key=${encodeURIComponent(KEY)}&value=0`);
        r = await fetch(`${BASE}/get/${NS}/${KEY}`);
      }
      const j = await r.json();
      return res.status(200).json({ value: Number(j?.value) || 0 });
    }

    if (action === "hit") {
      const r = await fetch(`${BASE}/hit/${NS}/${KEY}`);
      const j = await r.json();
      return res.status(200).json({ value: Number(j?.value) || 0 });
    }

    return res.status(400).json({ error: "bad action" });
  } catch (e) {
    // Si CountAPI falla, no rompas la página
    return res.status(200).json({ value: 0, note: "fallback" });
  }
}
