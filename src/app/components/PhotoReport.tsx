// src/app/components/PhotoReport.tsx

"use client";

import React from "react";
import { buildFreePhotoSummary, buildPaidPhotoReport, PhotoSeverity } from "../lib/photoLogic";

type FreeSummary = {
  severity: PhotoSeverity;
  title: string;
  summary: string;
  upsell: string;
};

type PaidReport = {
  whatYoureLookingAt: {
    label: string;
    confidence: string;
    details: string[];
  };
  redFlags: {
    flag: string;
    severity: PhotoSeverity;
    whyItMatters: string;
  }[];
  nextSteps: string[];
  costDrivers: string[];
  contractorQuestions: string[];
};

function toneClasses(sev: PhotoSeverity) {
  switch (sev) {
    case "red":
      return "text-red-700";
    case "yellow":
      return "text-orange-700";
    case "green":
      return "text-emerald-700";
    default:
      return "text-gray-900";
  }
}

const FREE_FALLBACK: FreeSummary = {
  // If your PhotoSeverity type does NOT include "unknown", change this to "yellow".
  severity: "unknown" as PhotoSeverity,
  title: "Quick photo read",
  summary: "We generated a quick preview. Unlock the full report for deeper details.",
  upsell: "Unlock to see what’s missing, what’s risky, and what to do next.",
};

const PAID_FALLBACK: PaidReport = {
  whatYoureLookingAt: { label: "N/A", confidence: "N/A", details: [] },
  redFlags: [],
  nextSteps: [],
  costDrivers: [],
  contractorQuestions: [],
};

export default function PhotoReport({
  isPaid,
  severity = ("unknown" as PhotoSeverity),
}: {
  isPaid: boolean;
  severity?: PhotoSeverity;
}) {
  // Build outputs (then normalize to known shapes)
  const freeRaw = buildFreePhotoSummary(severity) as Partial<FreeSummary> | undefined;
  const paidRaw = buildPaidPhotoReport(severity) as Partial<PaidReport> | undefined;

  const free: FreeSummary = {
    ...FREE_FALLBACK,
    ...(freeRaw ?? {}),
    severity: (freeRaw?.severity ?? FREE_FALLBACK.severity) as PhotoSeverity,
  };

  const paid: PaidReport = {
    ...PAID_FALLBACK,
    ...(paidRaw ?? {}),
    whatYoureLookingAt: {
      ...PAID_FALLBACK.whatYoureLookingAt,
      ...(paidRaw?.whatYoureLookingAt ?? {}),
      details: paidRaw?.whatYoureLookingAt?.details ?? [],
    },
    redFlags: paidRaw?.redFlags ?? [],
    nextSteps: paidRaw?.nextSteps ?? [],
    costDrivers: paidRaw?.costDrivers ?? [],
    contractorQuestions: paidRaw?.contractorQuestions ?? [],
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">📸 Photo Check</h3>
        <div className="text-sm text-gray-500">A fast read now — deeper report when unlocked.</div>
      </div>

      {/* FREE */}
      {!isPaid && (
        <div className="mt-4">
          <div className={`font-semibold ${toneClasses(free.severity)}`}>{free.title}</div>
          <div className="mt-1 text-sm text-gray-700">{free.summary}</div>
          <div className="mt-2 text-sm text-blue-600">{free.upsell}</div>
        </div>
      )}

      {/* PAID */}
      {isPaid && (
        <div className="mt-5 space-y-5">
          {/* What you're looking at */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">What you’re looking at</div>
            <div className="mt-1 text-sm text-gray-700">
              <span className="font-semibold">{paid.whatYoureLookingAt.label}</span>{" "}
              <span className="text-gray-500">({paid.whatYoureLookingAt.confidence})</span>
            </div>
            {paid.whatYoureLookingAt.details?.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {paid.whatYoureLookingAt.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Red flags */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Possible concerns</div>
            {paid.redFlags?.length ? (
              <div className="mt-2 space-y-3">
                {paid.redFlags.map((rf, i) => (
                  <div key={i} className="rounded-md border bg-white p-3">
                    <div className={`text-sm font-semibold ${toneClasses(rf.severity)}`}>{rf.flag}</div>
                    <div className="mt-1 text-sm text-gray-700">{rf.whyItMatters}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-600">No major red flags detected.</div>
            )}
          </div>

          {/* Next steps */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Next steps</div>
            {paid.nextSteps?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {paid.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-gray-600">No specific next steps provided.</div>
            )}
          </div>

          {/* Cost drivers */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Cost drivers</div>
            {paid.costDrivers?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {paid.costDrivers.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-gray-600">No cost drivers listed.</div>
            )}
          </div>

          {/* Contractor questions */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Questions to ask the contractor</div>
            {paid.contractorQuestions?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {paid.contractorQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm text-gray-600">No contractor questions provided.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
