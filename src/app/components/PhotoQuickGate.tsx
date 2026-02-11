// src/app/components/PhotoQuickGate.tsx
"use client";

import React from "react";
import Link from "next/link";

import { buildFreePhotoSummary, severityTone, type PhotoSeverity } from "../lib/photoLogic";
import type { PlanId } from "../lib/storage";

export default function PhotoQuickGate({
  isPaid,
  severity,
  topQuestions,
  onUnlock,
  unlockBusy,
  planId,
}: {
  isPaid: boolean;
  severity: PhotoSeverity;
  topQuestions: string[];
  onUnlock: () => void;
  unlockBusy: boolean;
  planId?: PlanId; // pass from FeatureGate (optional, but recommended)
}) {
  const free = buildFreePhotoSummary(severity);
  const tone = severityTone(free.severity);

  const isPro = planId === "home_plus" || planId === "contractor_pro";

  // If user has subscription but page still thinks "not paid",
  // we show a helpful message + let parent fix isPaid logic.
  if (!isPaid && isPro) {
    return (
      <section className="rounded-2xl border p-5 bg-neutral-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">✅ Pro is active</div>
            <p className="mt-1 text-sm text-neutral-700">
              You’re subscribed, so full reports should be unlocked automatically.
            </p>
            <p className="mt-2 text-xs text-neutral-600">
              If you still see the $2.99 prompt, we just need to treat Pro as “paid” in the page logic.
            </p>
          </div>

          <Link
            href="/pricing"
            className="shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            Manage Plan
          </Link>
        </div>
      </section>
    );
  }

  // FREE: no long lists, no deep content
  if (!isPaid) {
    return (
      <section className="rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-sm font-semibold ${tone.className}`}>{free.title}</div>
            <p className="mt-1 text-sm text-neutral-700">{free.summary}</p>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={onUnlock}
              disabled={unlockBusy}
              className="rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90 disabled:opacity-50"
            >
              Unlock $2.99
            </button>

            <Link
              href="/pricing"
              className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 text-center"
              title="Upgrade for more runs + full reports"
            >
              Go Home Plus
            </Link>
          </div>
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="text-sm font-semibold">3 things to ask the contractor</div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-800">
            {topQuestions.map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>

          <p className="mt-3 text-sm text-neutral-600">{free.upsell}</p>
        </div>
      </section>
    );
  }

  // PAID: just a small header (your deep report renders elsewhere)
  return (
    <section className="rounded-2xl border p-5 bg-neutral-50">
      <div className="text-sm font-semibold">✅ Full Photo Report Unlocked</div>
      <p className="mt-1 text-sm text-neutral-700">
        Deeper findings, red flags, next steps, local comparison, and a printable PDF.
      </p>
    </section>
  );
}
