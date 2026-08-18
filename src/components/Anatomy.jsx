import React from "react";
import { SIPS } from "../lib/sips.js";
import { sipText } from "../lib/i18n.js";
import { useLang } from "../lib/Lang.jsx";

export default function Anatomy({ open, onOpen }) {
  const { t } = useLang();
  const active = SIPS.find((s) => s.id === open) || SIPS[4];
  const text = sipText(t, active.id);

  return (
    <section className="anatomy">
      <div className="anatomyTop">
        <div>
          <span className="kicker">{t.protocol}</span>
          <strong>SIP-1 — SIP-5</strong>
        </div>
        <p className="anatomyNote">{active.id}: {text.lore}</p>
      </div>
      <div className="sipRow">
        {SIPS.map((s) => (
          <button
            key={s.id}
            className={s.id === open ? "on" : ""}
            onMouseEnter={() => onOpen(s.id)}
            onFocus={() => onOpen(s.id)}
            onClick={() => onOpen(s.id)}
            type="button"
          >
            {s.id}
            <small>{sipText(t, s.id).name}</small>
          </button>
        ))}
      </div>
      <div className="sipBody">
        <div>
          <span className="tag lore">{t.rule}</span>
          <p>{text.lore}</p>
        </div>
        <div>
          <span className="tag live">{t.liveData}</span>
          <p>{text.live}</p>
        </div>
      </div>
    </section>
  );
}
