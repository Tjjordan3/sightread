import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("sightread_install_dismissed") === "1",
  );
  const isIos = useMemo(() => detectIos(), []);
  const isStandalone = useMemo(
    () => window.matchMedia("(display-mode: standalone)").matches,
    [],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed) return null;

  if (deferred) {
    return (
      <div className="install-banner">
        <p>Install Sightread for an app-like experience.</p>
        <button
          type="button"
          className="btn btn--primary btn--compact"
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
            setDismissed(true);
            localStorage.setItem("sightread_install_dismissed", "1");
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--compact"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem("sightread_install_dismissed", "1");
          }}
        >
          Not now
        </button>
      </div>
    );
  }

  if (isIos) {
    return (
      <div className="install-banner install-banner--ios">
        <p>
          On iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install Sightread.
        </p>
        <button
          type="button"
          className="btn btn--ghost btn--compact"
          onClick={() => {
            setDismissed(true);
            localStorage.setItem("sightread_install_dismissed", "1");
          }}
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}
