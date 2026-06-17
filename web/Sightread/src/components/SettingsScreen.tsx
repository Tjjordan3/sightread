import { useState } from "react";
import { fetchBackendMeta, fetchBackendProviders } from "../lib/backend/client";
import { clearChatHistory } from "../lib/clearChatHistory";
import { PROMPT_PRESETS } from "../lib/promptPresets";
import type { ApiAccessMode, Settings } from "../lib/settings";
import { isBackendConfigured } from "../lib/settings";
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
  const [backendStatus, setBackendStatus] = useState("");

  const testBackend = async () => {
    if (!isBackendConfigured(draft)) {
      setBackendStatus("Set backend URL and device token first.");
      return;
    }
    setBackendStatus("Checking…");
    try {
      const meta = await fetchBackendMeta(draft);
      const providers = await fetchBackendProviders(draft);
      const available = providers.available.join(", ") || "none";
      setBackendStatus(
        `Connected to ${meta.service} v${meta.version}. Available providers: ${available}.`,
      );
    } catch (err) {
      setBackendStatus(
        err instanceof Error ? err.message : "Could not reach backend.",
      );
    }
  };

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

        <h3 className="settings-section-title">API access</h3>
        <label className="field">
          <span>Routing mode</span>
          <select
            value={draft.apiAccessMode}
            onChange={(e) =>
              setDraft({
                ...draft,
                apiAccessMode: e.target.value as ApiAccessMode,
              })
            }
          >
            <option value="local">Local only — browser API keys</option>
            <option value="backend">Backend only — concept server</option>
            <option value="auto">Auto — backend first, fallback to local keys</option>
          </select>
        </label>
        <p className="footnote">
          {draft.apiAccessMode === "local" &&
            "Calls go directly from this browser to Gemini, OpenAI, or Groq."}
          {draft.apiAccessMode === "backend" &&
            "All AI calls route through the concept backend. Server keys are used when set; otherwise your local keys are forwarded securely in the request."}
          {draft.apiAccessMode === "auto" &&
            "Tries the concept backend first. If it fails, falls back to local API keys in this browser."}
        </p>

        {draft.apiAccessMode !== "local" && (
          <>
            <label className="field">
              <span>Backend URL</span>
              <input
                type="url"
                value={draft.backendUrl}
                onChange={(e) =>
                  setDraft({ ...draft, backendUrl: e.target.value })
                }
                placeholder="/api/concept or http://localhost:8787"
              />
            </label>
            <label className="field">
              <span>Device token</span>
              <input
                type="password"
                autoComplete="off"
                value={draft.backendToken}
                onChange={(e) =>
                  setDraft({ ...draft, backendToken: e.target.value })
                }
                placeholder="Matches SIGHTREAD_CONCEPT_TOKEN"
              />
            </label>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void testBackend()}
            >
              Test backend connection
            </button>
            {backendStatus && (
              <p className="footnote">{backendStatus}</p>
            )}
          </>
        )}

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
          {draft.apiAccessMode === "local"
            ? "Keys stay in this browser (localStorage) and are sent directly to providers."
            : "Local keys are optional when using the backend. If the server lacks a provider key, yours are forwarded only for that request (BYOK-through-proxy)."}
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
