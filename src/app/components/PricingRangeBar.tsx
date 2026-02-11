// src/app/components/PricingRangeBar.tsx

import type { MarketPosition } from "../lib/pricingLogic";

interface Props {
  low: number;
  mid: number;
  high: number;
  bid: number;
  position: MarketPosition;
}

export default function PricingRangeBar({ low, mid, high, bid, position }: Props) {
  const safeLow = Math.max(0, Number(low) || 0);
  const safeHigh = Math.max(safeLow, Number(high) || 0);
  const safeMid = Math.max(safeLow, Math.min(safeHigh, Number(mid) || 0));
  const safeBid = Math.max(0, Number(bid) || 0);

  const min = Math.max(0, Math.floor(safeLow * 0.75));
  const max = Math.ceil(safeHigh * 1.6) || 1;

  const clampPct = (v: number) => {
    const denom = max - min;
    if (denom <= 0) return 0;
    const pct = ((v - min) / denom) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const lowPct = clampPct(safeLow);
  const highPct = clampPct(safeHigh);
  const midPct = clampPct(safeMid);
  const bidPct = clampPct(safeBid);

  const tone =
    position === "significantly_above" || position === "significantly_below"
      ? "alert"
      : position === "above" || position === "below"
      ? "warn"
      : "neutral";

  const bidColor =
    tone === "alert"
      ? "bg-red-600"
      : tone === "warn"
      ? "bg-orange-600"
      : "bg-gray-900";

  const bidRing =
    tone === "alert"
      ? "ring-red-200"
      : tone === "warn"
      ? "ring-orange-200"
      : "ring-gray-200";

  const rangeWidth = Math.max(1, highPct - lowPct);
  const isClamped = safeBid < min || safeBid > max;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Price placement</div>
        <div className="text-xs text-gray-500">Typical range vs bid</div>
      </div>

      <div className="mt-3 relative h-5 rounded-full bg-gray-100 overflow-hidden">
        {/* Typical range band */}
        <div
          className="absolute top-0 h-full bg-gray-300"
          style={{ left: `${lowPct}%`, width: `${rangeWidth}%` }}
          aria-label="Typical market range"
        />
        {/* Mid tick */}
        <div
          className="absolute top-0 h-full w-[2px] bg-gray-700/60"
          style={{ left: `${midPct}%` }}
          aria-label="Mid marker"
        />
        {/* Bid marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full ${bidColor} ring-4 ${bidRing}`}
          style={{ left: `calc(${bidPct}% - 8px)` }}
          aria-label="Bid marker"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-4 rounded bg-gray-300" />
          Typical range
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-[2px] bg-gray-700/60" />
          Mid
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${bidColor}`} />
          Bid
        </div>
      </div>

      {isClamped && (
        <div className="mt-2 text-xs text-gray-500">
          Bid is outside the chart window (still counted accurately in the report).
        </div>
      )}
    </div>
  );
}
