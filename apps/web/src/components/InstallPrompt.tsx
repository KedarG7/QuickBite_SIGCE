import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  // iOS Safari
  // @ts-expect-error legacy prop
  return window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const show = useMemo(() => !dismissed && !isInStandaloneMode(), [dismissed]);
  if (!show) return null;

  return (
    <div className="card">
      <h2 className="h2">Add to Home Screen</h2>
      <p className="muted">Install this app for a faster, smoother experience.</p>
      {deferredPrompt ? (
        <div className="row">
          <button
            className="btn primary"
            onClick={async () => {
              await deferredPrompt.prompt();
              const choice = await deferredPrompt.userChoice;
              if (choice.outcome !== "accepted") setDismissed(true);
              setDeferredPrompt(null);
            }}
          >
            Install
          </button>
          <button className="btn" onClick={() => setDismissed(true)}>
            Not now
          </button>
        </div>
      ) : isIos() ? (
        <p className="muted">On iPhone/iPad: tap Share → “Add to Home Screen”.</p>
      ) : (
        <button className="btn" onClick={() => setDismissed(true)}>
          Not now
        </button>
      )}
    </div>
  );
}

