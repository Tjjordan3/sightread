import type { RefObject } from "react";
import type { ChatMessage } from "../lib/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  listRef?: RefObject<HTMLDivElement | null>;
  emptyHint?: string;
}

export function ChatMessageList({
  messages,
  isSending,
  listRef,
  emptyHint,
}: ChatMessageListProps) {
  const showWelcomeOnly =
    messages.length === 1 && messages[0]?.id === "welcome";

  return (
    <div className="chat-message-list" ref={listRef}>
      {showWelcomeOnly && emptyHint && (
        <p className="chat-message-list__hint">{emptyHint}</p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`chat-bubble chat-bubble--${msg.role}`}
        >
          {msg.imagePreviewUrl && (
            <img
              src={msg.imagePreviewUrl}
              alt="Attached"
              className="chat-bubble__image"
            />
          )}
          <p>{msg.text}</p>
        </div>
      ))}
      {isSending && <p className="chat-panel__thinking">Thinking…</p>}
    </div>
  );
}
