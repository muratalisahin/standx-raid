import { proxyJson } from "./proxy.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: "symbol is required" });
  await proxyJson(
    res,
    `https://perps.standx.com/api/query_depth_book?symbol=${encodeURIComponent(symbol)}`
  );
}
