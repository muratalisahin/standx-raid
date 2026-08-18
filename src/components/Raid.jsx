import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DepthXray from "./DepthXray.jsx";
import Stander, { LOGO, standerPose } from "./Stander.jsx";
import { BEST_KEY } from "../lib/board.js";
import { submitScore } from "../lib/session.js";
import { ROUND_SIZE, advanceBoss, makeIntercept, newDeck, rankFor, resolveHit } from "../lib/intercepts.js";
import { sipText } from "../lib/i18n.js";
import { useLang } from "../lib/Lang.jsx";
const QUESTION_POINTS = 10;
const LIVES = 2;

export default function Raid({ overview, book, selected, onSip, sip, running, setRunning, hitRef, viewRef, hudEl, onScore }) {
  const { t } = useLang();
  const [wave, setWave] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [margin, setMargin] = useState(LIVES);
  const [intercept, setIntercept] = useState(null);
  const [left, setLeft] = useState(0);
  const [flash, setFlash] = useState("");
  const [over, setOver] = useState(false);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));
  const busyRef = useRef(false);
  const interceptRef = useRef(null);
  const snapRef = useRef({});
  const failRef = useRef(() => {});
  const attemptRef = useRef(() => {});
  const deckRef = useRef([]);

  const symbols = overview?.symbols || [];
  const rank = rankFor(score);
  const pose = standerPose({ running, over, flash, kind: intercept?.kind, rankId: rank.id });
  const active = intercept?.steps ? intercept.steps[intercept.step || 0] : intercept;
  const sipOptions = active?.options || intercept?.options || null;

  snapRef.current = { margin, wave, score, combo, symbols, book, sip, selected, left };
  interceptRef.current = intercept;

  function spawn(nextWave) {
    if (nextWave > ROUND_SIZE) {
      finishRun();
      return;
    }
    if (!deckRef.current.length) deckRef.current = newDeck();
    const row = makeIntercept(deckRef.current);
    setIntercept(row);
    setLeft(row.seconds);
    setWave(nextWave);
    onSip(row.target && row.mode === "tap-sip" ? row.target : snapRef.current.sip);
  }

  function finishRun() {
    const finalScore = snapRef.current.score;
    setOver(true);
    setRunning(false);
    setIntercept(null);
    setBest((b) => {
      const n = Math.max(b, finalScore);
      localStorage.setItem(BEST_KEY, String(n));
      submitScore(finalScore)
        .then(() => window.dispatchEvent(new Event("standx-board")))
        .catch(() => window.dispatchEvent(new Event("standx-board")));
      return n;
    });
  }

  function nextOrFinish() {
    if (snapRef.current.wave >= ROUND_SIZE) finishRun();
    else spawn(snapRef.current.wave + 1);
  }

  function start() {
    busyRef.current = false;
    deckRef.current = newDeck();
    setScore(0);
    setCombo(0);
    setMargin(LIVES);
    setOver(false);
    setFlash("");
    setIntercept(null);
    setWave(0);
    setRunning(true);
  }

  function fail(why) {
    if (busyRef.current) return;
    busyRef.current = true;
    setFlash(why || "WRONG");
    setCombo(0);
    const next = snapRef.current.margin - 1;
    setMargin(next);
    window.setTimeout(() => {
      busyRef.current = false;
      setFlash("");
      if (next <= 0) {
        finishRun();
      } else {
        spawn(snapRef.current.wave + 1);
      }
    }, 720);
  }

  function timesUp() {
    if (busyRef.current) return;
    busyRef.current = true;
    setFlash("TIME UP");
    setCombo(0);
    window.setTimeout(() => {
      busyRef.current = false;
      setFlash("");
      nextOrFinish();
    }, 720);
  }

  function win() {
    if (busyRef.current) return;
    const gained = QUESTION_POINTS;
    setScore((s) => s + gained);
    setCombo((c) => c + 1);
    setFlash(`+${gained} pts`);
    busyRef.current = true;
    window.setTimeout(() => {
      busyRef.current = false;
      setFlash("");
      nextOrFinish();
    }, 640);
  }

  function attempt(hit) {
    if (!running || over || !interceptRef.current || busyRef.current) return;
    const row = interceptRef.current;
    const ok = resolveHit(row, hit);
    if (!ok) {
      fail("WRONG WIRE");
      return;
    }
    if (row.steps) {
      const { done, intercept: next } = advanceBoss(row);
      if (!done) {
        setScore((s) => s + QUESTION_POINTS);
        setIntercept(next);
        setFlash(`+${QUESTION_POINTS} pts`);
        window.setTimeout(() => setFlash(""), 400);
        return;
      }
    }
    win();
  }

  useEffect(() => {
    if (!running) return;
    busyRef.current = false;
    setScore(0);
    setCombo(0);
    setMargin(LIVES);
    setOver(false);
    setFlash("");
    spawn(1);
  }, [running]);

  useEffect(() => {
    onScore?.({ score, best, running, over });
  }, [score, best, running, over, onScore]);

  useEffect(() => {
    failRef.current = fail;
    attemptRef.current = attempt;
    if (hitRef) hitRef.current = attempt;
    if (viewRef) {
      viewRef.current = {
        intercept,
        flash,
        wave,
        running,
        over,
        pose,
        kind: intercept?.kind,
      };
    }
  });

  useEffect(() => {
    if (!running || over || !intercept) return;
    const id = setInterval(() => {
      setLeft((ms) => (ms <= 1 ? 0 : ms - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, over, intercept]);

  useEffect(() => {
    if (!running || over || !intercept || left > 0) return;
    timesUp();
  }, [left, running, over, intercept]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      if (!running) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.key === "b" || e.key === "B") attemptRef.current({ side: "BID" });
      if (e.key === "a" || e.key === "A") attemptRef.current({ side: "ASK" });
      if (e.key === "c" || e.key === "C") attemptRef.current({ kind: "core" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  const radio = useMemo(() => {
    if (over) return t.raidOver(rank.id);
    if (!running) return t.raidIdle;
    if (flash) return flash;
    return intercept?.hint || t.raidHint;
  }, [over, running, flash, intercept, rank.id, t]);

  const modeNow = active?.mode || intercept?.mode;
  const questCard = (running && intercept) || over ? (
    <div className={`questCard ${flash ? "hot" : ""} ${over ? "dead" : ""}`}>
      {over ? (
        <>
          <div className="questTop">
            <b>{t.done} · {rank.id}</b>
            <em>{score} {t.pts}</em>
          </div>
          <p>{rank.line}</p>
          <button type="button" className="hudPlay" onClick={start}>{t.playAgain}</button>
        </>
      ) : (
        <>
          <div className="questTop">
            <b>{wave}/{ROUND_SIZE} · {intercept.kind}</b>
            <em>{left}s</em>
          </div>
          <div className="raidBar">
            <i style={{ width: `${Math.max(4, (left / intercept.seconds) * 100)}%` }} />
          </div>
          <p>{flash && !flash.includes("LOCKED") ? flash : intercept.prompt}</p>
          <small>{intercept.hint}</small>
          {modeNow === "tap-side" && (
            <div className="questBtns">
              <button type="button" className="bid" onClick={() => attempt({ side: "BID" })}>{t.bid}</button>
              <button type="button" className="ask" onClick={() => attempt({ side: "ASK" })}>{t.askHeavy}</button>
            </div>
          )}
          {modeNow === "tap-sip" && sipOptions && (
            <div className="questBtns sip">
              {sipOptions.map((s) => (
                <button key={s.id} type="button" onClick={() => attempt({ sip: s.id })}>
                  {s.id}
                  <small>{sipText(t, s.id).name}</small>
                </button>
              ))}
            </div>
          )}
          {modeNow === "truth" && (
            <div className="questBtns">
              <button type="button" className="ok" onClick={() => attempt({ kind: "core" })}>{t.truth}</button>
              <button type="button" className="ask" onClick={() => attempt({ kind: "mod", symbol: selected || "BTC-USD" })}>{t.falsy}</button>
            </div>
          )}
          {(modeNow === "tap-core") && (
            <div className="questBtns">
              <button type="button" className="ok" onClick={() => attempt({ kind: "core" })}>{t.core}</button>
            </div>
          )}
          {modeNow === "tap-mod" && <small className="questHint">{t.keysWatch}</small>}
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      {hudEl && questCard ? createPortal(questCard, hudEl) : null}
    <aside className="inspector raidPanel">
      <div className="inspectHead">
        <div>
          <span className="kicker">STANDX RAID</span>
          <h2>{running ? `${wave} / ${ROUND_SIZE}` : t.start}</h2>
        </div>
        <Stander pose={pose} className="inspectMascot" alt="" />
      </div>

      <div className="raidMeters">
        <div>
          <span>{t.score}</span>
          <b>{score}</b>
        </div>
        <div>
          <span>{t.combo}</span>
          <b>{combo}×</b>
        </div>
        <div>
          <span>{t.lives}</span>
          <b className={margin <= 1 ? "down" : ""}>
            {"●".repeat(Math.max(0, margin))}
            {"○".repeat(Math.max(0, LIVES - margin))}
          </b>
        </div>
      </div>

      <div className={`raidRadio ${flash ? "hot" : ""} ${over ? "dead" : ""}`}>
        <span>STANDER · COMMS</span>
        <p>{radio}</p>
      </div>

      {!running && !over && (
        <div className="raidIntro">
          <div className="raidCast">
            <img src={LOGO} alt="StandX" />
            <Stander cycle className="raidHero" alt="" />
          </div>
          <p>
            {t.raidIntro}
          </p>
          <p className="tiny">Best {best} · Spark → Maker → Shield → Circuit → Universal</p>
          <button type="button" className="share" onClick={start}>
            {t.start}
          </button>
        </div>
      )}

      {running && intercept && (
        <>
          <div className="raidTask">
            <div className="raidTaskTop">
              <b>{intercept.kind}</b>
              <em>{left}s</em>
            </div>
            <div className="raidBar">
              <i style={{ width: `${Math.max(4, (left / intercept.seconds) * 100)}%` }} />
            </div>
            <p>{intercept.prompt}</p>
          </div>

          {(active?.mode === "tap-side" || intercept.mode === "tap-side") && (
            <>
              <DepthXray book={book} symbol={selected} />
              <div className="raidSides">
              <button type="button" className="bid" onClick={() => attempt({ side: "BID" })}>
                {t.bid}
              </button>
              <button type="button" className="ask" onClick={() => attempt({ side: "ASK" })}>
                {t.askHeavy}
              </button>
              </div>
            </>
          )}

          {sipOptions && (active?.mode === "tap-sip" || intercept.mode === "tap-sip") && (
            <div className="raidSips">
              {sipOptions.map((s) => (
                <button key={s.id} type="button" onClick={() => attempt({ sip: s.id })}>
                  {s.id}
                  <small>{sipText(t, s.id).name}</small>
                </button>
              ))}
            </div>
          )}

          {(active?.mode === "truth" || intercept.mode === "truth" || active?.mode === "tap-core" || intercept.mode === "tap-core") && (
            <button type="button" className="share" onClick={() => attempt({ kind: "core" })}>
              {t.tapCore}
            </button>
          )}
        </>
      )}

      {over && (
        <div className="raidOver">
          <span className="kicker">{rank.id}</span>
          <p>{rank.line}</p>
          <p className="tiny">
            Score {score} · best {Math.max(best, score)} · last wave {wave}
          </p>
          <button type="button" className="share" onClick={start}>
            {t.playAgain}
          </button>
        </div>
      )}

      <p className="tiny">{t.raidTiny}</p>
    </aside>
    </>
  );
}
