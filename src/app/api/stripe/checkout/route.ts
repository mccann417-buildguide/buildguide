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

    // Do NOT pass apiVersion (avoids TS mismatch if stripe sdk version differs)
    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json().catch(() => null);
    const resultId = String(body?.resultId ?? "").trim();
    const area = String(body?.area ?? "").trim(); // optional

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pay/success?session_id={CHECKOUT_SESSION_ID}&resultId=${encodeURIComponent(
        resultId
      )}`,
      cancel_url: `${origin}/pay/cancel?resultId=${encodeURIComponent(resultId)}`,
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
