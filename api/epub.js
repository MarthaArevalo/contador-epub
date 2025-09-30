export default function handler(req, res) {
  // Activamos el soporte de CORS (para que pueda usarse desde cualquier página)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Respuesta rápida a preflight
  }

  // Usaremos una variable en memoria (⚠️ se reinicia cuando Vercel "duerme")
  // Para algo 100% persistente haría falta base de datos externa
  if (!global.downloadCount) {
    global.downloadCount = 0;
  }

  if (req.method === "POST") {
    global.downloadCount++;
    return res.status(200).json({ value: global.downloadCount });
  }

  if (req.method === "GET") {
    return res.status(200).json({ value: global.downloadCount });
  }

  res.status(405).json({ error: "Método no permitido" });
}
