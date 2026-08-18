import React, { useEffect, useState } from "react";
import Stander, { MARK } from "./Stander.jsx";
import { enterX, savedXName } from "../lib/session.js";
import { speakHello, unlockSpeech } from "../lib/speak.js";

export default function Auth({ onIn }) {
  const [name, setName] = useState(() => savedXName());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const kick = () => unlockSpeech();
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    const id = window.setTimeout(speakHello, 400);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    speakHello();
    try {
      const user = await enterX(name);
      onIn(user);
    } catch (ex) {
      setErr(ex.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authShell" onPointerDown={unlockSpeech}>
      <div className="authCard">
        <div className="helloStage">
          <Stander pose="front" className="authMascot" />
          <p className="helloBubble" aria-live="polite">
            Hello, welcome
          </p>
        </div>
        <div className="authBrand">
          <img className="authLogo" src={MARK} alt="StandX" />
          <span>STANDX RAID</span>
        </div>
        <h1>Sign in</h1>
        <p className="authAsk">Enter your X username.</p>
        <p>The browser saves this person. Next visit opens the same account.</p>
        <form onSubmit={submit}>
          <label>
            X username
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/^@/, ""))}
              placeholder="@handle"
              autoComplete="username"
              minLength={3}
              maxLength={20}
              required
              autoFocus
            />
          </label>
          {err && <p className="authErr">{err}</p>}
          <button type="submit" className="hudPlay" disabled={busy}>
            {busy ? "…" : "ENTER AND SAVE"}
          </button>
        </form>
      </div>
    </div>
  );
}
