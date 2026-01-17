// src/app/api/stripe/verify/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");

    // Stripe SDK (no apiVersion needed here—works fine without it)
    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json().catch(() => null);
    const sessionId = String(body?.sessionId ?? "").trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Treat "no_payment_required" as unlocked (covers edge cases like $0 sessions)
    const paid =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    const resultId = String(session.metadata?.resultId ?? "");

    return NextResponse.json({
      paid,
      resultId,
      status: session.status,
      payment_status: session.payment_status,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Verify failed" }, { status: 500 });
  }
}
