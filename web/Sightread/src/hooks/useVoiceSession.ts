import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "../lib/settings";
import { containsWakePhrase, stripWakePhrase } from "../lib/voice/wakeWord";

export type VoiceSessionPhase =
  | "idle"
  | "listening"
  | "processing"
  | "speaking";

export interface UseVoiceSessionOptions {
  settings: Settings;
  speechSupported: boolean;
  passiveListening: boolean;
  isSending: boolean;
  voiceConversation: boolean;
  onStartVoiceConversation: () => void;
  onStopVoiceConversation: () => void;
  onTranscriptCommit: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  startListening: (continuous: boolean) => void;
  stopListening: () => void;
  isListening: boolean;
}

export function useVoiceSession({
  settings,
  speechSupported,
  passiveListening,
  isSending,
  voiceConversation,
  onStartVoiceConversation,
  onStopVoiceConversation,
  onTranscriptCommit,
  onInterimTranscript,
  startListening,
  stopListening,
  isListening,
}: UseVoiceSessionOptions) {
  const [speaking, setSpeaking] = useState(false);
  const transcriptBuffer = useRef("");
  const silenceTimer = useRef<number | null>(null);
  const wakeArmed = useRef(false);

  const phase: VoiceSessionPhase = speaking
    ? "speaking"
    : isSending
      ? "processing"
      : isListening
        ? "listening"
        : "idle";

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current != null) {
      window.clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const commitBuffer = useCallback(() => {
    clearSilenceTimer();
    const raw = transcriptBuffer.current.trim();
    transcriptBuffer.current = "";
    if (!raw) return;

    if (settings.wakeWordEnabled) {
      const { triggered, command } = stripWakePhrase(raw);
      if (!triggered && !wakeArmed.current) return;
      wakeArmed.current = false;
      const text = command || raw;
      if (!text) return;
      onTranscriptCommit(text);
      return;
    }

    onTranscriptCommit(raw);
  }, [clearSilenceTimer, onTranscriptCommit, settings.wakeWordEnabled]);

  const scheduleSilenceCommit = useCallback(() => {
    clearSilenceTimer();
    if (!voiceConversation && !settings.alwaysListening) return;
    silenceTimer.current = window.setTimeout(() => {
      commitBuffer();
    }, settings.silenceTimeoutMs);
  }, [
    clearSilenceTimer,
    commitBuffer,
    settings.alwaysListening,
    settings.silenceTimeoutMs,
    voiceConversation,
  ]);

  const handleInterim = useCallback(
    (text: string) => {
      onInterimTranscript(text);
      if (settings.wakeWordEnabled && containsWakePhrase(text)) {
        wakeArmed.current = true;
      }
      if (voiceConversation || settings.alwaysListening) {
        transcriptBuffer.current = text;
        scheduleSilenceCommit();
      }
    },
    [
      onInterimTranscript,
      scheduleSilenceCommit,
      settings.alwaysListening,
      settings.wakeWordEnabled,
      voiceConversation,
    ],
  );

  const handleFinal = useCallback(
    (text: string) => {
      if (settings.wakeWordEnabled) {
        const { triggered, command } = stripWakePhrase(text);
        if (triggered) {
          wakeArmed.current = true;
          if (command) {
            onTranscriptCommit(command);
            return;
          }
        } else if (!wakeArmed.current && settings.alwaysListening) {
          return;
        }
      }

      if (voiceConversation || settings.alwaysListening) {
        transcriptBuffer.current = text;
        scheduleSilenceCommit();
        return;
      }

      onInterimTranscript(text);
      onTranscriptCommit(text);
    },
    [
      onInterimTranscript,
      onTranscriptCommit,
      scheduleSilenceCommit,
      settings.alwaysListening,
      settings.wakeWordEnabled,
      voiceConversation,
    ],
  );

  useEffect(() => {
    if (!speechSupported || !passiveListening) return;
    if (!settings.alwaysListening && !settings.wakeWordEnabled) return;

    const onVisibility = () => {
      if (document.hidden) {
        stopListening();
      } else if (settings.alwaysListening || settings.wakeWordEnabled) {
        startListening(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (settings.alwaysListening || settings.wakeWordEnabled) {
      startListening(true);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopListening();
      clearSilenceTimer();
    };
  }, [
    clearSilenceTimer,
    passiveListening,
    settings.alwaysListening,
    settings.wakeWordEnabled,
    speechSupported,
    startListening,
    stopListening,
  ]);

  const markSpeaking = useCallback(() => setSpeaking(true), []);
  const markIdle = useCallback(() => setSpeaking(false), []);

  const startVoiceChat = useCallback(() => {
    onStartVoiceConversation();
    wakeArmed.current = settings.wakeWordEnabled;
    startListening(true);
  }, [onStartVoiceConversation, settings.wakeWordEnabled, startListening]);

  const stopVoiceChat = useCallback(() => {
    onStopVoiceConversation();
    wakeArmed.current = false;
    transcriptBuffer.current = "";
    clearSilenceTimer();
    stopListening();
    setSpeaking(false);
  }, [
    clearSilenceTimer,
    onStopVoiceConversation,
    stopListening,
  ]);

  return {
    phase,
    handleInterim,
    handleFinal,
    startVoiceChat,
    stopVoiceChat,
    markSpeaking,
    markIdle,
  };
}
