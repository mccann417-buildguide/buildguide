// src/app/components/FeatureGate.tsx
"use client";

import React from "react";
import { loadState } from "../lib/storage";
import { getEntitlements } from "../lib/entitlements";

type Kind = "photo" | "bid";

type GateRenderProps = {
  allowed: boolean;
  remaining: number | "unlimited";
  planId: string;
  openPaywall: () => void;
};

export function FeatureGate({
  kind,
  children,
}: {
  kind: Kind;
  children: (props: GateRenderProps) => React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [paywallOpen, setPaywallOpen] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Key fix: server + first client render match (both render null),
  // then we render real content after mount.
  if (!mounted) return null;

  const state = loadState();
  const ent = getEntitlements(state.planId, state.usage);

  const allowed = kind === "photo" ? ent.canPhotoCheck : ent.canBidCheck;
  const remaining = kind === "photo" ? ent.remainingPhotoChecks : ent.remainingBidChecks;

  function openPaywall() {
    // If you already have a Paywall modal elsewhere, keep using it.
    // This is a safe fallback so nothing breaks.
    setPaywallOpen(true);
  }

  return (
    <>
      {children({
        allowed,
        remaining,
        planId: state.planId,
        openPaywall,
      })}

      {/* Minimal safe paywall fallback (won’t cause hydration issues) */}
      {paywallOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
            <div className="text-lg font-semibold">Upgrade to continue</div>
            <p className="mt-2 text-sm text-neutral-700">
              You’ve hit the free limit. Subscribe to keep using {kind === "photo" ? "Photo Check" : "Bid Check"}.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                onClick={() => {
                  setPaywallOpen(false);
                  setTick((t) => t + 1); // forces re-read of storage if plan changed elsewhere
                }}
              >
                Close
              </button>
              <button
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
                onClick={() => alert("Hook Stripe here later")}
              >
                View plans
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
