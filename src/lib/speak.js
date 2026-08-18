import { detectLang, langById } from "./i18n.js";

function pickVoice(locale) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;
  const loc = locale.toLowerCase();
  const prefix = loc.slice(0, 2);
  return (
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === loc) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    null
  );
}

export function speakHello(langId = detectLang()) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const lang = langById(langId);
  const go = () => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume?.();
      const u = new SpeechSynthesisUtterance(lang.hello);
      u.lang = lang.locale;
      u.rate = 0.92;
      u.pitch = 1.08;
      u.volume = 1;
      const voice = pickVoice(lang.locale);
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };
  go();
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.addEventListener("voiceschanged", go, { once: true });
  }
}

export function unlockSpeech(langId = detectLang()) {
  speakHello(langId);
}
