// src/app/api/stripe/checkout/route.ts
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
    const STRIPE_BID_ADDON_PRICE_ID = requireEnv("STRIPE_BID_ADDON_PRICE_ID");

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = await req.json().catch(() => ({}));
    const resultId = String(body?.resultId ?? "").trim();
    const area = String(body?.area ?? "").trim();

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_BID_ADDON_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/bid?resultId=${encodeURIComponent(
        resultId
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bid?resultId=${encodeURIComponent(resultId)}`,
      metadata: {
        resultId,
        area,
        product: "bid_full_report",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed." },
      { status: 500 }
    );
  }
}
