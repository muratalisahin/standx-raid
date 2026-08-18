export const BEST_KEY = "standx-circuit-raid-best";
export const RUNS_KEY = "standx-circuit-raid-runs";
export const NAME_KEY = "standx-circuit-player-name";

export function playerName() {
  return localStorage.getItem(NAME_KEY) || "Stander";
}

export function setPlayerName(name) {
  const n = String(name || "").trim().slice(0, 16) || "Stander";
  localStorage.setItem(NAME_KEY, n);
  return n;
}

export function loadRuns() {
  try {
    const rows = JSON.parse(localStorage.getItem(RUNS_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function recordRun(score) {
  const n = Number(score) || 0;
  if (n <= 0) return loadRuns();
  const best = Math.max(n, Number(localStorage.getItem(BEST_KEY) || 0));
  localStorage.setItem(BEST_KEY, String(best));
  const rows = loadRuns();
  rows.push({ name: playerName(), score: n, at: Date.now() });
  rows.sort((a, b) => b.score - a.score || b.at - a.at);
  const next = rows.slice(0, 25);
  localStorage.setItem(RUNS_KEY, JSON.stringify(next));
  return next;
}
