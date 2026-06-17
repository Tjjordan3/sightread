import { useState } from "react";
import { clearChatHistory } from "../lib/clearChatHistory";
import { PROMPT_PRESETS } from "../lib/promptPresets";
import type { Settings } from "../lib/settings";
import { WAKE_PHRASE } from "../lib/voice/wakeWord";

interface SettingsScreenProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onBack: () => void;
  onHistoryCleared?: () => void;
}

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
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
          </select>
        </label>

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
        <label className="field">
          <span>Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            value={draft.geminiApiKey}
            onChange={(e) =>
              setDraft({ ...draft, geminiApiKey: e.target.value })
            }
            placeholder="From Google AI Studio"
          />
        </label>

        <label className="field">
          <span>OpenAI API key</span>
          <input
            type="password"
            autoComplete="off"
            value={draft.openAIApiKey}
            onChange={(e) =>
              setDraft({ ...draft, openAIApiKey: e.target.value })
            }
            placeholder="sk-…"
          />
        </label>

        <label className="field">
          <span>Groq API key</span>
          <input
            type="password"
            autoComplete="off"
            value={draft.groqApiKey}
            onChange={(e) =>
              setDraft({ ...draft, groqApiKey: e.target.value })
            }
            placeholder="gsk_…"
          />
        </label>

        <p className="footnote">
          Keys are stored in this browser only (localStorage). They are sent
          directly to Gemini, OpenAI, or Groq from your device.
        </p>

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
