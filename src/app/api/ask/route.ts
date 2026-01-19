// src/app/api/ask/route.ts
import { NextResponse } from "next/server";
import { getOpenAI, requireEnv } from "../../lib/openai";
import { AskResultSchema } from "../../lib/aiSchemas";

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

    const body = await req.json().catch(() => null);
    const question = String(body?.question ?? "").trim();
    const context = String(body?.context ?? "").trim();

    if (!question) {
      return NextResponse.json({ error: "Missing question." }, { status: 400 });
    }

    const prompt = `
Return ONLY valid JSON matching:
{
  "answer": string,
  "followUps": string[],
  "redFlags": string[]
}

Keep it practical, short, and cautious.
`.trim();

    const openai = getOpenAI();

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
            (context ? "\n\nCONTEXT:\n" + context : ""),
        },
      ],
    });

    const raw = r.output_text ?? "";
    const json = extractJson(raw);
    const validated = AskResultSchema.parse(json);

    return NextResponse.json(validated);
  } catch (err: any) {
    console.error("ask route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Ask failed." },
      { status: 500 }
    );
  }
}
