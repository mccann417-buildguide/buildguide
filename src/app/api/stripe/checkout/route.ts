// src/app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getRequestOrigin(req: Request) {
  // Vercel-friendly origin builder (origin header is not always reliable)
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";

  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
    const STRIPE_BID_ADDON_PRICE_ID = requireEnv("STRIPE_BID_ADDON_PRICE_ID");

    // ✅ Removing apiVersion avoids TypeScript squiggles on older stripe typings.
    // Stripe will use your account’s default API version.
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = await req.json().catch(() => ({}));
    const resultId = String(body?.resultId ?? "").trim();
    const area = String(body?.area ?? "").trim();

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    const origin = getRequestOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_BID_ADDON_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/bid?resultId=${encodeURIComponent(
        resultId
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bid?resultId=${encodeURIComponent(resultId)}`,
      metadata: {
        resultId,
        area: area || "",
        product: "bid_addon_full_report",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed." },
      { status: 500 }
    );
  }
}
