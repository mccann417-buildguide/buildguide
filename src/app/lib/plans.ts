// src/app/lib/plans.ts

export type PlanKey =
  | "one_report_photo"
  | "one_report_bid"
  | "project_pass_14d"
  | "home_plus_monthly";

/**
 * These map to the Stripe Price "lookup_key" values you set in the Dashboard.
 * No price IDs, no hardcoded dollar amounts.
 */
export const PLAN_TO_LOOKUP_KEY: Record<PlanKey, string> = {
  one_report_photo: "bg_one_report_photo",
  one_report_bid: "bg_one_report_bid",
  project_pass_14d: "bg_project_pass_14d",
  home_plus_monthly: "bg_home_plus_monthly",
};

export function isSubscriptionPlan(plan: PlanKey) {
  return plan === "home_plus_monthly";
}
