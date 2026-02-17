"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // If Stripe sent session_id here, forward to the success page that verifies it
    const sessionId = params.get("session_id");
    if (sessionId) {
      router.replace(`/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
      return;
    }

    // Otherwise send them home (or to pricing)
    router.replace("/pricing");
  }, [params, router]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>BuildGuide</h1>
      <p style={{ marginTop: 12 }}>Redirecting…</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>BuildGuide</h1>
          <p style={{ marginTop: 12 }}>Redirecting…</p>
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
