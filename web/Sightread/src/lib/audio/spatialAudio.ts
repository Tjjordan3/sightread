/**
 * Spatial audio helper for accessibility.
 * v1 uses Web Audio API HRTF PannerNode inside the browser / Capacitor WebView.
 * Native platform bridges can later replace `playSpatialTone` without changing callers.
 */

export interface SpatialSpeakOptions {
  azimuthDeg: number;
  elevationDeg?: number;
  distanceM?: number | null;
}

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

/** Convert spherical-ish camera angles to Cartesian for PannerNode. */
export function azimuthToPosition(
  azimuthDeg: number,
  elevationDeg = 0,
  distanceM: number | null = 1.5,
): { x: number; y: number; z: number } {
  const distance = Math.max(0.4, distanceM ?? 1.5);
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  // Web Audio: +x right, +y up, -z forward
  return {
    x: Math.sin(az) * Math.cos(el) * distance,
    y: Math.sin(el) * distance,
    z: -Math.cos(az) * Math.cos(el) * distance,
  };
}

/**
 * Brief HRTF cue before speech so listeners can localize the announcement.
 */
export async function playSpatialCue(
  options: SpatialSpeakOptions,
): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  const { x, y, z } = azimuthToPosition(
    options.azimuthDeg,
    options.elevationDeg ?? 0,
    options.distanceM,
  );

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 1;
  panner.maxDistance = 20;
  panner.positionX.value = x;
  panner.positionY.value = y;
  panner.positionZ.value = z;

  oscillator.type = "sine";
  oscillator.frequency.value = 680;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.2);

  await new Promise((resolve) => window.setTimeout(resolve, 220));
  return true;
}

export function stopSpatialAudio(): void {
  // Oscillators are short-lived; closing is avoided to keep low-latency resume.
  if (sharedCtx && sharedCtx.state === "running") {
    // no-op stop — cues end themselves
  }
}

/**
 * Play a spatial localization cue, then run the provided speak function.
 */
export async function speakSpatially(
  text: string,
  options: SpatialSpeakOptions,
  speak: (text: string) => Promise<boolean>,
): Promise<boolean> {
  await playSpatialCue(options);
  return speak(text);
}
