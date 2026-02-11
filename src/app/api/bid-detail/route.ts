// src/app/api/bid-detail/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";

export const runtime = "nodejs";

/**
 * BuildGuide Bid Detail
 * - Deterministic parsing & guardrails first (NO AI)
 * - AI fills in narrative + tips but MUST respect guardrails
 */

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

type Verdict =
  | "significantly_below_market"
  | "below_market"
  | "within_typical"
  | "above_market"
  | "significantly_above_market"
  | "unknown";

type MarketComparison = {
  area: string;
  bidTotal: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: Verdict;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
  notes: string[];
  disclaimer: string;
};

function safeArr(v: any) {
  return Array.isArray(v) ? v.filter(Boolean).map((x) => String(x)) : [];
}
function safeStr(v: any, fb = "") {
  return typeof v === "string" ? v : fb;
}

function normalizeMoney(n: number) {
  if (!Number.isFinite(n)) return "Unknown";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function parseSqft(s?: string): number | null {
  if (!s) return null;
  const m = String(s).replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const v = Number(m[1]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

/**
 * Infer a "projectType" from bid text if user didn't provide it.
 * This is deliberately simple + deterministic.
 */
function inferProjectTypeFromText(bidText: string): string {
  const t = (bidText || "").toLowerCase();

  const has = (rx: RegExp) => rx.test(t);

  if (has(/\b(shower|tile|grout|schluter|kerdi|waterproof|pan)\b/)) return "bathroom / tile / shower";
  if (has(/\b(kitchen|cabinet|countertop|granite|quartz|backsplash)\b/)) return "kitchen remodel";
  if (has(/\b(drywall|sheetrock|tape|mud|joint compound|skim)\b/)) return "drywall / finishing";
  if (has(/\b(paint|primer|caulk|spackle)\b/)) return "painting";
  if (has(/\b(floor|flooring|lvp|vinyl plank|hardwood|laminate|carpet)\b/)) return "flooring";
  if (has(/\b(deck|porch|railing|trex|stair)\b/)) return "deck / porch";
  if (has(/\b(roof|shingle|underlayment|flashing|ridge vent)\b/)) return "roofing";
  if (has(/\b(siding|soffit|fascia|housewrap|tyvek)\b/)) return "siding / exterior";
  if (has(/\b(window|door|trim|casing|baseboard)\b/)) return "doors/windows/trim";
  if (has(/\b(electrical|panel|breaker|wire|wiring|outlet|switch|gfci|romex)\b/)) return "electrical";
  if (has(/\b(plumbing|pipe|pex|drain|trap|valve|water heater)\b/)) return "plumbing";

  return "";
}

/**
 * Extract "total bid" from raw text using conservative heuristics.
 * Returns null if unclear.
 */
function extractBidTotalNumber(
  bidText: string
): { total: number; confidence: "low" | "medium" | "high"; why: string } | null {
  const t = (bidText || "").replace(/\r/g, "\n");

  const totalLineRegexes = [
    /(?:grand\s+total|total\s+due|total\s+price|total\s+cost|estimate\s+total|project\s+total)\s*[:\-]?\s*\$?\s*([0-9][0-9,]*)(?:\.\d{2})?/gi,
    // IMPORTANT: this "total" rule can match a lot — keep it last and be conservative
    /(?:\btotal\b)\s*[:\-]?\s*\$?\s*([0-9][0-9,]*)(?:\.\d{2})?/gi,
  ];

  const candidates: number[] = [];

  for (const rx of totalLineRegexes) {
    let m: RegExpExecArray | null;
    while ((m = rx.exec(t))) {
      const num = Number(String(m[1]).replace(/,/g, ""));
      if (Number.isFinite(num) && num > 0) candidates.push(num);
    }
  }

  if (candidates.length) {
    const max = Math.max(...candidates);
    if (max < 50) return null;

    // If we matched multiple totals, that’s stronger
    const conf: "low" | "medium" | "high" = candidates.length >= 2 ? "high" : "medium";
    return { total: max, confidence: conf, why: "Matched a 'Total' style line in the bid text." };
  }

  // Fallback: cents amounts (weak)
  const moneyRx = /\$?\s*([0-9][0-9,]*)(?:\.\d{2})/g;
  let m2: RegExpExecArray | null;
  const cents: number[] = [];
  while ((m2 = moneyRx.exec(t))) {
    const num = Number(String(m2[1]).replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) cents.push(num);
  }
  if (cents.length) {
    const max = Math.max(...cents);
    if (max >= 200) {
      return { total: max, confidence: "low", why: "No explicit total line; using largest $xx.xx amount found." };
    }
  }

  return null;
}

/**
 * Category baselines when sqft is unknown.
 * These are intentionally wide, and still allow the report to differ by bid type.
 */
function baselineRangeByCategory(projectTypeLower: string): { low: number; mid: number; high: number; why: string } {
  const pt = projectTypeLower;

  // Default: generic remodel / unknown
  let low = 2000;
  let mid = 6000;
  let high = 15000;
  let why = "General remodeling baseline (project type not specific).";

  if (pt.includes("painting")) {
    low = 800; mid = 3000; high = 9000;
    why = "Painting baseline (scope varies by rooms, prep, ceilings, repairs).";
  } else if (pt.includes("drywall")) {
    low = 1200; mid = 4500; high = 14000;
    why = "Drywall/finishing baseline (patch vs full rooms, height, texture, sanding).";
  } else if (pt.includes("floor")) {
    low = 1500; mid = 5500; high = 16000;
    why = "Flooring baseline (material, subfloor prep, sqft, transitions).";
  } else if (pt.includes("deck") || pt.includes("porch")) {
    low = 3500; mid = 9000; high = 25000;
    why = "Deck/porch baseline (framing, footing, railing, stairs, composite vs PT).";
  } else if (pt.includes("roof")) {
    low = 5000; mid = 11000; high = 22000;
    why = "Roofing baseline (layers, pitch, sheathing, flashing, ventilation).";
  } else if (pt.includes("siding") || pt.includes("exterior")) {
    low = 4500; mid = 12000; high = 30000;
    why = "Siding/exterior baseline (tear-off, wrap, trim, height/access).";
  } else if (pt.includes("bath") || pt.includes("tile") || pt.includes("shower")) {
    low = 6000; mid = 14000; high = 32000;
    why = "Bathroom/tile baseline (waterproofing, plumbing changes, tile grade, fixtures).";
  } else if (pt.includes("kitchen")) {
    low = 12000; mid = 25000; high = 60000;
    why = "Kitchen baseline (cabinets, counters, layout changes, electrical/plumbing).";
  } else if (pt.includes("electrical")) {
    low = 1200; mid = 5000; high = 15000;
    why = "Electrical baseline (scope depends on circuits, panel work, code upgrades).";
  } else if (pt.includes("plumbing")) {
    low = 1200; mid = 5500; high = 18000;
    why = "Plumbing baseline (access, fixture count, drain/vent complexity).";
  } else if (pt.includes("door") || pt.includes("window") || pt.includes("trim")) {
    low = 500; mid = 2500; high = 9000;
    why = "Doors/windows/trim baseline (count, casing, jamb work, repairs).";
  }

  return { low, mid, high, why };
}

/**
 * Expected range builder.
 * - If sqft exists → per-sqft bands (best)
 * - If sqft missing → category baseline range (still varies by project)
 */
function buildExpectedRange(params: {
  projectType?: string;
  sqft?: number | null;
  finish?: "budget" | "mid" | "high" | "unknown";
  demo?: "yes" | "no" | "unknown";
  permits?: "yes" | "no" | "unknown";
}): { low: number; mid: number; high: number; confidence: "low" | "medium" | "high"; assumptions: string[] } {
  const assumptions: string[] = [];

  const pt = (params.projectType || "").toLowerCase().trim();
  const sqft = params.sqft ?? null;
  const finish = params.finish ?? "unknown";

  // multipliers
  let mult = 1;

  if (finish === "budget") mult *= 0.85;
  else if (finish === "high") mult *= 1.25;
  else assumptions.push("Finish level unknown.");

  if (params.demo === "yes") mult *= 1.12;
  else if (params.demo === "unknown") assumptions.push("Demo included unknown.");

  if (params.permits === "yes") mult *= 1.07;
  else if (params.permits === "unknown") assumptions.push("Permits unknown.");

  // If sqft known → per-sqft bands
  if (sqft && sqft > 0) {
    let lo = 6;
    let hi = 30;
    let confidence: "low" | "medium" | "high" = "low";

    const isPaint = pt.includes("paint");
    const isFloor = pt.includes("floor") || pt.includes("flooring") || pt.includes("carpet") || pt.includes("lvp") || pt.includes("hardwood");
    const isDeck = pt.includes("deck") || pt.includes("porch");
    const isRoof = pt.includes("roof");
    const isBath = pt.includes("bath") || pt.includes("tile") || pt.includes("shower");
    const isKitchen = pt.includes("kitchen");
    const isDrywall = pt.includes("drywall") || pt.includes("sheetrock") || pt.includes("tape") || pt.includes("mud");
    const isSiding = pt.includes("siding");

    if (isPaint) { lo = 1.5; hi = 6; confidence = "medium"; }
    else if (isFloor) { lo = 4; hi = 14; confidence = "medium"; }
    else if (isDrywall) { lo = 6; hi = 22; confidence = "medium"; }
    else if (isDeck) { lo = 25; hi = 70; confidence = "medium"; }
    else if (isRoof) { lo = 6; hi = 16; confidence = "medium"; }
    else if (isSiding) { lo = 10; hi = 35; confidence = "medium"; }
    else if (isBath) { lo = 120; hi = 350; confidence = "low"; assumptions.push("Bathroom scope varies heavily (plumbing, tile, fixtures)."); }
    else if (isKitchen) { lo = 150; hi = 450; confidence = "low"; assumptions.push("Kitchen scope varies heavily (cabinets, appliances, layout)."); }
    else { lo = 6; hi = 30; confidence = "low"; assumptions.push("Project type not specific; using general remodeling band."); }

    const low = Math.max(400, sqft * lo * mult);
    const high = Math.max(low * 1.35, sqft * hi * mult);
    const mid = (low + high) / 2;

    if (confidence === "medium" && finish !== "unknown" && pt.length >= 4) confidence = "high";
    return { low, mid, high, confidence, assumptions };
  }

  // sqft unknown → category baseline (this is the key fix)
  assumptions.push("Approx size/sqft unknown.");

  const base = baselineRangeByCategory(pt || "");
  let low = base.low * mult;
  let mid = base.mid * mult;
  let high = base.high * mult;

  // Confidence: if we at least know the project type, we can be "medium"
  // Still honest: without sqft, we don't go "high"
  let confidence: "low" | "medium" | "high" = pt ? "medium" : "low";

  if (!pt) assumptions.push("Project type unknown (using general baseline).");
  assumptions.push(base.why);

  return { low, mid, high, confidence, assumptions };
}

/**
 * Verdict logic:
 * - If confidence is low OR bid total unknown => verdict unknown
 * - Otherwise compare bid total to low/high with buffers
 */
function computeVerdict(
  bidTotal: number | null,
  range: { low: number; mid: number; high: number },
  confidence: "low" | "medium" | "high"
): Verdict {
  if (!bidTotal) return "unknown";
  if (confidence === "low") return "unknown";

  if (bidTotal > range.high * 1.6) return "significantly_above_market";
  if (bidTotal > range.high * 1.2) return "above_market";

  if (bidTotal < range.low * 0.6) return "significantly_below_market";
  if (bidTotal < range.low * 0.8) return "below_market";

  return "within_typical";
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();

    const body = await req.json().catch(() => null);
    const base = (body?.base ?? null) as BidBase | null;
    const context = (body?.context ?? null) as DetailContext | null;
    const bidText = typeof body?.bidText === "string" ? body.bidText : "";

    if (!base?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const area = context?.area?.trim() || "Troy, NY 12180";

    const inferredType = inferProjectTypeFromText(bidText);
    const projectType = ((context?.projectType || "").trim() || inferredType).trim();

    const finishLevel = context?.finishLevel ?? "unknown";

    // 1) Deterministic extraction (bid total)
    const extracted = extractBidTotalNumber(bidText);
    const bidTotalNum = extracted?.total ?? null;

    // 2) Deterministic expected range
    const sqft = parseSqft(context?.approxSqft);
    const rangeBuilt = buildExpectedRange({
      projectType,
      sqft,
      finish: finishLevel,
      demo: context?.includesDemo ?? "unknown",
      permits: context?.permits ?? "unknown",
    });

    // 3) Confidence gating (honest)
    // We allow "medium" when projectType inferred + bidTotal detected even if sqft missing
    const hasType = Boolean(projectType);
    const hasSqft = Boolean(sqft);
    const hasFinish = finishLevel !== "unknown";

    let confidenceFinal: "low" | "medium" | "high" = rangeBuilt.confidence;

    // If we have neither type nor sqft, force low
    if (!hasType && !hasSqft) confidenceFinal = "low";

    // If bid total is unknown, cap confidence
    if (!bidTotalNum) confidenceFinal = "low";

    // If sqft is missing and finish is unknown, cap to medium at best
    if (!hasSqft && !hasFinish && confidenceFinal === "high") confidenceFinal = "medium";

    // 4) Verdict
    const verdict = computeVerdict(bidTotalNum, rangeBuilt, confidenceFinal);

    const disclaimer = "This is a rough market snapshot. Exact pricing depends on scope and site conditions.";

    const guardrailMarket: MarketComparison = {
      area,
      bidTotal: bidTotalNum ? normalizeMoney(bidTotalNum) : "Unknown",
      expectedRange: {
        low: normalizeMoney(rangeBuilt.low),
        mid: normalizeMoney(rangeBuilt.mid),
        high: normalizeMoney(rangeBuilt.high),
      },
      verdict,
      confidence: confidenceFinal,
      assumptions: [
        ...rangeBuilt.assumptions,
        ...(extracted?.why ? [extracted.why] : []),
        ...(context?.projectType ? [] : inferredType ? ["Project type inferred from bid text."] : ["Project type not provided."]),
      ],
      notes: [],
      disclaimer,
    };

    const prompt = `
Return ONLY valid JSON matching EXACTLY this shape:

{
  "deeperIssues": string[],
  "paymentScheduleNotes": string[],
  "contractWarnings": string[],
  "negotiationTips": string[],
  "pdfSummary": string,

  "marketComparison": {
    "area": string,
    "bidTotal": string,
    "expectedRange": { "low": string, "mid": string, "high": string },
    "verdict":
      "significantly_below_market" |
      "below_market" |
      "within_typical" |
      "above_market" |
      "significantly_above_market" |
      "unknown",
    "confidence": "low" | "medium" | "high",
    "assumptions": string[],
    "notes": string[],
    "disclaimer": string
  }
}

IMPORTANT:
- You MUST copy marketComparison EXACTLY from GUARDRAILS (do not change any values).
- Fill "notes" with 3-8 bullets explaining what the range means and WHY verdict is what it is.
- If verdict is "unknown", notes MUST say: "More info = more accurate", and list the top 3 missing inputs.
- If verdict is "above_market" or "significantly_above_market", notes MUST suggest 3 contractor-smart follow-ups.
- If verdict is "below_market" or "significantly_below_market", notes MUST warn about scope gaps, change orders, or quality shortcuts.
- pdfSummary: 6–10 short lines, client-friendly, no emojis. Include one line: "More detail = tighter accuracy."

Context:
- area: ${area}
- projectType: ${projectType}
- approxSqft/size: ${context?.approxSqft ?? ""}
- finishLevel: ${finishLevel}
- permits: ${context?.permits ?? "unknown"}
- includesDemo: ${context?.includesDemo ?? "unknown"}
- timeline: ${context?.timeline ?? ""}
- accessNotes: ${context?.accessNotes ?? ""}
- extraNotes: ${context?.extraNotes ?? ""}
- jobNotes: ${context?.jobNotes ?? ""}

Now output JSON only.
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You are BuildGuide Bid Detail. Output ONLY JSON. Follow guardrails strictly." },
        {
          role: "user",
          content:
            prompt +
            "\n\nGUARDRAILS marketComparison:\n" +
            JSON.stringify(guardrailMarket, null, 2) +
            "\n\nBASE:\n" +
            JSON.stringify(base, null, 2) +
            "\n\nBID TEXT:\n" +
            bidText,
        },
      ],
      temperature: 0.2,
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    const deeperIssues = safeArr(json?.deeperIssues);
    const paymentScheduleNotes = safeArr(json?.paymentScheduleNotes);
    const contractWarnings = safeArr(json?.contractWarnings);
    const negotiationTips = safeArr(json?.negotiationTips);
    const pdfSummary = safeStr(json?.pdfSummary, "");

    const aiNotes = safeArr(json?.marketComparison?.notes);

    return NextResponse.json({
      deeperIssues,
      paymentScheduleNotes,
      contractWarnings,
      negotiationTips,
      pdfSummary,

      marketComparison: {
        ...guardrailMarket,
        notes:
          aiNotes.length
            ? aiNotes
            : verdict === "unknown"
              ? [
                  "Bid total and/or scope inputs are incomplete, so the verdict is marked Unknown.",
                  "More info = more accurate: add project type, size/sqft, finish level.",
                  "If you provide the full scope and the total, the range and verdict become much stronger.",
                ]
              : [
                  "Comparison uses detected bid total against a rough low/mid/high expected range for the provided context.",
                  "More detail = tighter accuracy (scope, finish level, demo/permits, and access constraints).",
                ],
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid detail failed." }, { status: 500 });
  }
}
