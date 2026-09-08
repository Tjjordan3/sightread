import { markOnboarded } from "../lib/onboarding";

interface WelcomeScreenProps {
  onComplete: () => void;
}

/**
 * First-run brand welcome. No provider picker or API key collection —
 * keys stay exclusively in Settings.
 */
export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const finish = () => {
    markOnboarded();
    onComplete();
  };

  return (
    <div className="welcome-screen" role="dialog" aria-labelledby="welcome-title">
      <div className="welcome-screen__content">
        <img
          src="/favicon.svg"
          alt=""
          className="welcome-screen__mark"
          width={72}
          height={68}
        />
        <p className="welcome-screen__brand">Sightread</p>
        <h1 id="welcome-title" className="welcome-screen__headline">
          Your AI that sees what you see
        </h1>
        <p className="welcome-screen__support">
          Chat, send photos, use voice, or open Vision to describe the world
          around you — no setup required to explore.
        </p>
        <button
          type="button"
          className="btn btn--primary welcome-screen__cta"
          onClick={finish}
        >
          Get started
        </button>
        <p className="welcome-screen__footnote">
          Add an API key anytime in Settings
        </p>
      </div>
    </div>
  );
}
