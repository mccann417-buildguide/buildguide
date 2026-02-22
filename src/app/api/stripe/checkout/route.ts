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

  // where user should end up AFTER verify (optional)
  returnTo?: string;

  // optional override (usually not needed)
  cancelPath?: string;

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

function pickMode(body: CheckoutBody): Stripe.Checkout.SessionCreateParams.Mode {
  if (body.plan === "home_plus" || body.kind === "home_plus") return "subscription";
  return "payment";
}

function deriveMeta(body: CheckoutBody): {
  derivedKind: "" | "photo" | "bid";
  normalizedPlan: "" | "one_report" | "project_pass_14d" | "home_plus";
} {
  const derivedKind: "" | "photo" | "bid" =
    body.plan === "one_report_photo"
      ? "photo"
      : body.plan === "one_report_bid"
        ? "bid"
        : "";

  const normalizedPlan: "" | "one_report" | "project_pass_14d" | "home_plus" =
    body.plan === "one_report_photo" || body.plan === "one_report_bid"
      ? "one_report"
      : body.plan === "project_pass_14d"
        ? "project_pass_14d"
        : body.plan === "home_plus"
          ? "home_plus"
          : ((body.kind as any) ?? "");

  return { derivedKind, normalizedPlan };
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

    const successPath = "/checkout/success";

    // ✅ IMPORTANT FIX:
    // Only set returnTo if the caller actually provided it.
    // DO NOT default to "/", because that forces the success page to always redirect home.
    const returnTo = (body.returnTo || "").trim(); // "" means "not provided"

    const cancelPath = body.cancelPath ?? "/pricing";
    const mode = pickMode(body);

    const successUrl = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;

    const { derivedKind, normalizedPlan } = deriveMeta(body);

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${baseUrl}${cancelPath}`,
      metadata: {
        plan: normalizedPlan,
        kind: derivedKind || (body.kind ?? ""), // ideally "photo"|"bid" for one_report, or "project_pass_14d"/"home_plus"
        resultId: body.resultId ?? "",
        // ✅ store returnTo ONLY if present
        returnTo,
      },
    });

    return NextResponse.json({
      url: session.url,
      debug: {
        sessionId: session.id,
        mode,
        priceId,
        planReceived: body.plan ?? null,
        kindReceived: body.kind ?? null,
        successUrl,
        returnTo: returnTo || null,
        cancelUrl: `${baseUrl}${cancelPath}`,
        meta: {
          plan: normalizedPlan,
          kind: derivedKind || (body.kind ?? ""),
          resultId: body.resultId ?? "",
          returnTo: returnTo || null,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Stripe checkout error" }, { status: 500 });
  }
}