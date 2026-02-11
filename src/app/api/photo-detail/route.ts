// src/app/api/photo-detail/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";

export const runtime = "nodejs";

type PhotoBase = {
  id: string;
  kind: "photo";
  summary: string;
  looksGood: string[];
  concerns: string[];
  whatToDoNext: string[];
  questionsToAsk?: string[];
};

type DetailContext = {
  area?: string;
  projectType?: string;
  stage?: string;
  budget?: string;
  extraNotes?: string;
};

function safeArr(v: any, max = 12) {
  return Array.isArray(v) ? v.filter(Boolean).map(String).slice(0, max) : [];
}
function safeStr(v: any, fb = "") {
  return typeof v === "string" ? v : fb;
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();
    const body = await req.json().catch(() => null);

    const base = (body?.base ?? null) as PhotoBase | null;
    const context = (body?.context ?? null) as DetailContext | null;

    if (!base?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const area = context?.area?.trim() || "Troy, NY 12180";

    const instructions =
      "You are BuildGuide Photo Detail (paid). Output ONLY valid JSON matching the provided schema. No markdown. No extra keys.";

    const prompt = `
Generate a PREMIUM paid Photo Check report.

Goal:
- Better than a general AI chat reply by being structured, cautious, and actionable.

Hard rules:
- Never claim certainty when a single photo can’t confirm.
- Do not invent details not visible in the photo or base preview.
- Make it contractor-safe and client-friendly.
- Include BOTH positives and negatives.
- Keep bullets short, direct, and non-fluffy.

Structure requirements:
- qualityChecks: 4–8 bullets. Include what looks correct / done right (if any).
- deeperFindings: 5–10 bullets. MUST include:
  - "What you're likely looking at: ___"
  - "Confidence: low/medium/high (and why)"
  - "Assumptions: ___" (1 bullet)
  - "Photos that would confirm: ___" (1–2 bullets)
- redFlags: 3–8 bullets. Prefix each with "RED:" or "YELLOW:".
  - RED = safety / code / failure risk
  - YELLOW = verify / could be fine but needs confirmation
- whatToDoNext: 6–10 bullets. MUST include:
  - 2 bullets that are "Take these photos next: ..."
  - 2 bullets that are "Verify: ..."
  - 1 bullet that is "Ask the contractor: ..." (one line, client language)
- pdfSummary: 6–10 lines, client-friendly, no jargon, no prices unless part of marketComparison.

Market comparison rules (this is paid):
- marketComparison.area must be "${area}"
- expectedRange.low/mid/high are rough ballpark strings like "$1,200", "$2,100", "$3,300"
- Low < Mid < High always.
- High should not be wildly higher than Mid (avoid insane ranges).
- If you lack enough info to estimate, set low/mid/high to "—" and verdict to "unknown".
- verdict must be one of: below_typical, within_typical, above_typical, unknown
- disclaimer must be EXACTLY:
  "This is a rough market snapshot. Exact pricing depends on scope and site conditions."
- notes: 3–6 bullets explaining what drives the range (scope, access, finish level, demo, disposal, protection, unknowns).

Context:
- projectType: ${context?.projectType ?? ""}
- stage: ${context?.stage ?? ""}
- budget: ${context?.budget ?? ""}
- extraNotes: ${context?.extraNotes ?? ""}

Base preview JSON:
${JSON.stringify(base, null, 2)}
`.trim();

    const r = await openai.responses.create({
      model: "gpt-4o-mini-2024-07-18",
      instructions,
      input: [{ role: "user", content: prompt }],
      temperature: 0.2,
      text: {
        format: {
          type: "json_schema",
          name: "photo_detail",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["deeperFindings", "qualityChecks", "redFlags", "whatToDoNext", "pdfSummary", "marketComparison"],
            properties: {
              deeperFindings: { type: "array", items: { type: "string" } },
              qualityChecks: { type: "array", items: { type: "string" } },
              redFlags: { type: "array", items: { type: "string" } },
              whatToDoNext: { type: "array", items: { type: "string" } },
              pdfSummary: { type: "string" },
              marketComparison: {
                type: "object",
                additionalProperties: false,
                required: ["area", "expectedRange", "verdict", "notes", "disclaimer"],
                properties: {
                  area: { type: "string" },
                  expectedRange: {
                    type: "object",
                    additionalProperties: false,
                    required: ["low", "mid", "high"],
                    properties: {
                      low: { type: "string" },
                      mid: { type: "string" },
                      high: { type: "string" },
                    },
                  },
                  verdict: {
                    type: "string",
                    enum: ["below_typical", "within_typical", "above_typical", "unknown"],
                  },
                  notes: { type: "array", items: { type: "string" } },
                  disclaimer: { type: "string" },
                },
              },
            },
          },
        },
      },
    });

    const raw = r.output_text ?? "";
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON (unexpected).", raw: raw.slice(0, 800) },
        { status: 500 }
      );
    }

    const expected = json?.marketComparison?.expectedRange ?? { low: "—", mid: "—", high: "—" };

    return NextResponse.json({
      deeperFindings: safeArr(json?.deeperFindings, 12),
      qualityChecks: safeArr(json?.qualityChecks, 10),
      redFlags: safeArr(json?.redFlags, 10),
      whatToDoNext: safeArr(json?.whatToDoNext, 12),
      pdfSummary: safeStr(json?.pdfSummary),

      marketComparison: {
        area: safeStr(json?.marketComparison?.area, area) || area,
        expectedRange: {
          low: safeStr(expected?.low, "—"),
          mid: safeStr(expected?.mid, "—"),
          high: safeStr(expected?.high, "—"),
        },
        verdict:
          json?.marketComparison?.verdict === "below_typical" ||
          json?.marketComparison?.verdict === "within_typical" ||
          json?.marketComparison?.verdict === "above_typical"
            ? json.marketComparison.verdict
            : "unknown",
        notes: safeArr(json?.marketComparison?.notes, 8),
        disclaimer: "This is a rough market snapshot. Exact pricing depends on scope and site conditions.",
      },
    });
  } catch (err: any) {
    console.error("photo-detail route error:", err);
    return NextResponse.json({ error: err?.message ?? "Photo detail failed." }, { status: 500 });
  }
}
