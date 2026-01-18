"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const key = (id: string) => `buildguide_bid_addon_unlocked_${id}`;

export default function SuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Verifying payment…");

  useEffect(() => {
    const sessionId = sp.get("session_id");
    const resultId = sp.get("resultId");

    if (!sessionId || !resultId) {
      setMsg("Missing payment info.");
      return;
    }

    fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.paid) {
          localStorage.setItem(key(resultId), "1");
          setMsg("Payment confirmed. Unlocking report…");
          setTimeout(() => {
            router.replace(`/history/${resultId}`);
          }, 600);
        } else {
          setMsg("Payment not confirmed.");
        }
      })
      .catch(() => setMsg("Verification failed."));
  }, []);

  return <div className="p-10 text-lg">{msg}</div>;
}
