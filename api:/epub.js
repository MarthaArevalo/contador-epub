// api/epub.js
export default async function handler(req, res) {
  const NS  = "las_marginadas_hijas_de_eva";  // deja estos IDs
  const KEY = "descargas_epub";
  const BASE = "https://api.countapi.xyz";

  // CORS para permitir requests desde Neocities
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  // Manejar preflight por si acaso (no debería hacer falta con GET)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

    return res.status(400).json({ error: "Bad action" });
  } catch (e) {
    // Si CountAPI está caído / bloqueado, no rompemos
    return res.status(200).json({ value: 0, note: "fallback" });
  }
}