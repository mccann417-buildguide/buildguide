// src/app/api/stripe/checkout/route.ts
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

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type CheckoutBody = {
  // legacy/simple
  kind?: "one_report" | "project_pass_14d" | "home_plus";

  // preferred
  plan?: "one_report_photo" | "one_report_bid" | "project_pass_14d" | "home_plus";

  successPath?: string;
  cancelPath?: string;

  // optional metadata
  resultId?: string;
};

function pickPriceId(body: CheckoutBody) {
  const plan = body.plan;

  if (plan === "one_report_photo") return process.env.STRIPE_ONE_REPORT_PHOTO_PRICE_ID ?? null;
  if (plan === "one_report_bid") return process.env.STRIPE_ONE_REPORT_BID_PRICE_ID ?? null;

  if (plan === "project_pass_14d") return process.env.STRIPE_PROJECT_PASS_14D_PRICE_ID ?? null;
  if (plan === "home_plus") return process.env.STRIPE_HOME_PLUS_PRICE_ID ?? null;

  // Fallback for older callers using "kind"
  const kind = body.kind ?? "one_report";
  if (kind === "one_report") return process.env.STRIPE_ONE_REPORT_PRICE_ID ?? null;
  if (kind === "project_pass_14d") return process.env.STRIPE_PROJECT_PASS_14D_PRICE_ID ?? null;
  if (kind === "home_plus") return process.env.STRIPE_HOME_PLUS_PRICE_ID ?? null;

  return null;
}

export async function POST(req: Request) {
  try {
    requireEnv("STRIPE_SECRET_KEY");

    const body = (await req.json().catch(() => ({}))) as CheckoutBody;

    const priceId = pickPriceId(body);
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            `Missing priceId. Check .env.local:\n` +
            `- STRIPE_ONE_REPORT_PHOTO_PRICE_ID\n` +
            `- STRIPE_ONE_REPORT_BID_PRICE_ID\n` +
            `- STRIPE_PROJECT_PASS_14D_PRICE_ID\n` +
            `- STRIPE_HOME_PLUS_PRICE_ID\n` +
            `(optional fallback) STRIPE_ONE_REPORT_PRICE_ID`,
          debug: { receivedPlan: body.plan ?? null, receivedKind: body.kind ?? null },
        },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);
    const successPath = body.successPath ?? "/";
    const cancelPath = body.cancelPath ?? "/";

    const isSubscription = body.plan === "home_plus" || body.kind === "home_plus";
    const mode: Stripe.Checkout.SessionCreateParams.Mode = isSubscription ? "subscription" : "payment";

    // ✅ ALWAYS append ?session_id=... so the app can call /api/stripe/verify
    const successUrl = `${baseUrl}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: {
        plan: body.plan ?? "",
        kind: body.kind ?? "",
        resultId: body.resultId ?? "",
        returnTo: successPath,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Stripe checkout error" }, { status: 500 });
  }
}
