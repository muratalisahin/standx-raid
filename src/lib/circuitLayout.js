export const RING_ORDER = [
  "BTC-USD",
  "ETH-USD",
  "SOL-USD",
  "BNB-USD",
  "HYPE-USD",
  "XAU-USD",
  "XAG-USD",
  "CL-USD",
  "TSLA-USD",
  "MU-USD",
  "SPCX-USD",
];

export function logFit(v, p50, p90) {
  const x = Math.log10(Math.max(Number(v) || 0, 1));
  const a = Math.log10(p50);
  const b = Math.log10(p90);
  if (b === a) return 0.5;
  return Math.max(0, Math.min(1, 0.5 + ((x - a) / (b - a)) * 0.4));
}

export function orderMarkets(symbols = []) {
  const bySym = new Map(symbols.map((m) => [m.symbol, m]));
  const ordered = [];
  for (const id of RING_ORDER) {
    if (bySym.has(id)) {
      ordered.push(bySym.get(id));
      bySym.delete(id);
    }
  }
  for (const m of symbols) {
    if (bySym.has(m.symbol)) ordered.push(m);
  }
  return ordered;
}

function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

export function pipeD(p0, p1, p2) {
  return `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
}

export function layoutCircuit(symbols, width, height) {
  const w = Math.max(260, width);
  const h = Math.max(260, height);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const compact = Math.min(w, h) < 520;
  const scale = Math.min(1, Math.min(w, h) / 640);
  const nodeMax = 14 + 16 * scale;
  const label = compact ? 12 : 18;
  const pad = nodeMax + label + 10;
  const ringR = Math.max(78, Math.min(w, h) / 2 - pad);
  const coreR = Math.max(36, Math.min(compact ? 52 : 78, ringR * 0.34));
  const markets = orderMarkets(symbols);
  const n = Math.max(markets.length, 1);

  const nodes = markets.map((m, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const oi = Number(m.open_interest_notional || m.open_interest || 0);
    const vol = Number(m.volume_quote_24h || 0);
    const r = (12 + logFit(oi, 2e5, 5e7) * 16) * (0.7 + 0.3 * scale);
    const x = cx + Math.cos(angle) * ringR;
    const y = cy + Math.sin(angle) * ringR;
    const mid = {
      x: (cx + x) / 2 + Math.cos(angle + Math.PI / 2) * ringR * 0.12,
      y: (cy + y) / 2 + Math.sin(angle + Math.PI / 2) * ringR * 0.12,
    };
    const from = {
      x: cx + Math.cos(angle) * (coreR + 10),
      y: cy + Math.sin(angle) * (coreR + 10),
    };
    const to = {
      x: x - Math.cos(angle) * (r + 6),
      y: y - Math.sin(angle) * (r + 6),
    };
    return {
      market: m,
      symbol: m.symbol,
      base: m.base || m.symbol.split("-")[0],
      i,
      angle,
      x,
      y,
      r,
      oi,
      vol,
      funding: Number(m.funding_rate || 0),
      change: Number(m.price_change_pct || 0),
      mark: Number(m.mark_price || m.last_price || 0),
      pipe: {
        p0: from,
        p1: mid,
        p2: to,
        width: (1.1 + logFit(vol, 4e5, 1.6e8) * 7) * (0.75 + 0.25 * scale),
        d: pipeD(from, mid, to),
        point: (t) => quadPoint(from, mid, to, t),
      },
    };
  });

  return { cx, cy, ringR, coreR, nodes, width: w, height: h, compact, scale };
}
