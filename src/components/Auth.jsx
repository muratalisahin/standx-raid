import React, { useState } from "react";
import Stander, { LOGO } from "./Stander.jsx";
import { enterX, savedXName } from "../lib/session.js";

export default function Auth({ onIn }) {
  const [name, setName] = useState(() => savedXName());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
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
        <img className="authLogo" src={LOGO} alt="StandX" />
        <Stander pose="cozy" className="authMascot" />
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
