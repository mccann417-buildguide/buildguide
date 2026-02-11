// src/app/lib/photoLogic.ts

export type PhotoSeverity = "green" | "yellow" | "red" | "unknown";

export type PhotoFreeSummary = {
  severity: PhotoSeverity;
  title: string;   // short label
  summary: string; // 1 sentence
  upsell: string;  // 1 sentence
};

export function buildFreePhotoSummary(severity: PhotoSeverity): PhotoFreeSummary {
  switch (severity) {
    case "green":
      return {
        severity,
        title: "Looks Generally OK",
        summary: "No obvious red flags from this photo, but one angle rarely tells the full story.",
        upsell: "Unlock the full photo report for deeper findings, next steps, and what to ask your contractor.",
      };
    case "yellow":
      return {
        severity,
        title: "Possible Concern",
        summary: "This photo shows a few things worth verifying before the job continues or gets covered up.",
        upsell: "Unlock the full photo report to see what’s missing, what’s risky, and what to do next.",
      };
    case "red":
      return {
        severity,
        title: "Potential Red Flag",
        summary: "This photo suggests a higher-risk issue that should be checked before moving forward.",
        upsell: "Unlock the full photo report for the deeper read, cost drivers, and the exact questions to ask.",
      };
    default:
      return {
        severity: "unknown",
        title: "Need Another Angle",
        summary: "This photo doesn’t show enough detail to make a confident call.",
        upsell: "Unlock the full photo report to get the exact photo checklist needed to confirm what’s going on.",
      };
  }
}

export function severityTone(sev: PhotoSeverity) {
  if (sev === "red") return { tone: "alert" as const, className: "text-red-700" };
  if (sev === "yellow") return { tone: "warn" as const, className: "text-orange-700" };
  if (sev === "green") return { tone: "ok" as const, className: "text-emerald-700" };
  return { tone: "neutral" as const, className: "text-gray-900" };
}
