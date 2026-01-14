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
  if (!open) return null;

  const title =
    context === "photo"
      ? "You’ve used your free photo checks"
      : "You’ve used your free bid check";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] m-3 rounded-2xl bg-white shadow-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Upgrade to unlock full answers, cost ranges, project history, and shareable links.
            </p>
          </div>
          <button className="text-neutral-500 hover:text-neutral-900" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">Homeowner Plus</div>
              <div className="text-sm text-neutral-700">
                <span className="font-semibold">$14</span>/mo or{" "}
                <span className="font-semibold">$129</span>/yr
              </div>
            </div>

            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {[
                "Unlimited photo checks",
                "Full issue breakdowns + cost ranges",
                "Project history + issue tracking",
                "Shareable view links",
                "Full bid check + red flags",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-[2px]">✅</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-black text-white py-2.5 font-medium hover:bg-black/90"
                onClick={() => {
                  // Demo upgrade (Stripe comes later)
                  const next = setPlan("home_plus");
                  onUpgraded?.(next.planId);
                  onClose();
                }}
              >
                Upgrade to Plus (demo)
              </button>
              <button className="rounded-xl border py-2.5 px-4 font-medium hover:bg-neutral-50" onClick={onClose}>
                Maybe later
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Next step: we’ll wire this button to Stripe checkout.
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">Contractor Pro</div>
              <div className="text-sm text-neutral-700">
                <span className="font-semibold">$49</span>/mo or{" "}
                <span className="font-semibold">$499</span>/yr
              </div>
            </div>

            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {[
                "Everything in Plus",
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

            <div className="mt-4">
              <button
                className="w-full rounded-xl border py-2.5 font-medium hover:bg-neutral-50"
                onClick={() => {
                  const next = setPlan("contractor_pro");
                  onUpgraded?.(next.planId);
                  onClose();
                }}
              >
                Upgrade to Pro (demo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
