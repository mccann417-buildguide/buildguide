// src/components/SiteHeader.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import { loadState, PLAN_EVENT, type PlanId } from "../lib/storage";

function planLabel(planId: PlanId) {
  if (planId === "home_plus") return "Home Plus";
  if (planId === "contractor_pro") return "Contractor Pro";
  return "Free";
}

function planPillTone(planId: PlanId) {
  if (planId === "home_plus") return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (planId === "contractor_pro") return "bg-indigo-50 border-indigo-200 text-indigo-800";
  return "bg-neutral-50 border-neutral-200 text-neutral-700";
}

export function SiteHeader() {
  const [planId, setPlanId] = React.useState<PlanId>("free");

  React.useEffect(() => {
    const sync = () => {
      const st = loadState();
      setPlanId(st.planId);
    };

    sync();

    const onStorage = () => sync();
    const onPlan = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(PLAN_EVENT, onPlan);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLAN_EVENT, onPlan);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border overflow-hidden bg-white">
            <Image
              src="/icons/icon-192.png"
              alt="BuildGuide"
              width={36}
              height={36}
              className="h-9 w-9 object-cover"
              priority
            />
          </span>
          <span className="tracking-tight">BuildGuide</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-700">
          <Link href="/photo" className="hover:text-neutral-900">
            Photo Check
          </Link>
          <Link href="/bid" className="hover:text-neutral-900">
            Bid Check
          </Link>
          <Link href="/ask" className="hover:text-neutral-900">
            Ask
          </Link>
          <Link href="/history" className="hover:text-neutral-900">
            History
          </Link>
          <Link href="/#how-it-works" className="hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/#testimonials" className="hover:text-neutral-900">
            Reviews
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Plan pill */}
          <span
            className={`hidden sm:inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${planPillTone(planId)}`}
            title="Your current plan"
          >
            {planLabel(planId)}
          </span>

          {/* Mobile quick nav */}
          <Link
            href="/photo"
            className="md:hidden inline-flex rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Photo
          </Link>

          <Link
            href="/bid"
            className="hidden sm:inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Bid
          </Link>

          <Link
            href="/history"
            className="hidden sm:inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            History
          </Link>

          {/* Pricing entry point */}
          <Link
            href="/pricing"
            className="hidden sm:inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            title={planId === "free" ? "View pricing" : "View plan / billing"}
          >
            {planId === "free" ? "Pricing" : "Pro Active"}
          </Link>

          <Link
            href="/photo"
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
          >
            Try Photo Check
          </Link>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden border-t bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between text-sm">
          <Link href="/photo" className="px-2 py-1 rounded-lg hover:bg-neutral-50">
            📸 Photo
          </Link>
          <Link href="/bid" className="px-2 py-1 rounded-lg hover:bg-neutral-50">
            📄 Bid
          </Link>
          <Link href="/ask" className="px-2 py-1 rounded-lg hover:bg-neutral-50">
            💬 Ask
          </Link>
          <Link href="/history" className="px-2 py-1 rounded-lg hover:bg-neutral-50">
            🕘 History
          </Link>
        </div>

        <div className="px-6 pb-2">
          <Link
            href="/pricing"
            className={`w-full inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50 ${planPillTone(
              planId
            )}`}
          >
            Plan: {planLabel(planId)} · View Pricing
          </Link>
        </div>
      </div>
    </header>
  );
}
