import { proxyJson } from "./proxy.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol;
  if (!symbol) {
    res.status(400).json({ error: "symbol required" });
    return;
  }
  await proxyJson(res, `https://perps.standx.com/api/query_recent_trades?symbol=${encodeURIComponent(symbol)}`);
}
