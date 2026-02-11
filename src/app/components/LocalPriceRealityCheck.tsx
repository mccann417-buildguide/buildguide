// src/app/components/LocalPriceRealityCheck.tsx

import type { MarketPosition } from "../lib/pricingLogic";
import {
  evaluateBidPricing,
  positionToFreeLabel,
} from "../lib/pricingLogic";
import PricingRangeBar from "./PricingRangeBar";

function money(n: number) {
  return `$${n.toLocaleString()}`;
}

function placementSentence(position: MarketPosition): string {
  switch (position) {
    case "within":
      return "Within the typical market range.";
    case "above":
      return "Above the typical market range.";
    case "significantly_above":
      return "Significantly above the typical market range.";
    case "below":
      return "Below the typical market range.";
    case "significantly_below":
      return "Significantly below the typical market range.";
    default:
      return "Unable to place without a clear bid amount.";
  }
}

function whyItLandedHere(position: MarketPosition): string[] {
  switch (position) {
    case "within":
      return [
        "Scope and finish level appear consistent with typical local projects.",
        "Labor time and material allowances align with common pricing patterns.",
      ];

    case "above":
      return [
        "Often driven by upgraded finishes or added scope.",
        "May include additional prep, protection, warranty, or schedule pressure.",
      ];

    case "significantly_above":
      return [
        "Usually reflects premium finishes, complex conditions, or expanded scope.",
        "If scope doesn’t clearly differ, request an itemized breakdown.",
      ];

    case "below":
      return [
        "Can occur when scope is simplified or finishes are basic.",
        "Confirm what’s included for prep, protection, and cleanup.",
      ];

    case "significantly_below":
      return [
        "Often indicates missing scope items or reduced labor allowance.",
        "Confirm exclusions before approving the bid.",
      ];

    default:
      return [
        "Add project details (size, finishes, demo, access) to refine placement.",
      ];
  }
}

function whatToAsk(position: MarketPosition): string[] {
  switch (position) {
    case "above":
    case "significantly_above":
      return [
        "Can you explain what’s included here that wouldn’t be in a lower-priced bid?",
        "Are there alternates or scope adjustments that could reduce cost?",
        "Is this price driven more by materials, labor time, or site conditions?",
      ];

    case "below":
    case "significantly_below":
      return [
        "Can you confirm what’s included for prep, protection, and cleanup?",
        "Are permits, disposal, and repairs included if issues are found?",
        "How are change orders handled if something unexpected comes up?",
      ];

    case "within":
      return [
        "Can you confirm the scope and finishes so bids can be compared accurately?",
        "What assumptions are built into this price?",
        "What would cause this price to change once work starts?",
      ];

    default:
      return [];
  }
}

interface Props {
  areaLabel: string;          // e.g. "Troy, NY 12180"
  marketLow: number;
  marketHigh: number;
  bidAmount?: number | null;
  isPaid: boolean;
}

export default function LocalPriceRealityCheck({
  areaLabel,
  marketLow,
  marketHigh,
  bidAmount,
  isPaid,
}: Props) {
  const result = evaluateBidPricing({
    marketLow,
    marketHigh,
    bidAmount,
  });

  const free = positionToFreeLabel(result.position);

  const toneClass =
    free.tone === "alert"
      ? "text-red-700"
      : free.tone === "warn"
      ? "text-orange-700"
      : "text-gray-900";

  return (
    <div className="rounded-xl border p-5 bg-white shadow-sm">
      <div>
        <h3 className="font-semibold text-lg">📍 Local Price Reality Check</h3>
        <div className="text-sm text-gray-500">{areaLabel}</div>
      </div>

      {/* FREE — WORDING ONLY */}
      {!isPaid && (
        <div className="mt-4">
          <div className={`font-semibold ${toneClass}`}>
            {free.title}
          </div>
          <div className="text-sm text-gray-700 mt-1">
            {free.line}
          </div>

          <div className="mt-4 text-sm text-gray-600 border-t pt-3">
            Unlock the full report to see typical pricing ranges, where your bid
            lands, and what drives the difference.
          </div>
        </div>
      )}

      {/* PAID — FULL BREAKDOWN */}
      {isPaid && (
        <div className="mt-4">
          {/* Visual */}
          {result.bidAmount && result.marketLow > 0 && result.marketHigh > 0 && (
            <div className="mb-4">
              <PricingRangeBar
                low={result.marketLow}
                mid={result.marketMid}
                high={result.marketHigh}
                bid={result.bidAmount}
                position={result.position}
              />
            </div>
          )}

          {/* Numbers */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-gray-500">Typical Low</div>
              <div className="font-semibold">
                {money(result.marketLow)}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-gray-500">Typical Mid</div>
              <div className="font-semibold">
                {money(result.marketMid)}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-gray-500">Typical High</div>
              <div className="font-semibold">
                {money(result.marketHigh)}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-gray-500">Bid Amount</div>
              <div className="font-semibold">
                {result.bidAmount ? money(result.bidAmount) : "—"}
              </div>
            </div>
          </div>

          {/* Placement */}
          <div className="mt-4">
            <div className="font-semibold text-gray-900">
              Placement
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {placementSentence(result.position)}
            </div>

            {(result.percentFromHigh || result.percentFromLow) && (
              <div className="text-sm text-gray-600 mt-1">
                {typeof result.percentFromHigh === "number" &&
                  `~${result.percentFromHigh}% above typical high.`}
                {typeof result.percentFromLow === "number" &&
                  `~${result.percentFromLow}% below typical low.`}
              </div>
            )}
          </div>

          {/* Why */}
          <div className="mt-4 border-t pt-3">
            <div className="font-semibold text-gray-900">
              Why it likely landed here
            </div>
            <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
              {whyItLandedHere(result.position).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {/* What to ask */}
          <div className="mt-4 border-t pt-3">
            <div className="font-semibold text-gray-900">
              What to ask the contractor
            </div>
            <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
              {whatToAsk(result.position).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 text-sm text-gray-600 border-t pt-3">
            Next: compare multiple bids, flag missing scope items, and export a
            PDF-ready summary.
          </div>
        </div>
      )}
    </div>
  );
}
