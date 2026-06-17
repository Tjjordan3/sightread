import { useEffect, useRef } from "react";
import { useAgentChat } from "../hooks/useAgentChat";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import type { Settings } from "../lib/settings";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";

export interface AgentChatViewProps {
  settings: Settings;
  getCurrentFrame?: () => HTMLVideoElement | null;
  showLiveFrameOption?: boolean;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export function AgentChatView({
  settings,
  getCurrentFrame,
  showLiveFrameOption = false,
  onClose,
  title = "Sightread Agent",
  className = "",
}: AgentChatViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const voiceConversationRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});

  const chat = useAgentChat({
    settings,
    getCurrentFrame,
    onReplySpoken: () => {
      if (voiceConversationRef.current) {
        startListeningRef.current();
      }
    },
  });

  const speech = useSpeechRecognition({
    onInterimTranscript: (text) => chat.setInput(text),
    onFinalTranscript: (text) => {
      chat.setInput(text);
      if (voiceConversationRef.current) {
        void chat.sendMessage(text);
      }
    },
  });

  useEffect(() => {
    startListeningRef.current = () => speech.start();
  });

  useEffect(() => {
    voiceConversationRef.current = chat.voiceConversation;
  }, [chat.voiceConversation]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [chat.messages, chat.isSending]);

  const handleMicPress = () => {
    if (speech.status === "listening") speech.stop();
    else speech.start();
  };

  const handleStartVoiceConversation = () => {
    chat.startVoiceConversation();
    voiceConversationRef.current = true;
    speech.start();
  };

  const handleStopVoiceConversation = () => {
    chat.stopVoiceConversation();
    voiceConversationRef.current = false;
    speech.stop();
  };

  const handleSend = () => {
    if (speech.status === "listening") speech.stop();
    void chat.sendMessage();
  };

  const error = chat.error || speech.error;

  return (
    <div className={`agent-chat ${className}`.trim()}>
      <header className="agent-chat__header">
        <div>
          <h2>{title}</h2>
          <p className="agent-chat__subtitle">
            Chat, photos, and voice — your browser-based AI agent
          </p>
        </div>
        {onClose && (
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        )}
      </header>

      {error && <p className="chat-panel__error">{error}</p>}

      <ChatMessageList
        messages={chat.messages}
        isSending={chat.isSending}
        listRef={listRef}
        emptyHint="Try: “What can you help me with?” or send a photo of what's in front of you."
      />

      <ChatComposer
        input={chat.input}
        onInputChange={chat.setInput}
        onSend={handleSend}
        isSending={chat.isSending}
        pendingAttachment={chat.pendingAttachment}
        onClearAttachment={chat.clearAttachment}
        onAttachFile={(file) => void chat.attachFile(file)}
        attachLiveFrame={chat.attachLiveFrame}
        onAttachLiveFrameChange={chat.setAttachLiveFrame}
        showLiveFrameOption={showLiveFrameOption}
        speechStatus={speech.status}
        onMicPress={handleMicPress}
        voiceConversation={chat.voiceConversation}
        onStartVoiceConversation={handleStartVoiceConversation}
        onStopVoiceConversation={handleStopVoiceConversation}
        speechSupported={speech.isSupported}
      />
    </div>
  );
}
