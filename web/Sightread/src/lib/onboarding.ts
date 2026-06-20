const HAS_ONBOARDED_KEY = "sightread_has_onboarded";
const STEP_KEY = "sightread_onboarding_step";

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
    sessionStorage.removeItem(STEP_KEY);
  } catch {
    // ignore
  }
}

/** Persists the current step while the user visits Settings mid-flow. */
export function getOnboardingStep(): number {
  try {
    const raw = sessionStorage.getItem(STEP_KEY);
    if (!raw) return 1;
    const step = Number.parseInt(raw, 10);
    if (!Number.isFinite(step)) return 1;
    return Math.min(3, Math.max(1, step));
  } catch {
    return 1;
  }
}

export function setOnboardingStep(step: number): void {
  try {
    sessionStorage.setItem(STEP_KEY, String(Math.min(3, Math.max(1, step))));
  } catch {
    // ignore
  }
}
