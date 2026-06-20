import { useCallback, useRef, useState } from "react";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import { getVisionPrompt, hasApiKeyForProvider, type Settings } from "../lib/settings";
import { isSpeechUnlocked, speakAsync, stopSpeaking } from "../lib/speech";
import { createVisionService } from "../lib/vision";

export type AnalysisState = "idle" | "running" | "error";

export interface AIResponseEntry {
  text: string;
  promptTitle: string;
  timestampMs: number;
}

export interface AIUiState {
  analysisState: AnalysisState;
  latestResponse: string;
  errorMessage: string;
  responses: AIResponseEntry[];
  ttsNeedsTap: boolean;
}

const INITIAL_STATE: AIUiState = {
  analysisState: "idle",
  latestResponse: "",
  errorMessage: "",
  responses: [],
  ttsNeedsTap: false,
};

export function useAIAnalysis(settings: Settings) {
  const [state, setState] = useState<AIUiState>(INITIAL_STATE);
  const lastSampleMs = useRef(0);
  const backoffMs = useRef(0);
  const isProcessing = useRef(false);
  const didShowMissingKeyError = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastSpokenRef = useRef("");
  const latestResponseRef = useRef("");
  const lastFrameBlobRef = useRef<Blob | null>(null);

  const speakVisionResult = useCallback(
    async (result: string, manual: boolean) => {
      if (!settings.isTTSEnabled || !result.trim()) return;
      if (result === lastSpokenRef.current && !manual) return;

      const maySpeak = manual || isSpeechUnlocked();
      if (!maySpeak) {
        setState((prev) => ({ ...prev, ttsNeedsTap: true }));
        return;
      }

      lastSpokenRef.current = result;
      setState((prev) => ({ ...prev, ttsNeedsTap: false }));
      await speakAsync(result, { force: manual });
    },
    [settings.isTTSEnabled],
  );

  const replayLatest = useCallback(async () => {
    const text = latestResponseRef.current;
    if (!text.trim()) return;
    await speakVisionResult(text, true);
  }, [speakVisionResult]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    lastSampleMs.current = 0;
    backoffMs.current = 0;
    isProcessing.current = false;
    didShowMissingKeyError.current = false;
    lastFrameBlobRef.current = null;
    stopSpeaking();
    setState(INITIAL_STATE);
  }, []);

  const runAnalysis = useCallback(
    async (video: HTMLVideoElement, manual: boolean) => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({
        ...prev,
        analysisState: "running",
        errorMessage: "",
      }));

      try {
        const blob = await captureFrameAsJpeg(video, {
          maxWidth: manual ? 768 : 512,
          quality: manual ? 0.75 : 0.6,
        });
        lastFrameBlobRef.current = blob;
        const base64 = await blobToBase64(blob);
        const service = createVisionService(settings);
        const visionPrompt = getVisionPrompt(settings);
        const result = await service.analyze(base64, visionPrompt.prompt);
        if (controller.signal.aborted) return;

        const title = visionPrompt.title + (manual ? " (now)" : "");
        latestResponseRef.current = result;
        setState((prev) => ({
          analysisState: "idle",
          latestResponse: result,
          errorMessage: "",
          ttsNeedsTap: false,
          responses: [
            { text: result, promptTitle: title, timestampMs: Date.now() },
            ...prev.responses,
          ].slice(0, 10),
        }));

        void speakVisionResult(result, manual);
        backoffMs.current = 0;
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Analysis failed.";
        const isRateLimited = isRateLimitError(message);
        if (isRateLimited) {
          const intervalMs = settings.analysisIntervalSec * 1000;
          backoffMs.current = Math.min(
            120_000,
            Math.max(intervalMs * 2, backoffMs.current * 2 || intervalMs * 3),
          );
          lastSampleMs.current = Date.now();
        }
        setState((prev) => ({
          ...prev,
          analysisState: "error",
          errorMessage: message,
        }));
      } finally {
        isProcessing.current = false;
      }
    },
    [settings, speakVisionResult],
  );

  const processFrame = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video || video.readyState < 2) return;
      if (!settings.isAIEnabled) return;
      if (settings.visionManualOnly) return;

      if (!hasApiKeyForProvider(settings)) {
        if (!didShowMissingKeyError.current) {
          didShowMissingKeyError.current = true;
          setState((prev) => ({
            ...prev,
            analysisState: "error",
            errorMessage: "Add API key in Settings.",
          }));
        }
        return;
      }
      didShowMissingKeyError.current = false;

      const now = Date.now();
      const waitMs = settings.analysisIntervalSec * 1000 + backoffMs.current;
      if (isProcessing.current || now - lastSampleMs.current < waitMs) {
        return;
      }
      lastSampleMs.current = now;
      void runAnalysis(video, false);
    },
    [runAnalysis, settings],
  );

  const analyzeNow = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video || video.readyState < 2) return;
      abortRef.current?.abort();
      lastSampleMs.current = 0;
      void runAnalysis(video, true);
    },
    [runAnalysis],
  );

  const getDiscussSnapshot = useCallback(() => {
    const description = latestResponseRef.current.trim();
    const blob = lastFrameBlobRef.current;
    if (!description || !blob) return null;
    return { description, blob };
  }, []);

  return { state, processFrame, analyzeNow, replayLatest, getDiscussSnapshot, reset };
}

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("429") ||
    lower.includes("quota")
  );
}
