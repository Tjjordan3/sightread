import { useState } from "react";
import { PROMPT_PRESETS } from "../lib/promptPresets";
import type { Settings } from "../lib/settings";

interface SettingsScreenProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onBack: () => void;
}

export function SettingsScreen({
  settings: initial,
  onSave,
  onBack,
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
