"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VerifyResponse = {
  ok: boolean;
  kind?: "photo" | "bid" | "subscription";
  plan?: "one_report" | "project_pass_14d" | "home_plus";
  resultId?: string;
  returnTo?: string;
  message?: string;
};

function setEntitlement(payload: VerifyResponse) {
  // Minimal MVP: localStorage entitlements
  // You can wire this into your existing FeatureGate logic.
  const now = Date.now();

  if (payload.plan === "one_report" && payload.kind && payload.resultId) {
    // Unlock a single report
    localStorage.setItem(`bg_unlocked_${payload.kind}_${payload.resultId}`, "1");
  }

  if (payload.plan === "project_pass_14d") {
    const expires = now + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem("bg_project_pass_expires", String(expires));
  }

  if (payload.plan === "home_plus") {
    // mark subscription active (MVP – later replace with real auth/webhook)
    localStorage.setItem("bg_home_plus_active", "1");
  }
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Verifying payment…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");
    if (!session_id) {
      setMsg("Missing session_id. Go back and try again.");
      return;
    }

    (async () => {
      const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(session_id)}`);
      const data = (await res.json()) as VerifyResponse;

      if (!data.ok) {
        setMsg(data.message || "Could not verify payment.");
        return;
      }

      // write entitlements first
      setEntitlement(data);

      // then redirect
      const dest =
        data.returnTo ||
        (data.kind === "photo" ? `/photo?resultId=${data.resultId}` :
        data.kind === "bid" ? `/bid?resultId=${data.resultId}` :
        "/");

      router.replace(dest);
    })();
  }, [router]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>BuildGuide</h1>
      <p style={{ marginTop: 12 }}>{msg}</p>
      <p style={{ marginTop: 12, opacity: 0.7 }}>
        If this hangs, go back to Pricing and try again.
      </p>
    </div>
  );
}
