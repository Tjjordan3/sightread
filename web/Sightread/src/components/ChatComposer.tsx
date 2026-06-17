import { useRef, type ClipboardEvent } from "react";
import type { PendingAttachment } from "../hooks/useAgentChat";
import type { SpeechRecognitionStatus } from "../hooks/useSpeechRecognition";

interface ChatComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  pendingAttachment: PendingAttachment | null;
  onClearAttachment: () => void;
  onAttachFile: (file: File) => void;
  attachLiveFrame?: boolean;
  onAttachLiveFrameChange?: (value: boolean) => void;
  showLiveFrameOption?: boolean;
  speechStatus: SpeechRecognitionStatus;
  onMicPress: () => void;
  voiceConversation: boolean;
  onStartVoiceConversation: () => void;
  onStopVoiceConversation: () => void;
  speechSupported: boolean;
  wakeWordHint?: string;
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  isSending,
  pendingAttachment,
  onClearAttachment,
  onAttachFile,
  attachLiveFrame = false,
  onAttachLiveFrameChange,
  showLiveFrameOption = false,
  speechStatus,
  onMicPress,
  voiceConversation,
  onStartVoiceConversation,
  onStopVoiceConversation: _onStopVoiceConversation,
  speechSupported,
  wakeWordHint,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    !isSending && (input.trim().length > 0 || pendingAttachment != null || attachLiveFrame);

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      onAttachFile(file);
      return;
    }
  };

  return (
    <div className="chat-composer">
      {pendingAttachment && (
        <div className="chat-composer__preview">
          <img src={pendingAttachment.previewUrl} alt="Pending attachment" />
          <button
            type="button"
            className="chat-composer__remove"
            onClick={onClearAttachment}
            aria-label="Remove attachment"
          >
            ×
          </button>
        </div>
      )}

      {showLiveFrameOption && onAttachLiveFrameChange && (
        <label className="chat-panel__attach">
          <input
            type="checkbox"
            checked={attachLiveFrame}
            onChange={(e) => onAttachLiveFrameChange(e.target.checked)}
          />
          Attach live camera frame
        </label>
      )}

      {wakeWordHint && !voiceConversation && (
        <p className="footnote chat-composer__wake-hint">
          Wake phrase: “{wakeWordHint}”
        </p>
      )}

      <div className="chat-composer__toolbar">
        <button
          type="button"
          className="icon-button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photo"
        >
          🖼
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Take photo"
        >
          📷
        </button>
        {speechSupported && (
          <button
            type="button"
            className={`icon-button ${speechStatus === "listening" ? "icon-button--active" : ""}`}
            onClick={onMicPress}
            aria-label="Voice input"
          >
            🎤
          </button>
        )}
        {speechSupported && !voiceConversation && (
          <button
            type="button"
            className="btn btn--secondary btn--compact"
            onClick={onStartVoiceConversation}
          >
            Voice chat
          </button>
        )}
      </div>

      <div className="chat-panel__composer">
        <input
          type="text"
          value={input}
          placeholder={
            speechStatus === "listening"
              ? "Listening…"
              : "Message your agent… (paste images)"
          }
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSend();
          }}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canSend}
          onClick={onSend}
        >
          Send
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttachFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttachFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
