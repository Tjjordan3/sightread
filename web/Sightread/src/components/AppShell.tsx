import type { ReactNode } from "react";

export type AppTab = "chat" | "vision" | "settings";

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: "chat", label: "Agent", icon: "💬" },
  { id: "vision", label: "Vision", icon: "🎥" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-shell__content">{children}</main>
      <nav className="app-shell__nav" aria-label="Main">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`app-shell__tab ${activeTab === tab.id ? "app-shell__tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span aria-hidden>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
