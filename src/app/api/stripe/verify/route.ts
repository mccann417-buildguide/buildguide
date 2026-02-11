// src/app/api/stripe/verify/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any,
});

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

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
    };

async function verifySession(session_id: string) {
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["line_items", "subscription"],
  });

  const md = (session.metadata || {}) as Record<string, string>;
  const plan = (md.plan || "").trim();
  const kind = (md.kind || "").trim();
  const resultId = (md.resultId || "").trim();
  const returnTo = (md.returnTo || "").trim();

  // ✅ SUBSCRIPTION (Home Plus)
  if (session.mode === "subscription") {
    const sub = session.subscription as Stripe.Subscription | null;

    if (!sub) {
      return {
        ok: false,
        entitlement: { type: "unknown", message: "No subscription found on session." } as Entitlement,
      };
    }

    return {
      ok: true,
      entitlement: {
        type: "subscription",
        plan: "home_plus",
        status: sub.status,
        customer: (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null,
        subscriptionId: sub.id ?? null,
        returnTo: returnTo || undefined,
      } as Entitlement,
    };
  }

  // ✅ ONE-TIME PAYMENTS (one report OR project pass)
  if (session.mode === "payment") {
    if (session.payment_status !== "paid") {
      return {
        ok: false,
        entitlement: { type: "unknown", message: `Payment not completed: ${session.payment_status}` } as Entitlement,
      };
    }

    // ✅ Project Pass 14d
    if (plan === "project_pass_14d" || kind === "project_pass_14d") {
      return {
        ok: true,
        entitlement: {
          type: "pass",
          plan: "project_pass_14d",
          days: 14,
          paid: true,
          returnTo: returnTo || undefined,
        } as Entitlement,
      };
    }

    // ✅ One-report (photo/bid)
    const resolved =
      plan === "one_report_photo"
        ? { plan: "one_report_photo" as const, kind: "photo" as const }
        : plan === "one_report_bid"
          ? { plan: "one_report_bid" as const, kind: "bid" as const }
          : // fallback (older callers)
            kind === "photo"
            ? { plan: "one_report_photo" as const, kind: "photo" as const }
            : kind === "bid"
              ? { plan: "one_report_bid" as const, kind: "bid" as const }
              : null;

    if (!resolved) {
      return {
        ok: true,
        entitlement: {
          type: "unknown",
          message: `Paid, but could not determine entitlement. metadata.plan="${plan}", metadata.kind="${kind}"`,
        } as Entitlement,
      };
    }

    return {
      ok: true,
      entitlement: {
        type: "one_report",
        kind: resolved.kind,
        plan: resolved.plan,
        paid: true,
        resultId: resultId || undefined,
        returnTo: returnTo || undefined,
      } as Entitlement,
    };
  }

  return {
    ok: false,
    entitlement: { type: "unknown", message: `Unsupported session mode: ${session.mode}` } as Entitlement,
  };
}

// ✅ Your app calls POST with JSON body: { session_id }
export async function POST(req: Request) {
  try {
    requireEnv("STRIPE_SECRET_KEY");

    const body = (await req.json().catch(() => ({}))) as { session_id?: string };
    const session_id = (body.session_id || "").trim();

    if (!session_id) {
      return NextResponse.json({ ok: false, message: "Missing session_id" }, { status: 400 });
    }

    const out = await verifySession(session_id);

    // Return 200 always so UI can show message nicely
    return NextResponse.json({ ok: !!out.ok, entitlement: out.entitlement }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Verify error" }, { status: 500 });
  }
}

// Optional GET for debugging
export async function GET(req: Request) {
  try {
    requireEnv("STRIPE_SECRET_KEY");

    const { searchParams } = new URL(req.url);
    const session_id = (searchParams.get("session_id") || "").trim();
    if (!session_id) return NextResponse.json({ ok: false, message: "Missing session_id" }, { status: 400 });

    const out = await verifySession(session_id);
    return NextResponse.json({ ok: !!out.ok, entitlement: out.entitlement }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Verify error" }, { status: 500 });
  }
}
