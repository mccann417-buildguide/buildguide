// src/app/components/PaywallModal.tsx
"use client";

import React from "react";
import { setPlan, type PlanId } from "../lib/storage";

type Props = {
  open: boolean;
  context: "photo" | "bid";
  onClose: () => void;
  onUpgraded?: (planId: PlanId) => void;
};

export function PaywallModal({ open, context, onClose, onUpgraded }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  if (!open) return null;

  const title =
    context === "photo"
      ? "You’ve used your free photo checks"
      : "You’ve used your free bid check";

  const returnTo = context === "photo" ? "/photo" : "/bid";

  async function startHomePlus() {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/stripe/subscription-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: "home_plus",
          returnTo, // send them back to the page they came from
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start subscription checkout.");

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing Stripe checkout URL.");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => (!busy ? onClose() : null)} />
      <div className="relative w-full sm:w-[560px] m-3 rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Upgrade to unlock more runs, deeper AI reports, local pricing comparisons, and printable PDFs.
            </p>
          </div>
          <button
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}

        <div className="mt-4 grid gap-3">
          {/* Home Plus */}
          <div className="rounded-2xl border p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">Home Plus</div>
              <div className="text-sm text-neutral-700">
                <span className="font-semibold">$29</span>/mo
              </div>
            </div>

            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {[
                "More runs (Phase 2 we’ll tighten gating)",
                "Deeper AI reports + red flags",
                "Local pricing reality checks",
                "Printable PDFs",
                "Great for repeat projects & quotes",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-[2px]">✅</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-black text-white py-2.5 font-medium hover:bg-black/90 disabled:opacity-50"
                disabled={busy}
                onClick={startHomePlus}
              >
                {busy ? "Redirecting…" : "Start Home Plus"}
              </button>

              <button
                className="rounded-xl border py-2.5 px-4 font-medium hover:bg-neutral-50 disabled:opacity-50"
                onClick={onClose}
                disabled={busy}
              >
                Maybe later
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              You can cancel anytime in the Stripe customer portal (we can add a “Manage billing” button next).
            </p>
          </div>

          {/* Contractor Pro (optional demo / coming soon) */}
          <div className="rounded-2xl border p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">Contractor Pro</div>
              <div className="text-sm text-neutral-700">
                <span className="font-semibold">$49</span>/mo
              </div>
            </div>

            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {[
                "Everything in Home Plus",
                "Client-friendly share links",
                "Job documentation timeline",
                "Fewer misunderstandings & callbacks",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-[2px]">✅</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-2">
              <button
                className="w-full rounded-xl border py-2.5 font-medium hover:bg-neutral-50"
                onClick={() => {
                  // Keep as demo until you add a Contractor Pro Stripe price + route.
                  const next = setPlan("contractor_pro");
                  onUpgraded?.(next.planId);
                  onClose();
                }}
              >
                Upgrade to Pro (demo for now)
              </button>

              <p className="text-xs text-neutral-500">
                Next step: add STRIPE_CONTRACTOR_PRO_PRICE_ID + a subscription checkout path for this plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
