export const WAKE_PHRASE = "hey sightread";

export function stripWakePhrase(text: string): {
  triggered: boolean;
  command: string;
} {
  const lower = text.toLowerCase().trim();
  const idx = lower.indexOf(WAKE_PHRASE);
  if (idx === -1) return { triggered: false, command: text.trim() };
  const after = text.slice(idx + WAKE_PHRASE.length).trim();
  return { triggered: true, command: after.replace(/^[,.!\s]+/, "") };
}

export function containsWakePhrase(text: string): boolean {
  return text.toLowerCase().includes(WAKE_PHRASE);
}
