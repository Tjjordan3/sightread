import type { Settings } from "../lib/settings";
import { AgentChatView } from "./AgentChatView";

interface AgentChatScreenProps {
  settings: Settings;
}

export function AgentChatScreen({ settings }: AgentChatScreenProps) {
  return (
    <div className="screen agent-chat-screen">
      <AgentChatView settings={settings} />
    </div>
  );
}
