// src/app/pricing/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import {
  setPlan,
  startProjectPass,
  getActivePlan,
  type PlanId,
  PLAN_EVENT,
} from "../lib/storage";

type VerifyResponse =
  | { ok: true; entitlement: any }
  | { ok: false; entitlement?: any; message?: string };

const STRIPE_CUSTOMER_KEY = "buildguide_stripe_customer_id";

function fmtDateTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function saveCustomerId(customerId: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!customerId) return;
  try {
    window.localStorage.setItem(STRIPE_CUSTOMER_KEY, String(customerId));
  } catch {}
}

function loadCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STRIPE_CUSTOMER_KEY);
    return v ? String(v) : null;
  } catch {
    return null;
  }
}

export default function PricingPage() {
  const [busyPlan, setBusyPlan] = React.useState<null | "project_pass_14d" | "home_plus">(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [activePlan, setActivePlan] = React.useState<PlanId>("free");
  const [passExpiresAt, setPassExpiresAt] = React.useState<number | null>(null);

  function syncPlan() {
    const st = getActivePlan();
    setActivePlan(st.planId);
    setPassExpiresAt((st as any).projectPassExpiresAt ?? null);
  }

  React.useEffect(() => {
    syncPlan();

    // ✅ Keep page in sync with same-tab plan changes
    const onPlan = () => syncPlan();
    window.addEventListener(PLAN_EVENT, onPlan);
    window.addEventListener("storage", onPlan); // other tabs

    return () => {
      window.removeEventListener(PLAN_EVENT, onPlan);
      window.removeEventListener("storage", onPlan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Verify Stripe return (session_id) and activate local plan
  React.useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const sessionId = sp.get("session_id") ?? "";
        if (!sessionId) return;

        setErr(null);

        const v = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const vdata = (await v.json().catch(() => null)) as VerifyResponse | null;
        const entitlement = (vdata as any)?.entitlement;

        // ✅ Home Plus subscription
        if (v.ok && vdata?.ok && entitlement?.type === "subscription") {
          // store customer id so portal works
          saveCustomerId(entitlement?.customer);

          if (entitlement?.status === "active" || entitlement?.status === "trialing") {
            setPlan("home_plus");
            setToast("✅ Home Plus activated.");
          } else {
            setToast(`⚠️ Subscription not active yet: ${String(entitlement?.status ?? "unknown")}`);
          }
        }
        // ✅ Project Pass (14 days)
        else if (v.ok && vdata?.ok && entitlement?.type === "pass" && entitlement?.plan === "project_pass_14d") {
          startProjectPass(14);
          setToast("✅ Project Pass activated (14 days).");
        }
        // ✅ Not confirmed (but handled gracefully)
        else if (v.ok && vdata && (vdata as any).ok === false) {
          setToast(
            `⚠️ ${String(
              (vdata as any)?.entitlement?.message ?? (vdata as any)?.message ?? "Not confirmed yet."
            )}`
          );
        } else {
          setToast("⚠️ Payment not confirmed yet. If you just paid, refresh once.");
        }

        // Clean URL (remove session_id)
        try {
          const clean = new URL(window.location.href);
          clean.searchParams.delete("session_id");
          window.history.replaceState({}, "", clean.toString());
        } catch {}

        syncPlan();
      } catch (e: any) {
        setToast(e?.message ?? "Verify failed.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(plan: "project_pass_14d" | "home_plus") {
    setBusyPlan(plan);
    setErr(null);
    setToast(null);

    try {
      // ✅ Return to pricing so this page can verify + activate the plan
      const returnPath = "/pricing";

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          successPath: returnPath,
          cancelPath: returnPath,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start Stripe checkout.");

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing Stripe checkout URL.");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setBusyPlan(null);
    }
  }

  function goUseApp() {
    // ✅ send to HOME so they can choose Photo or Bid
    window.location.href = "/";
  }

  async function openBillingPortal() {
    try {
      setErr(null);
      setToast(null);

      const customerId = loadCustomerId();
      if (!customerId) {
        throw new Error(
          "No customerId found yet. Do one Home Plus checkout, then return here so we can save it from /api/stripe/verify."
        );
      }

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/pricing", // ✅ matches your portal route param name
          customerId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not open billing portal.");

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing portal URL.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not open billing portal.");
    }
  }

  const isHomePlus = activePlan === "home_plus";
  const isPass = activePlan === "project_pass_14d";

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BuildGuide Pricing</h1>
          <p className="mt-1 text-neutral-700">Start free. Upgrade when you want deeper insight and more runs.</p>

          <div className="mt-2 text-xs text-neutral-600">
            Current plan: <span className="font-semibold">{activePlan}</span>
            {isPass && passExpiresAt ? (
              <>
                {" "}
                · Expires: <span className="font-semibold">{fmtDateTime(passExpiresAt)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Back home
          </Link>
        </div>
      </div>

      {toast ? <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">{toast}</div> : null}
      {err ? <div className="rounded-2xl border bg-red-50 p-4 text-sm text-red-700">{err}</div> : null}

      {/* FREE */}
      <div className="rounded-2xl border p-6 space-y-3">
        <div className="text-sm font-semibold">Free</div>
        <div className="text-3xl font-semibold">$0</div>
        <ul className="text-sm text-neutral-800 space-y-2 mt-3">
          <li>• Try Photo Check + Bid Check</li>
          <li>• One-time unlocks still available ($2.99 inside each report)</li>
          <li>• Great for occasional use</li>
        </ul>
        <div className="pt-4 flex gap-2">
          <Link href="/photo" className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Photo Check
          </Link>
          <Link href="/bid" className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Bid Check
          </Link>
        </div>
      </div>

      {/* PROJECT PASS 14D */}
      <div className="rounded-2xl border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Project Pass</div>
          <div className="text-xs rounded-full border px-2 py-1">⭐ Best for one project</div>
        </div>

        <div className="text-3xl font-semibold">
          $16.99 <span className="text-base font-medium text-neutral-600">/ 14 days</span>
        </div>

        <ul className="text-sm text-neutral-800 space-y-2 mt-3">
          <li>• Unlimited Bid + Photo checks for one active project</li>
          <li>• No auto-renew</li>
          <li>• Perfect for quotes, renovations, and short timelines</li>
        </ul>

        <button
          onClick={() => {
            if (isPass) return goUseApp();
            return startCheckout("project_pass_14d");
          }}
          disabled={busyPlan !== null || isHomePlus}
          className="mt-4 w-full rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
        >
          {isHomePlus
            ? "Included with Home Plus"
            : isPass
              ? "✅ Project Pass Active — Go Use It"
              : busyPlan === "project_pass_14d"
                ? "Redirecting…"
                : "Start Project Pass"}
        </button>

        <div className="text-xs text-neutral-600">Activates instantly after Stripe confirms payment.</div>
      </div>

      {/* HOME PLUS */}
      <div className="rounded-2xl border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Home Plus</div>
          <div className="text-xs rounded-full border px-2 py-1">Best value</div>
        </div>

        <div className="text-3xl font-semibold">
          $29<span className="text-base font-medium text-neutral-600">/mo</span>
        </div>

        <ul className="text-sm text-neutral-800 space-y-2 mt-3">
          <li>• Unlimited usage (fair-use)</li>
          <li>• Auto-renew</li>
          <li>• Designed for repeat use (projects, repairs, quotes)</li>
        </ul>

        <button
          onClick={() => {
            if (isHomePlus) return goUseApp();
            return startCheckout("home_plus");
          }}
          disabled={busyPlan !== null}
          className="mt-4 w-full rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
        >
          {isHomePlus ? "✅ Home Plus Active — Go Use It" : busyPlan === "home_plus" ? "Redirecting…" : "Start Home Plus"}
        </button>

        {/* ✅ Manage billing only when active */}
        {isHomePlus ? (
          <button
            onClick={openBillingPortal}
            className="mt-3 w-full rounded-xl border px-5 py-3 text-sm font-medium hover:bg-neutral-50"
            type="button"
          >
            Manage billing
          </button>
        ) : null}

        <div className="text-xs text-neutral-600">Cancel anytime in the Stripe customer portal.</div>
      </div>
    </main>
  );
}
