import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Arena3D from "./components/Arena3D.jsx";
import DepthXray from "./components/DepthXray.jsx";
import Anatomy from "./components/Anatomy.jsx";
import Spark from "./components/Spark.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Auth from "./components/Auth.jsx";
import Raid from "./components/Raid.jsx";
import Stander, { LOGO } from "./components/Stander.jsx";
import LangBar from "./components/LangBar.jsx";
import { logout, restoreSession, getUser } from "./lib/session.js";
import { speakHello } from "./lib/speak.js";
import { langById } from "./lib/i18n.js";
import { useLang } from "./lib/Lang.jsx";
import { depthUrl, fetchJson, klineUrl, marketUrl, parseDepth, parseKlines } from "./lib/api.js";
import { layoutCircuit } from "./lib/circuitLayout.js";
import { bps, funding, money, pct, px } from "./lib/format.js";

export default function App() {
  const { lang, t } = useLang();
  const stageRef = useRef(null);
  const shotRef = useRef(null);
  const prevMark = useRef({});
  const [size, setSize] = useState({ w: 900, h: 640 });
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState("BTC-USD");
  const [book, setBook] = useState(null);
  const [bars, setBars] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [sip, setSip] = useState("SIP-5");
  const [syncedAt, setSyncedAt] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [ticks, setTicks] = useState({});
  const [mode, setMode] = useState("watch");
  const [raidOn, setRaidOn] = useState(false);
  const raidHit = useRef(() => {});
  const raidView = useRef({});
  const [hudEl, setHudEl] = useState(null);
  const [gameHud, setGameHud] = useState(() => ({
    score: 0,
    best: 0,
    running: false,
    over: false,
  }));
  const [user, setUser] = useState(() => getUser());
  const [authReady, setAuthReady] = useState(false);
  const [hello, setHello] = useState(false);
  const fromAuth = useRef(false);

  useEffect(() => {
    restoreSession()
      .then((u) => {
        setUser(u);
        if (u && !fromAuth.current) {
          setHello(true);
          speakHello(lang);
          window.setTimeout(() => setHello(false), 3200);
        }
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(260, Math.round(r.width));
      const h = Math.max(180, Math.round(r.height || r.width));
      setSize((prev) => (Math.abs(prev.w - w) < 8 && Math.abs(prev.h - h) < 8 ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadOverview = useCallback(async () => {
    const o = await fetchJson(marketUrl());
    if (!o?.symbols?.length) throw new Error("empty");
    const next = {};
    for (const s of o.symbols) {
      const mark = Number(s.mark_price || s.last_price);
      const prev = prevMark.current[s.symbol];
      next[s.symbol] = prev == null || prev === mark ? 0 : mark > prev ? 1 : -1;
      prevMark.current[s.symbol] = mark;
    }
    setTicks(next);
    setOverview(o);
    setSyncedAt(new Date());
    setErr("");
    setSelected((prev) => prev || o.symbols[0].symbol);
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        await loadOverview();
      } catch {
        if (!stop) setErr("StandX engine feed could not be loaded.");
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    const id = setInterval(() => {
      if (!document.hidden) loadOverview().catch(() => {});
    }, 2500);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!selected) return;
    let stop = false;
    const pull = async () => {
      try {
        const [raw, m] = await Promise.all([
          fetchJson(depthUrl(selected)),
          fetchJson(marketUrl(selected)).catch(() => overview?.symbols.find((s) => s.symbol === selected)),
        ]);
        if (stop) return;
        setBook(parseDepth(raw, m));
        setSyncedAt(new Date());
      } catch {
        if (!stop) setBook(null);
      }
    };
    pull();
    const id = setInterval(pull, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    let stop = false;
    const pull = async () => {
      const to = Math.floor(Date.now() / 1000);
      const from = to - 60 * 60 * 12;
      try {
        const j = await fetchJson(klineUrl(selected, "60", from, to));
        if (!stop) setBars(parseKlines(j));
      } catch {
        if (!stop) setBars([]);
      }
    };
    pull();
    const id = setInterval(pull, 15000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [selected]);

  const layout = useMemo(() => {
    if (!overview?.symbols) return null;
    return layoutCircuit(overview.symbols, size.w, size.h);
  }, [overview, size]);

  const market = overview?.symbols.find((s) => s.symbol === selected) || overview?.symbols[0];

  useEffect(() => {
    const onKey = (e) => {
      if (!overview?.symbols?.length) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      const ordered = layout?.nodes.map((n) => n.symbol) || overview.symbols.map((s) => s.symbol);
      const pick = (sym) => {
        if (!sym) return;
        setSelected(sym);
        if (mode === "raid" && raidOn) raidHit.current({ kind: "mod", symbol: sym });
      };
      if (e.key >= "1" && e.key <= "9") {
        const i = Number(e.key) - 1;
        if (ordered[i]) pick(ordered[i]);
      }
      if (e.key === "0" && ordered[9]) pick(ordered[9]);
      if ((e.key === "-" || e.key === "_") && ordered[10]) pick(ordered[10]);
      if (e.key === "Escape" && mode !== "raid") setSelected(ordered[0]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overview, layout, mode, raidOn]);

  async function share() {
    if (!shotRef.current) return;
    try {
      const dataUrl = await toPng(shotRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#070a08" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `standx-circuit-${selected || "engine"}.png`;
      a.click();
      setSharing(false);
    } catch {
      setSharing(false);
    }
  }

  const summary = overview?.summary;
  const age = syncedAt ? Math.max(0, Math.round((clock - syncedAt) / 1000)) : null;

  if (!authReady) {
    return (
      <div className="authShell">
        <span>{t.checking}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Auth
        onIn={(u) => {
          fromAuth.current = true;
          setUser(u);
        }}
      />
    );
  }

  return (
    <div className="shell">
      {hello && (
        <div className="helloGate" aria-live="polite">
          <Stander cycle className="helloGateMascot" />
          <p>{langById(lang).hello}</p>
        </div>
      )}
      <header className="topHud">
        <div className="brand">
          <img className="brandLogo" src={LOGO} alt="StandX" />
          STANDX <b>CIRCUIT</b>
        </div>
        <div className="live">
          <i />
          {t.live} · {clock.toLocaleTimeString()} · {age == null ? t.sync : age === 0 ? t.now : `${age}s`}
        </div>
        <div className="userBar">
          <b>{user.name}</b>
          <button
            type="button"
            onClick={() => {
              logout().finally(() => {
                setUser(null);
                setRaidOn(false);
              });
            }}
          >
            {t.signOut}
          </button>
        </div>
        <LangBar />
        <div className="modeSwitch" role="tablist" aria-label="Mode">
          <button type="button" className={mode === "watch" ? "on" : ""} onClick={() => { setMode("watch"); setRaidOn(false); }}>
            {t.watch}
          </button>
          <button type="button" className={mode === "raid" ? "on" : ""} onClick={() => setMode("raid")}>
            {t.play}
          </button>
        </div>
      </header>

      {loading && (
        <div className="boot">
          <Stander cycle className="bootMascot" alt="" />
          <span>{t.boot}</span>
        </div>
      )}

      {err && <div className="error">{t.feedErr}</div>}

      {!loading && !err && (
        <div className="workspace" ref={shotRef}>
          <div className="stampBar">
            <img className="stampLogo" src={LOGO} alt="" />
            <span>STANDX CIRCUIT</span>
            <span>{mode === "raid" ? (raidOn ? "RAID LIVE" : t.play) : selected || "ENGINE"}</span>
            <span>{t.disclaimer}</span>
          </div>
          <div className="stageCol">
            <div className="coreStats">
              <div>
                <span>{t.vol24}</span>
                <b>{money(summary?.volume_quote_24h)}</b>
              </div>
              <div>
                <span>{t.oi}</span>
                <b>{money(summary?.open_interest_notional)}</b>
              </div>
              <div>
                <span>STANDER · DUSD</span>
                <b className="soft">{t.dusdSoft}</b>
              </div>
            </div>
            <div className="stage arenaStage" ref={stageRef}>
              <Arena3D
                layout={layout}
                selected={selected}
                onSelect={(s) => {
                  if (s) setSelected(s);
                  if (mode === "raid" && raidOn) {
                    raidHit.current(s ? { kind: "mod", symbol: s } : { kind: "core" });
                  }
                }}
                ticks={ticks}
                sip={sip}
                raid={mode === "raid"}
                raidView={raidView}
                imbalance={book?.imbalance}
              />
              {(!raidOn || mode !== "raid") && (
                <div className="stageHud">
                  <button
                    type="button"
                    className="hudPlay"
                    onClick={() => {
                      setMode("raid");
                      setRaidOn(true);
                    }}
                  >
                    {t.startRaid}
                  </button>
                </div>
              )}
              <div className="stageQuestMount" ref={setHudEl} />
            </div>
            <p className="keys">
              {mode === "raid" ? t.keysRaid : t.keysWatch}
            </p>
          </div>

          <div className="sideCol">
          {mode === "raid" ? (
            <Raid
              overview={overview}
              book={book}
              selected={selected}
              onSip={setSip}
              sip={sip}
              running={raidOn}
              setRunning={setRaidOn}
              hitRef={raidHit}
              viewRef={raidView}
              hudEl={hudEl}
              onScore={setGameHud}
            />
          ) : (
          <aside className="inspector">
            <div className="inspectHead">
              <div>
                <span className="kicker">{t.liveModule}</span>
                <h2>{market?.symbol || "—"}</h2>
              </div>
              <Stander pose="focus" className="inspectMascot" alt="Stander" />
            </div>
            <div className="markRow">
              <strong>{px(market?.mark_price || market?.last_price)}</strong>
              <em className={Number(market?.price_change_pct) >= 0 ? "up" : "down"}>{pct(market?.price_change_pct)}</em>
            </div>
            <Spark bars={bars} />
            <dl>
              <div>
                <dt>{t.dtOi}</dt>
                <dd>{money(market?.open_interest_notional)}</dd>
              </div>
              <div>
                <dt>{t.dtVol}</dt>
                <dd>{money(market?.volume_quote_24h)}</dd>
              </div>
              <div>
                <dt>{t.dtFund}</dt>
                <dd>{funding(market?.funding_rate)}</dd>
              </div>
              <div>
                <dt>{t.dtSpread}</dt>
                <dd>{bps(book?.spreadBps)}</dd>
              </div>
              <div>
                <dt>{t.dtBias}</dt>
                <dd className={book?.imbalance >= 0 ? "up" : "down"}>
                  {book ? `${book.imbalance >= 0 ? "BID" : "ASK"} ${(Math.abs(book.imbalance) * 100).toFixed(0)}%` : "—"}
                </dd>
              </div>
            </dl>
            <DepthXray book={book} symbol={market?.symbol} />
            <a
              className="trade"
              href={`https://standx.com/perps?symbol=${encodeURIComponent(market?.symbol || "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.trade}
            </a>
            <button type="button" className="share" onClick={() => { setSharing(true); setTimeout(share, 40); }}>
              {t.stamp}
            </button>
            <p className="tiny">{t.tiny}</p>
          </aside>
          )}
          </div>
          <Leaderboard
            user={user}
            gameScore={gameHud.score}
            playing={!!gameHud.running}
          />
        </div>
      )}

      <Anatomy open={sip} onOpen={setSip} />
      <footer>
        <Stander pose="three" className="footMascot" alt="" />
        StandX Circuit · {mode === "raid" ? t.footerRaid : t.footerWatch} · {t.noAdvice}
        {sharing ? ` · ${t.stampWait}` : ""}
      </footer>
    </div>
  );
}
