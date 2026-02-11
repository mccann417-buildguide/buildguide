// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Stripe requires the raw body for signature verification
export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = requireEnv("STRIPE_WEBHOOK_SECRET");

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Missing stripe-signature", { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err?.message ?? err);
      return new Response("Bad signature", { status: 400 });
    }

    // ✅ For now we just log and acknowledge.
    // Later (Phase 2) we’ll store subscription status in DB and enforce limits.
    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ checkout.session.completed", {
          id: event.id,
          mode: (event.data.object as any)?.mode,
        });
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        console.log(`🔁 ${event.type}`, {
          id: event.id,
          sub: (event.data.object as any)?.id,
          status: (event.data.object as any)?.status,
        });
        break;

      case "invoice.paid":
      case "invoice.payment_failed":
        console.log(`💳 ${event.type}`, { id: event.id });
        break;

      default:
        // keep quiet or log if you want
        // console.log("Unhandled event:", event.type);
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message ?? err);
    return new Response("Webhook error", { status: 500 });
  }
}
