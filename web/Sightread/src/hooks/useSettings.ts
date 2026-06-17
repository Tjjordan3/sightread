import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadSettings,
  saveSettings,
  type Settings,
} from "../lib/settings";

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, setSettings, updateSettings };
}

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setStatus("starting");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("live");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not access camera. Check browser permissions.",
      );
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, status, error, start, stop };
}
