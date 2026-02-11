// src/app/history/[id]/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ResultSection } from "../../components/ResultSection";
import { loadHistory, HISTORY_EVENT, type HistoryItem } from "../../lib/history";

function asArray(v: any): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function safeKind(v: any): "photo" | "bid" | "unknown" {
  const k = String(v ?? "").toLowerCase().trim();
  if (k === "photo") return "photo";
  if (k === "bid") return "bid";
  return "unknown";
}

function verdictLabel(v?: string) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";

  if (v === "significantly_below_market") return "Significantly below market";
  if (v === "below_market") return "Below market";
  if (v === "within_typical") return "Within typical range";
  if (v === "above_market") return "Above market";
  if (v === "significantly_above_market") return "Significantly above market";

  return "Unknown / needs more detail";
}

function titleFor(item: any) {
  const k = safeKind(item?.kind);
  if (k === "photo") return "Photo Report";
  if (k === "bid") return "Bid Report";
  return "Report";
}

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params?.id || "");

  const [item, setItem] = React.useState<HistoryItem | any | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  // PDF export state
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    try {
      const items = loadHistory();
      const found = items.find((x) => String(x?.id) === String(id)) ?? null;
      if (!found) {
        setNotFound(true);
        return;
      }
      setItem(found);
      setNotFound(false);
    } catch (e) {
      console.error("Failed to read history", e);
      setNotFound(true);
    }
  }, [id]);

  React.useEffect(() => {
    reload();

    const onHistory = () => reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener(HISTORY_EVENT, onHistory);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(HISTORY_EVENT, onHistory);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  async function exportPdf() {
    if (!item?.id) return;

    setPdfLoading(true);
    setPdfError(null);

    try {
      const kind = safeKind(item?.kind);

      const route = kind === "bid" ? "/api/bid-pdf" : "/api/pdf";

      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind, // ✅ important for your pdf routes
          base: item,
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
      a.download = kind === "bid" ? `BuildGuide_Bid_${item.id}.pdf` : `BuildGuide_Photo_${item.id}.pdf`;

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
          <p className="mt-2 text-sm text-neutral-600">This report isn’t in local history on this device.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/history" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Back to History
            </Link>
            <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!item) return null;

  const kind = safeKind(item?.kind);

  const hasDetail = !!item?.detail;
  const isUnlocked = !!item?.unlocked || hasDetail;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            {kind === "photo" ? "Photo Check" : kind === "bid" ? "Bid Check" : "Report"}
          </div>

          <h1 className="mt-1 text-2xl font-semibold">{titleFor(item)}</h1>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2 py-1">Report ID: {String(item.id)}</span>
            {isUnlocked ? (
              <span className="rounded-full border px-2 py-1">🔓 Unlocked</span>
            ) : (
              <span className="rounded-full border px-2 py-1">Basic</span>
            )}
            {hasDetail ? <span className="rounded-full border px-2 py-1">✅ Detailed</span> : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/history" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
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

      {/* PHOTO REPORT (new schema) */}
      {kind === "photo" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5">
            <div className="text-sm font-semibold">Summary</div>
            <p className="mt-2 text-sm text-neutral-800">{String(item?.summary || "—")}</p>
          </div>

          <ResultSection title="✅ Looks Good" icon="✅" items={asArray(item?.looksGood)} />
          <ResultSection title="⚠️ Concerns" icon="⚠️" items={asArray(item?.concerns)} />
          <ResultSection title="➡️ What To Do Next" icon="➡️" items={asArray(item?.whatToDoNext)} />

          {asArray(item?.questionsToAsk).length ? (
            <ResultSection title="❓ Questions To Ask" icon="❓" items={asArray(item?.questionsToAsk)} />
          ) : null}

          {/* Paid detail if saved */}
          {item?.detail ? (
            <div className="space-y-4">
              {item.detail?.marketComparison ? (
                <div className="rounded-2xl border p-4">
                  <div className="font-semibold">📍 Local Price Reality Check</div>
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

                  <div className="mt-3 text-xs text-neutral-600">{String(item.detail.marketComparison.disclaimer || "")}</div>
                </div>
              ) : null}

              {asArray(item.detail?.qualityChecks).length ? (
                <ResultSection title="✅ Quality Checks" icon="✅" items={asArray(item.detail.qualityChecks)} />
              ) : null}

              {asArray(item.detail?.deeperFindings).length ? (
                <ResultSection title="🧠 Deeper Findings" icon="🧠" items={asArray(item.detail.deeperFindings)} />
              ) : null}

              {asArray(item.detail?.redFlags).length ? (
                <ResultSection title="🚩 Red Flags" icon="🚩" items={asArray(item.detail.redFlags)} />
              ) : null}

              {asArray(item.detail?.whatToDoNext).length ? (
                <ResultSection title="➡️ Next Steps" icon="➡️" items={asArray(item.detail.whatToDoNext)} />
              ) : null}

              {String(item.detail?.pdfSummary || "").trim() ? (
                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">📄 PDF-ready Summary</div>
                  <p className="mt-2 text-sm text-neutral-800 whitespace-pre-line">{String(item.detail.pdfSummary)}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border p-4 text-sm text-neutral-700">
              No paid detail saved for this photo yet. Run a paid Photo Report to save the deeper analysis here.
            </div>
          )}
        </div>
      ) : null}

      {/* BID REPORT (new schema + detail) */}
      {kind === "bid" ? (
        <div className="space-y-4">
          <ResultSection title="📄 What’s Included" icon="📄" items={asArray(item?.included)} />
          <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={asArray(item?.missing)} />
          <ResultSection title="🚩 Red Flags" icon="🚩" items={asArray(item?.redFlags)} />

          {/* Saved paid detail if present */}
          {item?.detail ? (
            <div className="space-y-4">
              {item.detail?.marketComparison ? (
                <div className="rounded-2xl border p-4">
                  <div className="font-semibold">📍 Local Price Reality Check</div>
                  <div className="mt-2 text-sm text-neutral-700">
                    <div className="font-medium">{item.detail.marketComparison.area}</div>

                    {item.detail.marketComparison.bidTotal ? (
                      <div className="mt-1">
                        Bid total detected:{" "}
                        <span className="font-semibold">{item.detail.marketComparison.bidTotal}</span>
                        {item.detail.marketComparison.confidence ? (
                          <span className="text-xs text-neutral-600">
                            {" "}
                            · confidence: {item.detail.marketComparison.confidence}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

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

                  {asArray(item.detail.marketComparison.assumptions).length ? (
                    <div className="mt-3 rounded-xl border bg-neutral-50 p-3">
                      <div className="text-xs font-semibold text-neutral-700">Assumptions used</div>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                        {asArray(item.detail.marketComparison.assumptions).map((a) => (
                          <li key={a}>• {a}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-3 text-xs text-neutral-600">
                    {String(item.detail.marketComparison.disclaimer || "")}
                  </div>
                </div>
              ) : null}

              {asArray(item.detail?.deeperIssues).length ? (
                <ResultSection title="🧠 Deeper Issues" icon="🧠" items={asArray(item.detail.deeperIssues)} />
              ) : null}

              {asArray(item.detail?.paymentScheduleNotes).length ? (
                <ResultSection title="💵 Payment Schedule Notes" icon="💵" items={asArray(item.detail.paymentScheduleNotes)} />
              ) : null}

              {asArray(item.detail?.contractWarnings).length ? (
                <ResultSection title="🧾 Contract Warnings" icon="🧾" items={asArray(item.detail.contractWarnings)} />
              ) : null}

              {asArray(item.detail?.negotiationTips).length ? (
                <ResultSection title="🤝 Negotiation Tips" icon="🤝" items={asArray(item.detail.negotiationTips)} />
              ) : null}

              {String(item.detail?.pdfSummary || "").trim() ? (
                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">📄 PDF-ready Summary</div>
                  <p className="mt-2 text-sm text-neutral-800 whitespace-pre-line">{String(item.detail.pdfSummary)}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border p-4 text-sm text-neutral-700">
              No paid detail saved for this bid yet. Unlock the Full Bid Report to save the deeper analysis here.
            </div>
          )}

          {asArray(item?.questionsToAsk).length ? (
            <ResultSection title="❓ Questions To Ask" icon="❓" items={asArray(item?.questionsToAsk)} />
          ) : null}
        </div>
      ) : null}

      {kind === "unknown" ? (
        <div className="rounded-2xl border p-6 text-sm text-neutral-700">
          This saved item has an unknown type. It may be from an older BuildGuide version.
        </div>
      ) : null}
    </main>
  );
}
