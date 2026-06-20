import { useEffect, useRef, useState } from "react";
import type { AIUiState } from "../hooks/useAIAnalysis";
import type { SourceLinkItem } from "./SourceLinks";
import { SourceLinks } from "./SourceLinks";
import { VisionDiscussButton } from "./VisionDiscussButton";
import type { VisionDiscussMode } from "../lib/visionDiscuss";

interface AIResponsePanelProps {
  aiState: AIUiState;
  promptTitle: string;
  ttsEnabled: boolean;
  manualOnly?: boolean;
  webSearchEnabled?: boolean;
  citations?: SourceLinkItem[];
  sourcesLoading?: boolean;
  sourcesError?: string;
  canDiscuss?: boolean;
  onReadAloud?: () => void;
  onFindSources?: () => void;
  onDiscuss?: (mode: VisionDiscussMode) => void;
}

export function AIResponsePanel({
  aiState,
  promptTitle,
  ttsEnabled,
  manualOnly = false,
  webSearchEnabled = false,
  citations = [],
  sourcesLoading = false,
  sourcesError = "",
  canDiscuss = false,
  onReadAloud,
  onFindSources,
  onDiscuss,
}: AIResponsePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const canReadAloud =
    ttsEnabled && aiState.latestResponse && onReadAloud != null;

  const showFindSources =
    webSearchEnabled &&
    aiState.latestResponse.length > 0 &&
    onFindSources != null;

  const idleText =
    aiState.latestResponse ||
    (manualOnly
      ? "Tap Analyze now when you're ready."
      : "Waiting for frames…");

  useEffect(() => {
    setExpanded(false);
  }, [aiState.latestResponse]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const check = () => {
      const scrollable = el.scrollHeight > el.clientHeight + 2;
      const longText = aiState.latestResponse.length > 200;
      setCanExpand(scrollable || longText);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [aiState.latestResponse, citations.length, expanded]);

  return (
    <section
      className={`ai-panel ai-panel--frosted ${expanded ? "ai-panel--expanded" : ""}`}
      aria-live="polite"
    >
      <div className="ai-panel__header">
        <strong>Sightread AI</strong>
        <div className="ai-panel__header-actions">
          {canExpand && (
            <button
              type="button"
              className="btn btn--ghost btn--compact ai-panel__expand-btn"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          <span className="ai-panel__status">
            {aiState.analysisState === "running" && "…"}
            {aiState.analysisState === "error" && "!"}
            {aiState.analysisState === "idle" && "●"}
          </span>
        </div>
      </div>

      <div ref={bodyRef} className="ai-panel__body">
        {aiState.analysisState === "error" ? (
          <p className="ai-panel__error">{aiState.errorMessage}</p>
        ) : (
          <p className="ai-panel__text">{idleText}</p>
        )}
        {citations.length > 0 && (
          <SourceLinks sources={citations} variant="vision" showSnippets />
        )}
        {sourcesError && (
          <p className="ai-panel__error ai-panel__sources-error">{sourcesError}</p>
        )}
      </div>

      <p className="ai-panel__meta">
        {promptTitle}
        {ttsEnabled ? " · TTS on" : ""}
        {aiState.ttsNeedsTap ? " · Tap Hear to listen" : ""}
      </p>

      {(canReadAloud || canDiscuss || showFindSources) && (
        <div className="ai-panel__actions">
          {showFindSources && (
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              disabled={sourcesLoading || aiState.analysisState === "running"}
              onClick={onFindSources}
            >
              {sourcesLoading ? "Searching…" : "Find sources"}
            </button>
          )}
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
