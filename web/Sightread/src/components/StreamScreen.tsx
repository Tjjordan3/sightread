import { useEffect, useRef, useState } from "react";
import { useAIAnalysis } from "../hooks/useAIAnalysis";
import { useSceneExtraction } from "../hooks/useSceneExtraction";
import { useWebcam } from "../hooks/useSettings";
import { speakAccessible, unlockAccessibleSpeech } from "../lib/audio/tts";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import { getVisionPrompt, type Settings } from "../lib/settings";
import { createVisionService } from "../lib/vision";
import type { VisionDiscussHandoff, VisionDiscussMode } from "../lib/visionDiscuss";
import { AIResponsePanel } from "./AIResponsePanel";
import { ChatPanel } from "./ChatPanel";

interface StreamScreenProps {
  settings: Settings;
  onOpenSettings: () => void;
  onDiscussInAgent: (handoff: VisionDiscussHandoff) => void;
}

export function StreamScreen({
  settings,
  onOpenSettings,
  onDiscussInAgent,
}: StreamScreenProps) {
  const { videoRef, status, error, start, stop } = useWebcam();
  const {
    state,
    processFrame,
    analyzeNow,
    replayLatest,
    findSources,
    getDiscussSnapshot,
    applyExternalResult,
    reset,
  } = useAIAnalysis(settings);
  const sceneExtraction = useSceneExtraction(settings, {
    enabled: settings.sceneExtractionEnabled,
  });
  const {
    processFrame: processSceneFrame,
    extractNow: extractSceneNow,
    reset: resetScene,
    scene: latestScene,
    extracting: sceneExtracting,
    error: sceneError,
  } = sceneExtraction;
  const [showChat, setShowChat] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const uploadGenerationRef = useRef(0);

  useEffect(() => {
    void start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      reset();
      resetScene();
      stop();
    };
  }, [reset, resetScene, start, stop]);

  useEffect(() => {
    const tick = () => {
      processFrame(videoRef.current);
      processSceneFrame(videoRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (status === "live") {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [processFrame, processSceneFrame, status, videoRef]);

  const handleStop = () => {
    reset();
    resetScene();
    stop();
  };

  const handleReadAloud = () => {
    unlockAccessibleSpeech();
    void replayLatest();
  };

  const handleUpload = async (file: File) => {
    unlockAccessibleSpeech();
    const generation = ++uploadGenerationRef.current;
    setUploadError("");
    setUploading(true);
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image."));
        img.src = url;
      });
      const blob = await captureFrameAsJpeg(img, {
        maxWidth: 768,
        quality: 0.75,
      });
      URL.revokeObjectURL(url);
      if (generation !== uploadGenerationRef.current) return;

      const base64 = await blobToBase64(blob);
      const service = createVisionService(settings);
      const visionPrompt = getVisionPrompt(settings);
      const result = await service.analyze(base64, visionPrompt.prompt);
      if (generation !== uploadGenerationRef.current) return;

      applyExternalResult(result, blob, `${visionPrompt.title} (upload)`);
      if (settings.isTTSEnabled) {
        void speakAccessible(result, {
          force: true,
          spatialAudioEnabled: settings.spatialAudioEnabled,
        });
      }
    } catch (err) {
      if (generation !== uploadGenerationRef.current) return;
      setUploadError(
        err instanceof Error ? err.message : "Image analysis failed.",
      );
    } finally {
      if (generation === uploadGenerationRef.current) {
        setUploading(false);
      }
    }
  };

  const handleDiscuss = (mode: VisionDiscussMode) => {
    const snapshot = getDiscussSnapshot();
    if (!snapshot) return;
    onDiscussInAgent({
      description: snapshot.description,
      blob: snapshot.blob,
      mode,
    });
  };

  return (
    <div className="stream-screen">
      <video
        ref={videoRef}
        className="stream-screen__video"
        playsInline
        muted
        autoPlay
      />

      {status === "starting" && (
        <div className="stream-screen__overlay">
          <p>Starting camera…</p>
        </div>
      )}

      {(error || uploadError) && (
        <div className="stream-screen__banner stream-screen__banner--error">
          {error || uploadError}
        </div>
      )}

      <div className="stream-screen__chrome">
        <div className="stream-screen__top">
          <span className="stream-screen__label">Vision View</span>
          <div className="stream-screen__actions">
            <button
              type="button"
              className="icon-button"
              disabled={uploading}
              onClick={() => {
                unlockAccessibleSpeech();
                fileInputRef.current?.click();
              }}
              aria-label="Upload photo"
            >
              🖼
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowChat(true)}
              aria-label="Chat"
            >
              💬
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              ⚙
            </button>
          </div>
        </div>

        {status === "live" && settings.sceneExtractionEnabled && (
          <div
            className="stream-screen__banner"
            aria-live="polite"
            style={{ opacity: 0.92 }}
          >
            {sceneExtracting
              ? "Scene JSON: extracting…"
              : latestScene
                ? `Scene JSON: ${latestScene.summary.slice(0, 120)}${
                    latestScene.summary.length > 120 ? "…" : ""
                  }`
                : sceneError
                  ? `Scene JSON error: ${sceneError}`
                  : "Scene JSON: waiting for first frame…"}
          </div>
        )}

        {status === "live" && (
          <AIResponsePanel
            aiState={state}
            promptTitle={getVisionPrompt(settings).title}
            ttsEnabled={settings.isTTSEnabled}
            manualOnly={settings.visionManualOnly}
            webSearchEnabled={settings.webSearchEnabled}
            citations={state.latestCitations}
            sourcesLoading={state.sourcesLoading}
            sourcesError={state.sourcesError}
            canDiscuss={state.latestResponse.length > 0}
            onReadAloud={settings.isTTSEnabled ? handleReadAloud : undefined}
            onFindSources={() => void findSources()}
            onDiscuss={handleDiscuss}
          />
        )}

        <div className="stream-screen__bottom">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={status !== "live" || uploading}
            onClick={() => {
              unlockAccessibleSpeech();
              analyzeNow(videoRef.current);
              if (videoRef.current && settings.sceneExtractionEnabled) {
                void extractSceneNow(videoRef.current);
              }
            }}
          >
            Analyze now
          </button>
          <button type="button" className="btn btn--danger" onClick={handleStop}>
            Stop
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      {showChat && (
        <ChatPanel
          settings={settings}
          getCurrentFrame={() => videoRef.current}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
