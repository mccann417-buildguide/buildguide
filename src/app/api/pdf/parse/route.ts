// src/app/api/pdf/parse/route.ts
console.log("✅ PDF PARSE ROUTE LOADED: v999");
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isClass(fn: any) {
  try {
    return typeof fn === "function" && /^class\s/.test(Function.prototype.toString.call(fn));
  } catch {
    return false;
  }
}

async function loadPdfParseThing(): Promise<any> {
  const mod: any = await import("pdf-parse");

  const candidates = [mod?.default, mod, mod?.pdfParse, mod?.PDFParse, mod?.parse].filter(Boolean);

  for (const c of candidates) {
    if (typeof c === "function") return c;
  }

  console.error("pdf-parse import shape:", {
    keys: mod ? Object.keys(mod) : [],
    defaultType: typeof mod?.default,
  });

  throw new Error("Could not load pdf-parse export.");
}

async function parsePdfBinary(binary: Uint8Array): Promise<{ text: string }> {
  const thing = await loadPdfParseThing();

  // A) Function export
  if (typeof thing === "function" && !isClass(thing)) {
    const out = await thing(binary); // ✅ Uint8Array (NOT Buffer)
    return { text: String(out?.text ?? "").trim() };
  }

  // B) Class export
  if (typeof thing === "function" && isClass(thing)) {
    const instance: any = new thing(binary);

    if (typeof instance?.text === "string") return { text: instance.text.trim() };

    if (typeof instance?.parse === "function") {
      const out = await instance.parse();
      return { text: String(out?.text ?? out ?? "").trim() };
    }

    if (typeof instance?.getText === "function") {
      const out = await instance.getText();
      return { text: String(out ?? "").trim() };
    }

    if (typeof instance?.data?.text === "string") return { text: instance.data.text.trim() };

    console.error("PDFParse class instance shape:", {
      keys: instance ? Object.keys(instance) : [],
    });

    throw new Error("PDFParse class loaded but no usable output method found.");
  }

  throw new Error("pdf-parse export not usable.");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file." }, { status: 400 });
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ ok: false, error: "Only PDF files are supported." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    // ✅ KEY FIX: pdf-parse wants Uint8Array (not Buffer)
    const binary = new Uint8Array(arrayBuffer);

    const { text } = await parsePdfBinary(binary);

    return NextResponse.json({
      ok: true,
      text,
      empty: !text,
      warning: !text ? "No selectable text detected (scanned PDF)." : undefined,
    });
  } catch (err: any) {
    console.error("pdf parse error:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "PDF parse failed." }, { status: 500 });
  }
}
