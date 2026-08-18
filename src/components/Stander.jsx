export const LOGO = "/images/standx-logo.png";
export const MARK = "/images/standx-mark.png";

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

export default function Stander({ pose = "front", className = "", alt = "Stander, the StandX mascot" }) {
  return <img className={className} src={STANDER[pose] || STANDER.front} alt={alt} />;
}

export function standerPose({ running, over, flash, kind, rankId }) {
  if (over) return rankId === "UNIVERSAL" ? "formal" : "think";
  if (!running) return "cozy";
  if (flash?.includes("LOCKED")) return "cozy";
  if (flash?.includes("WRONG") || flash?.includes("TIMEOUT")) return "think";
  if (kind?.includes("BOSS")) return "formal";
  if (kind?.includes("SCAN") || kind?.includes("SIP")) return "think";
  if (kind?.includes("X-RAY") || kind?.includes("PIPE") || kind?.includes("COIL")) return "focus";
  return "three";
}
