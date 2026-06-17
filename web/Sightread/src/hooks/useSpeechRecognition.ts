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
  const continuousRef = useRef(false);
  const startRef = useRef<(continuous?: boolean) => void>(() => {});

  useEffect(() => {
    optionsRef.current = options;
  });

  const isSupported = useMemo(() => getSpeechRecognitionCtor() != null, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback((continuous = optionsRef.current.continuous ?? false) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    continuousRef.current = continuous;
    shouldRestartRef.current =
      continuous || (optionsRef.current.autoRestart ?? false);

    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = continuous;

    recognition.onstart = () => {
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
      setStatus("error");
      setError(
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error,
      );
      shouldRestartRef.current = false;
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus("idle");
      if (shouldRestartRef.current) {
        window.setTimeout(() => {
          if (shouldRestartRef.current) {
            startRef.current(continuousRef.current);
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => () => stop(), [stop]);

  return { isSupported, status, error, start, stop };
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
