import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.env.VERCEL ? join("/tmp", "standx-data") : join(root, "data");
const file = join(dir, "accounts.json");
const COOKIE = "standx_session";
const WEEK = 60 * 60 * 24 * 30;
const REDIS_KEY = "standx:accounts";
const STORE_ID = "accounts";

function loadLocalEnv() {
  for (const name of [".env", ".env.local"]) {
    const p = join(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (k && process.env[k] == null) process.env[k] = v;
    }
  }
}

loadLocalEnv();

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url: String(url).replace(/\/$/, ""), key };
}

function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: String(url).replace(/\/$/, ""), token };
}

function empty() {
  return { users: [], sessions: {}, runs: [], best: {} };
}

function parseDb(raw) {
  if (!raw) return empty();
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const db = {
    users: Array.isArray(data.users) ? data.users : [],
    sessions: data.sessions && typeof data.sessions === "object" ? data.sessions : {},
    runs: Array.isArray(data.runs) ? data.runs : [],
    best: data.best && typeof data.best === "object" ? data.best : {},
  };
  // Older stores kept only a run list. Rebuild each player's best from it.
  for (const run of db.runs) {
    if (!run?.userId) continue;
    const prev = db.best[run.userId];
    if (!prev || run.score > prev.score) {
      db.best[run.userId] = { score: run.score, at: run.at, name: run.name };
    }
  }
  return db;
}

function sbHeaders(key) {
  const headers = {
    apikey: key,
    "Content-Type": "application/json",
  };
  if (!String(key).startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

/**
 * Never answer with an empty database when the store is only unreachable:
 * a later save would write that emptiness over everyone's scores.
 */
async function load() {
  const sb = supabase();
  if (sb) {
    const r = await fetch(
      `${sb.url}/rest/v1/standx_store?id=eq.${encodeURIComponent(STORE_ID)}&select=data`,
      { headers: sbHeaders(sb.key) }
    );
    if (!r.ok) throw new Error("Score store is unreachable.");
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0]?.data) return parseDb(rows[0].data);
    return empty();
  }
  const kv = redis();
  if (kv) {
    const r = await fetch(`${kv.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
      headers: { Authorization: `Bearer ${kv.token}` },
    });
    if (!r.ok) throw new Error("Score store is unreachable.");
    const j = await r.json();
    return parseDb(j.result);
  }
  if (process.env.VERCEL) {
    throw new Error("Score store is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!existsSync(file)) return empty();
  return parseDb(readFileSync(file, "utf8"));
}

/** Re-read, re-apply, then write, so two players finishing at once do not erase each other. */
async function mutate(apply) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const db = await load();
    const out = apply(db);
    if (out?.error) return out;
    try {
      await save(db);
      return out;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Could not save.");
}

async function save(db) {
  const sb = supabase();
  if (sb) {
    const r = await fetch(`${sb.url}/rest/v1/standx_store`, {
      method: "POST",
      headers: {
        ...sbHeaders(sb.key),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: STORE_ID, data: db, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      throw new Error(detail ? "Could not save account." : "Could not save account.");
    }
    return;
  }
  const kv = redis();
  if (kv) {
    await fetch(`${kv.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kv.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(db),
    });
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(db, null, 2));
}

function hashPass(password, salt) {
  return scryptSync(String(password), String(salt), 32).toString("hex");
}

function cleanName(name) {
  return String(name || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .slice(0, 20);
}

function cleanEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email || "" };
}

function parseCookie(req) {
  const raw = req.headers?.cookie || req.headers?.Cookie || "";
  const m = String(raw).match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export function sessionToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  return parseCookie(req);
}

