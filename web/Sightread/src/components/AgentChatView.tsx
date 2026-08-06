import { useEffect, useRef, type ReactNode } from "react";
import { useAgentChat, WELCOME_MESSAGE } from "../hooks/useAgentChat";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useVoiceSession } from "../hooks/useVoiceSession";
import type { ChatMessage } from "../lib/chat";
import type { Settings } from "../lib/settings";
import { warmUpSpeech } from "../lib/speech";
import { WAKE_PHRASE } from "../lib/voice/wakeWord";
import type { ComposerSeed } from "./AgentChatScreen";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";

export interface AgentChatViewProps {
  settings: Settings;
  conversationId?: string | null;
  initialMessages?: ChatMessage[];
  getCurrentFrame?: () => HTMLVideoElement | null;
  showLiveFrameOption?: boolean;
  onClose?: () => void;
  onUserMessage?: (
    message: ChatMessage,
    imageBlob?: Blob,
    conversationId?: string,
  ) => void | Promise<void>;
  onAssistantMessage?: (
    message: ChatMessage,
    conversationId?: string,
  ) => void | Promise<void>;
  /** Auto-seed composer when opening from Vision Discuss. */
  composerSeed?: ComposerSeed | null;
  onOpenHistory?: () => void;
  title?: string;
  className?: string;
  /** Auto-start mic for wake phrase / always listening. Off for vision quick-chat overlay. */
  passiveListening?: boolean;
  showBrandedHeader?: boolean;
  brandedHeader?: ReactNode;
}

