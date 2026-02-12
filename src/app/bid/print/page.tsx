// src/app/bid/print/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type BidAnalysisResult = {
  id: string;
  included: string[];
  missing: string[];
  redFlags: string[];
};

type BidDetailAI = {
  deeperIssues: string[];
  paymentScheduleNotes: string[];
  contractWarnings: string[];
  negotiationTips: string[];
  pdfSummary: string;
  marketComparison?: {
    area: string;
    expectedRange: { low: string; mid: string; high: string };
    verdict: string;
    notes: string[];
    disclaimer: string;
  };
};

function baseKey(resultId: string) {
  return `buildguide_bid_base_${resultId}`;
}
function detailKey(resultId: string) {
  return `buildguide_bid_detail_${resultId}`;
}

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function BidPrintInner() {
  const sp = useSearchParams();
  const rid = sp.get("resultId") ?? "";

  const [base, setBase] = React.useState<BidAnalysisResult | null>(null);
  const [detail, setDetail] = React.useState<BidDetailAI | null>(null);

  React.useEffect(() => {
    if (!rid) return;

    const b = safeParse<BidAnalysisResult>(localStorage.getItem(baseKey(rid)));
    const d = safeParse<BidDetailAI>(localStorage.getItem(detailKey(rid)));
    setBase(b);
    setDetail(d);

    // Auto-print if you want:
    // setTimeout(() => window.print(), 300);
  }, [rid]);

  if (!rid) return <div className="p-8">Missing resultId.</div>;

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BuildGuide — Bid Report</h1>
          <div className="text-sm text-neutral-600">Result ID: {rid}</div>
        </div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {!base ? (
        <div className="rounded border p-4 text-sm">
          No saved report found for this resultId on this device.
          <div className="mt-2 text-neutral-600">
            (MVP note: this print page reads localStorage. If you need cross-device printing, we’ll store reports on the
            server.)
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Red Flags</h2>
            <ul className="list-disc pl-5">
              {base.redFlags.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">What’s Included</h2>
            <ul className="list-disc pl-5">
              {base.included.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">What’s Missing</h2>
            <ul className="list-disc pl-5">
              {base.missing.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </section>

          {detail ? (
            <>
              <hr />

              {detail.marketComparison ? (
                <section className="space-y-2">
                  <h2 className="text-lg font-semibold">Market Snapshot</h2>
                  <div className="text-sm">
                    <div>
                      <b>Area:</b> {detail.marketComparison.area}
                    </div>
                    <div>
                      <b>Expected range:</b> {detail.marketComparison.expectedRange.low} ·{" "}
                      {detail.marketComparison.expectedRange.mid} · {detail.marketComparison.expectedRange.high}
                    </div>
                    <div>
                      <b>Verdict:</b> {detail.marketComparison.verdict}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">{detail.marketComparison.disclaimer}</div>
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <h2 className="text-lg font-semibold">Deeper Issues</h2>
                <ul className="list-disc pl-5">
                  {detail.deeperIssues.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-semibold">Payment Schedule Notes</h2>
                <ul className="list-disc pl-5">
                  {detail.paymentScheduleNotes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-semibold">Contract Warnings</h2>
                <ul className="list-disc pl-5">
                  {detail.contractWarnings.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-semibold">Negotiation Tips</h2>
                <ul className="list-disc pl-5">
                  {detail.negotiationTips.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-semibold">PDF Summary</h2>
                <pre className="whitespace-pre-wrap rounded border bg-neutral-50 p-3 text-xs">{detail.pdfSummary}</pre>
              </section>
            </>
          ) : (
            <div className="rounded border p-4 text-sm">
              No saved “detail” found yet for this resultId.
              <div className="mt-2 text-neutral-600">Generate the Full Report once, then this page will include it.</div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function BidPrintPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <BidPrintInner />
    </Suspense>
  );
}
