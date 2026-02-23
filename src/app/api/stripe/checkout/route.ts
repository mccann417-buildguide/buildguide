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
  kind?: "one_report" | "project_pass_14d" | "home_plus" | "photo" | "bid";

  // preferred
  plan?: "one_report_photo" | "one_report_bid" | "project_pass_14d" | "home_plus";

  // where user should end up AFTER success verification
  returnTo?: string;

  cancelPath?: string;
  resultId?: string;
};

function pickPriceId(body: CheckoutBody) {
  const plan = body.plan;

  if (plan === "one_report_photo") return process.env.STRIPE_ONE_REPORT_PHOTO_PRICE_ID ?? null;
  if (plan === "one_report_bid") return process.env.STRIPE_ONE_REPORT_BID_PRICE_ID ?? null;

  if (plan === "project_pass_14d") return process.env.STRIPE_PROJECT_PASS_14D_PRICE_ID ?? null;
  if (plan === "home_plus") return process.env.STRIPE_HOME_PLUS_PRICE_ID ?? null;

  // Fallback for older callers
  const kind = body.kind ?? "one_report";
  if (kind === "one_report") return process.env.STRIPE_ONE_REPORT_PRICE_ID ?? null;
  if (kind === "project_pass_14d") return process.env.STRIPE_PROJECT_PASS_14D_PRICE_ID ?? null;
  if (kind === "home_plus") return process.env.STRIPE_HOME_PLUS_PRICE_ID ?? null;

  return null;
}

function pickMode(body: CheckoutBody): Stripe.Checkout.SessionCreateParams.Mode {
  if (body.plan === "home_plus" || body.kind === "home_plus") return "subscription";
  return "payment";
}

// Always store metadata in a way verify can understand
function buildMetadata(body: CheckoutBody) {
  const plan = (body.plan || "").trim();

  // normalizedPlan is what verify expects for pass/subscription routing
  const normalizedPlan: "one_report" | "project_pass_14d" | "home_plus" | "" =
    plan === "one_report_photo" || plan === "one_report_bid"
      ? "one_report"
      : plan === "project_pass_14d"
        ? "project_pass_14d"
        : plan === "home_plus"
          ? "home_plus"
          : ((body.kind as any) ?? "");

  const kind: "photo" | "bid" | "project_pass_14d" | "home_plus" | "" =
    plan === "one_report_photo"
      ? "photo"
      : plan === "one_report_bid"
        ? "bid"
        : plan === "project_pass_14d"
          ? "project_pass_14d"
          : plan === "home_plus"
            ? "home_plus"
            : (body.kind === "photo" || body.kind === "bid" ? body.kind : ("" as any));

  const returnTo = (body.returnTo || "").trim();
  const resultId = (body.resultId || "").trim();

  // Hard guard: one_report must know whether it's photo or bid
  if (normalizedPlan === "one_report" && (kind !== "photo" && kind !== "bid")) {
    return { error: 'Invalid one_report checkout. Use plan:"one_report_photo" or plan:"one_report_bid".' as string };
  }

  return {
    metadata: {
      plan: normalizedPlan,
      kind, // "photo" | "bid" | "project_pass_14d" | "home_plus"
      resultId,
      returnTo,
    } as Record<string, string>,
  };
}

export async function POST(req: Request) {
  try {
    requireEnv("STRIPE_SECRET_KEY");

    const body = (await req.json().catch(() => ({}))) as CheckoutBody;

    if (!body.plan && !body.kind) {
      return NextResponse.json({ error: "Missing plan/kind in checkout request." }, { status: 400 });
    }

    const priceId = pickPriceId(body);
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            `Missing priceId. Check env vars:\n` +
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

    // ✅ Stripe SUCCESS must land on a page that verifies + redirects.
    // Your verifier is /checkout/success (SuccessClient).
    const successPath = "/checkout/success";
    const cancelPath = body.cancelPath ?? "/pricing";
    const mode = pickMode(body);

    const metaOut = buildMetadata(body);
    if ("error" in metaOut) {
      return NextResponse.json({ error: metaOut.error }, { status: 400 });
    }

    const successUrl = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: metaOut.metadata,
    });

    return NextResponse.json({
      url: session.url,
      debug: {
        sessionId: session.id,
        mode,
        priceId,
        successUrl,
        cancelUrl: `${baseUrl}${cancelPath}`,
        metadata: metaOut.metadata,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Stripe checkout error" }, { status: 500 });
  }
}