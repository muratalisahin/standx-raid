export const n = (v, d = 2) =>
  v == null || v === "" ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

export function money(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  if (x >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(2)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(1)}K`;
  return `$${x.toFixed(0)}`;
}

export function px(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  const d = x >= 1000 ? 2 : x >= 10 ? 3 : 4;
  return x.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function pct(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}%`;
}

export function bps(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(2)} bps`;
}

export function funding(v) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(4)}%`;
}
