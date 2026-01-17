// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
    const priceId = requireEnv("STRIPE_BID_ADDON_PRICE_ID");

    // ✅ Fix: do NOT pass apiVersion (prevents version mismatch/type errors)
    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json().catch(() => null);
    const resultId = String(body?.resultId ?? "").trim();
    const area = String(body?.area ?? "").trim(); // optional (helpful for metadata)

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    // Prefer NEXT_PUBLIC_APP_URL for deployed environments
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // One-time checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/bid?paid=1&session_id={CHECKOUT_SESSION_ID}&resultId=${encodeURIComponent(resultId)}`,
      cancel_url: `${origin}/bid?canceled=1&resultId=${encodeURIComponent(resultId)}`,
      metadata: {
        resultId,
        ...(area ? { area } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Stripe checkout failed." },
      { status: 500 }
    );
  }
}
