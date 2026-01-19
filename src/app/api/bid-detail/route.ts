// src/app/api/bid-detail/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";

export const runtime = "nodejs";

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found.");
  return JSON.parse(text.slice(start, end + 1));
}

type BidBase = {
  id: string;
  kind: "bid";
  included: string[];
  missing: string[];
  redFlags: string[];
  typicalRange?: { low: string; mid: string; high: string };
  questionsToAsk?: string[];
};

type DetailContext = {
  area?: string;
  projectType?: string;
  approxSqft?: string;
  finishLevel?: "budget" | "mid" | "high" | "unknown";
  permits?: "yes" | "no" | "unknown";
  includesDemo?: "yes" | "no" | "unknown";
  timeline?: string;
  accessNotes?: string;
  extraNotes?: string;
  jobNotes?: string;
};

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();

    const body = await req.json().catch(() => null);
    const base = (body?.base ?? null) as BidBase | null;
    const context = (body?.context ?? null) as DetailContext | null;

    if (!base?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const area = context?.area?.trim() || "Troy, NY 12180";

    const prompt = `
Return ONLY valid JSON matching EXACTLY this shape:

{
  "deeperIssues": string[],
  "paymentScheduleNotes": string[],
  "contractWarnings": string[],
  "negotiationTips": string[],
  "pdfSummary": string,

  "marketComparison": {
    "area": "${area}",
    "expectedRange": { "low": string, "mid": string, "high": string },
    "verdict": "below_typical" | "within_typical" | "above_typical" | "unknown",
    "notes": string[],
    "disclaimer": string
  }
}

Rules:
- Be cautious. No guarantees.
- Use base.typicalRange IF PROVIDED as the anchor for expectedRange.
- If typicalRange is missing/unhelpful, estimate a rough expected range anyway for ${area}, but set verdict="unknown".
- marketComparison.disclaimer must be: "This is a rough market snapshot. Exact pricing depends on scope and site conditions."
- pdfSummary: 6–10 lines, client-friendly.

Context:
- projectType: ${context?.projectType ?? ""}
- approxSqft/size: ${context?.approxSqft ?? ""}
- finishLevel: ${context?.finishLevel ?? "unknown"}
- permits: ${context?.permits ?? "unknown"}
- includesDemo: ${context?.includesDemo ?? "unknown"}
- timeline: ${context?.timeline ?? ""}
- accessNotes: ${context?.accessNotes ?? ""}
- extraNotes: ${context?.extraNotes ?? ""}
- jobNotes: ${context?.jobNotes ?? ""}

Input base JSON follows.
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You are BuildGuide Bid Detail. Output ONLY JSON." },
        { role: "user", content: prompt + "\n\nBASE:\n" + JSON.stringify(base, null, 2) },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    const safeArr = (v: any) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
    const safeStr = (v: any, fb = "") => (typeof v === "string" ? v : fb);

    const expected =
      json?.marketComparison?.expectedRange ??
      base.typicalRange ??
      { low: "—", mid: "—", high: "—" };

    return NextResponse.json({
      deeperIssues: safeArr(json?.deeperIssues),
      paymentScheduleNotes: safeArr(json?.paymentScheduleNotes),
      contractWarnings: safeArr(json?.contractWarnings),
      negotiationTips: safeArr(json?.negotiationTips),
      pdfSummary: safeStr(json?.pdfSummary),

      marketComparison: {
        area,
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
        notes: safeArr(json?.marketComparison?.notes),
        disclaimer: "This is a rough market snapshot. Exact pricing depends on scope and site conditions.",
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid detail failed." }, { status: 500 });
  }
}
