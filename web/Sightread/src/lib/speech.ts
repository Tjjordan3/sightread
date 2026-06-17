let resumeTimer: number | null = null;
let unlockedUntil = 0;
let lastSpokenText = "";

function clearResumeTimer(): void {
  if (resumeTimer != null) {
    window.clearInterval(resumeTimer);
    resumeTimer = null;
  }
}

function primeVoices(): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  primeVoices();
  window.speechSynthesis.addEventListener("voiceschanged", primeVoices);
}

/** Browsers (especially iOS) block TTS until the user interacts with the page. */
export function unlockSpeech(): void {
  if (!("speechSynthesis" in window)) return;
  unlockedUntil = Date.now() + 30 * 60 * 1000;
  primeVoices();
  const synth = window.speechSynthesis;
  synth.resume();
  const prime = new SpeechSynthesisUtterance("\u200b");
  prime.volume = 0.01;
  prime.rate = 2;
  configureUtterance(prime);
  synth.speak(prime);
}

export function isSpeechUnlocked(): boolean {
  return Date.now() < unlockedUntil;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const lang = (navigator.language || "en").toLowerCase();
  const langPrefix = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

function configureUtterance(utterance: SpeechSynthesisUtterance): void {
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = navigator.language || "en-US";
  utterance.rate = 1;
}

function beginSpeaking(utterance: SpeechSynthesisUtterance): void {
  const synth = window.speechSynthesis;
  synth.resume();
  if (synth.paused) synth.resume();
  synth.speak(utterance);
}

/** iOS Safari pauses synthesis after ~15s unless resumed periodically. */
function startResumeHack(): void {
  clearResumeTimer();
  resumeTimer = window.setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, 5000);
}

export function speak(text: string): void {
  void speakAsync(text, { force: true });
}

export function speakAsync(
  text: string,
  options: { force?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text.trim()) {
      resolve(false);
      return;
    }

    const trimmed = text.trim();
    if (
      !options.force &&
      trimmed === lastSpokenText &&
      window.speechSynthesis.speaking
    ) {
      resolve(true);
      return;
    }

    primeVoices();
    lastSpokenText = trimmed;
    stopSpeaking();

    window.setTimeout(() => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearResumeTimer();
        resolve(ok);
      };

      const utterance = new SpeechSynthesisUtterance(trimmed);
      configureUtterance(utterance);
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      startResumeHack();
      beginSpeaking(utterance);

      const fallbackMs = Math.min(60000, Math.max(3000, trimmed.length * 80));
      window.setTimeout(() => finish(true), fallbackMs);
    }, 50);
  });
}

export function stopSpeaking(): void {
  clearResumeTimer();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return "speechSynthesis" in window;
}

export function warmUpSpeech(): void {
  unlockSpeech();
}
