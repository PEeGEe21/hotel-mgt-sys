'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/push-sw.js').catch(() => {
      // Installability is best-effort here. The app can still work normally.
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const showIosHint = useMemo(
    () => isIos() && !isStandalone() && !installed && !dismissed,
    [dismissed, installed],
  );

  const canInstall = Boolean(deferredPrompt) && !installed && !dismissed && !isStandalone();

  if (!canInstall && !showIosHint) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-xs rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="space-y-2">
        <p className="text-sm font-semibold">Install HotelOS</p>
        {canInstall ? (
          <p className="text-sm text-slate-300">
            Add HotelOS to your home screen for a faster app-like experience.
          </p>
        ) : (
          <p className="text-sm text-slate-300">
            On iPhone or iPad, tap Share and then Add to Home Screen.
          </p>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {canInstall ? (
          <button
            type="button"
            className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
            onClick={async () => {
              if (!deferredPrompt) return;
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
          >
            Install app
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
