import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any,
});

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as { returnPath?: string };

    // ⚠️ For now, we rely on the email prefilled in Stripe Checkout or
    // an existing logged-in customer system (Phase 2).
    // Since you don't have auth, we ask the browser to provide the customer id from localStorage.
    // We'll accept it explicitly.
    const customerId = (body as any)?.customerId as string | undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId (we'll store it automatically after a successful subscription verify)." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);
    const returnUrl = `${baseUrl}${body.returnPath ?? "/pricing"}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Portal error" }, { status: 500 });
  }
}
