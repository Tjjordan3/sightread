import { useState } from "react";
import { AI_PROVIDERS } from "../lib/providers";
import {
  getOnboardingStep,
  markOnboarded,
  setOnboardingStep,
} from "../lib/onboarding";
import type { Settings } from "../lib/settings";

interface ChatOnboardingOverlayProps {
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  onOpenSettings: () => void;
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Choose your AI provider",
    description:
      "Sightread talks to the provider you pick. Gemini is a solid default, but you can switch anytime in Settings.",
  },
  {
    title: "Add your API key",
    description:
      "Your key stays in this browser only — never on our servers. Open Settings, paste the key for your provider, and come back here.",
  },
  {
    title: "Start chatting",
    description:
      "Ask questions, attach photos, or turn on voice mode. Vision mode on the other tab can describe what your camera sees.",
  },
] as const;

export function ChatOnboardingOverlay({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onComplete,
}: ChatOnboardingOverlayProps) {
  const [step, setStep] = useState(getOnboardingStep);

  const goToStep = (next: number) => {
    setStep(next);
    setOnboardingStep(next);
  };

  const finish = () => {
    markOnboarded();
    onComplete();
  };

  const { title, description } = STEPS[step - 1];
  const provider = AI_PROVIDERS.find((p) => p.id === settings.provider);

  return (
    <div className="chat-onboarding" role="dialog" aria-labelledby="chat-onboarding-title">
      <div className="chat-onboarding__card">
        <p className="chat-onboarding__eyebrow">Step {step} of 3</p>
        <h2 id="chat-onboarding-title" className="chat-onboarding__title">
          {title}
        </h2>
        <p className="chat-onboarding__description">{description}</p>

        {step === 1 && (
          <label className="field chat-onboarding__field">
            <span>AI provider</span>
            <select
              value={settings.provider}
              onChange={(e) =>
                onUpdateSettings({
                  provider: e.target.value as Settings["provider"],
                })
              }
            >
              {AI_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {step === 2 && provider && (
          <p className="chat-onboarding__hint">
            Looking for a <strong>{provider.keyLabel}</strong>? Get one at{" "}
            <span className="chat-onboarding__hint-site">{provider.keyHint}</span>.
          </p>
        )}

        <div className="chat-onboarding__dots" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`chat-onboarding__dot ${n === step ? "chat-onboarding__dot--active" : ""}`}
            />
          ))}
        </div>

        <div className="chat-onboarding__actions">
          {step === 1 && (
            <button
              type="button"
              className="btn btn--primary chat-onboarding__btn"
              onClick={() => goToStep(2)}
            >
              Next
            </button>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                className="btn btn--primary chat-onboarding__btn"
                onClick={() => {
                  setOnboardingStep(2);
                  onOpenSettings();
                }}
              >
                Open Settings
              </button>
              <button
                type="button"
                className="btn btn--secondary chat-onboarding__btn"
                onClick={() => goToStep(3)}
              >
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <button
              type="button"
              className="btn btn--primary chat-onboarding__btn"
              onClick={finish}
            >
              Start chatting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
