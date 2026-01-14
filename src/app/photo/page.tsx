// src/app/photo/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import type { PhotoAnalysisResult } from "../lib/types";
import { saveToHistory } from "../lib/history";
import { ResultSection } from "../components/ResultSection";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { FeatureGate } from "../components/FeatureGate";
import { incrementUsage } from "../lib/storage";
import { TestimonialCard } from "../components/TestimonialCard";

type PhotoDetailAI = {
  whyItMatters: string[];
  priorityFixList: { first: string[]; next: string[]; optional: string[] };
  contractorQuestions: string[];
  whatToPhotoNext: string[];
  pdfSummary: string;
};

function addonKey(resultId: string) {
  return `buildguide_photo_addon_unlocked_${resultId}`;
}

function isAddonUnlocked(resultId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(addonKey(resultId)) === "1";
}

function setAddonUnlocked(resultId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(addonKey(resultId), "1");
}

export default function PhotoPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Optional notes/description
  const [notes, setNotes] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<PhotoAnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // $2.99 add-on state
  const [addonUnlocked, setAddonUnlockedState] = React.useState(false);

  // AI detailed report state
  const [detail, setDetail] = React.useState<PhotoDetailAI | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  // PDF export state
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function runPhotoAnalysis() {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAddonUnlockedState(false);

    // reset AI detail + pdf when re-running
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setPdfError(null);
    setPdfLoading(false);

    try {
      const form = new FormData();
      form.append("image", file);

      // include optional notes
      if (notes.trim()) form.append("notes", notes.trim());

      const res = await fetch("/api/photo", { method: "POST", body: form });
      if (!res.ok) throw new Error("Photo analysis failed.");

      const data = (await res.json()) as PhotoAnalysisResult;
      setResult(data);

      // Count usage only after a successful analysis
      incrementUsage("photo");
      saveToHistory(data);

      // Restore add-on unlock state for this report
      const unlocked = isAddonUnlocked(data.id);
      setAddonUnlockedState(unlocked);
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
      const res = await fetch("/api/photo-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base: result }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Detailed report failed.");

      setDetail(data as PhotoDetailAI);
    } catch (e: any) {
      setDetailError(e?.message ?? "Something went wrong generating detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function exportPdf() {
    if (!result) return;

    setPdfLoading(true);
    setPdfError(null);

    try {
      // ✅ USING /api/pdf (since photo-pdf was deleted)
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // You can include detail later if you want:
        // body: JSON.stringify({ base: result, detail })
        body: JSON.stringify({ base: result }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "PDF export failed.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `BuildGuide-Photo-${result.id}.pdf`;
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

  function goAsk(q: string) {
    window.location.href = `/ask?prefill=${encodeURIComponent(q)}`;
  }

  return (
    <FeatureGate kind="photo">
      {({ allowed, openPaywall, remaining, planId }) => (
        <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Photo Check</h1>
              <p className="mt-1 text-neutral-700">
                Upload a photo. Get structured guidance: what looks right, what might be wrong, and what to ask next.
              </p>
              <div className="mt-2 text-xs text-neutral-600">
                Plan: <span className="font-semibold">{planId}</span> · Remaining photo checks:{" "}
                <span className="font-semibold">{remaining}</span>
              </div>
            </div>
            <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Back home
            </Link>
          </div>

          <TestimonialCard
            name="Jason G."
            role="Investor"
            quote="I use Photo Check to keep contractors honest and projects on track. It spots the details that get missed in photos, and it gives me the exact questions to ask before I approve the next payment."
          />

          <div className="rounded-2xl border p-5 space-y-4">
            <div className="text-sm font-semibold">1) Upload a photo</div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />

            {previewUrl ? (
              <div className="rounded-2xl border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full max-h-[420px] object-contain bg-neutral-50" />
              </div>
            ) : null}

            {/* Optional description box */}
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">Optional: Brief description</div>
              <p className="mt-1 text-xs text-neutral-600">
                Add quick context (ex: “new deck framing”, “roof leak near chimney”, “bathroom tile install”).
              </p>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Example: "This is a new beam install — does this look supported correctly?"'
                className="mt-3 w-full min-h-[90px] rounded-2xl border p-3 text-sm"
              />
            </div>

            <button
              onClick={() => {
                if (!allowed) return openPaywall();
                return runPhotoAnalysis();
              }}
              disabled={!file || loading}
              className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
            >
              {loading ? "Analyzing..." : "Analyze Photo"}
            </button>

            {!allowed ? (
              <div className="text-sm text-neutral-700">
                You’ve used your free photo checks.{" "}
                <button className="underline" onClick={openPaywall}>
                  Upgrade to continue
                </button>
                .
              </div>
            ) : null}

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border p-5">
                <div className="text-sm text-neutral-700">🔍 What BuildGuide sees</div>
                <div className="mt-2 text-lg font-semibold">{result.identified}</div>
                <div className="mt-1 text-sm text-neutral-600">Confidence: {result.confidence}</div>
              </div>

              <ResultSection title="✅ Looks Good" icon="✅" items={result.looksGood} />
              <ResultSection title="⚠️ Possible Issues" icon="⚠️" items={result.issues} />

              <div className="rounded-2xl border p-4">
                <div className="font-semibold">💰 Typical Fix Cost</div>
                <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border p-3">
                    <div className="font-semibold">Minor</div>
                    <div className="text-neutral-700 mt-1">{result.typicalFixCost.minor}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="font-semibold">Moderate</div>
                    <div className="text-neutral-700 mt-1">{result.typicalFixCost.moderate}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="font-semibold">Major</div>
                    <div className="text-neutral-700 mt-1">{result.typicalFixCost.major}</div>
                  </div>
                </div>
              </div>

              {/* $2.99 add-on */}
              <div className="rounded-2xl border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Detailed Report Add-On</div>
                    <p className="mt-1 text-sm text-neutral-700">
                      Unlock deeper detail, PDF export, and “what to ask next” tools for this photo report.
                      <span className="font-semibold"> One-time $2.99</span>.
                    </p>
                  </div>

                  {!addonUnlocked ? (
                    <button
                      onClick={() => {
                        setAddonUnlocked(result.id);
                        setAddonUnlockedState(true);
                      }}
                      className="shrink-0 rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90"
                    >
                      Unlock $2.99 (demo)
                    </button>
                  ) : (
                    <div className="shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium">✅ Unlocked</div>
                  )}
                </div>

                {!addonUnlocked ? (
                  <div className="mt-4 rounded-2xl border bg-neutral-50 p-4">
                    <div className="text-sm font-semibold">What you’ll unlock</div>
                    <ul className="mt-3 space-y-2 text-sm text-neutral-800">
                      {[
                        "More detailed issue breakdown (why it matters + what fails later)",
                        "A prioritized fix list (do this first / next / optional)",
                        "A printable PDF report (client/partner friendly)",
                        "Extra photo-specific questions to ask (smart prompts)",
                        "‘What to photograph next’ guidance to confirm the diagnosis",
                      ].map((f) => (
                        <li key={f} className="flex gap-2">
                          <span className="mt-[2px]">🔒</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {/* PDF export */}
                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">🧾 PDF Export</div>
                          <p className="mt-1 text-sm text-neutral-700">Download a printable report for this photo check.</p>
                        </div>

                        <button
                          onClick={exportPdf}
                          disabled={pdfLoading}
                          className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
                        >
                          {pdfLoading ? "Exporting…" : "Export PDF"}
                        </button>
                      </div>

                      {pdfError ? <div className="mt-3 text-sm text-red-600">{pdfError}</div> : null}
                    </div>

                    {/* AI detail */}
                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">📌 Deeper Detail (AI)</div>
                        <button
                          onClick={generateDetailAI}
                          disabled={detailLoading}
                          className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
                        >
                          {detailLoading ? "Generating…" : detail ? "Regenerate (AI)" : "Generate (AI)"}
                        </button>
                      </div>

                      {detailError ? <div className="mt-3 text-sm text-red-600">{detailError}</div> : null}

                      {!detail ? (
                        <div className="mt-3 text-sm text-neutral-700">
                          Click <span className="font-semibold">Generate (AI)</span> to produce the paid detailed report.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="text-sm font-semibold">Why it matters</div>
                            <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                              {detail.whyItMatters?.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="text-sm font-semibold">Priority fix list</div>
                            <div className="mt-2 grid md:grid-cols-3 gap-3 text-sm">
                              <div className="rounded-xl border p-3">
                                <div className="font-semibold">Do first</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  {detail.priorityFixList?.first?.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-xl border p-3">
                                <div className="font-semibold">Do next</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  {detail.priorityFixList?.next?.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-xl border p-3">
                                <div className="font-semibold">Optional</div>
                                <ul className="mt-2 list-disc pl-5 space-y-1">
                                  {detail.priorityFixList?.optional?.map((x) => (
                                    <li key={x}>{x}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold">Questions to ask your contractor</div>
                            <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                              {detail.contractorQuestions?.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="text-sm font-semibold">What to photograph next</div>
                            <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                              {detail.whatToPhotoNext?.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border p-3 bg-neutral-50">
                            <div className="text-sm font-semibold">PDF summary</div>
                            <div className="mt-2 text-sm text-neutral-800 whitespace-pre-wrap">{detail.pdfSummary}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <SuggestedQuestions questions={result.suggestedQuestions} onPick={goAsk} />
            </div>
          ) : null}
        </main>
      )}
    </FeatureGate>
  );
}
