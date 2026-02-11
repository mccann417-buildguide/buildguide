// src/lib/pricingLogic.ts

export type MarketPosition =
  | "significantly_below"
  | "below"
  | "within"
  | "above"
  | "significantly_above"
  | "unknown";

export interface PricingResult {
  marketLow: number;
  marketMid: number;
  marketHigh: number;
  bidAmount: number | null;
  position: MarketPosition;
  percentFromHigh?: number;
  percentFromLow?: number;
}

/**
 * Conservative, contractor-safe pricing placement.
 * Market band is separate from bid amount.
 */
export function evaluateBidPricing(params: {
  marketLow: number;
  marketHigh: number;
  bidAmount?: number | null;
}): PricingResult {
  const low = Number(params.marketLow);
  const high = Number(params.marketHigh);
  const bid = params.bidAmount ?? null;

  const marketLow = Number.isFinite(low) && low > 0 ? low : 0;
  const marketHigh =
    Number.isFinite(high) && high > marketLow ? high : marketLow;

  const marketMid =
    marketLow > 0 && marketHigh > 0
      ? Math.round((marketLow + marketHigh) / 2)
      : 0;

  if (!bid || !Number.isFinite(bid) || bid <= 0 || marketLow === 0 || marketHigh === 0) {
    return {
      marketLow,
      marketMid,
      marketHigh,
      bidAmount: null,
      position: "unknown",
    };
  }

  // significantly below = 20%+ under low
  if (bid < marketLow * 0.8) {
    return {
      marketLow,
      marketMid,
      marketHigh,
      bidAmount: bid,
      position: "significantly_below",
      percentFromLow: Math.round(((marketLow - bid) / marketLow) * 100),
    };
  }

  // below = under low but within 20%
  if (bid < marketLow) {
    return {
      marketLow,
      marketMid,
      marketHigh,
      bidAmount: bid,
      position: "below",
      percentFromLow: Math.round(((marketLow - bid) / marketLow) * 100),
    };
  }

  // within range
  if (bid <= marketHigh) {
    return {
      marketLow,
      marketMid,
      marketHigh,
      bidAmount: bid,
      position: "within",
    };
  }

  // above = up to 40% over high
  if (bid <= marketHigh * 1.4) {
    return {
      marketLow,
      marketMid,
      marketHigh,
      bidAmount: bid,
      position: "above",
      percentFromHigh: Math.round(((bid - marketHigh) / marketHigh) * 100),
    };
  }

  // significantly above = 40%+ over high
  return {
    marketLow,
    marketMid,
    marketHigh,
    bidAmount: bid,
    position: "significantly_above",
    percentFromHigh: Math.round(((bid - marketHigh) / marketHigh) * 100),
  };
}

/**
 * FREE view labels (NO numbers).
 */
export function positionToFreeLabel(position: MarketPosition): {
  tone: "neutral" | "warn" | "alert";
  title: string;
  line: string;
} {
  switch (position) {
    case "within":
      return {
        tone: "neutral",
        title: "Within Typical Range",
        line: "This bid appears consistent with typical local pricing.",
      };
    case "above":
      return {
        tone: "warn",
        title: "Higher Than Typical",
        line: "This bid appears higher than typical local pricing.",
      };
    case "significantly_above":
      return {
        tone: "alert",
        title: "Significantly Higher Than Typical",
        line: "This bid appears significantly higher than typical local pricing.",
      };
    case "below":
      return {
        tone: "warn",
        title: "Lower Than Typical",
        line: "This bid appears lower than typical local pricing.",
      };
    case "significantly_below":
      return {
        tone: "alert",
        title: "Significantly Lower Than Typical",
        line: "This bid appears significantly lower than typical local pricing.",
      };
    default:
      return {
        tone: "neutral",
        title: "Need More Detail",
        line: "We need a clear bid amount and basic scope details to place it.",
      };
  }
}
