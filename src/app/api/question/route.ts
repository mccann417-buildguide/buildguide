// src/app/api/question/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { question, context } = (await req.json()) as {
      question: string;
      context?: string;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const prompt = `
You are BuildGuide — a practical construction advisor.
Answer in plain English. Be specific. Use bullets.
If unsure, say what info/photo you need next.

Question: ${question}
Context (optional): ${context ?? ""}

Return JSON:
{
  "answer": string,
  "followUps": string[],
  "redFlags": string[]
}
`;

    const res = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = res.output_text?.trim() ?? "";
    // Expecting JSON. If model ever returns non-JSON, you’ll see it quickly in dev.
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Question AI failed" },
      { status: 500 }
    );
  }
}
