import React from "react";
import { LANGS } from "../lib/i18n.js";
import { useLang } from "../lib/Lang.jsx";

export default function LangBar({ full = false }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`langRow hudLang ${full ? "full" : ""}`} role="group" aria-label={t.lang}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={l.id === lang ? "on" : ""}
          onClick={() => setLang(l.id)}
          title={l.label}
        >
          {full ? l.label : l.short}
        </button>
      ))}
    </div>
  );
}
