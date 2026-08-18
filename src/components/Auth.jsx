import React, { useEffect, useState } from "react";
import Stander, { MARK } from "./Stander.jsx";
import LangBar from "./LangBar.jsx";
import { enterX, savedXName } from "../lib/session.js";
import { langById } from "../lib/i18n.js";
import { useLang } from "../lib/Lang.jsx";
import { speakHello } from "../lib/speak.js";

export default function Auth({ onIn }) {
  const { lang, t } = useLang();
  const [name, setName] = useState(() => savedXName());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const hello = langById(lang).hello;

  useEffect(() => {
    const speak = () => speakHello(lang);
    speak();
    const t1 = window.setTimeout(speak, 250);
    const t2 = window.setTimeout(speak, 900);
    const once = () => speakHello(lang);
    window.addEventListener("pointerdown", once, { once: true });
    window.speechSynthesis?.addEventListener?.("voiceschanged", speak);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("pointerdown", once);
      window.speechSynthesis?.removeEventListener?.("voiceschanged", speak);
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    speakHello(lang);
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
    <div className="authShell">
      <div className="authCard">
        <div className="helloStage">
          <Stander pose="front" className="authMascot" />
          <p className="helloBubble" aria-live="polite">
            {hello}
          </p>
        </div>
        <p className="langLabel">{t.lang}</p>
        <LangBar full />
        <div className="authBrand">
          <img className="authLogo" src={MARK} alt="StandX" />
          <span>STANDX RAID</span>
        </div>
        <h1>{t.signIn}</h1>
        <p className="authAsk">{t.ask}</p>
        <p>{t.save}</p>
        <form onSubmit={submit}>
          <label>
            {t.user}
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
            {busy ? "…" : t.enter}
          </button>
        </form>
      </div>
    </div>
  );
}
