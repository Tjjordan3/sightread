import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const STORAGE_KEY = "sightread_settings";

/** Persist settings JSON: Capacitor Preferences on native, localStorage on web. */
export async function readSettingsRaw(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    return value;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function writeSettingsRaw(value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: STORAGE_KEY, value });
    return;
  }
  localStorage.setItem(STORAGE_KEY, value);
}

export function readSettingsRawSync(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeSettingsRawSync(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
  if (Capacitor.isNativePlatform()) {
    void Preferences.set({ key: STORAGE_KEY, value });
  }
}

export { STORAGE_KEY as SETTINGS_STORAGE_KEY };
