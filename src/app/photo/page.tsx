// src/app/photo/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import { FeatureGate } from "../components/FeatureGate";
import { ResultSection } from "../components/ResultSection";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { incrementUsage, setPlan, type PlanId } from "../lib/storage";
import { saveToHistory, loadHistory, attachDetailToHistory, markUnlocked } from "../lib/history";
import { TestimonialCard } from "../components/TestimonialCard";

import PhotoQuickGate from "../components/PhotoQuickGate";
import type { PhotoSeverity } from "../lib/photoLogic";

type PhotoAnalysisResult = {
  id: string;
  kind: "photo";
  summary: string;
  looksGood: string[];
  concerns: string[];
  whatToDoNext: string[];
  questionsToAsk?: string[];
};

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: "below_typical" | "within_typical" | "above_typical" | "unknown";
  notes: string[];
  disclaimer: string;
};

type PhotoDetailAI = {
  deeperFindings: string[];
  qualityChecks: string[];
  redFlags: string[];
  whatToDoNext: string[];
  pdfSummary: string;
  marketComparison?: MarketComparison;
};

type DetailInputs = {
  area: string;
  projectType: string;
  stage: string;
  budget: string;
  extraNotes: string;
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
function clearAddonUnlocked(resultId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(addonKey(resultId));
}

function baseKey(id: string) {
  return `buildguide_photo_base_${id}`;
}
function detailKey(id: string) {
  return `buildguide_photo_detail_${id}`;
}
function trySaveBase(id: string, base: PhotoAnalysisResult) {
  try {
    localStorage.setItem(baseKey(id), JSON.stringify(base));
  } catch {}
}
function tryLoadBase(id: string): PhotoAnalysisResult | null {
  try {
    const raw = localStorage.getItem(baseKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as PhotoAnalysisResult;
  } catch {
    return null;
  }
}
function trySaveDetail(id: string, detail: PhotoDetailAI) {
  try {
    localStorage.setItem(detailKey(id), JSON.stringify(detail));
  } catch {}
}
function tryLoadDetail(id: string): PhotoDetailAI | null {
  try {
    const raw = localStorage.getItem(detailKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as PhotoDetailAI;
  } catch {
    return null;
  }
}
function tryLoadFromHistory(resultId: string): PhotoAnalysisResult | null {
  try {
    const all = loadHistory();
    const found = all.find((x) => String((x as any)?.id) === String(resultId));
    if (!found) return null;
    return found as any as PhotoAnalysisResult;
  } catch {
    return null;
  }
}

function verdictLabel(v: MarketComparison["verdict"]) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";
  return "Unknown / needs more detail";
}

function pickSeverity(base: PhotoAnalysisResult): PhotoSeverity {
  const concerns = base.concerns?.length ?? 0;
  if (concerns >= 4) return "red";
  if (concerns >= 1) return "yellow";
  if ((base.looksGood?.length ?? 0) > 0) return "green";
  return "unknown";
}

function pickTop3Questions(base: PhotoAnalysisResult): string[] {
  const q = (base.questionsToAsk ?? []).filter(Boolean);
  const defaults = [
    "What’s the next step before this gets covered up?",
    "What detail here determines whether it lasts long-term?",
    "If something unexpected is found, how do you handle and price changes?",
  ];
  const merged = [...q, ...defaults];
  const uniq: string[] = [];
  for (const item of merged) {
    const s = String(item).trim();
    if (!s) continue;
    if (!uniq.includes(s)) uniq.push(s);
    if (uniq.length === 3) break;
  }
  return uniq;
}

function isPaidPlan(planId: string) {
  // ✅ MUST include project_pass_14d
  return planId === "home_plus" || planId === "contractor_pro" || planId === "project_pass_14d";
}

/**
 * ✅ 413 Fix helper:
 * Compress/resize the image before upload so Vercel doesn’t reject large payloads.
 * Returns a JPEG Blob typically < ~300-900KB depending on photo.
 */
async function compressImageToJpegBlob(
  file: File,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<Blob> {
  const maxWidth = opts?.maxWidth ?? 1400;
  const maxHeight = opts?.maxHeight ?? 1400;
  const quality = opts?.quality ?? 0.75;

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = imgUrl;
    });

    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error("Image compression failed"));
          else resolve(b);
        },
        "image/jpeg",
        quality
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

