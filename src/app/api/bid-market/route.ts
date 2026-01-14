// src/app/api/bid-market/route.ts
import { NextResponse } from "next/server";

import { openai, requireEnv } from "../../lib/openai";

export const runtime = "nodejs";

function extractJson(text: string) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Fallback: pull first {...} block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function safeStr(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export async function POST(req: Request) {
  try {
    requireEnv("OPENAI_API_KEY");

    const body = await req.json().catch(() => null);
    const text = body?.text;
    const notes = body?.notes;
    const location = body?.location;
    const projectType = body?.projectType;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing bid text." }, { status: 400 });
    }

    const zip = safeStr(location?.zip, "12180");
    const city = safeStr(location?.city, "Troy");
    const state = safeStr(location?.state, "NY");
    const project = safeStr(projectType, "general");

    const prompt = `Return ONLY valid JSON (no markdown, no extra text) matching this exact shape:

{
  "expectedRange": { "low": string, "mid": string, "high": string },
  "positioning": { "label": "low" | "in-range" | "high", "percent": number },
  "confidence": "low" | "medium" | "high",
  "assumptions": string[],
  "bigDrivers": string[],
  "missingInfo": string[],
  "lineItemSanity": { "item": string, "expected": string, "notes": string }[]
}

Context:
- Location: ${city}, ${state} ${zip}
- Project type: ${project}

Rules:
- expectedRange values like "$8,500–$11,000"
- positioning.percent is positive if the bid is ABOVE expected mid, negative if BELOW; 0 if about equal.
- Be conservative: if scope is unclear, set confidence="low" and list missingInfo.
- Use plausible local contractor pricing logic:
  - labor + materials + overhead/profit; explain assumptions.
- Keep bullets short and practical.
- lineItemSanity: include 3–8 items max (only if you can infer them from the bid; otherwise provide general buckets like "Labor", "Materials", "Demo/Disposal", "Permits", "Electrical", etc.)

BID TEXT:
${text}

OPTIONAL JOB CONTEXT:
${typeof notes === "string" ? notes : ""}`.trim();

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are BuildGuide Market Rate Checker. Estimate plausible local price ranges based on scope and location. Be cautious. Output ONLY JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    // Light sanity checks (avoid runtime crashes on UI)
    if (!json?.expectedRange?.low || !json?.expectedRange?.mid || !json?.expectedRange?.high) {
      throw new Error("Invalid response: expectedRange missing.");
    }
    if (!json?.positioning?.label || typeof json?.positioning?.percent !== "number") {
      throw new Error("Invalid response: positioning missing.");
    }
    if (!json?.confidence) {
      throw new Error("Invalid response: confidence missing.");
    }

    return NextResponse.json(json);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Market compare failed." },
      { status: 500 }
    );
  }
}
