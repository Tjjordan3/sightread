export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeSourceUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return isSafeHttpUrl(trimmed) ? trimmed : null;
}

export function sanitizeCitations<
  T extends { title: string; url: string; snippet?: string },
>(citations: T[]): T[] {
  const result: T[] = [];
  for (const citation of citations) {
    const safeUrl = sanitizeSourceUrl(citation.url);
    if (!safeUrl) continue;
    result.push({ ...citation, url: safeUrl });
  }
  return result;
}