function PhotoPageInner(props: {
  remaining: number;
  planId: string;

  imageDataUrl: string | null;
  setImageDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  pickedFile: File | null;
  setPickedFile: React.Dispatch<React.SetStateAction<File | null>>;

  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;

  loading: boolean;
  result: PhotoAnalysisResult | null;
  error: string | null;

  detail: PhotoDetailAI | null;
  detailLoading: boolean;
  detailError: string | null;

  unlockToast: string | null;
  unlockBusy: boolean;
  paidRid: string | null;

  ctx: DetailInputs;
  setCtx: React.Dispatch<React.SetStateAction<DetailInputs>>;

  runPhotoAnalysis: () => Promise<void>;
  generateDetailAI: () => Promise<void>;
  startStripeUnlock: (targetResultId: string) => Promise<void>;
  downloadPhotoPdf: () => Promise<void>;
  goAsk: (q: string) => void;

  resetForNewPhoto: () => void;
}) {
  const {
    remaining,
    planId,
    imageDataUrl,
    setImageDataUrl,
    pickedFile,
    setPickedFile,
    notes,
    setNotes,
    loading,
    result,
    error,
    detail,
    detailLoading,
    detailError,
    unlockToast,
    unlockBusy,
    paidRid,
    ctx,
    setCtx,
    runPhotoAnalysis,
    generateDetailAI,
    startStripeUnlock,
    downloadPhotoPdf,
    goAsk,
    resetForNewPhoto,
  } = props;

  const effectiveRid = result?.id ?? (paidRid ? String(paidRid) : null);

  // ✅ “paid” = subscription/pass OR addon unlocked for this result
  const unlocked = isPaidPlan(planId) || (effectiveRid ? isAddonUnlocked(String(effectiveRid)) : false);

  // Auto-generate full report after unlock
  React.useEffect(() => {
    if (!unlocked) return;
    if (!result) return;
    if (detail || detailLoading) return;
    generateDetailAI();
  }, [unlocked, result, detail, detailLoading, generateDetailAI]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [pickedName, setPickedName] = React.useState<string>("");

  async function onPickFile(file: File | null) {
    if (!file) return;

    setPickedFile(file);
    setPickedName(file.name);

    // Keep exact preview behavior (data URL)
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  const severity: PhotoSeverity = result ? pickSeverity(result) : "unknown";
  const top3 = result ? pickTop3Questions(result) : [];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Photo Check</h1>
          <p className="mt-1 text-neutral-700">
            Upload a job photo. BuildGuide gives a quick read — and a deeper report when unlocked.
          </p>
          <div className="mt-2 text-xs text-neutral-600">
            Plan: <span className="font-semibold">{planId}</span> · Remaining photo checks:{" "}
            <span className="font-semibold">{remaining}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link href="/history" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50">
            History
          </Link>
          <Link href="/" className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50">
            Back
          </Link>
        </div>
      </div>

      {unlockToast ? (
        <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">{unlockToast}</div>
      ) : null}

      <TestimonialCard
        name="Chad L."
        role="Contractor"
        quote="Photo Check saved me time — my clients understood what they were looking at without me explaining every step."
      />

      {result ? (
        <PhotoQuickGate
          isPaid={unlocked}
          severity={severity}
          topQuestions={top3}
          unlockBusy={unlockBusy}
          onUnlock={() => startStripeUnlock(String(result.id))}
          planId={planId as any}
        />
      ) : null}

      {result && !unlocked ? (
        <div className="rounded-2xl border bg-neutral-50 p-4 text-sm text-neutral-800">
          🔒 <span className="font-semibold">Unlock $2.99</span> to see deeper AI analysis, local pricing comparison,
          and a printable PDF for this photo.
        </div>
      ) : null}

      {result && unlocked ? (
        <section className="rounded-2xl border p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">✅ Full Photo Report</div>
              <p className="mt-1 text-sm text-neutral-700">
                Deeper AI findings, red flags, next steps, and a printable PDF.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={downloadPhotoPdf}
                disabled={detailLoading}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                title={!detail ? "Generating report… (this happens automatically after payment)" : ""}
              >
                Download Printable PDF
              </button>

              <button
                onClick={resetForNewPhoto}
                className="rounded-xl bg-black text-white px-4 py-2.5 text-sm font-medium hover:bg-black/90"
              >
                New Photo
              </button>
            </div>
          </div>

          {detailLoading ? <div className="text-sm text-neutral-700">Generating full report…</div> : null}
          {detailError ? <div className="text-sm text-red-600">{detailError}</div> : null}

          {detail?.marketComparison ? (
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">📍 Local Price Reality Check</div>

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
                <ul className="mt-3 space-y-1 text-sm text-neutral-800">
                  {detail.marketComparison.notes.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 text-xs text-neutral-600">{detail.marketComparison.disclaimer}</div>
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-4">
              <ResultSection title="✅ Quality Checks" icon="✅" items={detail.qualityChecks} />
              <ResultSection title="🧠 Deeper Findings" icon="🧠" items={detail.deeperFindings} />
              <ResultSection title="🚩 Red Flags" icon="🚩" items={detail.redFlags} />
              <ResultSection title="➡️ Next Steps" icon="➡️" items={detail.whatToDoNext} />

              <div className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">📄 PDF-ready Summary</div>
                <p className="mt-2 text-sm text-neutral-800 whitespace-pre-line">{detail.pdfSummary}</p>
              </div>
            </div>
          ) : null}

          <SuggestedQuestions questions={result.questionsToAsk ?? []} onPick={goAsk} />
        </section>
      ) : null}

      {!result ? (
        <section className="rounded-2xl border p-5 space-y-4">
          <div className="text-sm font-semibold">1) Upload a photo</div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 inline-flex items-center justify-center gap-2"
            >
              <span aria-hidden>📷</span>
              <span>Choose Photo</span>
            </button>

            <div className="text-sm text-neutral-700">
              {pickedName ? (
                <>
                  Selected: <span className="font-semibold">{pickedName}</span>
                </>
              ) : (
                "No file selected"
              )}
            </div>

            {imageDataUrl ? (
              <button
                type="button"
                onClick={() => {
                  setImageDataUrl(null);
                  setPickedFile(null);
                  setPickedName("");
                }}
                className="sm:ml-auto rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
              >
                Clear
              </button>
            ) : null}
          </div>

          {imageDataUrl ? (
            <div className="rounded-2xl border p-3 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageDataUrl} alt="Upload preview" className="max-h-[360px] w-full object-contain rounded-xl" />
            </div>
          ) : null}

          <div className="rounded-2xl border bg-neutral-50 p-4">
            <div className="text-sm font-semibold">Tip for accuracy</div>
            <p className="mt-1 text-xs text-neutral-700">
              More detail = a more accurate read. Even 1–2 lines helps the AI interpret what it’s seeing.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-neutral-700">
              <li>• What is this project + what stage is it in?</li>
              <li>• What are you worried about (leaks, cracks, leveling, wiring, etc.)?</li>
            </ul>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">Optional: context</div>
            <p className="mt-1 text-xs text-neutral-600">
              Example: “new tile shower”, “framing inspection”, “drywall finish”, etc.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 w-full min-h-[90px] rounded-2xl border p-3 text-sm"
              placeholder='Example: "Basement framing. Inspector coming Friday."'
            />
          </div>

          <div className="rounded-2xl border p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">📍 Your area (used for local comparison)</div>
              <input
                value={ctx.area}
                onChange={(e) => setCtx((p) => ({ ...p, area: e.target.value }))}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Troy, NY 12180"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={ctx.projectType}
                onChange={(e) => setCtx((p) => ({ ...p, projectType: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Project type (optional)"
              />
              <input
                value={ctx.stage}
                onChange={(e) => setCtx((p) => ({ ...p, stage: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Stage (optional)"
              />
              <input
                value={ctx.budget}
                onChange={(e) => setCtx((p) => ({ ...p, budget: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Budget (optional)"
              />
              <input
                value={ctx.extraNotes}
                onChange={(e) => setCtx((p) => ({ ...p, extraNotes: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Extra notes (optional)"
              />
            </div>
          </div>

          <button
            onClick={() => runPhotoAnalysis()}
            disabled={!pickedFile || loading}
            className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
          >
            {loading ? "Analyzing..." : "Analyze Photo"}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </section>
      ) : null}
    </main>
  );
}

export default function PhotoPage() {
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null);
  const [pickedFile, setPickedFile] = React.useState<File | null>(null);

  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<PhotoAnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [detail, setDetail] = React.useState<PhotoDetailAI | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const [unlockToast, setUnlockToast] = React.useState<string | null>(null);
  const [unlockBusy, setUnlockBusy] = React.useState(false);
  const [paidRid, setPaidRid] = React.useState<string | null>(null);

  const [ctx, setCtx] = React.useState<DetailInputs>({
    area: "Troy, NY 12180",
    projectType: "",
    stage: "",
    budget: "",
    extraNotes: "",
  });

  function resetForNewPhoto() {
    setImageDataUrl(null);
    setPickedFile(null);

    setNotes("");
    setLoading(false);
    setResult(null);
    setError(null);
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    setUnlockToast(null);
    setUnlockBusy(false);
    setPaidRid(null);

    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("resultId");
      u.searchParams.delete("session_id");
      window.history.replaceState({}, "", u.toString());
    } catch {}
  }

  const generateDetailAI = React.useCallback(async () => {
    if (!result) return;

    setDetailLoading(true);
    setDetailError(null);

    try {
      const payload = {
        base: result,
        context: {
          area: ctx.area,
          projectType: ctx.projectType || undefined,
          stage: ctx.stage || undefined,
          budget: ctx.budget || undefined,
          extraNotes: ctx.extraNotes || undefined,
        },
      };

      const res = await fetch("/api/photo-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Full report failed.");

      const d = data as PhotoDetailAI;
      setDetail(d);
      trySaveDetail(result.id, d);

      attachDetailToHistory(String(result.id), d);
    } catch (e: any) {
      setDetailError(e?.message ?? "Something went wrong generating detail.");
    } finally {
      setDetailLoading(false);
    }
  }, [result, ctx]);

  React.useEffect(() => {
    (async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        const rid = sp.get("resultId") ?? "";
        const sessionId = sp.get("session_id") ?? "";

        if (rid) setPaidRid(rid);

        if (rid && (!result || String(result.id) !== String(rid))) {
          const fromHistory = tryLoadFromHistory(rid);
          if (fromHistory?.id) {
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
            setPlan("home_plus" as PlanId);
            setUnlockToast("✅ Subscription confirmed — Home Plus is active.");
          } else {
            const onePhotoOk =
              v.ok && vdata?.ok && entitlement?.type === "one_report" && entitlement?.kind === "photo";

            if (rid && onePhotoOk) {
              setAddonUnlocked(rid);
              markUnlocked(rid);
              setUnlockToast("✅ Payment confirmed — Full Photo Report unlocked.");
              setTimeout(() => {
                generateDetailAI();
              }, 0);
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

  async function runPhotoAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    setDetail(null);
    setDetailError(null);

    try {
      if (!pickedFile) {
        throw new Error("Please choose a photo first.");
      }

      // ✅ Compress before upload to avoid 413
      const jpgBlob = await compressImageToJpegBlob(pickedFile, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.75,
      });

      const fd = new FormData();
      fd.append("image", new File([jpgBlob], "upload.jpg", { type: "image/jpeg" }));
      if (notes.trim()) fd.append("notes", notes.trim());

      const res = await fetch("/api/photo", {
        method: "POST",
        body: fd, // ✅ multipart/form-data
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Photo analysis failed.");

      const next = data as PhotoAnalysisResult;

      // ✅ NEW results should start locked unless Stripe verify confirms (or plan is paid)
      clearAddonUnlocked(String(next.id));

      setResult(next);

      incrementUsage("photo");
      saveToHistory(next as any);
      trySaveBase(next.id, next);

      try {
        const u = new URL(window.location.href);
        u.searchParams.set("resultId", String(next.id));
        window.history.replaceState({}, "", u.toString());
        setPaidRid(String(next.id));
      } catch {}
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
        saveToHistory(result as any);
        trySaveBase(result.id, result);
      }

      const returnPath = `/photo?resultId=${encodeURIComponent(targetResultId)}`;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "one_report_photo",
          resultId: targetResultId,
          successPath: returnPath,
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

  async function downloadPhotoPdf() {
    if (!result) return;

    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base: result, detail: detail ?? null, kind: "photo" }),
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
    a.download = `BuildGuide_Photo_${result.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function goAsk(q: string) {
    window.location.href = `/ask?prefill=${encodeURIComponent(q)}`;
  }

  return (
    <FeatureGate kind="photo">
      {(gate) => (
        <PhotoPageInner
          remaining={gate.remaining}
          planId={gate.planId}
          imageDataUrl={imageDataUrl}
          setImageDataUrl={setImageDataUrl}
          pickedFile={pickedFile}
          setPickedFile={setPickedFile}
          notes={notes}
          setNotes={setNotes}
          loading={loading}
          result={result}
          error={error}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          unlockToast={unlockToast}
          unlockBusy={unlockBusy}
          paidRid={paidRid}
          ctx={ctx}
          setCtx={setCtx}
          runPhotoAnalysis={runPhotoAnalysis}
          generateDetailAI={generateDetailAI}
          startStripeUnlock={startStripeUnlock}
          downloadPhotoPdf={downloadPhotoPdf}
          goAsk={goAsk}
          resetForNewPhoto={resetForNewPhoto}
        />
      )}
    </FeatureGate>
  );
}
