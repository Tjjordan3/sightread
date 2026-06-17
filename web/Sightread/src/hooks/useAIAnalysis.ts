import { useCallback, useRef, useState } from "react";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import { getVisionPrompt, hasApiKeyForProvider, type Settings } from "../lib/settings";
import { speak, stopSpeaking } from "../lib/speech";
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
}

const INITIAL_STATE: AIUiState = {
  analysisState: "idle",
  latestResponse: "",
  errorMessage: "",
  responses: [],
};

export function useAIAnalysis(settings: Settings) {
  const [state, setState] = useState<AIUiState>(INITIAL_STATE);
  const lastSampleMs = useRef(0);
  const isProcessing = useRef(false);
  const didShowMissingKeyError = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    lastSampleMs.current = 0;
    isProcessing.current = false;
    didShowMissingKeyError.current = false;
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
        const base64 = await blobToBase64(blob);
        const service = createVisionService(settings);
        const visionPrompt = getVisionPrompt(settings);
        const result = await service.analyze(base64, visionPrompt.prompt);
        if (controller.signal.aborted) return;

        const title = visionPrompt.title + (manual ? " (now)" : "");
        setState((prev) => ({
          analysisState: "idle",
          latestResponse: result,
          errorMessage: "",
          responses: [
            { text: result, promptTitle: title, timestampMs: Date.now() },
            ...prev.responses,
          ].slice(0, 10),
        }));

        if (settings.isTTSEnabled) speak(result);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          analysisState: "error",
          errorMessage:
            err instanceof Error ? err.message : "Analysis failed.",
        }));
      } finally {
        isProcessing.current = false;
      }
    },
    [settings],
  );

  const processFrame = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video || video.readyState < 2) return;
      if (!settings.isAIEnabled) return;

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
      if (
        isProcessing.current ||
        now - lastSampleMs.current < settings.analysisIntervalSec * 1000
      ) {
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

  return { state, processFrame, analyzeNow, reset };
}
