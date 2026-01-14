// src/app/components/UnlockPanel.tsx
"use client";

import Link from "next/link";

export function UnlockPanel({
  title,
  priceLabel = "$2.99",
  onUnlock,
  showSubscriptionNote = true,
}: {
  title: string;
  priceLabel?: string;
  onUnlock: () => void;
  showSubscriptionNote?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-neutral-50">
      <div className="font-semibold">🔒 {title}</div>

      <p className="mt-2 text-sm text-neutral-700">
        Unlock the full, decision-grade breakdown (comparisons, risks, what to say next, and the “important stuff”).
      </p>

      <button
        onClick={onUnlock}
        className="mt-4 w-full rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90"
      >
        Unlock Full Report — {priceLabel} (one-time)
      </button>

      {showSubscriptionNote && (
        <div className="mt-3 text-xs text-neutral-600">
          Prefer unlimited? Subscriptions remove per-report fees. Also: this unlock adds a <span className="font-semibold">{priceLabel} credit</span> toward your subscription.
          <div className="mt-2">
            <Link href="/pricing" className="underline">
              View subscription options
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
