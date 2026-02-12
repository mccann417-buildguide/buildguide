// src/app/lib/photoLogic.ts

export type PhotoSeverity = "green" | "yellow" | "red" | "unknown";

export type PhotoFreeSummary = {
  severity: PhotoSeverity;
  title: string;   // short label
  summary: string; // 1 sentence
  upsell: string;  // 1 sentence
};

export type PhotoPaidReport = {
  severity: PhotoSeverity;
  headline: string;
  whatYoureSeeing: string;
  risks: string[];
  whatToVerify: string[];
  questionsToAsk: string[];
  nextSteps: string[];
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

/**
 * Paid report builder (MVP)
 * PhotoReport.tsx expects this export.
 * For now this returns structured “deeper” sections based on severity.
 */
export function buildPaidPhotoReport(severity: PhotoSeverity): PhotoPaidReport {
  if (severity === "green") {
    return {
      severity,
      headline: "No obvious red flags — still worth confirming the basics",
      whatYoureSeeing:
        "From this angle, the work appears generally acceptable. The biggest risk is what the photo *doesn’t* show: fastening details, flashing, edge conditions, and transitions.",
      risks: [
        "Hidden defects outside the frame (fasteners, flashing, adhesive coverage, backing).",
        "Incorrect spacing/coverage that becomes expensive once covered up.",
        "Missing documentation (materials, specs, approvals).",
      ],
      whatToVerify: [
        "Confirm materials used match spec/quote (brand/model).",
        "Verify fastening/attachment method meets manufacturer guidance.",
        "Confirm waterproofing/flashing at transitions (if applicable).",
      ],
      questionsToAsk: [
        "Can you show me the fastening pattern / attachment method before it’s covered?",
        "What manufacturer instructions are you following for this material/system?",
        "Are there photos of each step for documentation and warranty?",
      ],
      nextSteps: [
        "Take 2–3 more angles: close-up, wide shot, and an edge/transition shot.",
        "Ask for a quick written scope confirmation (what’s included/excluded).",
        "Proceed, but document now so you’re protected later.",
      ],
    };
  }

  if (severity === "yellow") {
    return {
      severity,
      headline: "Possible concern — verify before the next step covers it",
      whatYoureSeeing:
        "This photo suggests something may be off or incomplete. It could be normal for the stage of work, but it’s worth confirming key details now.",
      risks: [
        "A small install miss can turn into leaks, movement, or premature failure.",
        "Unclear scope can lead to change orders once you’re committed.",
        "Safety or access issues can cause rushed work / shortcuts.",
      ],
      whatToVerify: [
        "Confirm this is an in-progress stage and what comes next (written).",
        "Check alignment/spacing/coverage at edges and penetrations.",
        "Confirm any required blocking/backing/support exists where needed.",
      ],
      questionsToAsk: [
        "What is the next step after this, and what needs to be inspected before it’s covered?",
        "Can you point out how you’re handling edges, corners, and transitions?",
        "What could fail here if this step is done incorrectly?",
      ],
      nextSteps: [
        "Pause cover-up until you get 2–3 confirming photos/measurements.",
        "Ask for a quick walkthrough of this stage and get it in writing (text/email).",
        "If unsure, request a quick site check from a supervisor/inspector.",
      ],
    };
  }

  if (severity === "red") {
    return {
      severity,
      headline: "Potential red flag — stop and verify before continuing",
      whatYoureSeeing:
        "This photo suggests a higher-risk issue. It may be fixable quickly right now, but becomes expensive once finished over.",
      risks: [
        "Code/manufacturer non-compliance could void warranty or require rework.",
        "Water intrusion, structural weakness, or unsafe conditions if left as-is.",
        "Costly tear-out if discovered after completion.",
      ],
      whatToVerify: [
        "Confirm this detail meets code/manufacturer requirements.",
        "Verify proper materials and fastening/anchoring method.",
        "Document the condition with close-ups and a wide shot for context.",
      ],
      questionsToAsk: [
        "Can you show me the code/manufacturer requirement you’re meeting here?",
        "What’s the fix if this is wrong—and who pays for the rework?",
        "Can we pause until we verify this with the spec/inspector?",
      ],
      nextSteps: [
        "Stop cover-up work until confirmed.",
        "Take clear photos (close + wide) and ask for a written corrective plan.",
        "If contractor resists, get a 3rd-party inspection before proceeding.",
      ],
    };
  }

  // unknown
  return {
    severity: "unknown",
    headline: "Not enough detail — need better photos to confirm",
    whatYoureSeeing:
      "This angle doesn’t show the key details needed to make a reliable call. The safest move is to capture the missing context before proceeding.",
    risks: [
      "Proceeding without confirmation can lock in a hidden defect.",
      "Miscommunication about scope and materials.",
    ],
    whatToVerify: ["Get a close-up of the critical detail area.", "Get a wide shot showing overall context."],
    questionsToAsk: [
      "What exactly is happening in this area and what step is this in the process?",
      "Can you walk me through what will be inspected before it’s covered?",
    ],
    nextSteps: [
      "Retake photos: close-up, wide shot, and one from the opposite side.",
      "Include a reference (tape measure or known object) for scale when possible.",
    ],
  };
}
