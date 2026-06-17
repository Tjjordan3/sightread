import { useState } from "react";
import { AgentChatScreen } from "./components/AgentChatScreen";
import { AppShell, type AppTab } from "./components/AppShell";
import { SettingsScreen } from "./components/SettingsScreen";
import { StreamScreen } from "./components/StreamScreen";
import { useSettings } from "./hooks/useSettings";

function App() {
  const { settings, setSettings } = useSettings();
  const [tab, setTab] = useState<AppTab>("chat");

  const content =
    tab === "chat" ? (
      <AgentChatScreen settings={settings} />
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
      />
    );

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      {content}
    </AppShell>
  );
}

export default App;
