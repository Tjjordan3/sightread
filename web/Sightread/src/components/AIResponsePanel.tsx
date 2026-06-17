import type { AIUiState } from "../hooks/useAIAnalysis";

interface AIResponsePanelProps {
  aiState: AIUiState;
  promptTitle: string;
  ttsEnabled: boolean;
  onReadAloud?: () => void;
}

export function AIResponsePanel({
  aiState,
  promptTitle,
  ttsEnabled,
  onReadAloud,
}: AIResponsePanelProps) {
  const canReadAloud =
    ttsEnabled && aiState.latestResponse && onReadAloud != null;

  return (
    <section
      className={`ai-panel ${canReadAloud ? "ai-panel--speakable" : ""}`}
      aria-live="polite"
      onClick={canReadAloud ? onReadAloud : undefined}
      onKeyDown={
        canReadAloud
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onReadAloud?.();
              }
            }
          : undefined
      }
      role={canReadAloud ? "button" : undefined}
      tabIndex={canReadAloud ? 0 : undefined}
    >
      <div className="ai-panel__header">
        <strong>Sightread AI</strong>
        <span className="ai-panel__status">
          {aiState.analysisState === "running" && "…"}
          {aiState.analysisState === "error" && "!"}
          {aiState.analysisState === "idle" && "●"}
        </span>
      </div>
      {aiState.analysisState === "error" ? (
        <p className="ai-panel__error">{aiState.errorMessage}</p>
      ) : (
        <p className="ai-panel__text">
          {aiState.latestResponse || "Waiting for frames…"}
        </p>
      )}
      <p className="ai-panel__meta">
        {promptTitle}
        {ttsEnabled ? " · TTS on" : ""}
        {aiState.ttsNeedsTap ? " · Tap panel to hear" : ""}
        {canReadAloud && !aiState.ttsNeedsTap ? " · Tap to replay" : ""}
      </p>
    </section>
  );
}
