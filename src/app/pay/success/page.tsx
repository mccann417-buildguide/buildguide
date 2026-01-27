// src/app/pay/success/page.tsx
"use client";

import React from "react";
import Link from "next/link";

function addonKey(resultId: string, feature: string) {
  return `buildguide_addon_unlocked_${feature}_${resultId}`;
}

export default function PaySuccessPage() {
  const [msg, setMsg] = React.useState("Verifying payment…");
  const [status, setStatus] = React.useState<
    "checking" | "paid" | "not_paid" | "error"
  >("checking");

  React.useEffect(() => {
    async function run() {
      try {
        const sp = new URLSearchParams(window.location.search);
        const sessionId = sp.get("session_id") ?? "";
        const resultIdFromUrl = sp.get("resultId") ?? "";
        const featureFromUrl = sp.get("feature") ?? "bid_detail";

        if (!sessionId) {
          setStatus("error");
          setMsg("Missing Stripe session id.");
          return;
        }

        const res = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Verify failed.");

        if (data?.paid) {
          const resultId = String(data?.resultId || resultIdFromUrl || "");
          const feature = String(data?.feature || featureFromUrl || "bid_detail");

          if (resultId) {
            // ✅ mark addon unlocked
            localStorage.setItem(addonKey(resultId, feature), "1");
          }

          setStatus("paid");
          setMsg("Payment verified ✅ Redirecting…");

          // ✅ Always go to the unlocked content page
          setTimeout(() => {
            if (resultId) {
              window.location.href = `/history/${encodeURIComponent(resultId)}`;
            } else {
              window.location.href = "/history";
            }
          }, 700);

          return;
        }

        setStatus("not_paid");
        setMsg("Payment not completed yet. If you just paid, refresh in a few seconds.");
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message ?? "Something went wrong verifying payment.");
      }
    }

    run();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payment Status</h1>
        <p className="mt-2 text-neutral-700">{msg}</p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/history"
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Open History
        </Link>
        <Link
          href="/bid"
          className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
        >
          Back to Bid Check
        </Link>
      </div>

      {status === "checking" ? (
        <div className="rounded-2xl border p-4 text-sm text-neutral-700">
          Checking with Stripe…
        </div>
      ) : null}
    </main>
  );
}
