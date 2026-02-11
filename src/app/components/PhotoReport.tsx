// src/app/components/PhotoReport.tsx

"use client";

import React from "react";
import { buildFreePhotoSummary, buildPaidPhotoReport, PhotoSeverity } from "../lib/photoLogic";

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

export default function PhotoReport({
  isPaid,
  severity = "unknown",
}: {
  isPaid: boolean;
  severity?: PhotoSeverity;
}) {
  const free = buildFreePhotoSummary({ severity });
  const paid = buildPaidPhotoReport({ severity });

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold">📸 Photo Check</h3>
        <div className="text-sm text-gray-500">A fast read now — deeper report when unlocked.</div>
      </div>

      {/* FREE: no deep detail */}
      {!isPaid && (
        <div className="mt-4">
          <div className={`font-semibold ${toneClasses(free.severity)}`}>{free.title}</div>
          <div className="mt-1 text-sm text-gray-700">{free.summary}</div>

          <div className="mt-4 border-t pt-3 text-sm text-gray-600">
            {free.upsell}
          </div>
        </div>
      )}

      {/* PAID: deep structure */}
      {isPaid && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">What you’re looking at</div>
            <div className="mt-1 text-sm text-gray-700">
              {paid.whatYoureLookingAt.label}{" "}
              <span className="text-gray-500">
                (confidence: {paid.whatYoureLookingAt.confidence})
              </span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              {paid.whatYoureLookingAt.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>

          {paid.redFlags.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="font-semibold text-gray-900">Red flags</div>
              <ul className="mt-2 space-y-2">
                {paid.redFlags.map((rf) => (
                  <li key={rf.flag} className="text-sm">
                    <div className={`font-semibold ${toneClasses(rf.severity)}`}>{rf.flag}</div>
                    <div className="text-gray-700">{rf.whyItMatters}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">What’s next</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              {paid.nextSteps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">Why it costs what it costs</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              {paid.costDrivers.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border p-3">
            <div className="font-semibold text-gray-900">What to ask the contractor</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
              {paid.contractorQuestions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
