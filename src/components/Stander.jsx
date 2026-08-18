import React, { useEffect, useState } from "react";

export const LOGO = "/images/standx-logo.png";
export const MARK = "/images/standx-mark.png";
export const WORDMARK = "/images/standx-wordmark.png";

export const STANDER = {
  front: "/images/stander-front.png",
  three: "/images/stander-34.png",
  side: "/images/stander-side.png",
  back: "/images/stander-back.png",
  focus: "/images/stander-focus.png",
  think: "/images/stander-think.png",
  formal: "/images/stander-formal.png",
  cozy: "/images/stander-cozy.png",
};

const CYCLE = ["front", "three", "side", "think", "focus", "cozy", "formal"];

export default function Stander({
  pose = "front",
  cycle = false,
  className = "",
  alt = "Stander, the StandX mascot",
}) {
  const [shown, setShown] = useState(pose);
  const [swap, setSwap] = useState(false);

  useEffect(() => {
    if (!cycle) return;
    let inner;
    const id = setInterval(() => {
      setSwap(true);
      inner = window.setTimeout(() => {
        setShown((p) => CYCLE[(Math.max(0, CYCLE.indexOf(p)) + 1) % CYCLE.length]);
        setSwap(false);
      }, 160);
    }, 1600);
    return () => {
      clearInterval(id);
      if (inner) window.clearTimeout(inner);
    };
  }, [cycle]);

  useEffect(() => {
    if (cycle || pose === shown) return;
    setSwap(true);
    const id = window.setTimeout(() => {
      setShown(pose);
      setSwap(false);
    }, 120);
    return () => window.clearTimeout(id);
  }, [cycle, pose, shown]);

  return (
    <span className={`standerLive pose-${shown} ${swap ? "swap" : ""} ${className}`.trim()}>
      <img src={STANDER[shown] || STANDER.front} alt={alt} draggable={false} />
    </span>
  );
}

export function standerPose({ running, over, flash, kind, rankId }) {
  if (over) return rankId === "UNIVERSAL" ? "formal" : "think";
  if (!running) return "cozy";
  if (flash?.includes("LOCKED")) return "cozy";
  if (flash?.includes("WRONG") || flash?.includes("TIMEOUT") || flash?.includes("TIME")) return "think";
  if (kind?.includes("BOSS")) return "formal";
  if (kind?.includes("SCAN") || kind?.includes("SIP")) return "think";
  if (kind?.includes("X-RAY") || kind?.includes("PIPE") || kind?.includes("COIL") || kind?.includes("PROTOCOL")) return "focus";
  return "three";
}
