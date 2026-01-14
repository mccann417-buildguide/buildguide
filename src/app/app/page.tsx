// src/app/app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function AppLandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  const canInstall = useMemo(() => !!deferredPrompt, [deferredPrompt]);

  useEffect(() => {
    // Capture the browser PWA install prompt (Chrome/Edge/Android primarily)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Optional: if user already installed, some browsers fire "appinstalled"
    const installedHandler = () => setInstallStatus("Installed ✅");
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      setInstallStatus("Install not available yet on this browser/device.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallStatus("Installing… ✅");
      } else {
        setInstallStatus("Install dismissed.");
      }
    } catch {
      setInstallStatus("Install failed. Try again.");
    } finally {
      // One-time use in most browsers
      setDeferredPrompt(null);
    }
  }

  return (
    <main className="min-h-dvh bg-white text-zinc-900">
      <div className="mx-auto min-h-dvh max-w-md px-5 pb-10 pt-10">
        <header className="mb-8">
          <div className="text-sm font-semibold tracking-[0.28em] text-zinc-500">BUILDGUIDE</div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight">
            Know what you’re looking at — before you approve the job or the bid.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Understand what’s happening during the work, what typically gets inspected, compare bids, and know what to ask
            — in plain language.
          </p>

          <p className="mt-3 text-sm text-zinc-800">
            ⭐⭐⭐⭐⭐ <span className="font-semibold">(4.9/5)</span> — BuildGuide helps you understand what you’re looking at
            and what’s missing before you approve the job or the bid.
          </p>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-relaxed text-zinc-800">
              “BuildGuide didn’t tell me who to hire — it showed me what each bid actually included, which made the
              decision obvious.”
            </p>
            <p className="mt-2 text-xs font-semibold text-zinc-600">— Ron G., Homeowner</p>
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-relaxed text-zinc-800">
              “I finally understood what the contractor was talking about before the job started.”
            </p>
            <p className="mt-2 text-xs font-semibold text-zinc-600">— Jason G., Homeowner</p>
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm leading-relaxed text-zinc-800">
              “It helped my clients understand what was going on from photos — without me having to explain every step
              over and over.”
            </p>
            <p className="mt-2 text-xs font-semibold text-zinc-600">— Chad L., Contractor</p>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Free preview first — unlock the full report, PDF export, and bid check when you need it.
          </p>
        </header>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/photo"
            className="flex aspect-square items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 text-zinc-900"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl">📷</div>
              <div className="text-sm font-semibold">Photo</div>
              <div className="text-xs text-zinc-600">See what’s typical</div>
            </div>
          </Link>

          <Link
            href="/question"
            className="flex aspect-square items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 text-zinc-900"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl">❓</div>
              <div className="text-sm font-semibold">Question</div>
              <div className="text-xs text-zinc-600">Get a clear answer</div>
            </div>
          </Link>
        </div>

        {/* Install section */}
        <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5">
          <div className="text-xs font-semibold tracking-[0.28em] text-zinc-500">INSTALL</div>
          <h2 className="mt-2 text-lg font-semibold">Download BuildGuide</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Install BuildGuide on your phone so it feels like a real app: quick access, full-screen, and easy to use on-site.
          </p>

          <button
            type="button"
            onClick={handleInstall}
            className="mt-4 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!canInstall}
            title={canInstall ? "Install BuildGuide" : "Install becomes available after PWA is enabled + browser supports it"}
          >
            {canInstall ? "Install BuildGuide" : "Install (coming soon on this device)"}
          </button>

          {installStatus && <p className="mt-2 text-xs text-zinc-600">{installStatus}</p>}

          <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-700">If you don’t see the install button:</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-600">
              <li>
                iPhone (Safari): tap <span className="font-semibold">Share</span> → <span className="font-semibold">Add to Home Screen</span>
              </li>
              <li>
                Android (Chrome): tap <span className="font-semibold">⋮</span> → <span className="font-semibold">Install app</span>
              </li>
              <li>Desktop: look for the install icon in the address bar (Chrome/Edge)</li>
            </ul>
          </div>
        </section>

        <p className="mt-8 text-xs text-zinc-500">
          Educational guidance only. Not a substitute for licensed professionals. For safety-critical concerns, hire a pro.
        </p>

        <a href="/" className="mt-4 block text-center text-sm text-zinc-500 underline underline-offset-4">
          Back to home
        </a>
      </div>
    </main>
  );
}
