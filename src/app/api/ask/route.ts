// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

import { openai, requireEnv } from "../../lib/openai";
import { AskResultSchema } from "../../lib/aiSchemas";

export const runtime = "nodejs";

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function POST(req: Request) {
  try {
    requireEnv("OPENAI_API_KEY");

    const body = await req.json().catch(() => null);
    const question = body?.question;
    const context = body?.context ?? null;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing question." }, { status: 400 });
    }

    const prompt = `Return ONLY valid JSON (no markdown, no extra text):
{ "answer": string }

Rules:
- Be clear and practical.
- If permits/code could apply, recommend verifying locally.
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "You are BuildGuide Ask. Output ONLY JSON." },
        {
          role: "user",
          content:
            prompt +
            "\n\nQUESTION:\n" +
            question +
            "\n\nCONTEXT (may be null):\n" +
            JSON.stringify(context, null, 2),
        },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);

    const validated = AskResultSchema.parse(json);

    return NextResponse.json(validated);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Ask AI failed." }, { status: 500 });
  }
}
