// src/app/bid/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import type { BidAnalysisResult } from "../lib/types";
import { saveToHistory } from "../lib/history";
import { ResultSection } from "../components/ResultSection";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { FeatureGate } from "../components/FeatureGate";
import { incrementUsage } from "../lib/storage";
import { TestimonialCard } from "../components/TestimonialCard";

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: "below_typical" | "within_typical" | "above_typical" | "unknown";
  notes: string[];
  disclaimer: string;
};

type BidDetailAI = {
  deeperIssues: string[];
  paymentScheduleNotes: string[];
  contractWarnings: string[];
  negotiationTips: string[];
  pdfSummary: string;
  marketComparison?: MarketComparison;
};

type CompareInputs = {
  area: string;
  projectType: string;
  approxSqft: string;
  finishLevel: "budget" | "mid" | "high" | "unknown";
  permits: "yes" | "no" | "unknown";
  includesDemo: "yes" | "no" | "unknown";
  timeline: string;
  accessNotes: string;
  extraNotes: string;
};

const HISTORY_KEY = "buildguide_history";

/** Unlock is per-resultId (stored locally) */
function addonKey(resultId: string) {
  return `buildguide_bid_addon_unlocked_${resultId}`;
}
function isAddonUnlocked(resultId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(addonKey(resultId)) === "1";
}
function setAddonUnlocked(resultId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(addonKey(resultId), "1");
}

/** Fix "blank after payment" by caching the report before leaving for Stripe */
function pendingKey(resultId: string) {
  return `buildguide_pending_${resultId}`;
}
function savePending(result: BidAnalysisResult) {
  try {
    localStorage.setItem(pendingKey(String(result.id)), JSON.stringify(result));
  } catch {}
}
function loadPending(resultId: string): BidAnalysisResult | null {
  try {
    const raw = localStorage.getItem(pendingKey(String(resultId)));
    if (!raw) return null;
    return JSON.parse(raw) as BidAnalysisResult;
  } catch {
    return null;
  }
}
function clearPending(resultId: string) {
  try {
    localStorage.removeItem(pendingKey(String(resultId)));
  } catch {}
}

function verdictLabel(v: MarketComparison["verdict"]) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";
  return "Unknown / needs more detail";
}

function trySaveDetailToHistory(baseId: string, detail: BidDetailAI) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const idx = parsed.findIndex((x) => String(x?.id) === String(baseId));
    if (idx === -1) return;

    parsed[idx] = {
      ...parsed[idx],
      detail,
      detailUpdatedAt: new Date().toISOString(),
    };

    localStorage.setItem(HISTORY_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function tryLoadFromHistory(resultId: string): BidAnalysisResult | null {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const found = parsed.find((x) => String(x?.id) === String(resultId));
    return (found ?? null) as BidAnalysisResult | null;
  } catch {
    return null;
  }
}

function forceSaveToHistory(item: BidAnalysisResult) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(parsed) ? parsed : [];
    const idx = arr.findIndex((x) => String(x?.id) === String(item.id));
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
    else arr.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  } catch {}
}

