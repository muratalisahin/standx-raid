import { addScore, board, cookieHeader, enterByX, login, logoutSession, me, register, sessionToken } from "./accounts.js";

function send(res, data, status = 200, cookie) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  if (cookie) res.setHeader("set-cookie", cookie);
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  try {
    if (req.body != null) {
      if (Buffer.isBuffer(req.body)) {
        const raw = req.body.toString("utf8");
        return raw ? JSON.parse(raw) : {};
      }
      if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
      if (typeof req.body === "object" && !Array.isArray(req.body)) return req.body;
    }
    const chunks = [];
    for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function handleAuth(req, res) {
  try {
    const token = sessionToken(req);
    if (req.method === "GET") {
      const out = await me(token);
      return send(res, out, out.error ? out.status : 200);
    }
    if (req.method !== "POST") return send(res, { error: "Method not allowed." }, 405);
    const body = await readBody(req);
    const action = body.action || "login";
    if (action === "logout") {
      await logoutSession(token);
      return send(res, { ok: true }, 200, cookieHeader("", true));
    }
    if (action === "me") {
      const out = await me(token);
      return send(res, out, out.error ? out.status : 200);
    }
    const out =
      action === "register"
        ? await register(body)
        : action === "enter"
          ? await enterByX(body.name)
          : await login(body);
    if (out.error) return send(res, out, out.status);
    return send(res, { user: out.user, token: out.token }, 200, cookieHeader(out.token));
  } catch (err) {
    return send(res, { error: err?.message || "Could not read request." }, 400);
  }
}

export async function handleBoard(req, res) {
  try {
    if (req.method === "GET") return send(res, await board());
    if (req.method !== "POST") return send(res, { error: "Method not allowed." }, 405);
    const body = await readBody(req);
    const out = await addScore(sessionToken(req), body.score);
    return send(res, out, out.error ? out.status : 200);
  } catch (err) {
    return send(res, { error: err?.message || "Could not read request." }, 400);
  }
}

export function authPlugin() {
  return {
    name: "standx-auth",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/auth") return handleAuth(req, res);
        if (url === "/api/board") return handleBoard(req, res);
        next();
      });
    },
  };
}
