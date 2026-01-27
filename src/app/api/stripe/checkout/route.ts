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

function getBaseUrl(req: Request) {
  // Works on Vercel + localhost
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.headers.get("origin")?.replace(/^https?:\/\//, "") ||
    "localhost:3000";

  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
    const STRIPE_BID_ADDON_PRICE_ID = requireEnv("STRIPE_BID_ADDON_PRICE_ID");

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      // Remove apiVersion typing issues by not hardcoding here.
      // Stripe will default to your account’s API version.
    });

    const body = await req.json().catch(() => ({}));
    const resultId = String(body?.resultId ?? "").trim();
    const area = String(body?.area ?? "").trim();

    if (!resultId) {
      return NextResponse.json({ error: "Missing resultId" }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_BID_ADDON_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/bid?resultId=${encodeURIComponent(
        resultId
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/bid?resultId=${encodeURIComponent(resultId)}`,
      metadata: {
        resultId,
        area: area || "",
        product: "bid_addon_full_report",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // IMPORTANT: return the actual error so you can see it in the browser popup
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed." },
      { status: 500 }
    );
  }
}
