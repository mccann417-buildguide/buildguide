"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type Entitlement =
  | {
      type: "one_report";
      kind: "photo" | "bid";
      plan: "one_report_photo" | "one_report_bid";
      paid: true;
      resultId?: string;
      returnTo?: string;
    }
  | {
      type: "pass";
      plan: "project_pass_14d";
      days: 14;
      paid: true;
      returnTo?: string;
    }
  | {
      type: "subscription";
      plan: "home_plus";
      status: "active" | "trialing" | string;
      customer?: string | null;
      subscriptionId?: string | null;
      returnTo?: string;
    }
  | {
      type: "unknown";
      message: string;
      debug?: any;
    };

type VerifyResponse = {
  ok: boolean;
  entitlement?: Entitlement;
  message?: string;
};

function applyEntitlement(ent: Entitlement) {
  const now = Date.now();

  if (ent.type === "one_report" && ent.paid && ent.kind && ent.resultId) {
    localStorage.setItem(`bg_unlocked_${ent.kind}_${ent.resultId}`, "1");
  }

  if (ent.type === "pass" && ent.paid) {
    const expires = now + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem("bg_project_pass_expires", String(expires));
  }

  if (ent.type === "subscription") {
    localStorage.setItem("bg_home_plus_active", "1");
  }
}

function normalizeReturnTo(raw?: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;

  // ✅ ignore "/" because it just dumps people on home and masks bugs
  if (v === "/") return null;

  // ✅ only allow internal paths
  if (!v.startsWith("/")) return null;

  return v;
}

function destinationFromEntitlement(ent: Entitlement): string {
  // Highest priority: explicit returnTo (if valid)
  const safeReturnTo = normalizeReturnTo("returnTo" in ent ? ent.returnTo : undefined);
  if (safeReturnTo) return safeReturnTo;

  // One-report fallback
  if (ent.type === "one_report" && ent.kind && ent.resultId) {
    return ent.kind === "photo"
      ? `/photo?resultId=${encodeURIComponent(ent.resultId)}`
      : `/bid?resultId=${encodeURIComponent(ent.resultId)}`;
  }

  // Pass/subscription fallback (send to pricing or a useful landing page)
  if (ent.type === "pass" || ent.type === "subscription") return "/pricing";

  // Absolute fallback
  return "/pricing";
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

        const ent = data.entitlement;
        if (!ent) {
          setTitle("Verification error");
          setMsg("Verified payment but no entitlement returned. Please contact support.");
          return;
        }

        if (ent.type === "unknown") {
          setTitle("Verified — but could not unlock");
          setMsg(ent.message || "We verified payment, but couldn't determine what to unlock.");
          return;
        }

        setTitle("Payment confirmed ✅");
        setMsg("Unlocking…");

        applyEntitlement(ent);

        const dest = destinationFromEntitlement(ent);

        setTimeout(() => {
          router.replace(dest);
        }, 300);
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
          If this page doesn’t move in a few seconds, go back and try again — or contact support if you were charged.
        </p>
      </div>
    </div>
  );
}