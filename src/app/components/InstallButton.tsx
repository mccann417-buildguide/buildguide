"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua);
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    // iOS Safari
    const iosStandalone = (window.navigator as any)?.standalone === true;
    // Other browsers
    const displayStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    return Boolean(iosStandalone || displayStandalone);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => setIsInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isStandalone]);

  async function onInstall() {
    // iOS: no prompt event exists, show instructions
    if (isIOS && !deferred) {
      alert(
        "To install:\n\n1) Tap Share (square with arrow)\n2) Tap “Add to Home Screen”\n3) Tap Add"
      );
      return;
    }

    if (!deferred) {
      alert("Install is not available yet. Try again after you’ve visited the site once or twice.");
      return;
    }

    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (isInstalled) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        ✅ Installed on your device
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onInstall}
      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900"
    >
      Install BuildGuide
    </button>
  );
}