export function AgentChatView({
  settings,
  conversationId = null,
  initialMessages = [WELCOME_MESSAGE],
  getCurrentFrame,
  showLiveFrameOption = false,
  onClose,
  onUserMessage,
  onAssistantMessage,
  onOpenHistory,
  composerSeed = null,
  title = "Sightread Agent",
  className = "",
  passiveListening = false,
  showBrandedHeader = false,
  brandedHeader = null,
}: AgentChatViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const voiceConversationRef = useRef(false);
  const startListeningRef = useRef<(continuous?: boolean) => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});
  const pauseListeningRef = useRef<() => void>(() => {});
  const resumeListeningRef = useRef<() => void>(() => {});
  const voiceHandlersRef = useRef({
    onInterim: (text: string) => { void text; },
    onFinal: (text: string) => { void text; },
    markSpeaking: () => {},
    markIdle: () => {},
    startVoiceChat: () => {},
    stopVoiceChat: () => {},
  });

  const speech = useSpeechRecognition({
    continuous: settings.alwaysListening || settings.wakeWordEnabled,
    autoRestart: settings.alwaysListening || settings.wakeWordEnabled,
    onInterimTranscript: (text) => voiceHandlersRef.current.onInterim(text),
    onFinalTranscript: (text) => voiceHandlersRef.current.onFinal(text),
  });

  const chat = useAgentChat({
    settings,
    conversationId,
    getCurrentFrame,
    initialMessages,
    onUserMessage,
    onAssistantMessage,
    onBeforeSpeak: () => {
      pauseListeningRef.current();
      voiceHandlersRef.current.markSpeaking();
    },
    onAfterSpeak: () => {
      voiceHandlersRef.current.markIdle();
    },
    onReplySpoken: () => {
      if (!voiceConversationRef.current && !passiveListening) return;
      window.setTimeout(() => {
        if (voiceConversationRef.current || passiveListening) {
          resumeListeningRef.current();
        }
      }, 800);
    },
  });

  useEffect(() => {
    startListeningRef.current = (continuous = false) => speech.start(continuous);
    stopListeningRef.current = () => speech.stop();
    pauseListeningRef.current = () => speech.pause();
    resumeListeningRef.current = () => speech.resume();
  }, [speech]);

  useEffect(() => {
    if (!composerSeed) return;
    chat.seedComposer(composerSeed.text, composerSeed.blob);
  }, [composerSeed]);

  const voice = useVoiceSession({
    settings,
    speechSupported: speech.isSupported,
    passiveListening,
    isSending: chat.isSending,
    voiceConversation: chat.voiceConversation,
    onStartVoiceConversation: chat.startVoiceConversation,
    onStopVoiceConversation: chat.stopVoiceConversation,
    onTranscriptCommit: (text) => {
      if (!text.trim()) return;
      void chat.sendMessage(text);
    },
    onInterimTranscript: (text) => chat.setInput(text),
    startListening: (continuous) => speech.start(continuous),
    stopListening: () => speech.stop(),
    isListening: speech.status === "listening",
  });

  useEffect(() => {
    voiceHandlersRef.current.onInterim = voice.handleInterim;
    voiceHandlersRef.current.onFinal = voice.handleFinal;
    voiceHandlersRef.current.markSpeaking = voice.markSpeaking;
    voiceHandlersRef.current.markIdle = voice.markIdle;
    voiceHandlersRef.current.startVoiceChat = voice.startVoiceChat;
    voiceHandlersRef.current.stopVoiceChat = voice.stopVoiceChat;
  }, [voice]);

  useEffect(() => {
    voiceConversationRef.current = chat.voiceConversation;
  }, [chat.voiceConversation]);

  useEffect(() => {
    if (chat.isSending) {
      if (chat.voiceConversation || passiveListening) {
        pauseListeningRef.current();
      }
      return;
    }
    if (passiveListening && !chat.voiceConversation) {
      window.setTimeout(() => resumeListeningRef.current(), 400);
    }
  }, [chat.isSending, chat.voiceConversation, passiveListening]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [chat.messages, chat.isSending]);

  const handleMicPress = () => {
    warmUpSpeech();
    if (speech.status === "listening") speech.stop();
    else speech.start(false);
  };

  const handleSend = () => {
    if (speech.status === "listening") speech.stop();
    void chat.sendMessage();
  };

  const error = chat.error || speech.error;
  const voiceLabel =
    voice.phase === "listening"
      ? "Listening"
      : voice.phase === "processing"
        ? "Thinking"
        : voice.phase === "speaking"
          ? "Speaking"
          : passiveListening && settings.wakeWordEnabled
            ? `Say “${WAKE_PHRASE}”`
            : null;

  return (
    <div className={`agent-chat ${className}`.trim()}>
      <header className="agent-chat__header">
        <div>
          <h2>{title}</h2>
          <p className="agent-chat__subtitle">
            Chat, photos, and voice — your browser-based AI agent
          </p>
        </div>
        <div className="agent-chat__header-actions">
          {onOpenHistory && (
            <button type="button" className="btn btn--ghost" onClick={onOpenHistory}>
              History
            </button>
          )}
          {onClose && (
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </header>

      {voiceLabel && (
        <div className={`voice-status voice-status--${voice.phase}`} role="status">
          <span>{voiceLabel}</span>
          {chat.voiceConversation && (
            <button
              type="button"
              className="btn btn--ghost btn--compact"
              onClick={() => voiceHandlersRef.current.stopVoiceChat()}
            >
              Stop
            </button>
          )}
        </div>
      )}

      {error && <p className="chat-panel__error">{error}</p>}

      {showBrandedHeader && brandedHeader}

      <ChatMessageList
        messages={chat.messages}
        isSending={chat.isSending}
        webSearchEnabled={settings.webSearchEnabled}
        listRef={listRef}
        emptyHint={
          showBrandedHeader
            ? undefined
            : "Try: “What can you help me with?” or send a photo of what's in front of you."
        }
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
        onStartVoiceConversation={() => {
          warmUpSpeech();
          voiceHandlersRef.current.startVoiceChat();
        }}
        onStopVoiceConversation={() => voiceHandlersRef.current.stopVoiceChat()}
        speechSupported={speech.isSupported}
        wakeWordHint={settings.wakeWordEnabled ? WAKE_PHRASE : undefined}
      />
    </div>
  );
}
