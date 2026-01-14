// src/app/api/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

type PhotoBase = {
  id: string;
  kind: "photo";
  identified: string;
  confidence: "low" | "medium" | "high";
  looksGood: string[];
  issues: string[];
  typicalFixCost?: { minor: string; moderate: string; major: string };
  suggestedQuestions?: string[];
};

type PhotoDetailAI = {
  whyItMatters: string[];
  priorityFixList: { first: string[]; next: string[]; optional: string[] };
  contractorQuestions: string[];
  whatToPhotoNext: string[];
  pdfSummary: string;
};

function asArray(v: any): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function safeStr(v: any, fallback = ""): string {
  if (typeof v === "string") return v;
  return fallback;
}

function tryReadIconPath() {
  // Update this path if your icon lives elsewhere in /public
  return path.join(process.cwd(), "public", "icons", "icon-192.png");
}

function splitWords(text: string) {
  return (text ?? "").split(/\s+/).filter(Boolean);
}

function wrapLines(opts: {
  text: string;
  font: any;
  size: number;
  maxWidth: number;
}): string[] {
  const { text, font, size, maxWidth } = opts;
  const words = splitWords(text);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    line = w;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type Ctx = {
  pdfDoc: PDFDocument;
  font: any;
  fontBold: any;
  fontMono: any;
  icon?: any;
  page: any;
  pageNumber: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function drawHeader(ctx: Ctx, title: string, reportId: string) {
  const { page, left, right, top, fontBold, font, icon } = ctx;

  // Header bar
  page.drawRectangle({
    x: 0,
    y: top - 64,
    width: 612,
    height: 64,
    color: rgb(0.98, 0.98, 0.985),
  });

  // Logo
  if (icon) {
    page.drawImage(icon, {
      x: left,
      y: top - 52,
      width: 28,
      height: 28,
    });
  }

  // Title
  page.drawText(title, {
    x: left + (icon ? 38 : 0),
    y: top - 38,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Report ID (right)
  const idText = `Report ID: ${reportId}`;
  const idSize = 10;
  const idWidth = font.widthOfTextAtSize(idText, idSize);
  page.drawText(idText, {
    x: Math.max(left, right - idWidth),
    y: top - 36,
    size: idSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  // Divider
  page.drawLine({
    start: { x: left, y: top - 68 },
    end: { x: right, y: top - 68 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });
}

function drawFooter(ctx: Ctx) {
  const { page, left, right, bottom, font } = ctx;

  page.drawLine({
    start: { x: left, y: bottom + 26 },
    end: { x: right, y: bottom + 26 },
    thickness: 1,
    color: rgb(0.92, 0.92, 0.92),
  });

  page.drawText(
    "BuildGuide provides guidance, not a substitute for an on-site professional. Verify code/permits with local officials.",
    {
      x: left,
      y: bottom + 12,
      size: 8.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  page.drawText(`Page ${ctx.pageNumber}`, {
    x: right - 52,
    y: bottom + 12,
    size: 8.5,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });
}

function newPage(ctx: Ctx, title: string, reportId: string) {
  ctx.pageNumber += 1;
  ctx.page = ctx.pdfDoc.addPage([612, 792]);
  drawHeader(ctx, title, reportId);
  drawFooter(ctx);
  // start cursor under header
  return ctx.top - 92;
}

function ensureSpace(ctx: Ctx, y: number, needed: number, title: string, reportId: string) {
  if (y - needed < ctx.bottom + 40) {
    return newPage(ctx, title, reportId);
  }
  return y;
}

function drawSectionTitle(ctx: Ctx, y: number, title: string) {
  const { page, left, right, fontBold } = ctx;

  page.drawText(title, {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // subtle divider
  page.drawLine({
    start: { x: left, y: y - 6 },
    end: { x: right, y: y - 6 },
    thickness: 1,
    color: rgb(0.93, 0.93, 0.93),
  });

  return y - 20;
}

function drawBullets(ctx: Ctx, y: number, bullets: string[], title: string, reportId: string) {
  const { page, left, right, font } = ctx;

  const bodySize = 10;
  const lineH = 14;
  const maxWidth = right - left - 14;

  const list = bullets.length ? bullets : ["—"];
  for (const b of list) {
    y = ensureSpace(ctx, y, 26, title, reportId);

    // bullet dot
    page.drawText("•", { x: left, y, size: bodySize, font, color: rgb(0.2, 0.2, 0.2) });

    // wrapped text
    const lines = wrapLines({ text: String(b), font, size: bodySize, maxWidth });
    let first = true;
    for (const ln of lines) {
      y = ensureSpace(ctx, y, 18, title, reportId);
      page.drawText(ln, {
        x: left + 14,
        y,
        size: bodySize,
        font,
        color: rgb(0.18, 0.18, 0.18),
      });
      y -= lineH;
      first = false;
      if (!first) {
        // no-op
      }
    }
    y -= 2;
  }

  return y - 6;
}

function drawInfoRow(ctx: Ctx, y: number, label: string, value: string) {
  const { page, left, font, fontBold } = ctx;
  page.drawText(label, { x: left, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(value, { x: left + 120, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
  return y - 14;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const base: PhotoBase | null = body?.base ?? null;
    const detail: PhotoDetailAI | null = body?.detail ?? null;

    if (!base?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Try to embed your icon from /public
    let icon: any | undefined = undefined;
    try {
      const iconBytes = await readFile(tryReadIconPath());
      // icon-192.png should be PNG; if you use JPG, swap to embedJpg
      icon = await pdfDoc.embedPng(iconBytes);
    } catch {
      // If it fails, we simply render without the icon.
      icon = undefined;
    }

    const ctx: Ctx = {
      pdfDoc,
      font,
      fontBold,
      fontMono,
      icon,
      page,
      pageNumber: 1,
      left: 48,
      right: 612 - 48,
      top: 792 - 40,
      bottom: 40,
    };

    const title = "BuildGuide — Photo Report";
    drawHeader(ctx, title, base.id);
    drawFooter(ctx);

    let y = ctx.top - 92;

    // Metadata card
    y = ensureSpace(ctx, y, 84, title, base.id);
    ctx.page.drawRectangle({
      x: ctx.left,
      y: y - 62,
      width: ctx.right - ctx.left,
      height: 62,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    const generated = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    ctx.page.drawText("Summary", {
      x: ctx.left + 14,
      y: y - 18,
      size: 12,
      font: ctx.fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    // Identified
    const identified = safeStr((base as any).identified, "Unknown");
    const confidence = safeStr((base as any).confidence, "low");

    ctx.page.drawText(identified, {
      x: ctx.left + 14,
      y: y - 36,
      size: 11,
      font: ctx.font,
      color: rgb(0.18, 0.18, 0.18),
    });

    ctx.page.drawText(`Confidence: ${confidence}`, {
      x: ctx.right - 160,
      y: y - 36,
      size: 10,
      font: ctx.font,
      color: rgb(0.35, 0.35, 0.35),
    });

    ctx.page.drawText(`Generated: ${generated}`, {
      x: ctx.left + 14,
      y: y - 52,
      size: 9,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    });

    y -= 84;

    // Typical fix cost (optional)
    const cost = (base as any).typicalFixCost ?? null;
    if (cost?.minor || cost?.moderate || cost?.major) {
      y = ensureSpace(ctx, y, 56, title, base.id);

      ctx.page.drawRectangle({
        x: ctx.left,
        y: y - 40,
        width: ctx.right - ctx.left,
        height: 40,
        color: rgb(0.98, 0.98, 0.985),
        borderColor: rgb(0.92, 0.92, 0.92),
        borderWidth: 1,
      });

      ctx.page.drawText("Typical Fix Cost (rough)", {
        x: ctx.left + 14,
        y: y - 16,
        size: 11,
        font: ctx.fontBold,
        color: rgb(0.12, 0.12, 0.12),
      });

      const rangeText = `Minor: ${safeStr(cost.minor)}   Moderate: ${safeStr(cost.moderate)}   Major: ${safeStr(
        cost.major
      )}`;
      ctx.page.drawText(rangeText, {
        x: ctx.left + 14,
        y: y - 32,
        size: 10,
        font: ctx.font,
        color: rgb(0.2, 0.2, 0.2),
      });

      y -= 58;
    }

    // Sections
    y = drawSectionTitle(ctx, y, "✅ Looks Good");
    y = drawBullets(ctx, y, asArray((base as any).looksGood), title, base.id);

    y = drawSectionTitle(ctx, y, "⚠️ Possible Issues");
    y = drawBullets(ctx, y, asArray((base as any).issues), title, base.id);

    // Detail (if included)
    if (detail) {
      y = drawSectionTitle(ctx, y, "📌 Why It Matters");
      y = drawBullets(ctx, y, asArray(detail.whyItMatters), title, base.id);

      y = drawSectionTitle(ctx, y, "🧰 Priority Fix List — Do First");
      y = drawBullets(ctx, y, asArray(detail.priorityFixList?.first), title, base.id);

      y = drawSectionTitle(ctx, y, "🧰 Priority Fix List — Do Next");
      y = drawBullets(ctx, y, asArray(detail.priorityFixList?.next), title, base.id);

      y = drawSectionTitle(ctx, y, "🧰 Priority Fix List — Optional");
      y = drawBullets(ctx, y, asArray(detail.priorityFixList?.optional), title, base.id);

      y = drawSectionTitle(ctx, y, "❓ Questions For Your Contractor");
      y = drawBullets(ctx, y, asArray(detail.contractorQuestions), title, base.id);

      y = drawSectionTitle(ctx, y, "📸 What To Photograph Next");
      y = drawBullets(ctx, y, asArray(detail.whatToPhotoNext), title, base.id);

      const summary = safeStr(detail.pdfSummary, "");
      if (summary) {
        y = drawSectionTitle(ctx, y, "📝 PDF Summary");
        const lines = wrapLines({
          text: summary,
          font: ctx.fontMono,
          size: 9.5,
          maxWidth: ctx.right - ctx.left,
        });

        for (const ln of lines.slice(0, 200)) {
          y = ensureSpace(ctx, y, 16, title, base.id);
          ctx.page.drawText(ln, {
            x: ctx.left,
            y,
            size: 9.5,
            font: ctx.fontMono,
            color: rgb(0.18, 0.18, 0.18),
          });
          y -= 13;
        }
        y -= 6;
      }
    } else {
      // If no detail passed, show suggested questions
      y = drawSectionTitle(ctx, y, "💬 Suggested Questions");
      y = drawBullets(ctx, y, asArray((base as any).suggestedQuestions), title, base.id);
    }

    // Return PDF
    const bytes = (await pdfDoc.save()) as Uint8Array;
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BuildGuide-PhotoReport-${base.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "PDF export failed." }, { status: 500 });
  }
}
