import { clearChatHistory } from "../lib/clearChatHistory";
import { PROMPT_PRESETS } from "../lib/promptPresets";
import { AI_PROVIDERS } from "../lib/providers";
import type { Settings } from "../lib/settings";
import { WAKE_PHRASE } from "../lib/voice/wakeWord";

interface SettingsScreenProps {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onHistoryCleared?: () => void;
}

const KEY_FIELDS = {
  gemini: "geminiApiKey",
  openai: "openAIApiKey",
  groq: "groqApiKey",
  anthropic: "anthropicApiKey",
  mistral: "mistralApiKey",
  openrouter: "openrouterApiKey",
} as const;

export function SettingsScreen({
  settings,
  onUpdate,
  onBack,
  onHistoryCleared,
}: SettingsScreenProps) {
  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Back
        </button>
        <h2>Sightread Settings</h2>
      </header>

      <div className="settings-screen__content">
        <h3 className="settings-section-title">Appearance</h3>
        <label className="field">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(e) =>
              onUpdate({
                theme: e.target.value as Settings["theme"],
              })
            }
          >
            <option value="auto">Auto (match system)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="footnote">
          Auto follows your device&apos;s light or dark mode setting.
        </p>

        <h3 className="settings-section-title">Vision</h3>
        <label className="switch-row">
          <span>Enable AI analysis</span>
          <input
            type="checkbox"
            checked={settings.isAIEnabled}
            onChange={(e) => onUpdate({ isAIEnabled: e.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>Read vision responses aloud</span>
          <input
            type="checkbox"
            checked={settings.isTTSEnabled}
            onChange={(e) => onUpdate({ isTTSEnabled: e.target.checked })}
          />
        </label>

        <label className="field">
          <span>Provider</span>
          <select
            value={settings.provider}
            onChange={(e) =>
              onUpdate({
                provider: e.target.value as Settings["provider"],
              })
            }
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </label>

        {settings.provider === "openrouter" && (
          <label className="field">
            <span>OpenRouter model</span>
            <input
              type="text"
              value={settings.openrouterModel}
              onChange={(e) => onUpdate({ openrouterModel: e.target.value })}
              placeholder="google/gemini-2.0-flash-001"
            />
          </label>
        )}

        <label className="switch-row">
          <span>Smart prompts (recommended)</span>
          <input
            type="checkbox"
            checked={settings.promptMode === "auto"}
            onChange={(e) =>
              onUpdate({
                promptMode: e.target.checked ? "auto" : "manual",
              })
            }
          />
        </label>
        <p className="footnote">
          {settings.promptMode === "auto"
            ? "Sightread picks the best vision prompt automatically — no preset to choose."
            : "Choose a fixed preset for live vision and photo analysis."}
        </p>

        {settings.promptMode === "manual" && (
          <label className="field">
            <span>Prompt preset</span>
            <select
              value={settings.selectedPromptId}
              onChange={(e) => onUpdate({ selectedPromptId: e.target.value })}
            >
              {PROMPT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Analyze every {settings.analysisIntervalSec}s</span>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={settings.analysisIntervalSec}
            onChange={(e) =>
              onUpdate({
                analysisIntervalSec: Number(e.target.value),
              })
            }
          />
        </label>

        <h3 className="settings-section-title">Agent & voice</h3>
        <label className="switch-row">
          <span>Speak agent replies in chat</span>
          <input
            type="checkbox"
            checked={settings.speakChatReplies}
            onChange={(e) => onUpdate({ speakChatReplies: e.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>Always listening (pause when tab hidden)</span>
          <input
            type="checkbox"
            checked={settings.alwaysListening}
            onChange={(e) => onUpdate({ alwaysListening: e.target.checked })}
          />
        </label>

        <label className="switch-row">
          <span>Wake phrase (“{WAKE_PHRASE}”)</span>
          <input
            type="checkbox"
            checked={settings.wakeWordEnabled}
            onChange={(e) => onUpdate({ wakeWordEnabled: e.target.checked })}
          />
        </label>

        <label className="field">
          <span>Silence before send: {settings.silenceTimeoutMs}ms</span>
          <input
            type="range"
            min={600}
            max={3000}
            step={100}
            value={settings.silenceTimeoutMs}
            onChange={(e) =>
              onUpdate({
                silenceTimeoutMs: Number(e.target.value),
              })
            }
          />
        </label>

        <h3 className="settings-section-title">API keys</h3>
        <p className="footnote">
          Keys are stored in this browser only (localStorage). Calls go directly
          from your device to the selected provider. Changes save automatically.
        </p>

        {AI_PROVIDERS.map((provider) => {
          const field = KEY_FIELDS[provider.id];
          return (
            <label key={provider.id} className="field">
              <span>{provider.keyLabel}</span>
              <input
                type="password"
                autoComplete="off"
                value={settings[field]}
                onChange={(e) => onUpdate({ [field]: e.target.value })}
                placeholder={provider.keyPlaceholder}
              />
              <span className="footnote">{provider.keyHint}</span>
            </label>
          );
        })}

        <h3 className="settings-section-title">Data</h3>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() =>
            void clearChatHistory(() => {
              onHistoryCleared?.();
            })
          }
        >
          Clear all chat history
        </button>
      </div>
    </div>
  );
}
