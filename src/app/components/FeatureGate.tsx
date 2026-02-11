// src/app/components/FeatureGate.tsx
"use client";

import React from "react";
import {
  loadState,
  PLAN_EVENT,
  incrementUsage,
  type PlanId,
  getActivePlan,
} from "../lib/storage";

type GateKind = "bid" | "photo" | "ask" | "question";

type GateRenderProps = {
  allowed: boolean; // Phase 1: always true (never blocks)
  openPaywall: () => void; // kept for compatibility
  remaining: number; // informational only
  planId: PlanId;
  consume: () => void; // call after a successful run (for counters)
};

type Props = {
  kind: GateKind;
  children: (props: GateRenderProps) => React.ReactNode;
};

// For ask/question only (until you add them to storage.ts usage)
const USAGE_EVENT = "buildguide:usage_updated";

function legacyUsageKey(kind: GateKind) {
  return `buildguide_usage_${kind}`;
}

/**
 * Caps are for UI/display only (Phase 1 soft launch: never blocks).
 * We can tighten enforcement later.
 *
 * ✅ IMPORTANT:
 * - If Project Pass 14d is active, treat as "unlimited" during the window.
 * - Home Plus is subscription unlimited.
 */
function capsForPlan(planId: PlanId): Record<GateKind, number> {
  // Unlimited plans
  if (planId === "project_pass_14d" || planId === "home_plus" || planId === "contractor_pro") {
    return { bid: 9999, photo: 9999, ask: 9999, question: 9999 };
  }

  // Free
  return { bid: 1, photo: 1, ask: 3, question: 3 };
}

function getLegacyUsed(kind: GateKind): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(legacyUsageKey(kind));
    const used = raw ? Number(raw) : 0;
    return Number.isFinite(used) && used >= 0 ? used : 0;
  } catch {
    return 0;
  }
}

function setLegacyUsed(kind: GateKind, used: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(legacyUsageKey(kind), String(Math.max(0, Math.floor(used))));
  } catch {}
}

function getUsed(kind: GateKind): number {
  const st = loadState();

  // ✅ Use storage.ts usage for bid/photo
  if (kind === "photo") return st.usage.photoChecksLifetimeUsed ?? 0;
  if (kind === "bid") return st.usage.bidChecksLifetimeUsed ?? 0;

  // ✅ Keep legacy for ask/question until you add them to AppState
  return getLegacyUsed(kind);
}

function consume(kind: GateKind) {
  // ✅ bid/photo: incrementUsage updates storage + dispatches PLAN_EVENT (via saveState)
  if (kind === "photo" || kind === "bid") {
    incrementUsage(kind);
    return;
  }

  // ✅ ask/question: legacy localStorage counters + same-tab event
  const used = getLegacyUsed(kind);
  setLegacyUsed(kind, used + 1);
  try {
    window.dispatchEvent(new Event(USAGE_EVENT));
  } catch {}
}

function getRemaining(kind: GateKind, planId: PlanId) {
  const caps = capsForPlan(planId);
  const cap = caps[kind] ?? 0;
  const used = getUsed(kind);
  return Math.max(0, cap - used);
}

export function FeatureGate({ kind, children }: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [remaining, setRemaining] = React.useState<number>(0);
  const [planId, setPlanId] = React.useState<PlanId>("free");

  React.useEffect(() => {
    setMounted(true);

    const sync = () => {
      // ✅ Use "active plan" (auto-falls back to free if Project Pass expired)
      const active = getActivePlan();
      setPlanId(active.planId);
      setRemaining(getRemaining(kind, active.planId));
    };

    sync();

    const onStorage = () => sync(); // other tabs
    const onPlan = () => sync(); // same tab plan/usage change (saveState dispatches PLAN_EVENT)
    const onUsage = () => sync(); // same tab ask/question legacy usage

    window.addEventListener("storage", onStorage);
    window.addEventListener(PLAN_EVENT, onPlan);
    window.addEventListener(USAGE_EVENT, onUsage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLAN_EVENT, onPlan);
      window.removeEventListener(USAGE_EVENT, onUsage);
    };
  }, [kind]);

  // Phase 1: NEVER block. (We’ll enforce later.)
  const allowed = true;
  const safeRemaining = mounted ? remaining : 0;

  return (
    <>
      {children({
        allowed,
        openPaywall: () => {},
        remaining: safeRemaining,
        planId,
        consume: () => consume(kind),
      })}
    </>
  );
}
