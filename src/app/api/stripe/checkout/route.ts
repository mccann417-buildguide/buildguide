import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
    const priceId = env("STRIPE_BID_ADDON_PRICE_ID");

    const body = await req.json();
    const resultId = String(body.resultId || "").trim();

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pay/success?session_id={CHECKOUT_SESSION_ID}&resultId=${encodeURIComponent(resultId)}`,
      cancel_url: `${origin}/bid`,
      metadata: { resultId },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
