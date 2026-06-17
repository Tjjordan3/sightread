import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SpeechRecognitionStatus = "idle" | "listening" | "unsupported" | "error";

export interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  autoRestart?: boolean;
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: { error: string }) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [error, setError] = useState("");
  const optionsRef = useRef(options);
  const shouldRestartRef = useRef(false);
  const pausedRef = useRef(false);
  const wantsListeningRef = useRef(false);
  const continuousRef = useRef(false);
  const startRef = useRef<(continuous?: boolean) => void>(() => {});
  const resumeRef = useRef<() => void>(() => {});
  const lastEndMs = useRef(0);
  const rapidRestarts = useRef(0);

  useEffect(() => {
    optionsRef.current = options;
  });

  const isSupported = useMemo(() => getSpeechRecognitionCtor() != null, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    pausedRef.current = false;
    wantsListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const resume = useCallback(() => {
    if (!wantsListeningRef.current) return;
    pausedRef.current = false;
    startRef.current(continuousRef.current);
  }, []);

  const start = useCallback((continuous = optionsRef.current.continuous ?? false) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    continuousRef.current = continuous;
    wantsListeningRef.current = true;
    pausedRef.current = false;
    shouldRestartRef.current =
      continuous || (optionsRef.current.autoRestart ?? false);

    const existing = recognitionRef.current;
    if (existing) {
      existing.onend = null;
      existing.onerror = null;
      existing.abort();
      recognitionRef.current = null;
    }

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = continuous;

    recognition.onstart = () => {
      rapidRestarts.current = 0;
      setError("");
      setStatus("listening");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (interim) optionsRef.current.onInterimTranscript?.(interim.trim());
      if (finalText) optionsRef.current.onFinalTranscript?.(finalText.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (recognitionRef.current !== recognition) return;
      setStatus("error");
      setError(
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error,
      );
      shouldRestartRef.current = false;
      wantsListeningRef.current = false;
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setStatus("idle");
      if (pausedRef.current) return;
      if (shouldRestartRef.current) {
        const now = Date.now();
        const gap = now - lastEndMs.current;
        lastEndMs.current = now;
        if (gap < 2500) rapidRestarts.current += 1;
        else rapidRestarts.current = 0;
        const delay = Math.min(2000, 500 + rapidRestarts.current * 400);
        window.setTimeout(() => {
          if (shouldRestartRef.current && !pausedRef.current) {
            startRef.current(continuousRef.current);
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setStatus("error");
      setError("Could not start speech recognition.");
      shouldRestartRef.current = false;
    }
  }, []);

  useEffect(() => {
    startRef.current = start;
    resumeRef.current = resume;
  }, [resume, start]);

  useEffect(() => () => stop(), [stop]);

  return { isSupported, status, error, start, stop, pause, resume };
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
