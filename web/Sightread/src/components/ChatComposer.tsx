import { useRef } from "react";
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
  onStopVoiceConversation,
  speechSupported,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    !isSending && (input.trim().length > 0 || pendingAttachment != null || attachLiveFrame);

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

      {voiceConversation && (
        <div className="chat-composer__voice-banner">
          <span>Voice conversation active — speak, then pause to send</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onStopVoiceConversation}
          >
            Stop
          </button>
        </div>
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
            speechStatus === "listening" ? "Listening…" : "Message your agent…"
          }
          onChange={(e) => onInputChange(e.target.value)}
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
