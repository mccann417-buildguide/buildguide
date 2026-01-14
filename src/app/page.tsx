// src/app/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import { SiteHeader } from "./components/SiteHeader";
import { Section } from "./components/Section";
import { FeatureCard } from "./components/FeatureCard";
import { TestimonialCard } from "./components/TestimonialCard";
import { PricingCard } from "./components/PricingCard";

export default function HomePage() {
  function downloadIcon() {
    // Public asset path
    const url = "/icons/icon-192.png";

    const a = document.createElement("a");
    a.href = url;
    a.download = "buildguide-icon-192.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl border p-8 md:p-10 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-700">⭐⭐⭐⭐⭐ (4.9/5)</div>

              <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
                Your Second Set of Eyes on Every Construction Decision.
              </h1>

              <p className="mt-4 max-w-2xl text-neutral-700">
                Upload a photo. Ask questions. Check your bid. Get clear, plain-English guidance
                before mistakes happen.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/photo"
                  className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium hover:bg-black/90 text-center inline-flex items-center justify-center gap-2"
                >
                  <Image
                    src="/icons/icon-192.png"
                    alt="BuildGuide"
                    width={18}
                    height={18}
                    className="rounded-[4px]"
                  />
                  <span>Try 1–2 Free Photo Checks</span>
                </Link>

                <Link
                  href="/bid"
                  className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center"
                >
                  📄 Check a Bid
                </Link>

                <Link
                  href="#how-it-works"
                  className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center"
                >
                  See how it works
                </Link>
              </div>
            </div>

            {/* APP ICON (STATIC + DOWNLOAD) */}
            <div className="shrink-0 w-full sm:w-[260px] rounded-2xl border p-4">
              <div className="text-sm font-semibold">App Icon</div>
              <div className="mt-1 text-xs text-neutral-600">
                This is the BuildGuide icon used for install/shortcuts.
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl border bg-neutral-50 overflow-hidden flex items-center justify-center">
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
                    onClick={downloadIcon}
                    className="w-full rounded-xl bg-black text-white px-3 py-2 text-xs font-medium hover:bg-black/90 inline-flex items-center justify-center gap-2"
                  >
                    {/* Download icon */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3v10m0 0l4-4m-4 4L8 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 17v3h16v-3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Download Icon</span>
                  </button>

                  <div className="mt-2 text-[11px] text-neutral-500">
                    File: <span className="font-mono">/public/icons/icon-192.png</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Verify</div>
              <div className="text-neutral-700 mt-1">
                Photo check for problems, missing steps, and risks.
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Understand</div>
              <div className="text-neutral-700 mt-1">
                Ask follow-ups in plain English — no jargon.
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="font-semibold">Decide</div>
              <div className="text-neutral-700 mt-1">
                Bid check to spot missing scope and red flags.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* PROBLEM */}
      <Section
        eyebrow="Why it matters"
        title="Construction is confusing. Mistakes are expensive."
        subtitle="You shouldn’t have to guess whether something is normal, safe, or missing from the plan."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5">
            <h3 className="font-semibold">What people struggle with</h3>
            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {[
                "You don’t know what’s normal",
                "You don’t know what’s missing",
                "You don’t know what to question",
                "You don’t know if a bid is fair",
                "You don’t want to look dumb asking",
              ].map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-[2px]">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <h3 className="font-semibold">What BuildGuide does instead</h3>
            <p className="mt-3 text-sm text-neutral-700">
              BuildGuide gives you instant, construction-specific guidance — designed for
              real jobs, real bids, and real photos. Not generic AI answers.
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href="/photo"
                className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium"
              >
                Start with a photo
              </Link>

              <Link
                href="/bid"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Check a bid
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section
        id="how-it-works"
        eyebrow="How it works"
        title="A simple flow that matches how homeowners actually think."
        subtitle="Verify → Understand → Decide. The full confidence loop."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            title="1) Verify (Photo Check)"
            desc="Upload a photo and get structured feedback, not a wall of text."
            bullets={[
              "What looks right vs wrong",
              "What may be missing",
              "Safety & code red flags",
              "Suggested questions to ask",
            ]}
          />

          <FeatureCard
            title="2) Understand (Ask Questions)"
            desc="Follow up with context-aware questions tied to your photo or project."
            bullets={[
              "Plain-English explanations",
              "Step-by-step guidance",
              "What happens if it’s wrong",
              "What to say to your contractor",
            ]}
          />

          <FeatureCard
            title="3) Decide (Bid Check)"
            desc="Paste your estimate and instantly see gaps, risks, and missing scope."
            bullets={[
              "What’s included vs missing",
              "Red flags & vague wording",
              "Typical cost ranges",
              "Questions to ask before signing",
            ]}
          />
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section
        id="testimonials"
        eyebrow="Reviews"
        title="Trusted by homeowners and contractors"
        subtitle="Social proof belongs above the fold — and here’s what people are saying."
      >
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

      {/* PRICING */}
      <Section
        id="pricing"
        eyebrow="Pricing"
        title="Try it free, then unlock the full toolset when you’re ready."
        subtitle="Free is intentionally limited. Paid feels like peace of mind."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <PricingCard
            name="Free"
            price="$0"
            tagline="Get a feel for it."
            features={[
              "1–2 total photo checks",
              "Bid check (lite)",
              "Basic explanation",
              "No project history",
              "No share links",
            ]}
            ctaText="Start Free"
            ctaHref="/photo"
          />

          <PricingCard
            name="Homeowner Plus"
            price="$14/mo"
            tagline="$129/yr option available"
            features={[
              "Unlimited photo checks",
              "Full issue breakdowns",
              "Cost ranges",
              "Project history + issue tracking",
              "Shareable view links",
              "Full bid check + red flags",
            ]}
            ctaText="Upgrade to Plus"
            ctaHref="/pricing"
            highlight
          />

          <PricingCard
            name="Contractor Pro"
            price="$49/mo"
            tagline="$499/yr option available"
            features={[
              "Everything in Plus",
              "Client-friendly share links",
              "Job documentation timeline",
              "Fewer misunderstandings & callbacks",
              "Branding (phase 2)",
            ]}
            ctaText="See Pro"
            ctaHref="/pricing"
          />
        </div>
      </Section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border p-8 md:p-10 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-semibold">Stop guessing. Start knowing.</h2>

          <p className="mt-3 text-neutral-700 max-w-2xl">
            BuildGuide is your second set of eyes — from photos, to questions, to bids.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/photo"
              className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium hover:bg-black/90 text-center inline-flex items-center justify-center gap-2"
            >
              <Image
                src="/icons/icon-192.png"
                alt="BuildGuide"
                width={18}
                height={18}
                className="rounded-[4px]"
              />
              <span>Try 1–2 Free Photo Checks</span>
            </Link>

            <Link
              href="/bid"
              className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50 text-center"
            >
              📄 Check a Bid
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-neutral-600">
          © {new Date().getFullYear()} BuildGuide. All rights reserved.
        </div>
      </footer>
    </>
  );
}
