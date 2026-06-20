import { useState } from "react";
import { AgentChatScreen } from "./components/AgentChatScreen";
import { AppShell, type AppTab } from "./components/AppShell";
import { InstallPrompt } from "./components/InstallPrompt";
import { InsecureContextBanner } from "./components/InsecureContextBanner";
import { SettingsScreen } from "./components/SettingsScreen";
import { StreamScreen } from "./components/StreamScreen";
import { unlockSpeech } from "./lib/speech";
import type { VisionDiscussHandoff } from "./lib/visionDiscuss";
import { useKeyboardViewportOffset } from "./hooks/useKeyboardViewport";
import { useTheme } from "./hooks/useTheme";
import { useSettings } from "./hooks/useSettings";

function App() {
  const { settings, updateSettings } = useSettings();
  useTheme(settings.theme);
  const [tab, setTab] = useState<AppTab>("chat");
  const [chatEpoch, setChatEpoch] = useState(0);
  const [discussHandoff, setDiscussHandoff] = useState<VisionDiscussHandoff | null>(
    null,
  );
  useKeyboardViewportOffset();

  const content =
    tab === "chat" ? (
      <AgentChatScreen
        key={chatEpoch}
        settings={settings}
        discussHandoff={discussHandoff}
        onDiscussHandoffConsumed={() => setDiscussHandoff(null)}
        onUpdateSettings={updateSettings}
        onOpenSettings={() => setTab("settings")}
      />
    ) : tab === "vision" ? (
      <StreamScreen
        settings={settings}
        onOpenSettings={() => setTab("settings")}
        onDiscussInAgent={(handoff) => {
          setDiscussHandoff(handoff);
          setTab("chat");
        }}
      />
    ) : (
      <SettingsScreen
        settings={settings}
        onUpdate={updateSettings}
        onBack={() => setTab("chat")}
        onHistoryCleared={() => setChatEpoch((n) => n + 1)}
      />
    );

  return (
    <>
      <InsecureContextBanner />
      <InstallPrompt />
      <AppShell
        activeTab={tab}
        onTabChange={(next) => {
          if (next === "vision") unlockSpeech();
          setTab(next);
        }}
      >
        {content}
      </AppShell>
    </>
  );
}

export default App;
