// src/app/lib/entitlements.ts
import type { PlanId, Usage } from "./storage";

export const FREE_LIMITS = {
  photoChecksLifetime: 2, // set to 1 if you want
  bidChecksLifetime: 1,
};

export type Entitlements = {
  planId: PlanId;
  isPaid: boolean;
  canPhotoCheck: boolean;
  canBidCheck: boolean;
  remainingPhotoChecks: number | "unlimited";
  remainingBidChecks: number | "unlimited";
};

export function getEntitlements(planId: PlanId, usage: Usage): Entitlements {
  const isPaid = planId !== "free";

  if (isPaid) {
    return {
      planId,
      isPaid: true,
      canPhotoCheck: true,
      canBidCheck: true,
      remainingPhotoChecks: "unlimited",
      remainingBidChecks: "unlimited",
    };
  }

  const remainingPhoto = Math.max(0, FREE_LIMITS.photoChecksLifetime - usage.photoChecksLifetimeUsed);
  const remainingBid = Math.max(0, FREE_LIMITS.bidChecksLifetime - usage.bidChecksLifetimeUsed);

  return {
    planId,
    isPaid: false,
    canPhotoCheck: remainingPhoto > 0,
    canBidCheck: remainingBid > 0,
    remainingPhotoChecks: remainingPhoto,
    remainingBidChecks: remainingBid,
  };
}
