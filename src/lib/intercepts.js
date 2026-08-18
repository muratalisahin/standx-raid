import { SIPS } from "./sips.js";
import { QUESTIONS } from "./questions.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const ROUND_SIZE = 15;

export function newDeck() {
  const sip = shuffle(QUESTIONS.filter((q) => q.type === "sip"));
  const truth = shuffle(QUESTIONS.filter((q) => q.type === "truth"));
  return shuffle([...sip.slice(0, 5), ...truth.slice(0, 10)]);
}

export function fromQuestion(q) {
  if (!q) return fallbackTruth();
  if (q.type === "sip") {
    const sip = SIPS.find((s) => s.id === q.sip) || SIPS[0];
    return {
      kind: "SIP",
      prompt: q.prompt || `What is ${sip.id} about?`,
      hint: "Pick the topic below: SIP-1 Block Trade · SIP-2 Position Yield · SIP-3 DUSD Native Yield · SIP-4 Block Options · SIP-5 Universal Markets.",
      target: sip.id,
      mode: "tap-sip",
      options: SIPS,
      seconds: 20,
      score: 10,
      sip: sip.id,
    };
  }
  return {
    kind: "PROTOCOL",
    prompt: q.prompt,
    hint: "TRUE if it matches StandX / perps as framed here. FALSE if it is wrong.",
    target: q.truth ? "CORE" : "MODULE",
    mode: "truth",
    seconds: 14,
    score: 10,
  };
}

function fallbackTruth() {
  return fromQuestion(QUESTIONS[0]);
}

export function makeIntercept(deck) {
  if (!deck.length) deck.push(...newDeck());
  return fromQuestion(deck.pop());
}

export function resolveHit(intercept, hit) {
  if (!intercept) return false;
  if (intercept.steps) {
    const step = intercept.steps[intercept.step || 0];
    return hitMatches(step, hit);
  }
  return hitMatches(intercept, hit);
}

function hitMatches(rule, hit) {
  if (rule.mode === "tap-mod") {
    if (rule.accept) return rule.accept.has(hit.symbol);
    return hit.symbol === rule.target;
  }
  if (rule.mode === "tap-core") return hit.kind === "core";
  if (rule.mode === "tap-sip") return hit.sip === rule.target;
  if (rule.mode === "tap-side") return hit.side === rule.target;
  if (rule.mode === "truth") {
    if (rule.target === "CORE") return hit.kind === "core";
    return hit.kind === "mod";
  }
  return false;
}

export function advanceBoss(intercept) {
  if (!intercept?.steps) return { done: true, intercept };
  const next = (intercept.step || 0) + 1;
  if (next >= intercept.steps.length) return { done: true, intercept };
  return { done: false, intercept: { ...intercept, step: next } };
}

export const RANKS = [
  { min: 0, id: "SPARK", line: "Current is just leaving the core." },
  { min: 30, id: "MAKER", line: "The quote is sitting." },
  { min: 60, id: "SHIELD", line: "Loss hits you last." },
  { min: 100, id: "CIRCUIT", line: "The ring answers back." },
  { min: 150, id: "UNIVERSAL", line: "You can list and keep a market live." },
];

export function rankFor(score) {
  return [...RANKS].reverse().find((r) => score >= r.min) || RANKS[0];
}
