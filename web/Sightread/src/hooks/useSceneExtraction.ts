import { useCallback, useEffect, useRef, useState } from "react";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import { extractSceneFromJpeg } from "../lib/scene/sceneExtractor";
import {
  clearSceneStore,
  getLatestScene,
  setSceneError,
  setSceneExtracting,
  setSceneSuccess,
  subscribeSceneStore,
  type SceneStoreSnapshot,
} from "../lib/scene/sceneStore";
import type { SceneState } from "../lib/scene/schema";
import type { Settings } from "../lib/settings";

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("quota")
  );
}

export interface UseSceneExtractionResult {
  scene: SceneState | null;
  extracting: boolean;
  error: string;
  updatedAtMs: number;
  processFrame: (video: HTMLVideoElement | null) => void;
  extractNow: (video: HTMLVideoElement) => Promise<void>;
  reset: () => void;
}

/**
 * Throttled async Tier-1 scene extraction. Coalesces overlapping requests and
 * keeps the last successful JSON in the shared scene store.
 */
export function useSceneExtraction(
  settings: Settings,
  options: { enabled?: boolean } = {},
): UseSceneExtractionResult {
  const enabled = options.enabled !== false && settings.isAIEnabled;
  const [snap, setSnap] = useState<SceneStoreSnapshot>(() => ({
    scene: getLatestScene(),
    updatedAtMs: 0,
    error: "",
    extracting: false,
  }));

  const lastSampleMs = useRef(0);
  const backoffMs = useRef(0);
  const isProcessing = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const pendingManualRef = useRef<HTMLVideoElement | null>(null);
  const runRef = useRef<(video: HTMLVideoElement, manual: boolean) => Promise<void>>(
    async () => {},
  );

  useEffect(() => subscribeSceneStore(setSnap), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    pendingManualRef.current = null;
    lastSampleMs.current = 0;
    backoffMs.current = 0;
    isProcessing.current = false;
    clearSceneStore();
  }, []);

  const runExtraction = useCallback(
    async (video: HTMLVideoElement, manual: boolean) => {
      if (!enabled && !manual) return;
      if (isProcessing.current) {
        if (manual) {
          abortRef.current?.abort();
          pendingManualRef.current = video;
        }
        return;
      }

      isProcessing.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSceneExtracting(true);

      try {
        const blob = await captureFrameAsJpeg(video, {
          maxWidth: manual ? 768 : 512,
          quality: manual ? 0.75 : 0.55,
        });
        if (controller.signal.aborted) return;

        const base64 = await blobToBase64(blob);
        if (controller.signal.aborted) return;

        const scene = await extractSceneFromJpeg(base64, settings);
        if (controller.signal.aborted) return;

        setSceneSuccess(scene);
        backoffMs.current = 0;
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Scene extraction failed.";
        if (isRateLimitError(message)) {
          const intervalMs = settings.analysisIntervalSec * 1000;
          backoffMs.current = Math.min(
            120_000,
            Math.max(intervalMs * 2, backoffMs.current * 2 || intervalMs * 3),
          );
          lastSampleMs.current = Date.now();
        }
        setSceneError(message);
      } finally {
        isProcessing.current = false;
        const pending = pendingManualRef.current;
        if (pending) {
          pendingManualRef.current = null;
          lastSampleMs.current = 0;
          void runRef.current(pending, true);
        }
      }
    },
    [enabled, settings],
  );

  useEffect(() => {
    runRef.current = runExtraction;
  }, [runExtraction]);

  const processFrame = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!enabled || !video || video.readyState < 2) return;
      if (settings.visionManualOnly) return;

      const now = Date.now();
      const intervalMs =
        settings.analysisIntervalSec * 1000 + backoffMs.current;
      if (now - lastSampleMs.current < intervalMs) return;
      if (isProcessing.current) return;

      lastSampleMs.current = now;
      void runExtraction(video, false);
    },
    [enabled, runExtraction, settings.analysisIntervalSec, settings.visionManualOnly],
  );

  const extractNow = useCallback(
    async (video: HTMLVideoElement) => {
      lastSampleMs.current = 0;
      await runExtraction(video, true);
    },
    [runExtraction],
  );

  return {
    scene: snap.scene,
    extracting: snap.extracting,
    error: snap.error,
    updatedAtMs: snap.updatedAtMs,
    processFrame,
    extractNow,
    reset,
  };
}
