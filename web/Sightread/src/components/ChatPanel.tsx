import type { Settings } from "../lib/settings";
import { AgentChatView } from "./AgentChatView";

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
  return (
    <div className="chat-overlay" role="dialog" aria-label="Chat">
      <div className="chat-panel chat-panel--agent">
        <AgentChatView
          settings={settings}
          getCurrentFrame={getCurrentFrame}
          showLiveFrameOption
          onClose={onClose}
          title="Quick chat"
          className="agent-chat--embedded"
        />
      </div>
    </div>
  );
}
