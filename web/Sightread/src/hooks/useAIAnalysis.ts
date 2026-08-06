import { useCallback, useRef, useState } from "react";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import { webSearch, type SearchCitation } from "../lib/search/tavilyClient";
import { getVisionPrompt, hasApiKeyForProvider, type Settings } from "../lib/settings";
import { isSpeechUnlocked, speakAsync, stopSpeaking } from "../lib/speech";
import { createVisionService } from "../lib/vision";

export type AnalysisState = "idle" | "running" | "error";

export interface AIResponseEntry {
  text: string;
  promptTitle: string;
  timestampMs: number;
  citations?: SearchCitation[];
}

export interface AIUiState {
  analysisState: AnalysisState;
  latestResponse: string;
  errorMessage: string;
  responses: AIResponseEntry[];
  ttsNeedsTap: boolean;
  latestCitations: SearchCitation[];
  sourcesLoading: boolean;
  sourcesError: string;
}

const INITIAL_STATE: AIUiState = {
  analysisState: "idle",
  latestResponse: "",
  errorMessage: "",
  responses: [],
  ttsNeedsTap: false,
  latestCitations: [],
  sourcesLoading: false,
  sourcesError: "",
};

function buildSearchQueryFromVision(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 120) return trimmed;
  const sentence = trimmed.match(/^[^.!?]+[.!?]?/)?.[0]?.trim();
  if (sentence && sentence.length >= 20) return sentence.slice(0, 120);
  return trimmed.slice(0, 120);
}

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
  const pendingManualRef = useRef<HTMLVideoElement | null>(null);
  const runAnalysisRef = useRef<
    (video: HTMLVideoElement, manual: boolean) => Promise<void>
  >(async () => {});

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
    pendingManualRef.current = null;
    lastSampleMs.current = 0;
    backoffMs.current = 0;
    isProcessing.current = false;
    didShowMissingKeyError.current = false;
    lastFrameBlobRef.current = null;
    latestResponseRef.current = "";
    stopSpeaking();
    setState(INITIAL_STATE);
  }, []);

  const applyExternalResult = useCallback(
    (result: string, blob: Blob, promptTitle: string) => {
      latestResponseRef.current = result;
      lastFrameBlobRef.current = blob;
      setState((prev) => ({
        analysisState: "idle",
        latestResponse: result,
        errorMessage: "",
        ttsNeedsTap: false,
        latestCitations: [],
        sourcesLoading: false,
        sourcesError: "",
        responses: [
          { text: result, promptTitle, timestampMs: Date.now() },
          ...prev.responses,
        ].slice(0, 10),
      }));
    },
    [],
  );

  const runAnalysis = useCallback(
    async (video: HTMLVideoElement, manual: boolean) => {
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

      setState((prev) => ({
        ...prev,
        analysisState: "running",
        errorMessage: "",
        latestCitations: [],
        sourcesError: "",
      }));

      try {
        const blob = await captureFrameAsJpeg(video, {
          maxWidth: manual ? 768 : 512,
          quality: manual ? 0.75 : 0.6,
        });
        if (controller.signal.aborted) return;

        lastFrameBlobRef.current = blob;
        const base64 = await blobToBase64(blob);
        if (controller.signal.aborted) return;

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
          latestCitations: [],
          sourcesLoading: false,
          sourcesError: "",
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
        const pending = pendingManualRef.current;
        if (pending) {
          pendingManualRef.current = null;
          lastSampleMs.current = 0;
          void runAnalysisRef.current(pending, true);
        }
      }
    },
    [settings, speakVisionResult],
  );

  runAnalysisRef.current = runAnalysis;

  const findSources = useCallback(async () => {
    const query = buildSearchQueryFromVision(latestResponseRef.current);
    if (!settings.webSearchEnabled) return;
    if (!query) return;

    setState((prev) => ({
      ...prev,
      sourcesLoading: true,
      sourcesError: "",
    }));

    try {
      const results = await webSearch(query);
      setState((prev) => ({
        ...prev,
        sourcesLoading: false,
        latestCitations: results,
        responses:
          prev.responses.length > 0
            ? [
                { ...prev.responses[0], citations: results },
                ...prev.responses.slice(1),
              ]
            : prev.responses,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        sourcesLoading: false,
        sourcesError: err instanceof Error ? err.message : "Search failed.",
      }));
    }
  }, [settings.webSearchEnabled]);

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
      lastSampleMs.current = 0;
      if (isProcessing.current) {
        abortRef.current?.abort();
        pendingManualRef.current = video;
        return;
      }
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

  return {
    state,
    processFrame,
    analyzeNow,
    replayLatest,
    findSources,
    getDiscussSnapshot,
    applyExternalResult,
    reset,
  };
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
