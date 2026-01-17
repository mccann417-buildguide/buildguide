"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";

function addonKey(resultId: string) {
  return `buildguide_bid_addon_unlocked_${resultId}`;
}

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = React.useState("Verifying payment…");

  React.useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setMsg("Missing session_id. Returning to Bid Check…");
      setTimeout(() => router.replace("/bid"), 800);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Verify failed.");

        if (data?.paid && data?.resultId) {
          localStorage.setItem(addonKey(data.resultId), "1");
          setMsg("Payment verified ✅ Unlocking…");
        } else {
          setMsg("Payment not confirmed yet. Returning…");
        }

        setTimeout(() => router.replace("/bid"), 900);
      } catch (e: any) {
        setMsg(e?.message ?? "Verification error");
        setTimeout(() => router.replace("/bid"), 1200);
      }
    })();
  }, [searchParams, router]);

  return (
    <main className="mx-auto max-w-xl px-6 py-14">
      <h1 className="text-2xl font-semibold">Payment Success</h1>
      <p className="mt-3 text-neutral-700">{msg}</p>
    </main>
  );
}
