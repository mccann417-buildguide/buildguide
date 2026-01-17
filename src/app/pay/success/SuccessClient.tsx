// src/app/pay/success/SuccessClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function addonKey(resultId: string) {
  return `buildguide_bid_addon_unlocked_${resultId}`;
}

export default function SuccessClient() {
  const sp = useSearchParams();
  const sessionId = sp.get("session_id") ?? "";

  const [status, setStatus] = React.useState<"checking" | "paid" | "not_paid" | "error">("checking");
  const [message, setMessage] = React.useState<string>("");

  React.useEffect(() => {
    async function run() {
      try {
        if (!sessionId) {
          setStatus("error");
          setMessage("Missing session_id.");
          return;
        }

        const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setMessage(data?.error ?? "Verification failed.");
          return;
        }

        if (data?.paid && data?.resultId) {
          // ✅ Mark this report as unlocked (MVP)
          localStorage.setItem(addonKey(String(data.resultId)), "1");
          setStatus("paid");
          setMessage("Payment confirmed. Your detailed report is unlocked for that bid.");
          return;
        }

        setStatus("not_paid");
        setMessage("Payment not confirmed yet. If you just paid, refresh in a few seconds.");
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message ?? "Something went wrong.");
      }
    }

    run();
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 space-y-6">
      <h1 className="text-2xl font-semibold">✅ Payment Status</h1>

      <div className="rounded-2xl border p-5 text-sm text-neutral-800">
        {status === "checking" ? "Checking payment..." : message}
      </div>

      <div className="flex gap-3">
        <Link href="/history" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
          Open History
        </Link>
        <Link href="/bid" className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90">
          Back to Bid Check
        </Link>
      </div>

      <div className="text-xs text-neutral-600">
        Tip: Your bid result is saved in <span className="font-semibold">History</span>. Open it and the “Local Bid
        Comparison / Detailed Report” should show as unlocked for that report.
      </div>
    </main>
  );
}
