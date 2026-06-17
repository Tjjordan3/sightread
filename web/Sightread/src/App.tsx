import { useState } from "react";
import { AgentChatScreen } from "./components/AgentChatScreen";
import { AppShell, type AppTab } from "./components/AppShell";
import { InstallPrompt } from "./components/InstallPrompt";
import { SettingsScreen } from "./components/SettingsScreen";
import { StreamScreen } from "./components/StreamScreen";
import { useKeyboardViewportOffset } from "./hooks/useKeyboardViewport";
import { useTheme } from "./hooks/useTheme";
import { useSettings } from "./hooks/useSettings";

function App() {
  const { settings, setSettings } = useSettings();
  useTheme(settings.theme);
  const [tab, setTab] = useState<AppTab>("chat");
  const [chatEpoch, setChatEpoch] = useState(0);
  useKeyboardViewportOffset();

  const content =
    tab === "chat" ? (
      <AgentChatScreen key={chatEpoch} settings={settings} />
    ) : tab === "vision" ? (
      <StreamScreen
        settings={settings}
        onOpenSettings={() => setTab("settings")}
      />
    ) : (
      <SettingsScreen
        settings={settings}
        onSave={(next) => {
          setSettings(next);
          setTab("chat");
        }}
        onBack={() => setTab("chat")}
        onHistoryCleared={() => {
          setChatEpoch((n) => n + 1);
          setTab("chat");
        }}
      />
    );

  return (
    <>
      <InstallPrompt />
      <AppShell activeTab={tab} onTabChange={setTab}>
        {content}
      </AppShell>
    </>
  );
}

export default App;
