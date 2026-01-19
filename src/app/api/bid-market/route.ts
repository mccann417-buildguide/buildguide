// src/app/api/bid-market/route.ts
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

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();

    const body = await req.json().catch(() => null);
    const area = String(body?.area ?? "Troy, NY 12180").trim();
    const projectType = String(body?.projectType ?? "").trim();
    const approxSqft = String(body?.approxSqft ?? "").trim();
    const finishLevel = String(body?.finishLevel ?? "unknown").trim();

    const prompt = `
Return ONLY valid JSON:

{
  "area": string,
  "expectedRange": { "low": string, "mid": string, "high": string },
  "verdict": "below_typical" | "within_typical" | "above_typical" | "unknown",
  "notes": string[],
  "disclaimer": "This is a rough market snapshot. Exact pricing depends on scope and site conditions."
}

Rules:
- If details are thin, set verdict="unknown".
- Notes should mention what would tighten accuracy ("more input = tighter comparison").
- Keep it practical and short.
Inputs:
- area: ${area}
- projectType: ${projectType}
- approxSqft: ${approxSqft}
- finishLevel: ${finishLevel}
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You produce a rough local bid market snapshot. Output ONLY JSON." },
        { role: "user", content: prompt },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    const safeArr = (v: any) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
    const safeStr = (v: any, fb = "") => (typeof v === "string" ? v : fb);

    return NextResponse.json({
      area: safeStr(json?.area, area),
      expectedRange: {
        low: safeStr(json?.expectedRange?.low, "—"),
        mid: safeStr(json?.expectedRange?.mid, "—"),
        high: safeStr(json?.expectedRange?.high, "—"),
      },
      verdict:
        json?.verdict === "below_typical" ||
        json?.verdict === "within_typical" ||
        json?.verdict === "above_typical"
          ? json.verdict
          : "unknown",
      notes: safeArr(json?.notes),
      disclaimer: "This is a rough market snapshot. Exact pricing depends on scope and site conditions.",
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid market failed." }, { status: 500 });
  }
}
