import { useEffect, useRef, useState } from "react";
import { createChatService, type ChatMessage } from "../lib/chat";
import { blobToBase64, captureFrameAsJpeg } from "../lib/imageEncoding";
import {
  getApiKey,
  hasApiKeyForProvider,
  type Settings,
} from "../lib/settings";

interface ChatPanelProps {
  settings: Settings;
  getCurrentFrame: () => HTMLVideoElement | null;
  onClose: () => void;
}

export function ChatPanel({
  settings,
  getCurrentFrame,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachFrame, setAttachFrame] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages, isSending]);

  const send = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    if (!hasApiKeyForProvider(settings)) {
      setError("Add API key in Settings.");
      return;
    }

    setError("");
    setIsSending(true);

    let attachedImageBase64: string | undefined;
    let attachedImageBytes: number | undefined;
    if (attachFrame) {
      const video = getCurrentFrame();
      if (video && video.readyState >= 2) {
        const blob = await captureFrameAsJpeg(video, {
          maxWidth: 512,
          quality: 0.6,
        });
        attachedImageBytes = blob.size;
        attachedImageBase64 = await blobToBase64(blob);
      }
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      attachedImageBytes,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    try {
      const service = createChatService(settings.provider, getApiKey(settings));
      const reply = await service.chat(nextMessages, attachedImageBase64);
      setMessages([
        ...nextMessages,
        { id: crypto.randomUUID(), role: "assistant", text: reply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-overlay" role="dialog" aria-label="Chat">
      <div className="chat-panel">
        <header className="chat-panel__header">
          <h3>Chat</h3>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {error && <p className="chat-panel__error">{error}</p>}

        <div className="chat-panel__messages" ref={listRef}>
          {messages.length === 0 && (
            <p className="footnote">Ask about what the camera sees.</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble chat-bubble--${msg.role}`}
            >
              <p>{msg.text}</p>
              {msg.attachedImageBytes != null && (
                <span className="chat-bubble__meta">
                  Attached frame ({msg.attachedImageBytes} bytes)
                </span>
              )}
            </div>
          ))}
          {isSending && <p className="chat-panel__thinking">Thinking…</p>}
        </div>

        <label className="chat-panel__attach">
          <input
            type="checkbox"
            checked={attachFrame}
            onChange={(e) => setAttachFrame(e.target.checked)}
          />
          Attach current frame
        </label>

        <div className="chat-panel__composer">
          <input
            type="text"
            value={input}
            placeholder="Message…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <button
            type="button"
            className="btn btn--primary"
            disabled={isSending || !input.trim()}
            onClick={() => void send()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
