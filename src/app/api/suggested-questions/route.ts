// src/app/api/suggested-questions/route.ts
import { NextResponse } from "next/server";
import { openai, requireEnv } from "../../lib/openai";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    requireEnv("OPENAI_API_KEY");

    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") || "photo";
    const identified = url.searchParams.get("identified") || "";

    const prompt =
      kind === "bid"
        ? "Generate 8 sharp questions a homeowner should ask about a contractor bid. Focus on scope gaps, exclusions, allowances, warranty, payment schedule, permits, and change orders."
        : `Generate 8 sharp questions based on a construction photo. If a detail is unknown, ask verification questions. Photo topic: ${identified || "general construction detail"}.`;

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    // Split into lines, clean bullets
    const lines = (r.output_text || "")
      .split("\n")
      .map((s) => s.replace(/^[-*•\d.]+\s*/, "").trim())
      .filter(Boolean);

    // keep best 8
    const questions = lines.slice(0, 8);

    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Suggested questions failed." },
      { status: 500 }
    );
  }
}
