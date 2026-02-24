// src/app/bid/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import type { BidAnalysisResult } from "../lib/types";
import { saveToHistory, loadHistory, attachDetailToHistory, markUnlocked } from "../lib/history";
import { ResultSection } from "../components/ResultSection";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { FeatureGate } from "../components/FeatureGate";
import { incrementUsage, setPlan } from "../lib/storage";
import { TestimonialCard } from "../components/TestimonialCard";

type Verdict =
  | "significantly_below_market"
  | "below_market"
  | "within_typical"
  | "above_market"
  | "significantly_above_market"
  | "unknown";

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: Verdict;
  notes: string[];
  disclaimer: string;
  bidTotal?: string;
  assumptions?: string[];
  confidence?: "low" | "medium" | "high";
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
function clearAddonUnlocked(resultId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(addonKey(resultId));
}

// ✅ Credit fallback (prevents losing $2.99 if resultId/base isn't available)
function creditKey() {
  return "buildguide_credit_bid_v1";
}
function hasCredit(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(creditKey()) === "1";
}
function setCredit() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(creditKey(), "1");
}
function clearCredit() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(creditKey());
}

// Store base/detail for “pay → return → auto-show full report”
function baseKey(id: string) {
  return `buildguide_bid_base_${id}`;
}
function detailKey(id: string) {
  return `buildguide_bid_detail_${id}`;
}
function trySaveBase(id: string, base: BidAnalysisResult) {
  try {
    localStorage.setItem(baseKey(id), JSON.stringify(base));
  } catch {}
}
function tryLoadBase(id: string): BidAnalysisResult | null {
  try {
    const raw = localStorage.getItem(baseKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as BidAnalysisResult;
  } catch {
    return null;
  }
}
function trySaveDetail(id: string, detail: BidDetailAI) {
  try {
    localStorage.setItem(detailKey(id), JSON.stringify(detail));
  } catch {}
}
function tryLoadDetail(id: string): BidDetailAI | null {
  try {
    const raw = localStorage.getItem(detailKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as BidDetailAI;
  } catch {
    return null;
  }
}

function tryLoadFromHistory(resultId: string): BidAnalysisResult | null {
  try {
    const all = loadHistory();
    const found = all.find((x) => String((x as any)?.id) === String(resultId));
    if (!found) return null;
    return found as any as BidAnalysisResult;
  } catch {
    return null;
  }
}

function verdictLabel(v: Verdict) {
  if (v === "significantly_below_market") return "Significantly below market";
  if (v === "below_market") return "Below market";
  if (v === "within_typical") return "Within typical range";
  if (v === "above_market") return "Above market";
  if (v === "significantly_above_market") return "Significantly above market";
  return "Unknown / needs more detail";
}

function verdictTone(v: Verdict) {
  if (v === "significantly_above_market" || v === "significantly_below_market") return "border-red-200 bg-red-50";
  if (v === "above_market" || v === "below_market") return "border-amber-200 bg-amber-50";
  if (v === "within_typical") return "border-emerald-200 bg-emerald-50";
  return "border-neutral-200 bg-neutral-50";
}

function isPaidPlan(planId: string) {
  // ✅ MUST include project_pass_14d so it auto-unlocks
  return planId === "home_plus" || planId === "contractor_pro" || planId === "project_pass_14d";
}

function FullReportCard({
  onUnlock,
  onGoHomePlus,
  hasResult,
  teaserArea,
  disabled,
}: {
  onUnlock: () => void;
  onGoHomePlus: () => void;
  hasResult: boolean;
  teaserArea: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">📊 Full Bid Report (Local + Deeper AI)</div>
          <p className="mt-1 text-sm text-neutral-700">
            Local pricing snapshot + deeper scope gaps + negotiation tips + PDF-ready summary.
          </p>
          <div className="mt-1 text-xs text-neutral-600">
            Area: <span className="font-semibold">{teaserArea}</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-2 items-stretch">
          <button
            onClick={onUnlock}
            disabled={disabled}
            className="rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90 disabled:opacity-50"
            title={!hasResult ? "Run Analyze Bid first so the unlock applies to that report" : ""}
          >
            Unlock Full Report $2.99
          </button>

          <button
            type="button"
            onClick={onGoHomePlus}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            Go Home Plus
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
        <div className="text-sm font-semibold">What you’ll get</div>
        <ul className="mt-3 space-y-2 text-sm text-neutral-800">
          {[
            "Local pricing range (low / typical / high) and where your bid sits",
            "Deterministic sanity checks (no fake ranges)",
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
            Tip: Run <span className="font-semibold">Analyze Bid</span> first — then unlock applies to that specific report.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AnalyzeAnotherBid({
  open,
  setOpen,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <div>
          <div className="text-sm font-semibold">{open ? "Analyze a bid" : "Analyze another bid"}</div>
          <div className="mt-1 text-xs text-neutral-600">
            {open ? "Paste a bid below." : "Open to paste a different bid and generate a new report."}
          </div>
        </div>
        <div className="text-sm text-neutral-600">{open ? "▲" : "▼"}</div>
      </button>

      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function BidPage() {
  return (
    <FeatureGate kind="bid">
      {(gate) => <BidPageInner {...gate} />}
    </FeatureGate>
  );
}

function BidPageInner({
  allowed,
  openPaywall,
  remaining,
  planId,
}: {
  allowed: boolean;
  openPaywall: () => void;
  remaining: number;
  planId: string;
}) {
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

  const topRef = React.useRef<HTMLDivElement | null>(null);

  const effectiveRid = (result?.id ?? paidRid) ? String(result?.id ?? paidRid) : null;

  // ✅ “paid” = subscription/pass OR addon unlocked for this result
  const unlocked = isPaidPlan(planId) || (effectiveRid ? isAddonUnlocked(effectiveRid) : false);

  const canAnalyze = allowed || unlocked;
  const [formOpen, setFormOpen] = React.useState(true);

  const generateDetailAI = React.useCallback(async () => {
    if (!result) return;

    const isPlanPaid = isPaidPlan(planId);
    const rid = result?.id ? String(result.id) : null;

    if (!isPlanPaid) {
      if (!rid) return;
      if (!isAddonUnlocked(rid)) return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const payload = {
        base: result,
        bidText: text?.slice(0, 12000) || "",
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

      const d = data as BidDetailAI;
      setDetail(d);

      trySaveDetail(result.id, d);
      attachDetailToHistory(String(result.id), d);

      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e: any) {
      setDetailError(e?.message ?? "Something went wrong generating detail.");
    } finally {
      setDetailLoading(false);
    }
  }, [result, compare, notes, text, planId]);

  React.useEffect(() => {
    if (!unlocked) return;
    if (!result) return;
    if (detail || detailLoading) return;
    generateDetailAI();
  }, [unlocked, result, detail, detailLoading, generateDetailAI]);

  React.useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const rid = sp.get("resultId") ?? "";
        const sessionId = sp.get("session_id") ?? "";

        if (rid) setPaidRid(rid);

        if (rid && (!result || String(result.id) !== String(rid))) {
          const fromHistory = tryLoadFromHistory(rid);
          if (fromHistory) {
            setResult(fromHistory);
            trySaveBase(rid, fromHistory);
          } else {
            const fromLS = tryLoadBase(rid);
            if (fromLS) setResult(fromLS);
          }

          const cachedDetail = tryLoadDetail(rid);
          if (cachedDetail) setDetail(cachedDetail);
        }

        if (sessionId) {
          const v = await fetch("/api/stripe/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          const vdata = await v.json().catch(() => null);
          const entitlement = vdata?.entitlement;

          const subOk =
            v.ok &&
            vdata?.ok &&
            entitlement?.type === "subscription" &&
            (entitlement?.status === "active" || entitlement?.status === "trialing");

          if (subOk) {
            setPlan("home_plus");
            setUnlockToast("✅ Subscription confirmed — Home Plus is active.");
          } else {
            const oneBidOk = v.ok && vdata?.ok && entitlement?.type === "one_report" && entitlement?.kind === "bid";

            if (oneBidOk) {
              if (rid) {
                setAddonUnlocked(rid);
                markUnlocked(rid);
                setUnlockToast("✅ Payment confirmed — Full Bid Report unlocked.");
                setTimeout(() => {
                  generateDetailAI();
                }, 0);
              } else {
                setCredit();
                setUnlockToast("✅ Payment confirmed — you have a Bid unlock credit. Run Analyze Bid to apply it.");
              }
            } else {
              setUnlockToast("⚠️ Payment not confirmed yet. If you just paid, refresh once.");
            }
          }

          const clean = new URL(window.location.href);
          clean.searchParams.delete("session_id");
          window.history.replaceState({}, "", clean.toString());
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runBidAnalysis() {
    if (!canAnalyze) {
      openPaywall();
      return;
    }

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

      clearAddonUnlocked(String(next.id));

      setResult(next);

      incrementUsage("bid");
      saveToHistory(next);
      trySaveBase(next.id, next);

      // ✅ Apply credit if present (prevents losing $2.99)
      if (hasCredit()) {
        setAddonUnlocked(String(next.id));
        markUnlocked(String(next.id));
        clearCredit();
        setUnlockToast("✅ Applied your Bid unlock credit — Full Report unlocked.");
        setTimeout(() => {
          generateDetailAI();
        }, 0);
      }

      try {
        const u = new URL(window.location.href);
        u.searchParams.set("resultId", String(next.id));
        window.history.replaceState({}, "", u.toString());
        setPaidRid(String(next.id));
      } catch {}

      setFormOpen(false);

      requestAnimationFrame(() => {
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startStripeUnlock(targetResultId: string) {
    setUnlockBusy(true);
    try {
      if (result?.id && String(result.id) === String(targetResultId)) {
        trySaveBase(result.id, result);
        saveToHistory(result);
      }

      const returnPath = `/bid?resultId=${encodeURIComponent(targetResultId)}`;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "one_report_bid",
          resultId: String(targetResultId),
          returnTo: returnPath,
          cancelPath: returnPath,
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

  async function downloadBidPdf() {
    if (!result) return;
    if (unlocked && !detail) {
      alert("Full report is still generating. Try again in a moment.");
      return;
    }

    const res = await fetch("/api/bid-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base: result, detail: detail ?? null, kind: "bid" }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => null);
      alert(e?.error ?? "PDF download failed.");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BuildGuide_Bid_${result.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function goAsk(q: string) {
    window.location.href = `/ask?prefill=${encodeURIComponent(q)}`;
  }

  const teaserArea = compare.area || "Your area";

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
      <div ref={topRef} />

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
        quote="BuildGuide helped me ask the right questions — I felt confident signing once I saw what was missing."
      />

      {!result && paidRid && isAddonUnlocked(String(paidRid)) ? (
        <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">
          ✅ Payment is confirmed for this Bid Report (ID: <span className="font-semibold">{paidRid}</span>), but the base
          report isn’t available on this device. If you have a Bid credit, run Analyze Bid and it will apply automatically.
        </div>
      ) : null}

      {hasCredit() ? (
        <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-900">
          ✅ You have a saved $2.99 Bid unlock credit. Run Analyze Bid and it will unlock automatically.
        </div>
      ) : null}

      {result && !unlocked && !isPaidPlan(planId) ? (
        <FullReportCard
          hasResult={!!result}
          teaserArea={teaserArea}
          disabled={!result || unlockBusy}
          onGoHomePlus={() => {
            window.location.href = "/pricing";
          }}
          onUnlock={() => {
            if (!result?.id) {
              alert("Run Analyze Bid first so we can unlock the correct report.");
              return;
            }
            return startStripeUnlock(String(result.id));
          }}
        />
      ) : null}

      {result && unlocked ? (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Full Report</div>
                <p className="mt-1 text-sm text-neutral-700">
                  Local pricing, deeper analysis, negotiation tips, and a PDF-ready summary.
                </p>
                <div className="mt-2 text-xs text-neutral-600">
                  ✅ Unlocked · Area: <span className="font-semibold">{compare.area}</span>
                </div>
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
                  onClick={downloadBidPdf}
                  disabled={detailLoading || (unlocked && !detail)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                  title={unlocked && !detail ? "Full report is generating… PDF will enable once ready." : ""}
                >
                  Download Printable PDF
                </button>
              </div>
            </div>

            {detailError ? <div className="text-sm text-red-600">{detailError}</div> : null}

            {detail?.marketComparison ? (
              <div className={`rounded-2xl border p-4 ${verdictTone(detail.marketComparison.verdict)}`}>
                <div className="text-sm font-semibold">📍 Local Price Reality Check</div>

                <div className="mt-2 text-sm text-neutral-800">
                  <div className="font-medium">{detail.marketComparison.area}</div>

                  {detail.marketComparison.bidTotal ? (
                    <div className="mt-1">
                      Bid total detected: <span className="font-semibold">{detail.marketComparison.bidTotal}</span>
                      {detail.marketComparison.confidence ? (
                        <span className="text-xs text-neutral-600"> · confidence: {detail.marketComparison.confidence}</span>
                      ) : null}
                    </div>
                  ) : null}

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

                <div className="mt-3 text-xs text-neutral-700">
                  Accuracy improves with more detail: project type, size/sqft, finish level, demo, and permits.
                </div>

                {detail.marketComparison.notes?.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-neutral-800">
                    {detail.marketComparison.notes.map((n, i) => (
                      <li key={i}>• {n}</li>
                    ))}
                  </ul>
                ) : null}

                {detail.marketComparison.assumptions?.length ? (
                  <div className="mt-3 rounded-xl border bg-white/60 p-3">
                    <div className="text-xs font-semibold text-neutral-700">Assumptions used</div>
                    <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                      {detail.marketComparison.assumptions.map((a, i) => (
                        <li key={i}>• {a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-neutral-700">{detail.marketComparison.disclaimer}</div>
              </div>
            ) : (
              <div className="text-sm text-neutral-700">
                {detailLoading ? "Generating full report…" : "Full report will appear automatically once ready."}
              </div>
            )}

            <ResultSection title="📄 What’s Included" icon="📄" items={result.included} />
            <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={result.missing} />
            <ResultSection title="🚩 Red Flags" icon="🚩" items={result.redFlags} />

            {detail ? (
              <div className="space-y-4">
                <ResultSection title="🧠 Deeper Issues" icon="🧠" items={detail.deeperIssues} />
                <ResultSection title="💵 Payment Schedule Notes" icon="💵" items={detail.paymentScheduleNotes} />
                <ResultSection title="🧾 Contract Warnings" icon="🧾" items={detail.contractWarnings} />
                <ResultSection title="🤝 Negotiation Tips" icon="🤝" items={detail.negotiationTips} />

                <div className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">📄 PDF-ready Summary</div>
                  <p className="mt-2 text-sm text-neutral-800 whitespace-pre-line">{detail.pdfSummary}</p>
                </div>
              </div>
            ) : null}
          </div>

          <SuggestedQuestions questions={result.questionsToAsk ?? []} onPick={goAsk} />
        </div>
      ) : null}

      <AnalyzeAnotherBid open={formOpen || !result} setOpen={setFormOpen}>
        <div className="space-y-4">
          <div className="text-sm font-semibold">1) Paste your bid</div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full bid/estimate text here..."
            className="w-full min-h-[180px] rounded-2xl border p-3 text-sm"
          />

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">Optional: Job context</div>
            <p className="mt-1 text-xs text-neutral-600">Example: “kitchen remodel”, “insurance repair”, “occupied home”.</p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Example: "1920s home, partial gut, mid-grade finishes, occupied."'
              className="mt-3 w-full min-h-[90px] rounded-2xl border p-3 text-sm"
            />
          </div>

          <div className="rounded-2xl border p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">📍 Your area (used for local comparison)</div>
              <p className="mt-1 text-xs text-neutral-600">Example: “Troy, NY 12180”.</p>
              <input
                value={compare.area}
                onChange={(e) => setCompare((p) => ({ ...p, area: e.target.value }))}
                className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Troy, NY 12180"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={compare.projectType}
                onChange={(e) => setCompare((p) => ({ ...p, projectType: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Project type (recommended)"
              />
              <input
                value={compare.approxSqft}
                onChange={(e) => setCompare((p) => ({ ...p, approxSqft: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Approx size / sqft (recommended)"
              />
              <input
                value={compare.timeline}
                onChange={(e) => setCompare((p) => ({ ...p, timeline: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Timeline (optional)"
              />
              <input
                value={compare.accessNotes}
                onChange={(e) => setCompare((p) => ({ ...p, accessNotes: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Access notes (optional)"
              />
            </div>

            <input
              value={compare.extraNotes}
              onChange={(e) => setCompare((p) => ({ ...p, extraNotes: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Extra notes (optional)"
            />
          </div>

          <button
            onClick={() => runBidAnalysis()}
            disabled={!text.trim() || loading}
            className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
          >
            {loading ? "Analyzing..." : "Analyze Bid"}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>
      </AnalyzeAnotherBid>

      {result && !unlocked ? (
        <div className="space-y-4">
          <ResultSection title="📄 What’s Included" icon="📄" items={result.included} />
          <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={result.missing} />
          <ResultSection title="🚩 Red Flags" icon="🚩" items={result.redFlags} />
          <SuggestedQuestions questions={result.questionsToAsk ?? []} onPick={goAsk} />
        </div>
      ) : null}
    </main>
  );
}