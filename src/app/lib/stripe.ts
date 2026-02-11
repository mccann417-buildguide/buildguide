// src/app/lib/stripe.ts
import Stripe from "stripe";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Server-side Stripe client (use in route handlers only)
export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-06-20" as any, // ✅ fixes TS typing squiggle
});
