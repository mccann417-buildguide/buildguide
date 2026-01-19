// src/app/api/bid/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOpenAI } from "../../lib/openai";
import { BidResultSchema } from "../../lib/aiSchemas";

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
    const bidText = body?.text;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!bidText || typeof bidText !== "string") {
      return NextResponse.json({ error: "Missing text." }, { status: 400 });
    }

    const id = randomUUID();

    const prompt = `
Return ONLY valid JSON matching:
{
  "id": "${id}",
  "kind": "bid",
  "included": string[],
  "missing": string[],
  "redFlags": string[],
  "typicalRange": { "low": string, "mid": string, "high": string },
  "questionsToAsk": string[]
}

Rules:
- included: what the bid clearly covers
- missing: common scope gaps/exclusions
- redFlags: vague wording, allowance traps, payment risk, permit ambiguity, no warranty, no cleanup, etc.
- typicalRange values like "$8,500–$11,000"
- keep bullets short & specific
`;

    const userContext = notes ? `\n\nJOB CONTEXT:\n${notes}\n` : "";

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: "You are BuildGuide Bid Check. Be practical and cautious. Output ONLY JSON.",
        },
        {
          role: "user",
          content: prompt + userContext + "\n\nBID TEXT:\n" + bidText,
        },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);
    const validated = BidResultSchema.parse(json);

    return NextResponse.json(validated);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid AI failed." }, { status: 500 });
  }
}
