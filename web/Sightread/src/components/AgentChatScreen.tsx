import { useEffect, useState } from "react";
import { useConversationSession } from "../hooks/useConversationSession";
import type { ChatMessage } from "../lib/chat";
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

function hasUserMessages(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.role === "user");
}

export function ChatEmptyBrandedHeader() {
  return (
    <div className="chat-empty-brand">
      <img
        src="/favicon.svg"
        alt=""
        className="chat-empty-brand__mark"
        width={44}
        height={42}
      />
      <h2 className="chat-empty-brand__wordmark">SightRead</h2>
      <p className="chat-empty-brand__tagline">Your AI that sees what you see</p>
    </div>
  );
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
  const [brandingHidden, setBrandingHidden] = useState(() =>
    hasUserMessages(session.initialMessages),
  );

  const needsOnboarding =
    !onboardingDismissed &&
    !hasOnboarded() &&
    !hasApiKeyForProvider(settings);

  useEffect(() => {
    setBrandingHidden(hasUserMessages(session.initialMessages));
  }, [session.activeConversation?.id, session.initialMessages]);

  useEffect(() => {
    if (hasApiKeyForProvider(settings) && !hasOnboarded()) {
      markOnboarded();
      setOnboardingDismissed(true);
    }
  }, [settings]);

  const showBrandedHeader = !brandingHidden;

  const handleUserMessage = async (
    message: ChatMessage,
    imageBlob?: Blob,
    conversationId?: string,
  ) => {
    setBrandingHidden(true);
    await session.persistUserMessage(message, imageBlob, conversationId);
  };

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
        conversationId={session.activeConversation?.id ?? null}
        initialMessages={session.initialMessages}
        composerSeed={composerSeed}
        onUserMessage={handleUserMessage}
        onAssistantMessage={session.persistAssistantMessage}
        onOpenHistory={() => setShowHistory(true)}
        title={session.activeConversation?.title ?? "Sightread Agent"}
        passiveListening={settings.alwaysListening || settings.wakeWordEnabled}
        showBrandedHeader={showBrandedHeader}
        brandedHeader={<ChatEmptyBrandedHeader />}
      />
    </div>
  );
}
