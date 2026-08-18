let unlocked = false;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /google|samantha|zira|jenny|aria/i.test(v.name)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    null
  );
}

export function speakHello() {
  const text = "Hello, welcome";
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    u.pitch = 1.12;
    u.volume = 1;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function unlockSpeech() {
  if (unlocked) {
    speakHello();
    return;
  }
  unlocked = true;
  if (window.speechSynthesis?.getVoices().length) {
    speakHello();
    return;
  }
  window.speechSynthesis?.addEventListener?.("voiceschanged", speakHello, { once: true });
  speakHello();
}
