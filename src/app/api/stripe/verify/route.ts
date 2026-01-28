// src/app/api/stripe/verify/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = await req.json().catch(() => ({}));

    // Accept both names
    const sessionId = String(body?.session_id ?? body?.sessionId ?? "").trim();

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid";
    const resultId = String(session.metadata?.resultId ?? "").trim();
    const area = String(session.metadata?.area ?? "").trim();

    return NextResponse.json({
      ok: paid,
      paid,
      resultId,
      area,
      payment_status: session.payment_status,
    });
  } catch (err: any) {
    console.error("stripe verify error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Verify failed." }, { status: 500 });
  }
}
