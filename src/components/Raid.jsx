import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DepthXray from "./DepthXray.jsx";
import Stander, { LOGO, standerPose } from "./Stander.jsx";
import { BEST_KEY } from "../lib/board.js";
import { submitScore } from "../lib/session.js";
import { ROUND_SIZE, advanceBoss, makeIntercept, newDeck, rankFor, resolveHit } from "../lib/intercepts.js";
const QUESTION_POINTS = 10;
const LIVES = 2;

export default function Raid({ overview, book, selected, onSip, sip, running, setRunning, hitRef, viewRef, hudEl, onScore }) {
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
    if (over) return `Run over. Rank ${rank.id}. Try again.`;
    if (!running) return `15 questions from a 100-item pool. TRUE / FALSE, or pick what each SIP is about.`;
    if (flash) return flash;
    return intercept?.hint || "Answer in the question card.";
  }, [over, running, flash, intercept, rank.id]);

  const modeNow = active?.mode || intercept?.mode;
  const questCard = (running && intercept) || over ? (
    <div className={`questCard ${flash ? "hot" : ""} ${over ? "dead" : ""}`}>
      {over ? (
        <>
          <div className="questTop">
            <b>DONE · {rank.id}</b>
            <em>{score} pts</em>
          </div>
          <p>{rank.line}</p>
          <button type="button" className="hudPlay" onClick={start}>PLAY AGAIN</button>
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
              <button type="button" className="bid" onClick={() => attempt({ side: "BID" })}>BID</button>
              <button type="button" className="ask" onClick={() => attempt({ side: "ASK" })}>ASK</button>
            </div>
          )}
          {modeNow === "tap-sip" && sipOptions && (
            <div className="questBtns sip">
              {sipOptions.map((s) => (
                <button key={s.id} type="button" onClick={() => attempt({ sip: s.id })}>
                  {s.id}
                  <small>{s.name}</small>
                </button>
              ))}
            </div>
          )}
          {modeNow === "truth" && (
            <div className="questBtns">
              <button type="button" className="ok" onClick={() => attempt({ kind: "core" })}>TRUE</button>
              <button type="button" className="ask" onClick={() => attempt({ kind: "mod", symbol: selected || "BTC-USD" })}>FALSE</button>
            </div>
          )}
          {(modeNow === "tap-core") && (
            <div className="questBtns">
              <button type="button" className="ok" onClick={() => attempt({ kind: "core" })}>STANDER / CORE</button>
            </div>
          )}
          {modeNow === "tap-mod" && <small className="questHint">Answer: tap a market on the 3D ring.</small>}
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
          <h2>{running ? `${wave} / ${ROUND_SIZE}` : "START"}</h2>
        </div>
        <Stander pose={pose} className="inspectMascot" alt="" />
      </div>

      <div className="raidMeters">
        <div>
          <span>SCORE</span>
          <b>{score}</b>
        </div>
        <div>
          <span>COMBO</span>
          <b>{combo}×</b>
        </div>
        <div>
          <span>LIVES</span>
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
            1) You are in <em>PLAY</em>. 2) Hit green <em>START</em>.
            Each run is 15 random questions from a 100-item pool (5 SIP + 10 true/false). For SIP, pick what SIP-1…SIP-5 is about from the chips below.
          </p>
          <p className="tiny">Best {best} · Spark → Maker → Shield → Circuit → Universal</p>
          <button type="button" className="share" onClick={start}>
            START
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
                BID HEAVY
              </button>
              <button type="button" className="ask" onClick={() => attempt({ side: "ASK" })}>
                ASK HEAVY
              </button>
              </div>
            </>
          )}

          {sipOptions && (active?.mode === "tap-sip" || intercept.mode === "tap-sip") && (
            <div className="raidSips">
              {sipOptions.map((s) => (
                <button key={s.id} type="button" onClick={() => attempt({ sip: s.id })}>
                  {s.id}
                  <small>{s.name}</small>
                </button>
              ))}
            </div>
          )}

          {(active?.mode === "truth" || intercept.mode === "truth" || active?.mode === "tap-core" || intercept.mode === "tap-core") && (
            <button type="button" className="share" onClick={() => attempt({ kind: "core" })}>
              TAP DUSD CORE
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
            PLAY AGAIN
          </button>
        </div>
      )}

      <p className="tiny">Answer in the question card. Not investment advice.</p>
    </aside>
    </>
  );
}
