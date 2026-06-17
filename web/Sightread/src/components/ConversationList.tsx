import { useState } from "react";
import {
  deleteConversation,
  exportConversationJson,
  exportConversationMarkdown,
  exportConversationPdf,
} from "../lib/storage";
import type { StoredConversation } from "../lib/storage/types";

interface ConversationListProps {
  conversations: StoredConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onChanged: () => void;
  onClose: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onChanged,
  onClose,
}: ConversationListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const runExport = async (
    conversation: StoredConversation,
    format: "json" | "md" | "pdf",
  ) => {
    setBusyId(conversation.id);
    try {
      if (format === "json") await exportConversationJson(conversation);
      else if (format === "md") await exportConversationMarkdown(conversation);
      else await exportConversationPdf(conversation);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="conversation-drawer" role="dialog" aria-label="Chat history">
      <div className="conversation-drawer__panel">
        <header className="conversation-drawer__header">
          <h3>Chats</h3>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <button type="button" className="btn btn--primary conversation-drawer__new" onClick={onNew}>
          New chat
        </button>

        <ul className="conversation-list">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className={`conversation-list__item ${activeId === conversation.id ? "conversation-list__item--active" : ""}`}
            >
              <button
                type="button"
                className="conversation-list__select"
                onClick={() => onSelect(conversation.id)}
              >
                <strong>{conversation.title}</strong>
                <span>{new Date(conversation.updatedAt).toLocaleString()}</span>
              </button>
              <div className="conversation-list__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--compact"
                  disabled={busyId === conversation.id}
                  onClick={() => void runExport(conversation, "json")}
                >
                  JSON
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--compact"
                  disabled={busyId === conversation.id}
                  onClick={() => void runExport(conversation, "md")}
                >
                  MD
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--compact"
                  disabled={busyId === conversation.id}
                  onClick={() => void runExport(conversation, "pdf")}
                >
                  PDF
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--compact"
                  onClick={async () => {
                    await deleteConversation(conversation.id);
                    onChanged();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {conversations.length === 0 && (
          <p className="footnote">No saved chats yet.</p>
        )}
      </div>
    </div>
  );
}
