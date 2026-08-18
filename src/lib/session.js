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
  if (!r.ok) {
    const err = new Error(j.error || "Request failed.");
    err.status = r.status;
    throw err;
  }
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
  } catch (err) {
    // The server forgets sessions when it restarts. Claim the saved name again
    // so this player keeps their leaderboard row instead of starting over.
    const name = cached?.name || savedXName();
    if (err.status === 401 && name) {
      try {
        return await enterX(name);
      } catch {
        /* offline */
      }
    }
    return cached || null;
  }
}

export async function fetchBoard() {
  return req("/api/board");
}

export async function submitScore(score) {
  const post = () => req("/api/board", { method: "POST", body: JSON.stringify({ score }) });
  try {
    return await post();
  } catch (err) {
    const name = getUser()?.name || savedXName();
    if (err.status !== 401 || !name) throw err;
    await enterX(name);
    return post();
  }
}
