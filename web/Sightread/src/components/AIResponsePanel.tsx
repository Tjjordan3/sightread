import type { AIUiState } from "../hooks/useAIAnalysis";

interface AIResponsePanelProps {
  aiState: AIUiState;
  promptTitle: string;
  ttsEnabled: boolean;
}

export function AIResponsePanel({
  aiState,
  promptTitle,
  ttsEnabled,
}: AIResponsePanelProps) {
  return (
    <section className="ai-panel" aria-live="polite">
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
      </p>
    </section>
  );
}
