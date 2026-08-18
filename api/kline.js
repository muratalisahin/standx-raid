import { proxyJson } from "./proxy.js";

export default async function handler(req, res) {
  const { symbol, resolution, from, to } = req.query;
  if (!symbol || !resolution || !from || !to) {
    return res.status(400).json({ error: "symbol, resolution, from and to are required" });
  }
  const path = `/api/kline/history?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  await proxyJson(res, `https://perps.standx.com${path}`);
}
