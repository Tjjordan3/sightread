import { useState } from "react";
import { clearChatHistory } from "../lib/clearChatHistory";
import { PROMPT_PRESETS } from "../lib/promptPresets";
import { AI_PROVIDERS } from "../lib/providers";
import type { Settings } from "../lib/settings";
import { WAKE_PHRASE } from "../lib/voice/wakeWord";

interface SettingsScreenProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
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
  settings: initial,
  onSave,
  onBack,
  onHistoryCleared,
}: SettingsScreenProps) {
  const [draft, setDraft] = useState<Settings>(initial);

  return (
    <div className="screen settings-screen">
      <header className="screen-header">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Back
        </button>
        <h2>Sightread Settings</h2>
      </header>

      <div className="settings-screen__content">
        <h3 className="settings-section-title">Vision</h3>
        <label className="switch-row">
          <span>Enable AI analysis</span>
          <input
            type="checkbox"
            checked={draft.isAIEnabled}
            onChange={(e) =>
              setDraft({ ...draft, isAIEnabled: e.target.checked })
            }
          />
        </label>

        <label className="switch-row">
          <span>Read vision responses aloud</span>
          <input
            type="checkbox"
            checked={draft.isTTSEnabled}
            onChange={(e) =>
              setDraft({ ...draft, isTTSEnabled: e.target.checked })
            }
          />
        </label>

        <label className="field">
          <span>Provider</span>
          <select
            value={draft.provider}
            onChange={(e) =>
              setDraft({
                ...draft,
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

        {draft.provider === "openrouter" && (
          <label className="field">
            <span>OpenRouter model</span>
            <input
              type="text"
              value={draft.openrouterModel}
              onChange={(e) =>
                setDraft({ ...draft, openrouterModel: e.target.value })
              }
              placeholder="google/gemini-2.0-flash-001"
            />
          </label>
        )}

        <label className="switch-row">
          <span>Smart prompts (recommended)</span>
          <input
            type="checkbox"
            checked={draft.promptMode === "auto"}
            onChange={(e) =>
              setDraft({
                ...draft,
                promptMode: e.target.checked ? "auto" : "manual",
              })
            }
          />
        </label>
        <p className="footnote">
          {draft.promptMode === "auto"
            ? "Sightread picks the best vision prompt automatically — no preset to choose."
            : "Choose a fixed preset for live vision and photo analysis."}
        </p>

        {draft.promptMode === "manual" && (
          <label className="field">
            <span>Prompt preset</span>
            <select
              value={draft.selectedPromptId}
              onChange={(e) =>
                setDraft({ ...draft, selectedPromptId: e.target.value })
              }
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
          <span>Analyze every {draft.analysisIntervalSec}s</span>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={draft.analysisIntervalSec}
            onChange={(e) =>
              setDraft({
                ...draft,
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
            checked={draft.speakChatReplies}
            onChange={(e) =>
              setDraft({ ...draft, speakChatReplies: e.target.checked })
            }
          />
        </label>

        <label className="switch-row">
          <span>Always listening (pause when tab hidden)</span>
          <input
            type="checkbox"
            checked={draft.alwaysListening}
            onChange={(e) =>
              setDraft({ ...draft, alwaysListening: e.target.checked })
            }
          />
        </label>

        <label className="switch-row">
          <span>Wake phrase (“{WAKE_PHRASE}”)</span>
          <input
            type="checkbox"
            checked={draft.wakeWordEnabled}
            onChange={(e) =>
              setDraft({ ...draft, wakeWordEnabled: e.target.checked })
            }
          />
        </label>

        <label className="field">
          <span>Silence before send: {draft.silenceTimeoutMs}ms</span>
          <input
            type="range"
            min={600}
            max={3000}
            step={100}
            value={draft.silenceTimeoutMs}
            onChange={(e) =>
              setDraft({
                ...draft,
                silenceTimeoutMs: Number(e.target.value),
              })
            }
          />
        </label>

        <h3 className="settings-section-title">API keys</h3>
        <p className="footnote">
          Keys are stored in this browser only (localStorage). Calls go directly
          from your device to the selected provider.
        </p>

        {AI_PROVIDERS.map((provider) => {
          const field = KEY_FIELDS[provider.id];
          return (
            <label key={provider.id} className="field">
              <span>{provider.keyLabel}</span>
              <input
                type="password"
                autoComplete="off"
                value={draft[field]}
                onChange={(e) =>
                  setDraft({ ...draft, [field]: e.target.value })
                }
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

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onSave(draft)}
        >
          Save
        </button>
      </div>
    </div>
  );
}
