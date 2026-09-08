const HAS_ONBOARDED_KEY = "sightread_has_onboarded";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(HAS_ONBOARDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(HAS_ONBOARDED_KEY, "true");
  } catch {
    // ignore
  }
}
