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

function MarketComparisonCard({
  locked,
  isSubscriber,
  detail,
  onUnlock,
  onGenerate,
  generating,
  needsBidFirst,
}: {
  locked: boolean;
  isSubscriber: boolean;
  detail: BidDetailAI | null;
  onUnlock: () => void;
  onGenerate: () => void;
  generating: boolean;
  needsBidFirst: boolean;
}) {
  const mc = detail?.marketComparison;

  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">📊 Local Bid Comparison</div>
          <p className="mt-1 text-sm text-neutral-700">
            Typical range for your area + what drives price.
            {isSubscriber ? (
              <span className="font-semibold"> Included with your plan</span>
            ) : (
              <span className="font-semibold"> Unlock for $2.99</span>
            )}
            .
          </p>
        </div>

        {locked ? (
          <button
            onClick={onUnlock}
            className="shrink-0 rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90"
          >
            {isSubscriber ? "Included (Sign in)" : "Unlock $2.99"}
          </button>
        ) : mc ? (
          <div className="shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium">✅ Unlocked</div>
        ) : (
          <button
            onClick={onGenerate}
            disabled={generating || needsBidFirst}
            className="shrink-0 rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
            title={needsBidFirst ? "Run a bid check first" : ""}
          >
            {generating ? "Generating…" : "Generate Snapshot"}
          </button>
        )}
      </div>

      {/* Always show the section (locked preview vs unlocked content) */}
      {locked ? (
        <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
          <div className="text-sm font-semibold">Typical range (locked)</div>
          <div className="mt-2 text-sm text-neutral-700">
            Expected range: <span className="font-semibold">••••• · ••••• · •••••</span>
          </div>
          <div className="mt-1 text-sm text-neutral-700">
            Verdict: <span className="font-semibold">••••••••••••</span>
          </div>
          <div className="mt-3 text-xs text-neutral-600">
            🔒 Unlock to see the local pricing range + what affects it (permits, demo, finish level, access, timeline).
          </div>
          {needsBidFirst ? (
            <div className="mt-2 text-xs text-neutral-600">Tip: Run a Bid Check first so the comparison can be accurate.</div>
          ) : null}
        </div>
      ) : null}

      {!locked && !mc ? (
        <div className="mt-4 rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">
          Click <span className="font-semibold">Generate Snapshot</span> to produce the local comparison from your bid + inputs.
        </div>
      ) : null}

      {!locked && mc ? (
        <div className="mt-4 rounded-2xl border p-4">
          <div className="text-sm text-neutral-700">
            <div className="font-medium">{mc.area}</div>
            <div className="mt-1">
              Expected range:{" "}
              <span className="font-semibold">
                {mc.expectedRange.low} · {mc.expectedRange.mid} · {mc.expectedRange.high}
              </span>
            </div>
            <div className="mt-1">
              Verdict: <span className="font-semibold">{verdictLabel(mc.verdict)}</span>
            </div>
          </div>

          {mc.notes?.length ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-neutral-800 space-y-1">
              {mc.notes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 text-xs text-neutral-600">{mc.disclaimer}</div>
        </div>
      ) : null}
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

  // Comparison inputs (always visible after unlock)
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

  // If Stripe success redirects back with ?resultId=..., reload the report from History so page isn't blank.
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const rid = sp.get("resultId") ?? "";
      if (!rid) return;

      // If we already have this result on screen, do nothing.
      if (result?.id && String(result.id) === String(rid)) return;

      const fromHistory = tryLoadFromHistory(rid);
      if (fromHistory) {
        setResult(fromHistory);
        // Restore any existing unlock status
        // (success page should have already set localStorage)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runBidAnalysis() {
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

      setResult(data as BidAnalysisResult);

      incrementUsage("bid");
      saveToHistory(data as BidAnalysisResult);
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
    setDetail(null);

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

  async function startStripeUnlock() {
    if (!result?.id) {
      alert("Run a Bid Check first so we can unlock that specific report.");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: result.id,
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
    }
  }

  function goAsk(q: string) {
    window.location.href = `/ask?prefill=${encodeURIComponent(q)}`;
  }

  return (
    <FeatureGate kind="bid">
      {({ allowed, openPaywall, remaining, planId }) => {
        const isSubscriber = planId !== "free";
        const paidByAddon = result?.id ? isAddonUnlocked(result.id) : false;

        // Locked if not subscriber and not addon unlocked
        const locked = !isSubscriber && !paidByAddon;

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

            <TestimonialCard
              name="Courtney S."
              role="Homeowner"
              quote="BuildGuide helped me ask all the right questions — and I trusted my contractor more after I ran the bid through Bid Check."
            />

            {/* 1) Paste + run */}
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

              <button
                onClick={() => {
                  if (!allowed) return openPaywall();
                  return runBidAnalysis();
                }}
                disabled={!text.trim() || loading}
                className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
              >
                {loading ? "Analyzing..." : "Analyze Bid"}
              </button>

              {!allowed ? (
                <div className="text-sm text-neutral-700">
                  You’ve used your free bid check.{" "}
                  <button className="underline" onClick={openPaywall}>
                    Upgrade to continue
                  </button>
                  .
                </div>
              ) : null}

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            {/* Results */}
            {result ? (
              <div className="space-y-4">
                <ResultSection title="📄 What’s Included" icon="📄" items={result.included} />
                <ResultSection title="⚠️ What’s Missing" icon="⚠️" items={result.missing} />
                <ResultSection title="🚩 Red Flags" icon="🚩" items={result.redFlags} />

                {/* Always-visible Local Comparison (locked/unlocked) */}
                <MarketComparisonCard
                  locked={locked}
                  isSubscriber={isSubscriber}
                  detail={detail}
                  generating={detailLoading}
                  needsBidFirst={!result}
                  onUnlock={async () => {
                    // If subscriber but FeatureGate is "free", send them to plan/paywall
                    if (isSubscriber) return;

                    // Start Stripe checkout for this report
                    await startStripeUnlock();
                  }}
                  onGenerate={async () => {
                    // If locked, do nothing (button already disabled/hidden)
                    if (locked) return;
                    await generateDetailAI();
                  }}
                />

                {/* Paid content (comparison inputs + deeper detail) */}
                <div className="rounded-2xl border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">Detailed Report</div>
                      <p className="mt-1 text-sm text-neutral-700">
                        Deeper detail, negotiation tips, and the local pricing snapshot.
                        {!isSubscriber ? <span className="font-semibold"> One-time $2.99</span> : null}
                        {isSubscriber ? <span className="font-semibold"> Included with your plan</span> : null}
                        .
                      </p>
                    </div>

                    {locked ? (
                      <button
                        onClick={startStripeUnlock}
                        className="shrink-0 rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90"
                      >
                        Unlock $2.99
                      </button>
                    ) : (
                      <div className="shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium">✅ Unlocked</div>
                    )}
                  </div>

                  {locked ? (
                    <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
                      <div className="text-sm font-semibold">What you’ll unlock</div>
                      <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                        {[
                          "Local pricing range for your area",
                          "Market context: permits / demo / finish level / access",
                          "Deeper scope gap detection",
                          "Payment schedule red flags",
                          "Negotiation tips",
                        ].map((f) => (
                          <li key={f} className="flex gap-2">
                            <span className="mt-[2px]">🔒</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 text-xs text-neutral-600">
                        After payment, this report unlocks for this specific bid (saved in History).
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {/* Inputs */}
                      <div className="rounded-2xl border p-4">
                        <div className="font-semibold">📍 Market Comparison Inputs</div>
                        <p className="mt-1 text-sm text-neutral-700">
                          The more input you give, the tighter the local comparison gets.
                        </p>

                        <div className="mt-4 grid md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-neutral-600">Area</label>
                            <input
                              value={compare.area}
                              onChange={(e) => setCompare((p) => ({ ...p, area: e.target.value }))}
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="Troy, NY 12180"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Project type</label>
                            <input
                              value={compare.projectType}
                              onChange={(e) => setCompare((p) => ({ ...p, projectType: e.target.value }))}
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="Kitchen remodel, roof, deck, bathroom..."
                            />
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Approx sqft / size</label>
                            <input
                              value={compare.approxSqft}
                              onChange={(e) => setCompare((p) => ({ ...p, approxSqft: e.target.value }))}
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="e.g. 180 sq ft, 1200 sq ft, 2 bathrooms..."
                            />
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Finish level</label>
                            <select
                              value={compare.finishLevel}
                              onChange={(e) =>
                                setCompare((p) => ({
                                  ...p,
                                  finishLevel: e.target.value as CompareInputs["finishLevel"],
                                }))
                              }
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                            >
                              <option value="unknown">Unknown</option>
                              <option value="budget">Budget</option>
                              <option value="mid">Mid-grade</option>
                              <option value="high">High-end</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Permits included?</label>
                            <select
                              value={compare.permits}
                              onChange={(e) =>
                                setCompare((p) => ({
                                  ...p,
                                  permits: e.target.value as CompareInputs["permits"],
                                }))
                              }
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                            >
                              <option value="unknown">Unknown</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Demo included?</label>
                            <select
                              value={compare.includesDemo}
                              onChange={(e) =>
                                setCompare((p) => ({
                                  ...p,
                                  includesDemo: e.target.value as CompareInputs["includesDemo"],
                                }))
                              }
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                            >
                              <option value="unknown">Unknown</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Timeline</label>
                            <input
                              value={compare.timeline}
                              onChange={(e) => setCompare((p) => ({ ...p, timeline: e.target.value }))}
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="ASAP, 2 weeks, spring, nights/weekends..."
                            />
                          </div>

                          <div>
                            <label className="text-xs text-neutral-600">Access / constraints</label>
                            <input
                              value={compare.accessNotes}
                              onChange={(e) => setCompare((p) => ({ ...p, accessNotes: e.target.value }))}
                              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                              placeholder="Occupied, stairs only, tight parking, etc."
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-xs text-neutral-600">Extra notes</label>
                          <textarea
                            value={compare.extraNotes}
                            onChange={(e) => setCompare((p) => ({ ...p, extraNotes: e.target.value }))}
                            className="mt-1 w-full min-h-[90px] rounded-2xl border p-3 text-sm"
                            placeholder='Anything that affects price: premium materials, structural work, surprises, etc.'
                          />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-xs text-neutral-600">
                            Tip: More scope detail = tighter pricing range.
                          </div>

                          <button
                            onClick={generateDetailAI}
                            disabled={detailLoading}
                            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
                          >
                            {detailLoading ? "Generating…" : detail ? "Regenerate (AI)" : "Generate Detailed Report (AI)"}
                          </button>
                        </div>

                        {detailError ? <div className="mt-3 text-sm text-red-600">{detailError}</div> : null}
                      </div>

                      {/* Detail outputs */}
                      {detail ? (
                        <div className="rounded-2xl border p-4">
                          <div className="font-semibold">📌 Deeper Detail (AI)</div>

                          <div className="mt-4 space-y-4">
                            <div>
                              <div className="text-sm font-semibold">Deeper issues</div>
                              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                                {detail.deeperIssues.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <div className="text-sm font-semibold">Payment schedule notes</div>
                              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                                {detail.paymentScheduleNotes.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <div className="text-sm font-semibold">Contract warnings</div>
                              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                                {detail.contractWarnings.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <div className="text-sm font-semibold">Negotiation tips</div>
                              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                                {detail.negotiationTips.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="rounded-xl border p-3 bg-neutral-50">
                              <div className="text-sm font-semibold">PDF summary</div>
                              <div className="mt-2 text-sm whitespace-pre-wrap">{detail.pdfSummary}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-neutral-700">
                          Click <span className="font-semibold">Generate Detailed Report (AI)</span> to produce the local snapshot + deeper analysis.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <SuggestedQuestions questions={result.questionsToAsk} onPick={goAsk} />
              </div>
            ) : (
              // No result yet: still show the local comparison card (locked preview)
              <MarketComparisonCard
                locked={true}
                isSubscriber={planId !== "free"}
                detail={null}
                generating={false}
                needsBidFirst={true}
                onUnlock={() => {
                  alert("Run a Bid Check first so we can unlock that specific report.");
                }}
                onGenerate={() => {}}
              />
            )}
          </main>
        );
      }}
    </FeatureGate>
  );
}
