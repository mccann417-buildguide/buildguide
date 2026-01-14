// src/app/api/photo-detail/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { base } = (await req.json()) as { base: any };

    // base = the existing PhotoAnalysisResult you already have
    if (!base?.identified) {
      return NextResponse.json({ error: "Missing base result" }, { status: 400 });
    }

    const prompt = `
You are BuildGuide — expert construction second set of eyes.
You already have the BASIC result below. Generate the PAID "Detailed Report".

BASIC RESULT:
${JSON.stringify(base, null, 2)}

Return JSON:
{
  "whyItMatters": string[],
  "priorityFixList": { "first": string[], "next": string[], "optional": string[] },
  "contractorQuestions": string[],
  "whatToPhotoNext": string[],
  "pdfSummary": string
}
`;

    const res = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const data = JSON.parse(res.output_text.trim());
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Photo detail AI failed" },
      { status: 500 }
    );
  }
}
