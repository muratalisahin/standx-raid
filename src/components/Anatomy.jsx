import React from "react";
import { SIPS } from "../lib/sips.js";

export default function Anatomy({ open, onOpen }) {
  const active = SIPS.find((s) => s.id === open) || SIPS[4];

  return (
    <section className="anatomy">
      <div className="anatomyTop">
        <div>
          <span className="kicker">PROTOCOL</span>
          <strong>SIP-1 — SIP-5</strong>
        </div>
        <p className="anatomyNote">{active.id}: {active.lore}</p>
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
            <small>{s.name}</small>
          </button>
        ))}
      </div>
      <div className="sipBody">
        <div>
          <span className="tag lore">RULE</span>
          <p>{active.lore}</p>
        </div>
        <div>
          <span className="tag live">LIVE DATA</span>
          <p>{active.live}</p>
        </div>
      </div>
    </section>
  );
}
