const marketPath = (symbol = "") =>
  symbol
    ? `/api/query_symbol_market?symbol=${encodeURIComponent(symbol)}`
    : `/api/query_market_overview`;

export function marketUrl(symbol = "") {
  return import.meta.env.DEV
    ? `/standx-api${marketPath(symbol)}`
    : `/api/market${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`;
}

export function depthUrl(symbol) {
  return import.meta.env.DEV
    ? `/standx-api/api/query_depth_book?symbol=${encodeURIComponent(symbol)}`
    : `/api/depth?symbol=${encodeURIComponent(symbol)}`;
}

export function klineUrl(symbol, resolution, from, to) {
  const q = `symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${to}`;
  return import.meta.env.DEV ? `/standx-api/api/kline/history?${q}` : `/api/kline?${q}`;
}

export function parseKlines(j) {
  if (!j || j.s !== "ok" || !Array.isArray(j.t)) return [];
  return j.t
    .map((t, i) => ({ t, o: +j.o[i], h: +j.h[i], l: +j.l[i], c: +j.c[i] }))
    .filter((c) => c.c > 0);
}

function wall(levels) {
  let best = null;
  let usd = 0;
  for (const [p, q] of levels.slice(0, 24)) {
    const n = p * q;
    if (n > usd) {
      usd = n;
      best = p;
    }
  }
  return best ? { price: best, usd } : null;
}

export function tradesUrl(symbol) {
  return import.meta.env.DEV
    ? `/standx-api/api/query_recent_trades?symbol=${encodeURIComponent(symbol)}`
    : `/api/trades?symbol=${encodeURIComponent(symbol)}`;
}

export async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export function parseDepth(raw, market) {
  const bids = (raw?.bids || []).map((x) => [+x[0], +x[1]]).filter((x) => x[0] > 0 && x[1] > 0).sort((a, b) => b[0] - a[0]);
  const asks = (raw?.asks || []).map((x) => [+x[0], +x[1]]).filter((x) => x[0] > 0 && x[1] > 0).sort((a, b) => a[0] - b[0]);
  const bidUsd = bids.slice(0, 24).reduce((s, x) => s + x[0] * x[1], 0);
  const askUsd = asks.slice(0, 24).reduce((s, x) => s + x[0] * x[1], 0);
  const mid = Number(market?.mid_price || market?.mark_price || market?.last_price || 0);
  const spreadRaw = market?.spread;
  const spread =
    Array.isArray(spreadRaw) && spreadRaw.length >= 2
      ? Math.abs(+spreadRaw[1] - +spreadRaw[0])
      : asks[0] && bids[0]
        ? asks[0][0] - bids[0][0]
        : 0;
  const spreadBps = mid > 0 ? (spread / mid) * 10000 : 0;
  const tot = bidUsd + askUsd;
  const imbalance = tot > 0 ? (bidUsd - askUsd) / tot : 0;
  return {
    bids,
    asks,
    bidUsd,
    askUsd,
    mid,
    spread,
    spreadBps,
    imbalance,
    bidWall: wall(bids),
    askWall: wall(asks),
  };
}
