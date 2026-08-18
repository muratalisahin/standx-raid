import { proxyJson } from "./proxy.js";

export default async function handler(req, res) {
  const symbol = req.query.symbol;
  const path = symbol
    ? `/api/query_symbol_market?symbol=${encodeURIComponent(symbol)}`
    : "/api/query_market_overview";
  await proxyJson(res, `https://perps.standx.com${path}`);
}
