import { useState } from "react";
import { useConversationSession } from "../hooks/useConversationSession";
import type { Settings } from "../lib/settings";
import { AgentChatView } from "./AgentChatView";
import { ConversationList } from "./ConversationList";

interface AgentChatScreenProps {
  settings: Settings;
}

export function AgentChatScreen({ settings }: AgentChatScreenProps) {
  const session = useConversationSession();
  const [showHistory, setShowHistory] = useState(false);

  if (!session.ready) {
    return (
      <div className="screen agent-chat-screen agent-chat-screen--loading">
        <p>Loading conversations…</p>
      </div>
    );
  }

  return (
    <div className="screen agent-chat-screen">
      {session.storageError && (
        <p className="storage-banner">{session.storageError}</p>
      )}

      {showHistory && (
        <ConversationList
          conversations={session.conversations}
          activeId={session.activeConversation?.id ?? null}
          onSelect={async (id) => {
            await session.switchConversation(id);
            setShowHistory(false);
          }}
          onNew={async () => {
            await session.startNewConversation();
            setShowHistory(false);
          }}
          onChanged={async () => {
            const list = await session.reloadConversations();
            const activeId = session.activeConversation?.id;
            if (activeId && !list.some((c) => c.id === activeId)) {
              await session.startNewConversation();
            }
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      <AgentChatView
        key={session.activeConversation?.id ?? "default"}
        settings={settings}
        initialMessages={session.initialMessages}
        onUserMessage={session.persistUserMessage}
        onAssistantMessage={session.persistAssistantMessage}
        onOpenHistory={() => setShowHistory(true)}
        title={session.activeConversation?.title ?? "Sightread Agent"}
      />
    </div>
  );
}
