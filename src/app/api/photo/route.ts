// src/app/api/photo/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { openai, requireEnv } from "../../lib/openai";
import { PhotoResultSchema } from "../../lib/aiSchemas";

export const runtime = "nodejs";

async function fileToDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

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

    const form = await req.formData();
    const image = form.get("image");

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: "Missing image file (image)." }, { status: 400 });
    }

    const id = randomUUID();
    const imageUrl = await fileToDataUrl(image);

    const prompt = `Return ONLY valid JSON (no markdown, no extra text) that matches this shape exactly:
{
  "id": "${id}",
  "kind": "photo",
  "identified": string,
  "confidence": "low" | "medium" | "high",
  "looksGood": string[],
  "issues": string[],
  "typicalFixCost": { "minor": string, "moderate": string, "major": string },
  "suggestedQuestions": string[]
}

Rules:
- Keep bullets short and practical.
- If you cannot tell, set confidence="low" and add a question suggesting the next photo angle needed.
- typicalFixCost values are strings like "$150–$400".
`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: "You are BuildGuide Photo Check. Analyze construction photos. Be cautious and practical. Output ONLY JSON.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageUrl, detail: "auto" },
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
    return NextResponse.json({ error: err?.message ?? "Photo AI failed." }, { status: 500 });
  }
}
