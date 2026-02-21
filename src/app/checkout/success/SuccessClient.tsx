"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type VerifyResponse = {
  ok: boolean;
  kind?: "photo" | "bid" | "subscription";
  plan?: "one_report" | "project_pass_14d" | "home_plus";
  resultId?: string;
  returnTo?: string;
  message?: string;
};

function setEntitlement(payload: VerifyResponse) {
  const now = Date.now();

  if (payload.plan === "one_report" && payload.kind && payload.resultId) {
    localStorage.setItem(`bg_unlocked_${payload.kind}_${payload.resultId}`, "1");
  }

  if (payload.plan === "project_pass_14d") {
    const expires = now + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem("bg_project_pass_expires", String(expires));
  }

  if (payload.plan === "home_plus") {
    localStorage.setItem("bg_home_plus_active", "1");
  }
}

export default function SuccessClient() {
  const router = useRouter();
  const [title, setTitle] = useState("Thanks — payment received ✅");
  const [msg, setMsg] = useState("Verifying your purchase…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");

    if (!session_id) {
      setTitle("Missing payment info");
      setMsg("Missing session_id. Please go back and try again.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/stripe/verify?session_id=${encodeURIComponent(session_id)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as VerifyResponse;

        if (!data.ok) {
          setTitle("Could not verify payment");
          setMsg(data.message || "Payment verification failed. If you were charged, contact support.");
          return;
        }

        setTitle("Payment confirmed ✅");
        setMsg("Unlocking your report…");

        setEntitlement(data);

        const dest =
          data.returnTo ||
          (data.kind === "photo"
            ? `/photo?resultId=${data.resultId}`
            : data.kind === "bid"
              ? `/bid?resultId=${data.resultId}`
              : "/");

        // Leave the page visible briefly (also helps conversion tracking)
        setTimeout(() => {
          router.replace(dest);
        }, 900);
      } catch {
        setTitle("Error verifying payment");
        setMsg("Something went wrong verifying your purchase. Please try again.");
      }
    })();
  }, [router]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>BuildGuide</h1>

      <div style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
        <p style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>{msg}</p>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          If this page doesn’t move in a few seconds, go back to Pricing and try again.
        </p>
      </div>
    </div>
  );
}