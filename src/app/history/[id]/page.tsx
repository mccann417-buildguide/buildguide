// src/app/history/[id]/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ResultSection } from "../../components/ResultSection";

const HISTORY_KEY = "buildguide_history";

function asArray(v: any): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function verdictLabel(v?: string) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";
  return "Unknown / needs more detail";
}

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params?.id || "");

  const [item, setItem] = React.useState<any | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  // PDF export state
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) {
        setNotFound(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setNotFound(true);
        return;
      }

      const found = parsed.find((x) => String(x?.id) === String(id)) ?? null;
      if (!found) {
        setNotFound(true);
        return;
      }

      setItem(found);
    } catch (e) {
      console.error("Failed to read history", e);
      setNotFound(true);
    }
  }, [id]);

  async function exportPdf() {
    if (!item?.id) return;

    setPdfLoading(true);
    setPdfError(null);

    try {
      const kind = item?.kind;

      const route = kind === "bid" ? "/api/bid-pdf" : "/api/pdf";

      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: item,
          // ✅ if we have saved detail (bid), pass it so PDF can include market snapshot
          detail: item?.detail ?? null,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "PDF export failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        kind === "bid" ? `BuildGuide-Bid-${item.id}.pdf` : `BuildGuide-Photo-${item.id}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setPdfError(e?.message ?? "PDF export failed.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
        <div className="rounded-2xl border p-6">
          <div className="text-lg font-semibold">Report not found</div>
          <p className="mt-2 text-sm text-neutral-600">
            This report isn’t in local history on this device.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/history"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Back to History
            </Link>
            <Link
              href="/"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!item) return null;

  const kind = item?.kind;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            {kind === "photo" ? "Photo Check" : "Bid Check"}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {kind === "photo" ? item?.identified || "Photo Report" : "Bid Report"}
          </h1>
          <div className="mt-1 text-xs text-neutral-600">Report ID: {item.id}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/history"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Back
          </Link>

          <button
            onClick={exportPdf}
            disabled={pdfLoading}
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
          >
            {pdfLoading ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </div>

      {pdfError ? <div className="text-sm text-red-600">{pdfError}</div> : null}

      {/* PHOTO REPORT */}
      {kind === "photo" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5">
            <div className="text-sm text-neutral-700">🔍 What BuildGuide sees</div>
            <div className="mt-2 text-lg font-semibold">{item?.identified || "—"}</div>
            <div className="mt-1 text-sm text-neutral-600">Confidence: {item?.confidence || "—"}</div>
          </div>

          <ResultSection title="✅ Looks Good" icon="✅" items={asArray(item?.looksGood)} />
          <ResultSection title="⚠️ Possible Issues" icon="⚠️" items={asArray(item?.issues)} />

          {item?.typicalFixCost ? (
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">💰 Typical Fix Cost</div>
              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border p-3">
                  <div className="font-semibold">Minor</div>
                  <div className="text-neutral-700 mt-1">{item.typicalFixCost.minor}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="font-semibold">Moderate</div>
                  <div className="text-neutral-700 mt-1">{item.typicalFixCost.moderate}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="font-semibold">Major</div>
                  <div className="text-neutral-700 mt-1">{item.typicalFixCost.major}</div>
                </div>
              </div>
            </div>
          ) : null}

          {asArray(item?.suggestedQuestions).length ? (
            <ResultSection title="💬 Suggested Questions" icon="💬" items={asArray(item?.suggestedQuestions)} />
          ) : null}
        </div>
      ) : null}

      {/* BID REPORT */}
      {kind === "bid" ? (
        <div className="space-y-4">
          <ResultSection title="📄 What’s Included" icon="📄" items={asArray(item?.included)} />
          <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={asArray(item?.missing)} />
          <ResultSection title="🚩 Red Flags" icon="🚩" items={asArray(item?.redFlags)} />

          {item?.typicalRange ? (
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">💰 Typical Range</div>
              <div className="mt-2 text-sm text-neutral-700">
                Low: {item.typicalRange.low} · Mid: {item.typicalRange.mid} · High: {item.typicalRange.high}
              </div>
            </div>
          ) : null}

          {/* ✅ Market Snapshot if detail exists */}
          {item?.detail?.marketComparison ? (
            <div className="rounded-2xl border p-4">
              <div className="font-semibold">📊 Troy, NY Market Snapshot</div>
              <div className="mt-2 text-sm text-neutral-700">
                <div className="font-medium">{item.detail.marketComparison.area}</div>
                <div className="mt-1">
                  Expected range:{" "}
                  <span className="font-semibold">
                    {item.detail.marketComparison.expectedRange.low} · {item.detail.marketComparison.expectedRange.mid} ·{" "}
                    {item.detail.marketComparison.expectedRange.high}
                  </span>
                </div>
                <div className="mt-1">
                  Verdict:{" "}
                  <span className="font-semibold">{verdictLabel(item.detail.marketComparison.verdict)}</span>
                </div>
              </div>

              {asArray(item.detail.marketComparison.notes).length ? (
                <ul className="mt-3 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                  {asArray(item.detail.marketComparison.notes).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 text-xs text-neutral-600">{item.detail.marketComparison.disclaimer}</div>
            </div>
          ) : (
            <div className="rounded-2xl border p-4 text-sm text-neutral-700">
              No market snapshot saved for this report yet. Generate the Detailed Report from the Bid page to add it.
            </div>
          )}

          {asArray(item?.questionsToAsk).length ? (
            <ResultSection title="❓ Questions To Ask" icon="❓" items={asArray(item?.questionsToAsk)} />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
