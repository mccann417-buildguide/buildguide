// src/app/pay/success/page.tsx
"use client";

import React from "react";
import Link from "next/link";

function addonKey(resultId: string) {
  return `buildguide_bid_addon_unlocked_${resultId}`;
}

export default function PaySuccessPage() {
  const [msg, setMsg] = React.useState("Verifying payment…");
  const [status, setStatus] = React.useState<"checking" | "paid" | "not_paid" | "error">("checking");

  React.useEffect(() => {
    async function run() {
      try {
        const sp = new URLSearchParams(window.location.search);
        const sessionId = sp.get("session_id") ?? "";
        const resultIdFromUrl = sp.get("resultId") ?? "";

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

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Verify failed.");

        if (data?.paid) {
          const resultId = String(data?.resultId || resultIdFromUrl || "");
          if (resultId) localStorage.setItem(addonKey(resultId), "1");

          setStatus("paid");
          setMsg("Payment verified. ✅ Unlock applied.");

          setTimeout(() => {
            window.location.href = "/bid";
          }, 900);
          return;
        }

        setStatus("not_paid");
        setMsg("Payment not completed yet.");
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
        <Link href="/bid" className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90">
          Back to Bid Check
        </Link>
        <Link href="/history" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
          History
        </Link>
      </div>

      {status === "checking" ? (
        <div className="rounded-2xl border p-4 text-sm text-neutral-700">Checking with Stripe…</div>
      ) : null}
    </main>
  );
}
