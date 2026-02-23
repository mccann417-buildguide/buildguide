// src/app/checkout/success/SuccessClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setPlan, startProjectPass } from "../../lib/storage";
import { markUnlocked } from "../../lib/history";

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

function addonKey(kind: "photo" | "bid", resultId: string) {
  return kind === "photo"
    ? `buildguide_photo_addon_unlocked_${resultId}`
    : `buildguide_bid_addon_unlocked_${resultId}`;
}

function creditKey(kind: "photo" | "bid") {
  return kind === "photo" ? "buildguide_credit_photo_v1" : "buildguide_credit_bid_v1";
}

function applyEntitlement(ent: Entitlement) {
  // One-report unlock
  if (ent.type === "one_report" && ent.paid) {
    const rid = (ent.resultId || "").trim();
    if (rid) {
      try {
        localStorage.setItem(addonKey(ent.kind, rid), "1");
      } catch {}

      try {
        markUnlocked(rid);
      } catch {}
    } else {
      try {
        localStorage.setItem(creditKey(ent.kind), "1");
      } catch {}
    }
    return;
  }

  // Project pass
  if (ent.type === "pass" && ent.paid && ent.days) {
    try {
      startProjectPass(ent.days);
    } catch {}
    return;
  }

  // Subscription
  if (ent.type === "subscription") {
    const ok = ent.status === "active" || ent.status === "trialing";
    if (ok) {
      try {
        setPlan("home_plus");
      } catch {}
    }
    return;
  }
}

function destinationFromEntitlement(ent: Entitlement): string {
  if ("returnTo" in ent && ent.returnTo) return ent.returnTo;

  if (ent.type === "one_report" && ent.kind && ent.resultId) {
    return ent.kind === "photo"
      ? `/photo?resultId=${encodeURIComponent(ent.resultId)}`
      : `/bid?resultId=${encodeURIComponent(ent.resultId)}`;
  }

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
        const res = await fetch(`/api/stripe/verify?session_id=${encodeURIComponent(session_id)}`, {
          cache: "no-store",
        });

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
        }, 450);
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