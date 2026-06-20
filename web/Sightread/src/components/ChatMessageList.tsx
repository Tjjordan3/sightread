import type { RefObject } from "react";
import type { ChatMessage } from "../lib/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  webSearchEnabled?: boolean;
  listRef?: RefObject<HTMLDivElement | null>;
  emptyHint?: string;
}

export function ChatMessageList({
  messages,
  isSending,
  webSearchEnabled = false,
  listRef,
  emptyHint,
}: ChatMessageListProps) {
  const showWelcomeOnly =
    messages.length === 1 && messages[0]?.id === "welcome";

  const renderAvatar = (role: ChatMessage["role"]) => (
    <span className="chat-message__avatar" aria-hidden>
      {role === "user" ? "U" : "A"}
    </span>
  );

  const renderTypingIndicator = (label: string) => (
    <div className="chat-message chat-message--assistant">
      {renderAvatar("assistant")}
      <div
        className="chat-bubble chat-bubble--assistant chat-bubble--typing"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <span className="typing-indicator" aria-hidden>
          <span className="typing-indicator__dot" />
          <span className="typing-indicator__dot" />
          <span className="typing-indicator__dot" />
        </span>
      </div>
    </div>
  );

  return (
    <div className="chat-message-list" ref={listRef}>
      {showWelcomeOnly && emptyHint && (
        <p className="chat-message-list__hint">{emptyHint}</p>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
          {msg.role === "assistant" && renderAvatar(msg.role)}
          <div className={`chat-bubble chat-bubble--${msg.role}`}>
            {msg.imagePreviewUrl && (
              <img
                src={msg.imagePreviewUrl}
                alt="Attached"
                className="chat-bubble__image"
              />
            )}
            <p>{msg.text}</p>
            {msg.citations && msg.citations.length > 0 && (
              <ul className="chat-bubble__citations">
                {msg.citations.map((cite) => (
                  <li key={cite.url}>
                    <a href={cite.url} target="_blank" rel="noopener noreferrer">
                      {cite.title || cite.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {msg.role === "user" && renderAvatar(msg.role)}
        </div>
      ))}
      {isSending &&
        renderTypingIndicator(
          webSearchEnabled ? "Searching the web" : "Thinking",
        )}
    </div>
  );
}
