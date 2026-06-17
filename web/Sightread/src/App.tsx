import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { StreamScreen } from "./components/StreamScreen";
import { useSettings } from "./hooks/useSettings";

type Screen = "home" | "stream" | "settings";

function App() {
  const { settings, setSettings } = useSettings();
  const [screen, setScreen] = useState<Screen>("home");
  const [settingsReturn, setSettingsReturn] = useState<Screen>("home");

  if (screen === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        onSave={(next) => {
          setSettings(next);
          setScreen(settingsReturn);
        }}
        onBack={() => setScreen(settingsReturn)}
      />
    );
  }

  if (screen === "stream") {
    return (
      <StreamScreen
        settings={settings}
        onStop={() => setScreen("home")}
        onOpenSettings={() => {
          setSettingsReturn("stream");
          setScreen("settings");
        }}
      />
    );
  }

  return (
    <HomeScreen
      onStart={() => setScreen("stream")}
      onOpenSettings={() => {
        setSettingsReturn("home");
        setScreen("settings");
      }}
    />
  );
}

export default App;