export function cookieHeader(token, clear = false) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  if (clear || !token) {
    return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  }
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${WEEK}${secure}`;
}

function userByToken(db, token) {
  if (!token) return null;
  const sid = db.sessions[token];
  if (!sid?.userId) return null;
  if (sid.exp && sid.exp < Date.now()) return null;
  return db.users.find((u) => u.id === sid.userId) || null;
}

function issueSession(db, user) {
  const token = randomBytes(24).toString("hex");
  db.sessions[token] = { userId: user.id, exp: Date.now() + WEEK * 1000 };
  return token;
}

export async function register({ name, email, password, password2 }) {
  const n = cleanName(name);
  const e = cleanEmail(email);
  const p = String(password || "");
  if (n.length < 3) return { error: "Username must be at least 3 characters.", status: 400 };
  if (!validEmail(e)) return { error: "Enter a valid email.", status: 400 };
  if (p.length < 6) return { error: "Password must be at least 6 characters.", status: 400 };
  if (password2 != null && p !== String(password2)) return { error: "Passwords do not match.", status: 400 };
  return mutate((db) => {
    if (db.users.some((u) => u.name.toLowerCase() === n.toLowerCase())) {
      return { error: "That username is taken.", status: 409 };
    }
    if (db.users.some((u) => (u.email || "").toLowerCase() === e)) {
      return { error: "That email is already registered. Sign in.", status: 409 };
    }
    const salt = randomBytes(16).toString("hex");
    const user = {
      id: randomBytes(8).toString("hex"),
      name: n,
      email: e,
      salt,
      hash: hashPass(p, salt),
      created: Date.now(),
      lastLogin: Date.now(),
    };
    db.users.push(user);
    return { token: issueSession(db, user), user: publicUser(user) };
  });
}

export async function login({ email, name, password }) {
  const e = cleanEmail(email);
  const n = cleanName(name);
  const p = String(password || "");
  return mutate((db) => {
    const user = db.users.find(
      (u) => (e && u.email === e) || (n && u.name.toLowerCase() === n.toLowerCase())
    );
    if (!user) return { error: "X name or password is wrong.", status: 401 };
    const next = hashPass(p, user.salt);
    const a = Buffer.from(user.hash, "hex");
    const b = Buffer.from(next, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { error: "X name or password is wrong.", status: 401 };
    }
    user.lastLogin = Date.now();
    return { token: issueSession(db, user), user: publicUser(user) };
  });
}

export async function enterByX(name) {
  const n = cleanName(name);
  if (n.length < 3) return { error: "Enter your X username.", status: 400 };
  return mutate((db) => {
    let user = db.users.find((u) => u.name.toLowerCase() === n.toLowerCase());
    if (!user) {
      user = {
        id: randomBytes(8).toString("hex"),
        name: n,
        email: "",
        salt: "",
        hash: "",
        created: Date.now(),
      };
      db.users.push(user);
    }
    user.lastLogin = Date.now();
    return { token: issueSession(db, user), user: publicUser(user) };
  });
}

export async function me(token) {
  const db = await load();
  const user = userByToken(db, token);
  if (!user) return { error: "No session. Sign in.", status: 401 };
  return { user: publicUser(user) };
}

export async function logoutSession(token) {
  if (!token) return { ok: true };
  return mutate((db) => {
    delete db.sessions[token];
    return { ok: true };
  });
}

export async function addScore(token, score) {
  const n = Number(score) || 0;
  if (n < 0 || n > 100000) return { error: "Invalid score.", status: 400 };
  return mutate((db) => {
    const user = userByToken(db, token);
    if (!user) return { error: "Sign in required.", status: 401 };
    const at = Date.now();
    const prev = db.best[user.id];
    if (!prev || n > prev.score) db.best[user.id] = { score: n, at, name: user.name };
    db.runs.unshift({ userId: user.id, name: user.name, score: n, at });
    db.runs = db.runs.slice(0, 50);
    return { ok: true, board: boardFrom(db) };
  });
}

export async function resetScores({ wipeUsers = false } = {}) {
  const { cleared, users } = await mutate((db) => {
    const out = { cleared: db.runs.length, users: wipeUsers ? 0 : db.users.length };
    if (wipeUsers) {
      db.users = [];
      db.sessions = {};
    }
    db.runs = [];
    db.best = {};
    return out;
  });
  try {
    if (existsSync(file)) {
      const local = wipeUsers
        ? empty()
        : { ...parseDb(readFileSync(file, "utf8")), runs: [], best: {} };
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify(local, null, 2));
    }
  } catch {
    /* ignore */
  }
  return { ok: true, cleared, users };
}

export async function board() {
  return { board: boardFrom(await load()) };
}

function boardFrom(db) {
  const people = (db.users || []).map((u) => {
    const run = db.best?.[u.id];
    return {
      name: u.name,
      score: run?.score || 0,
      at: run?.at || u.lastLogin || u.created || 0,
    };
  });
  people.sort((a, b) => b.score - a.score || b.at - a.at);
  const top = people.slice(0, 50).map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, at: r.at }));
  return {
    users: db.users.length,
    top,
    recent: db.runs.slice(0, 15).map((r) => ({ name: r.name, score: r.score, at: r.at })),
  };
}
