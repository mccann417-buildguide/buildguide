// src/app/api/photo/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";

export const runtime = "nodejs";

// Helpers
function safeStr(v: any, fb = "") {
  return typeof v === "string" ? v : fb;
}

function safeArr(v: any, max = 5) {
  return Array.isArray(v) ? v.filter(Boolean).map(String).slice(0, max) : [];
}

// Convert an uploaded File (Blob) to a base64 data URL (data:image/jpeg;base64,...)
async function fileToDataUrl(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  const base64 = buf.toString("base64");
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();

    // ✅ Expect multipart/form-data
    const form = await req.formData();
    const file = form.get("image");
    const notes = (form.get("notes") ? String(form.get("notes")) : "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file (field name: image)." }, { status: 400 });
    }

    const mime = file.type || "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image." }, { status: 400 });
    }

    // Convert to data URL for OpenAI image input (server-side)
    const imageDataUrl = await fileToDataUrl(file);

    const instructions =
      "You are BuildGuide Photo Check (free preview). " +
      "Be cautious and practical. Output ONLY JSON matching the schema. No markdown. No extra keys.";

    const prompt = `
You are analyzing ONE construction photo as a quick preview.

Hard rules:
- Be cautious. No guarantees. Don’t invent details not visible.
- If you can’t tell, say so plainly.
- Keep this FREE preview useful but brief.
- summary must be 1–2 sentences (not a full report).
- looksGood: 0–3 short bullets.
- concerns: 0–3 short bullets.
- whatToDoNext: EXACTLY 3 bullets (keep broad + practical).
- questionsToAsk: EXACTLY 3 bullets (simple, contractor-safe).
- Never include prices or cost ranges in the free preview.

User notes/context (may be empty):
${notes}
`.trim();

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions,
      temperature: 0.2,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageDataUrl },
          ] as any,
        },
      ] as any,
      text: {
        format: {
          type: "json_schema",
          name: "photo_preview",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "summary", "looksGood", "concerns", "whatToDoNext", "questionsToAsk"],
            properties: {
              id: { type: "string" },
              kind: { type: "string", enum: ["photo"] },
              summary: { type: "string" },
              looksGood: { type: "array", items: { type: "string" } },
              concerns: { type: "array", items: { type: "string" } },
              whatToDoNext: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
              questionsToAsk: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            },
          },
        },
      },
    });

    const raw = r.output_text ?? "";
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON (unexpected).", raw: raw.slice(0, 800) },
        { status: 500 }
      );
    }

    const id = safeStr(json?.id) || `photo_${Date.now()}`;

    return NextResponse.json({
      id,
      kind: "photo",
      summary: safeStr(json?.summary),
      looksGood: safeArr(json?.looksGood, 3),
      concerns: safeArr(json?.concerns, 3),
      whatToDoNext: safeArr(json?.whatToDoNext, 3),
      questionsToAsk: safeArr(json?.questionsToAsk, 3),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Photo analysis failed." }, { status: 500 });
  }
}
