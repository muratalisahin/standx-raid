const HDR = { accept: "application/json" };

export async function proxyJson(res, url) {
  try {
    const r = await fetch(url, { headers: HDR });
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: "StandX API proxy failed", detail: e.message });
  }
}
