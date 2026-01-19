// src/app/api/photo/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getOpenAI, requireEnv } from "../../lib/openai";
import { PhotoResultSchema } from "../../lib/aiSchemas";

export const runtime = "nodejs";

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: Request) {
  try {
    requireEnv("OPENAI_API_KEY");
    const openai = getOpenAI();

    const body = await req.json().catch(() => null);

    const imageDataUrl = String(body?.imageDataUrl ?? "").trim();
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "Missing imageDataUrl" },
        { status: 400 }
      );
    }

    const id = randomUUID();

    const prompt = `
Return ONLY valid JSON matching:
{
  "id": "${id}",
  "kind": "photo",
  "summary": string,
  "redFlags": string[],
  "suggestedFixes": string[],
  "typicalFixCost": { "minor": string, "moderate": string, "major": string },
  "questionsToAsk": string[]
}
Rules:
- be cautious and practical
- keep bullets short
- typicalFixCost values like "$150–$400"
`;

    const userContext = notes ? `\n\nNOTES:\n${notes}\n` : "";

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You are BuildGuide Photo Check. Output ONLY JSON." },
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt + userContext },
            { type: "input_image", image_url: imageDataUrl, detail: "auto" },
          ],
        },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);
    const validated = PhotoResultSchema.parse(json);

    return NextResponse.json(validated);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Photo AI failed." },
      { status: 500 }
    );
  }
}
