let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string): void {
  if (!("speechSynthesis" in window) || !text.trim()) return;
  stopSpeaking();
  currentUtterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(currentUtterance);
}

export function stopSpeaking(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeechSupported(): boolean {
  return "speechSynthesis" in window;
}
