import { Capacitor } from "@capacitor/core";
import {
  isSpeechUnlocked,
  speakAsync as webSpeakAsync,
  stopSpeaking as webStopSpeaking,
  unlockSpeech as webUnlockSpeech,
  warmUpSpeech as webWarmUpSpeech,
} from "../speech";
import { getLatestScene } from "../scene/sceneStore";
import {
  speakSpatially,
  stopSpatialAudio,
  type SpatialSpeakOptions,
} from "./spatialAudio";

export interface SpeakAccessibleOptions {
  force?: boolean;
  /** Prefer object/hazard azimuth from latest scene JSON when spatial audio is on. */
  spatialAudioEnabled?: boolean;
  /** Explicit azimuth override (degrees). */
  azimuthDeg?: number;
  elevationDeg?: number;
  distanceM?: number | null;
}

async function speakNativeCapacitor(text: string): Promise<boolean> {
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({
      text,
      lang: navigator.language || "en-US",
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      category: "ambient",
    });
    return true;
  } catch {
    return webSpeakAsync(text, { force: true });
  }
}

function pickSpatialTarget(
  options: SpeakAccessibleOptions,
): SpatialSpeakOptions | null {
  if (!options.spatialAudioEnabled) return null;

  if (typeof options.azimuthDeg === "number") {
    return {
      azimuthDeg: options.azimuthDeg,
      elevationDeg: options.elevationDeg ?? 0,
      distanceM: options.distanceM ?? null,
    };
  }

  const scene = getLatestScene();
  if (!scene) return null;

  const hazardObject =
    scene.hazards.length > 0
      ? scene.objects.find((obj) =>
          scene.hazards.some((h) =>
            obj.label.toLowerCase().includes(h.toLowerCase().slice(0, 24)),
          ),
        )
      : undefined;
  const target = hazardObject ?? scene.objects[0];
  if (!target) return null;

  return {
    azimuthDeg: target.azimuthDeg,
    elevationDeg: target.elevationDeg,
    distanceM: target.distanceM,
  };
}

/**
 * Unified TTS entry point: Capacitor native TTS on device, Web Speech in browser.
 * Optionally pans audio via the spatial module using scene object positions.
 */
export async function speakAccessible(
  text: string,
  options: SpeakAccessibleOptions = {},
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const spatial = pickSpatialTarget(options);
  if (spatial) {
    return speakSpatially(trimmed, spatial, async (spoken) => {
      if (Capacitor.isNativePlatform()) {
        return speakNativeCapacitor(spoken);
      }
      return webSpeakAsync(spoken, { force: options.force ?? true });
    });
  }

  if (Capacitor.isNativePlatform()) {
    return speakNativeCapacitor(trimmed);
  }
  return webSpeakAsync(trimmed, { force: options.force });
}

export function stopAccessibleSpeech(): void {
  stopSpatialAudio();
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor-community/text-to-speech")
      .then(({ TextToSpeech }) => TextToSpeech.stop())
      .catch(() => {
        webStopSpeaking();
      });
    return;
  }
  webStopSpeaking();
}

export function unlockAccessibleSpeech(): void {
  webUnlockSpeech();
}

export function warmUpAccessibleSpeech(): void {
  webWarmUpSpeech();
}

export { isSpeechUnlocked };
