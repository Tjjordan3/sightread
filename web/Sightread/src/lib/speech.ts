let resumeTimer: number | null = null;

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
  if (!("speechSynthesis" in window) || !text.trim()) return;
  primeVoices();
  stopSpeaking();
  window.setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    configureUtterance(utterance);
    startResumeHack();
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => clearResumeTimer();
    utterance.onerror = () => clearResumeTimer();
  }, 50);
}

export function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window) || !text.trim()) {
      resolve();
      return;
    }
    primeVoices();
    stopSpeaking();

    window.setTimeout(() => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearResumeTimer();
        resolve();
      };

      const utterance = new SpeechSynthesisUtterance(text);
      configureUtterance(utterance);
      utterance.onend = finish;
      utterance.onerror = finish;
      startResumeHack();
      window.speechSynthesis.speak(utterance);

      // Chrome occasionally skips onend; cap wait by text length.
      const fallbackMs = Math.min(60000, Math.max(3000, text.length * 80));
      window.setTimeout(finish, fallbackMs);
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
  primeVoices();
}
