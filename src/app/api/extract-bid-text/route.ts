import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/extract-bid-text
 * Accepts multipart/form-data:
 *  - file: PDF or text file
 * Returns { ok: true, text } or { ok: false, error }
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Missing "file" in form-data' },
        { status: 400 }
      );
    }

    const name = (file.name || "").toLowerCase();

    // If they upload a .txt, just read it directly
    if (name.endsWith(".txt") || file.type === "text/plain") {
      const text = (await file.text()).trim();
      return NextResponse.json({ ok: true, text });
    }

    // Otherwise assume PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Reliable pdf-parse import for Next.js
    const mod = await import("pdf-parse");
    const pdfParse = (mod as any).default as (b: Buffer) => Promise<{ text?: string }>;

    const data = await pdfParse(buffer);
    const text = (data?.text ?? "").trim();

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "extract-bid-text failed" },
      { status: 500 }
    );
  }
}
