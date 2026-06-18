import type { AIUiState } from "../hooks/useAIAnalysis";
import { VisionDiscussButton } from "./VisionDiscussButton";
import type { VisionDiscussMode } from "../lib/visionDiscuss";

interface AIResponsePanelProps {
  aiState: AIUiState;
  promptTitle: string;
  ttsEnabled: boolean;
  canDiscuss?: boolean;
  onReadAloud?: () => void;
  onDiscuss?: (mode: VisionDiscussMode) => void;
}

export function AIResponsePanel({
  aiState,
  promptTitle,
  ttsEnabled,
  canDiscuss = false,
  onReadAloud,
  onDiscuss,
}: AIResponsePanelProps) {
  const canReadAloud =
    ttsEnabled && aiState.latestResponse && onReadAloud != null;

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
        {aiState.ttsNeedsTap ? " · Tap Hear to listen" : ""}
      </p>
      {(canReadAloud || canDiscuss) && (
        <div className="ai-panel__actions">
          {canReadAloud && (
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={onReadAloud}
            >
              Hear
            </button>
          )}
          {canDiscuss && onDiscuss && (
            <VisionDiscussButton
              disabled={!aiState.latestResponse}
              onDiscuss={onDiscuss}
            />
          )}
        </div>
      )}
    </section>
  );
}