function FullReportTeaserCard({
  area,
  isUnlocked,
  hasResult,
  onUnlock,
  disabled,
}: {
  area: string;
  isUnlocked: boolean;
  hasResult: boolean;
  onUnlock: () => void;
  disabled?: boolean;
}) {
  if (isUnlocked) {
    return (
      <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">
        ✅ Full Report unlocked for this bid.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">📊 Local Price Reality Check</div>
          <p className="mt-1 text-sm text-neutral-700">
            See a local pricing snapshot + deeper bid detail + PDF-ready summary.
          </p>
          <div className="mt-1 text-xs text-neutral-600">
            Area: <span className="font-semibold">{area || "Your area"}</span>
          </div>
        </div>

        <button
          onClick={onUnlock}
          disabled={disabled}
          className="shrink-0 rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90 disabled:opacity-50"
          title={!hasResult ? "Run Analyze Bid first so the unlock applies to that report" : ""}
        >
          Unlock Full Report $2.99
        </button>
      </div>

      <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
        <div className="text-sm font-semibold">What you’ll get</div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-800">
          {[
            "Local pricing range for your area (low / typical / high)",
            "Market context: permits / demo / finish level / access / timeline",
            "Deeper scope gap detection + negotiation tips",
            "Payment schedule red flags + contract warnings",
            "PDF-ready summary you can download",
          ].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-[2px]">🔒</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {!hasResult ? (
          <div className="mt-3 text-xs text-neutral-600">
            Tip: Run <span className="font-semibold">Analyze Bid</span> first — then unlock applies to that specific report and can be saved.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BidPage() {
  const [text, setText] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<BidAnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [detail, setDetail] = React.useState<BidDetailAI | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const [unlockBusy, setUnlockBusy] = React.useState(false);
  const [unlockToast, setUnlockToast] = React.useState<string | null>(null);

  // resultId from URL (used after Stripe return)
  const [paidRid, setPaidRid] = React.useState<string | null>(null);

  const [compare, setCompare] = React.useState<CompareInputs>({
    area: "Troy, NY 12180",
    projectType: "",
    approxSqft: "",
    finishLevel: "unknown",
    permits: "unknown",
    includesDemo: "unknown",
    timeline: "",
    accessNotes: "",
    extraNotes: "",
  });

  // Stripe return handling + restore report from history/pending
  React.useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const rid = sp.get("resultId") ?? "";
        const sessionId = sp.get("session_id") ?? "";

        if (rid) setPaidRid(rid);

        // Verify payment if session_id is present
        if (rid && sessionId) {
          const v = await fetch("/api/stripe/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          const vdata = await v.json().catch(() => null);

          if (v.ok && vdata?.ok && String(vdata?.resultId) === String(rid)) {
            setAddonUnlocked(rid);
            setUnlockToast("✅ Payment confirmed — Full Report unlocked.");

            // If verify route provided area, optionally sync it
            if (typeof vdata?.area === "string" && vdata.area.trim()) {
              setCompare((p) => ({ ...p, area: vdata.area }));
            }
          } else {
            setUnlockToast("⚠️ Payment not confirmed yet. If you just paid, refresh once.");
          }

          // Remove session_id from URL
          const clean = new URL(window.location.href);
          clean.searchParams.delete("session_id");
          window.history.replaceState({}, "", clean.toString());
        }

        // Restore report to avoid "blank after payment"
        if (rid && (!result || String(result.id) !== String(rid))) {
          const fromHistory = tryLoadFromHistory(rid);
          if (fromHistory) {
            setResult(fromHistory);
          } else {
            const pending = loadPending(rid);
            if (pending) {
              forceSaveToHistory(pending);
              setResult(pending);
              clearPending(rid);
            }
          }
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runBidAnalysis(effectiveRid: string | null, unlocked: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    setDetail(null);
    setDetailError(null);

    try {
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, notes: notes.trim() || undefined }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Bid analysis failed.");

      const next = data as BidAnalysisResult;
      setResult(next);

      incrementUsage("bid");
      saveToHistory(next);

      // If they already paid for a previous rid in URL, carry unlock to new id
      if (unlocked && effectiveRid && isAddonUnlocked(effectiveRid) && !isAddonUnlocked(next.id)) {
        setAddonUnlocked(next.id);
      }

      // Update URL to current reportId
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("resultId", String(next.id));
        window.history.replaceState({}, "", u.toString());
        setPaidRid(String(next.id));
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function generateDetailAI() {
    if (!result) return;

    setDetailLoading(true);
    setDetailError(null);

    try {
      const payload = {
        base: result,
        context: {
          area: compare.area,
          projectType: compare.projectType || undefined,
          approxSqft: compare.approxSqft || undefined,
          finishLevel: compare.finishLevel,
          permits: compare.permits,
          includesDemo: compare.includesDemo,
          timeline: compare.timeline || undefined,
          accessNotes: compare.accessNotes || undefined,
          extraNotes: compare.extraNotes || undefined,
          jobNotes: notes.trim() || undefined,
        },
      };

      const res = await fetch("/api/bid-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Detailed report failed.");

      setDetail(data as BidDetailAI);
      trySaveDetailToHistory(result.id, data as BidDetailAI);
    } catch (e: any) {
      setDetailError(e?.message ?? "Something went wrong generating detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function downloadPdf() {
    if (!result || !detail) return;

    try {
      const res = await fetch("/api/bid-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: result,
          detail,
          area: compare.area,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "PDF generation failed.");

      if (data?.url) {
        window.open(data.url, "_blank");
        return;
      }

      throw new Error("Missing PDF URL.");
    } catch (e: any) {
      alert(e?.message ?? "PDF failed.");
    }
  }

  async function startStripeUnlock(targetResultId: string) {
    setUnlockBusy(true);
    try {
      // Save report before leaving so we can restore after return
      if (result && String(result.id) === String(targetResultId)) {
        savePending(result);
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: targetResultId,
          area: compare.area,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Checkout failed.");

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing Stripe checkout URL.");
    } catch (e: any) {
      alert(e?.message ?? "Stripe checkout failed.");
    } finally {
      setUnlockBusy(false);
    }
  }

  function goAsk(q: string) {
    window.location.href = `/ask?prefill=${encodeURIComponent(q)}`;
  }

  return (
    <FeatureGate kind="bid">
      {({ allowed, openPaywall, remaining, planId }) => {
        const isSubscriber = planId !== "free";

        // Use URL resultId when no result loaded yet
        const effectiveRid = result?.id ?? paidRid;

        const paidByAddon = effectiveRid ? isAddonUnlocked(String(effectiveRid)) : false;
        const unlocked = isSubscriber || paidByAddon;

        // Allow Analyze if unlocked (even if remaining=0)
        const canAnalyze = allowed || unlocked;

        return (
          <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">Bid Check</h1>
                <p className="mt-1 text-neutral-700">
                  Paste an estimate. BuildGuide highlights what’s included, what’s missing, and red flags.
                </p>
                <div className="mt-2 text-xs text-neutral-600">
                  Plan: <span className="font-semibold">{planId}</span> · Remaining bid checks:{" "}
                  <span className="font-semibold">{remaining}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href="/history" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                  History
                </Link>
                <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                  Back home
                </Link>
              </div>
            </div>

            {unlockToast ? (
              <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">{unlockToast}</div>
            ) : null}

            <TestimonialCard
              name="Courtney S."
              role="Homeowner"
              quote="BuildGuide helped me ask all the right questions — and I trusted my contractor more after I ran the bid through Bid Check."
            />

            <div className="rounded-2xl border p-5 space-y-4">
              <div className="text-sm font-semibold">1) Paste your bid</div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the full bid/estimate text here..."
                className="w-full min-h-[180px] rounded-2xl border p-3 text-sm"
              />

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Optional: Job context</div>
                <p className="mt-1 text-xs text-neutral-600">
                  Add any background that helps (example: “kitchen remodel”, “insurance repair”, “historic home”, “timeline ASAP”).
                </p>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Example: "1920s home, partial gut, mid-grade finishes, occupied."'
                  className="mt-3 w-full min-h-[90px] rounded-2xl border p-3 text-sm"
                />
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">📍 Your area (used for local comparison)</div>
                <p className="mt-1 text-xs text-neutral-600">Example: “Troy, NY 12180” or “90210”.</p>
                <input
                  value={compare.area}
                  onChange={(e) => setCompare((p) => ({ ...p, area: e.target.value }))}
                  className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Troy, NY 12180"
                />
              </div>

              {/* ONE clean upsell card (no duplicates) */}
              <FullReportTeaserCard
                area={compare.area}
                isUnlocked={unlocked}
                hasResult={!!result}
                disabled={!result || unlockBusy}
                onUnlock={() => {
                  if (!result?.id) return;
                  return startStripeUnlock(String(result.id));
                }}
              />

              <button
                onClick={() => {
                  if (!canAnalyze) return openPaywall();
                  return runBidAnalysis(effectiveRid ? String(effectiveRid) : null, unlocked);
                }}
                disabled={!text.trim() || loading}
                className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
              >
                {loading ? "Analyzing..." : "Analyze Bid"}
              </button>

              {!canAnalyze ? (
                <div className="text-sm text-neutral-700">
                  You’ve used your free bid check.{" "}
                  <button className="underline" onClick={openPaywall}>
                    Upgrade to continue
                  </button>
                  .
                </div>
              ) : !allowed && unlocked ? (
                <div className="text-sm text-neutral-700">
                  ✅ Full Report unlocked — you can analyze this bid even though free checks are used up.
                </div>
              ) : null}

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            {result ? (
              <div className="space-y-4">
                <ResultSection title="📄 What’s Included" icon="📄" items={result.included} />
                <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={result.missing} />
                <ResultSection title="🚩 Red Flags" icon="🚩" items={result.redFlags} />

                {/* Full report section (unlocked only) */}
                {unlocked ? (
                  <div className="rounded-2xl border p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">Full Report</div>
                        <p className="mt-1 text-sm text-neutral-700">
                          Local range, deeper analysis, negotiation tips, and a PDF-ready summary.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={generateDetailAI}
                          disabled={detailLoading}
                          className="rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
                        >
                          {detailLoading ? "Generating…" : detail ? "Regenerate (AI)" : "Generate (AI)"}
                        </button>

                        <button
                          onClick={downloadPdf}
                          disabled={!detail}
                          className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                          title={!detail ? "Generate the full report first" : ""}
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>

                    {detailError ? <div className="mt-3 text-sm text-red-600">{detailError}</div> : null}

                    {detail?.marketComparison ? (
                      <div className="mt-4 rounded-2xl border p-4">
                        <div className="text-sm font-semibold">📍 Market Snapshot</div>
                        <div className="mt-2 text-sm text-neutral-700">
                          <div className="font-medium">{detail.marketComparison.area}</div>
                          <div className="mt-1">
                            Expected range:{" "}
                            <span className="font-semibold">
                              {detail.marketComparison.expectedRange.low} · {detail.marketComparison.expectedRange.mid} ·{" "}
                              {detail.marketComparison.expectedRange.high}
                            </span>
                          </div>
                          <div className="mt-1">
                            Verdict: <span className="font-semibold">{verdictLabel(detail.marketComparison.verdict)}</span>
                          </div>
                        </div>

                        {detail.marketComparison.notes?.length ? (
                          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                            {detail.marketComparison.notes.map((n, i) => (
                              <li key={i}>{n}</li>
                            ))}
                          </ul>
                        ) : null}

                        {detail.marketComparison.disclaimer ? (
                          <div className="mt-3 text-xs text-neutral-600">{detail.marketComparison.disclaimer}</div>
                        ) : null}
                      </div>
                    ) : null}

                    {detail ? (
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border p-4">
                          <div className="text-sm font-semibold">Deeper issues</div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                            {detail.deeperIssues.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <div className="text-sm font-semibold">Payment schedule notes</div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                            {detail.paymentScheduleNotes.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <div className="text-sm font-semibold">Contract warnings</div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                            {detail.contractWarnings.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border p-4">
                          <div className="text-sm font-semibold">Negotiation tips</div>
                          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
                            {detail.negotiationTips.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border bg-neutral-50 p-4">
                          <div className="text-sm font-semibold">PDF-ready summary</div>
                          <pre className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{detail.pdfSummary}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-neutral-700">
                        Click <span className="font-semibold">Generate (AI)</span> to produce the full report.
                      </div>
                    )}
                  </div>
                ) : null}

                <SuggestedQuestions questions={result.questionsToAsk} onPick={goAsk} />
              </div>
            ) : null}
          </main>
        );
      }}
    </FeatureGate>
  );
}
