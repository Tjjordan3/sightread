import { useEffect, useState } from "react";
import { useConversationSession } from "../hooks/useConversationSession";
import { hasOnboarded, markOnboarded } from "../lib/onboarding";
import { hasApiKeyForProvider, type Settings } from "../lib/settings";
import type { VisionDiscussHandoff } from "../lib/visionDiscuss";
import { AgentChatView } from "./AgentChatView";
import { ChatOnboardingOverlay } from "./ChatOnboardingOverlay";
import { ConversationList } from "./ConversationList";

export interface ComposerSeed {
  id: number;
  text: string;
  blob: Blob;
}

interface AgentChatScreenProps {
  settings: Settings;
  discussHandoff?: VisionDiscussHandoff | null;
  onDiscussHandoffConsumed?: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  onOpenSettings: () => void;
}

function buildDiscussSeedText(description: string): string {
  return `Here's what Sightread vision detected:\n\n${description}\n\nWhat would you like to know about this?`;
}

export function AgentChatScreen({
  settings,
  discussHandoff = null,
  onDiscussHandoffConsumed,
  onUpdateSettings,
  onOpenSettings,
}: AgentChatScreenProps) {
  const session = useConversationSession();
  const [showHistory, setShowHistory] = useState(false);
  const [composerSeed, setComposerSeed] = useState<ComposerSeed | null>(null);
  const [viewKey, setViewKey] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const needsOnboarding =
    !onboardingDismissed &&
    !hasOnboarded() &&
    !hasApiKeyForProvider(settings);

  useEffect(() => {
    if (hasApiKeyForProvider(settings) && !hasOnboarded()) {
      markOnboarded();
      setOnboardingDismissed(true);
    }
  }, [settings]);

  useEffect(() => {
    if (!discussHandoff || !session.ready) return;

    let cancelled = false;
    void (async () => {
      if (discussHandoff.mode === "new") {
        await session.startNewConversation();
      }
      if (cancelled) return;
      setComposerSeed({
        id: Date.now(),
        text: buildDiscussSeedText(discussHandoff.description),
        blob: discussHandoff.blob,
      });
      setViewKey((k) => k + 1);
      onDiscussHandoffConsumed?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    discussHandoff,
    onDiscussHandoffConsumed,
    session.ready,
    session.startNewConversation,
  ]);

  if (!session.ready) {
    return (
      <div className="screen agent-chat-screen agent-chat-screen--loading">
        <p>Loading conversations…</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="screen agent-chat-screen agent-chat-screen--onboarding">
        <ChatOnboardingOverlay
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onOpenSettings={onOpenSettings}
          onComplete={() => setOnboardingDismissed(true)}
        />
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
        key={`${session.activeConversation?.id ?? "default"}-${viewKey}`}
        settings={settings}
        initialMessages={session.initialMessages}
        composerSeed={composerSeed}
        onUserMessage={session.persistUserMessage}
        onAssistantMessage={session.persistAssistantMessage}
        onOpenHistory={() => setShowHistory(true)}
        title={session.activeConversation?.title ?? "Sightread Agent"}
        passiveListening={settings.alwaysListening || settings.wakeWordEnabled}
      />
    </div>
  );
}
