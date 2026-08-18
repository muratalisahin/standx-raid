const USER_KEY = "standx-user";
const TOKEN_KEY = "standx-token";
const X_NAME_KEY = "standx-x-name";

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function savedXName() {
  return localStorage.getItem(X_NAME_KEY) || "";
}

function remember(user, token) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.name) localStorage.setItem(X_NAME_KEY, user.name);
  } else {
    localStorage.removeItem(USER_KEY);
  }
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user === null) localStorage.removeItem(TOKEN_KEY);
}

async function req(url, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY) || "";
  const headers = { "content-type": "application/json", ...(opts.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...opts,
    headers,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed.");
  return j;
}

export async function register(fields) {
  const j = await req("/api/auth", { method: "POST", body: JSON.stringify({ action: "register", ...fields }) });
  remember(j.user, j.token);
  return j.user;
}

export async function enterX(name) {
  const j = await req("/api/auth", { method: "POST", body: JSON.stringify({ action: "enter", name }) });
  remember(j.user, j.token);
  return j.user;
}

export async function logout() {
  try {
    await req("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
  } catch {
    /* ignore */
  }
  remember(null);
}

export async function restoreSession() {
  const cached = getUser();
  try {
    const j = await req("/api/auth");
    remember(j.user, localStorage.getItem(TOKEN_KEY));
    return j.user;
  } catch {
    if (cached) return cached;
    return null;
  }
}

export async function fetchBoard() {
  return req("/api/board");
}

export async function submitScore(score) {
  return req("/api/board", { method: "POST", body: JSON.stringify({ score }) });
}
