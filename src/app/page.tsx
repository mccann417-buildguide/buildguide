"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import { SiteHeader } from "./components/SiteHeader";
import { Section } from "./components/Section";
import { FeatureCard } from "./components/FeatureCard";
import { TestimonialCard } from "./components/TestimonialCard";

export default function HomePage() {
  const [showInstallHelp, setShowInstallHelp] = React.useState(false);
  const deferredPrompt = React.useRef<any>(null);

  // Capture Android install prompt (PWA)
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleAddToHome() {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      deferredPrompt.current = null;
      return;
    }
    setShowInstallHelp(true);
  }

  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border p-6 md:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="w-full">
              <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
                Know what your project should cost — before you hire anyone.
              </h1>

              <p className="mt-4 max-w-2xl text-neutral-700">
                Get realistic local pricing ranges, understand what drives cost, and compare contractor bids with calm,
                data-driven confidence. BuildGuide helps you spot missing scope, risk flags, and vague allowances before
                you commit.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {/* Primary CTA: COST/BID (black) */}
                <Link
                  href="/bid"
                  className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium hover:bg-black/90 text-center inline-flex items-center justify-center gap-2"
                >
                  <span aria-hidden>💰</span>
                  <span>Estimate My Project Cost</span>
                </Link>

                {/* Secondary CTA: PHOTO */}
                <Link
                  href="/photo"
                  className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center inline-flex items-center justify-center gap-2"
                >
                  <Image
                    src="/icons/icon-192.png"
                    alt="BuildGuide"
                    width={18}
                    height={18}
                    className="rounded-[4px]"
                  />
                  <span>Photo Check</span>
                </Link>

                <button
                  onClick={handleAddToHome}
                  className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center"
                >
                  📲 Add to Home Screen
                </button>
              </div>

              {/* Keep rating, but make it subtle + credible */}
              <div className="mt-3 text-xs text-neutral-600">★ 4.9/5 from early users</div>
            </div>

            {/* APP CARD */}
            <div className="shrink-0 w-full md:w-[280px] rounded-2xl border p-4 bg-neutral-50">
              <div className="text-sm font-semibold">Use BuildGuide like an app</div>
              <div className="mt-1 text-xs text-neutral-600">Add it to your Home Screen — no App Store required.</div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl border bg-white overflow-hidden flex items-center justify-center">
                  <Image
                    src="/icons/icon-192.png"
                    alt="BuildGuide App Icon"
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <button
                    onClick={handleAddToHome}
                    className="w-full rounded-xl bg-black text-white px-3 py-2 text-xs font-medium hover:bg-black/90 inline-flex items-center justify-center"
                  >
                    Add to Home Screen
                  </button>

                  <div className="mt-2 text-[11px] text-neutral-500">
                    Icon file: <span className="font-mono">/public/icons/icon-192.png</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-neutral-500">
                Tip: On iPhone, open in Safari → Share → Add to Home Screen.
              </div>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Price</div>
              <div className="text-neutral-700 mt-1">
                Realistic local cost ranges (low / typical / high) so you can plan with confidence.
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Understand</div>
              <div className="text-neutral-700 mt-1">
                Plain-English clarity on scope, allowances, and the right questions to ask.
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Compare</div>
              <div className="text-neutral-700 mt-1">
                Already have a bid? See what’s missing and where pricing stands locally.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* HOW IT WORKS */}
      <Section
        id="how-it-works"
        eyebrow="How it works"
        title="A simple flow that matches how people actually decide."
        subtitle="Price → Verify → Decide."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            title="1) Price (Project Cost)"
            desc="Know the numbers before you commit."
            bullets={[
              "Local cost ranges (low / typical / high)",
              "What drives price up or down",
              "Scope gaps that change cost fast",
              "A clearer plan before bids",
            ]}
          />

          <FeatureCard
            title="2) Verify (Photo Check)"
            desc="Get clarity on what you’re looking at."
            bullets={[
              "What looks right vs questionable",
              "What may be missing",
              "Concerns to ask about",
              "Suggested questions to send",
            ]}
          />

          <FeatureCard
            title="3) Decide (Compare bids)"
            desc="If you have an estimate, we’ll break down what’s included and what’s missing."
            bullets={[
              "Defined scope vs vague scope",
              "Allowances & exclusions",
              "Change-order risk flags",
              "What to ask before signing",
            ]}
          />
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="testimonials" eyebrow="Reviews" title="Trusted by homeowners and contractors">
        <div className="grid md:grid-cols-2 gap-4">
          <TestimonialCard
            name="Ron G."
            role="Homeowner"
            quote="BuildGuide didn’t tell me who to hire — it showed me what each bid actually included, which made the decision obvious."
          />
          <TestimonialCard
            name="Chad L."
            role="Contractor"
            quote="It helps my clients understand what’s going on without me having to explain everything over and over."
          />
        </div>
      </Section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border p-8 md:p-10 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-semibold">Stop guessing. Start knowing.</h2>

          <p className="mt-3 text-neutral-700 max-w-2xl">
            BuildGuide is your pricing intelligence layer — from project cost planning, to photos, to bid clarity and the
            right questions before you commit.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Primary CTA: COST/BID (black) */}
            <Link
              href="/bid"
              className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium hover:bg-black/90 text-center inline-flex items-center justify-center gap-2"
            >
              <span aria-hidden>💰</span>
              <span>Estimate My Project Cost</span>
            </Link>

            {/* Secondary CTA: PHOTO */}
            <Link
              href="/photo"
              className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center inline-flex items-center justify-center gap-2"
            >
              <Image
                src="/icons/icon-192.png"
                alt="BuildGuide"
                width={18}
                height={18}
                className="rounded-[4px]"
              />
              <span>Photo Check</span>
            </Link>

            <button
              onClick={handleAddToHome}
              className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center"
            >
              📲 Add to Home Screen
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-neutral-600">
          © {new Date().getFullYear()} BuildGuide. All rights reserved.
        </div>
      </footer>

      {/* iOS INSTALL HELP */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full">
            <div className="font-semibold text-lg">Add BuildGuide to Home Screen</div>
            <p className="mt-2 text-sm text-neutral-700">
              On iPhone: open this site in <strong>Safari</strong>, tap the <strong>Share</strong> icon, then choose{" "}
              <strong>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowInstallHelp(false)}
              className="mt-4 w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}