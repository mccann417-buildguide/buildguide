// src/app/api/bid-market/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";

export const runtime = "nodejs";

/**
 * We intentionally DO NOT compute verdict here.
 * This endpoint returns an *independent* market range only.
 * Verdict is computed in /api/bid-detail using the actual bid total.
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

function clampNum(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Accepts "$1,200" "1200" "1,200" etc
function parseMoneyToNumber(v: any): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^0-9.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatUSD(n: number) {
  // round to nearest $50 to keep ranges from looking weirdly precise
  const rounded = Math.round(n / 50) * 50;
  return rounded.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();

    const body = await req.json().catch(() => null);
    const area = String(body?.area ?? "Troy, NY 12180").trim();
    const projectType = String(body?.projectType ?? "").trim();
    const approxSqft = String(body?.approxSqft ?? "").trim();
    const finishLevel = String(body?.finishLevel ?? "unknown").trim();
    const permits = String(body?.permits ?? "unknown").trim();
    const includesDemo = String(body?.includesDemo ?? "unknown").trim();

    const prompt = `
Return ONLY valid JSON:

{
  "area": string,
  "expectedRange": { "low": number, "mid": number, "high": number },
  "confidence": "low" | "medium" | "high",
  "assumptions": string[],
  "notes": string[]
}

RULES (IMPORTANT):
- You are NOT given the bid total. Do NOT guess where the bid lands.
- Provide a typical local range for this type of work only.
- expectedRange.low < expectedRange.mid < expectedRange.high (strictly increasing).
- Use whole-dollar numbers (no "$", no commas) for expectedRange.
- If details are missing, widen the range and lower confidence.
- Keep assumptions + notes practical (short bullets).

Inputs:
- area: ${area}
- projectType: ${projectType || "(unknown)"}
- approxSqft: ${approxSqft || "(unknown)"}
- finishLevel: ${finishLevel}
- permits: ${permits}
- includesDemo: ${includesDemo}
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You produce an independent local pricing range. Output ONLY JSON." },
        { role: "user", content: prompt },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    const safeArr = (v: any) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
    const safeStr = (v: any, fb = "") => (typeof v === "string" ? v : fb);

    // Read numbers from model
    let low = parseMoneyToNumber(json?.expectedRange?.low);
    let mid = parseMoneyToNumber(json?.expectedRange?.mid);
    let high = parseMoneyToNumber(json?.expectedRange?.high);

    // Fallback if model gives junk
    if (low == null || mid == null || high == null) {
      // a wide placeholder range when inputs are thin
      low = 1000;
      mid = 3000;
      high = 8000;
    }

    // Enforce ordering + sane spacing so we never get low==high etc
    // Make sure low < mid < high even if model screws it up
    const nums = [low, mid, high].map((n) => (Number.isFinite(n) ? n : 0)).sort((a, b) => a - b);
    low = nums[0];
    mid = nums[1];
    high = nums[2];

    // If any ties, push them apart
    if (mid <= low) mid = low + Math.max(250, Math.round(low * 0.25));
    if (high <= mid) high = mid + Math.max(500, Math.round(mid * 0.5));

    // Clamp extreme nonsense (still allow big jobs, but not absurd)
    low = clampNum(low, 200, 2_000_000);
    mid = clampNum(mid, low + 200, 3_000_000);
    high = clampNum(high, mid + 200, 5_000_000);

    const confidence =
      json?.confidence === "high" || json?.confidence === "medium" || json?.confidence === "low"
        ? json.confidence
        : "low";

    return NextResponse.json({
      area: safeStr(json?.area, area),
      expectedRange: {
        // Return both numeric and formatted strings to make UI/PDF easy + consistent
        low: formatUSD(low),
        mid: formatUSD(mid),
        high: formatUSD(high),
        _low: low,
        _mid: mid,
        _high: high,
      },
      confidence,
      assumptions: safeArr(json?.assumptions),
      notes: safeArr(json?.notes),
      disclaimer: "This is a rough market snapshot. Exact pricing depends on scope and site conditions.",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid market failed." }, { status: 500 });
  }
}
