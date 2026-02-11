// src/app/api/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

/**
 * pdf-lib StandardFonts are WinAnsi-ish.
 * Emojis and many unicode chars can break output.
 * We convert common symbols to ASCII tags and strip remaining non-ascii.
 */
function sanitizeText(input: any): string {
  const s = String(input ?? "");

  const replaced = s
    .replaceAll("✅", "[OK] ")
    .replaceAll("☑️", "[OK] ")
    .replaceAll("✔️", "[OK] ")
    .replaceAll("⚠️", "[!] ")
    .replaceAll("🚩", "[FLAG] ")
    .replaceAll("🧠", "[AI] ")
    .replaceAll("📌", "[NOTE] ")
    .replaceAll("🧰", "[TOOLS] ")
    .replaceAll("❓", "[Q] ")
    .replaceAll("📸", "[PHOTO] ")
    .replaceAll("➡️", "-> ")
    .replaceAll("—", "-")
    .replaceAll("•", "-")
    // smart quotes -> normal
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // non-breaking space
    .replace(/\u00A0/g, " ");

  // strip remaining non-ascii
  return replaced.replace(/[^\x00-\x7F]/g, "");
}

function asArray(v: any): string[] {
  if (!v) return [];
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x !== null && x !== undefined)
    .map((x) => sanitizeText(x).trim())
    .filter(Boolean);
}

function safeStr(v: any, fallback = ""): string {
  const out = typeof v === "string" ? v : fallback;
  return sanitizeText(out).trim();
}

function tryReadIconPath() {
  return path.join(process.cwd(), "public", "icons", "icon-192.png");
}

function splitWords(text: string) {
  return sanitizeText(text).split(/\s+/).filter(Boolean);
}

function wrapLines(opts: { text: string; font: any; size: number; maxWidth: number }): string[] {
  const { font, size, maxWidth } = opts;
  const words = splitWords(opts.text);
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

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: "below_typical" | "within_typical" | "above_typical" | "unknown";
  notes: string[];
  disclaimer: string;
};

type NormalizedPhotoBase = {
  id: string;
  summary: string;
  identified?: string;
  confidence?: string;
  looksGood: string[];
  concerns: string[];
  whatToDoNext: string[];
  questionsToAsk: string[];
  typicalFixCost?: { minor: string; moderate: string; major: string };
};

type NormalizedPhotoDetail = {
  deeperFindings: string[];
  qualityChecks: string[];
  redFlags: string[];
  whatToDoNext: string[];
  pdfSummary: string;
  marketComparison?: MarketComparison;
};

// Accept BOTH old and new shapes and normalize.
function normalizePhotoBase(input: any): NormalizedPhotoBase | null {
  if (!input?.id) return null;

  const looksGood = asArray(input?.looksGood);
  const concerns = asArray(input?.concerns ?? input?.issues);
  const whatToDoNext = asArray(input?.whatToDoNext);
  const questionsToAsk = asArray(input?.questionsToAsk ?? input?.suggestedQuestions);
  const summary = safeStr(input?.summary, "");

  const identified = safeStr(input?.identified, "");
  const confidence = safeStr(input?.confidence, "");

  const typicalFixCost =
    input?.typicalFixCost && typeof input.typicalFixCost === "object"
      ? {
          minor: safeStr(input.typicalFixCost.minor, ""),
          moderate: safeStr(input.typicalFixCost.moderate, ""),
          major: safeStr(input.typicalFixCost.major, ""),
        }
      : undefined;

  return {
    id: sanitizeText(input.id),
    summary,
    identified: identified || undefined,
    confidence: confidence || undefined,
    looksGood,
    concerns,
    whatToDoNext,
    questionsToAsk,
    typicalFixCost,
  };
}

function normalizePhotoDetail(input: any): NormalizedPhotoDetail | null {
  if (!input || typeof input !== "object") return null;

  const deeperFindings = asArray(input?.deeperFindings);
  const qualityChecks = asArray(input?.qualityChecks);
  const redFlags = asArray(input?.redFlags);
  const whatToDoNext = asArray(input?.whatToDoNext);
  const pdfSummary = safeStr(input?.pdfSummary, "");

  const mcRaw = input?.marketComparison;
  let marketComparison: MarketComparison | undefined = undefined;
  if (mcRaw && typeof mcRaw === "object") {
    marketComparison = {
      area: safeStr(mcRaw.area, ""),
      expectedRange: {
        low: safeStr(mcRaw?.expectedRange?.low, "—"),
        mid: safeStr(mcRaw?.expectedRange?.mid, "—"),
        high: safeStr(mcRaw?.expectedRange?.high, "—"),
      },
      verdict:
        mcRaw.verdict === "below_typical" ||
        mcRaw.verdict === "within_typical" ||
        mcRaw.verdict === "above_typical"
          ? mcRaw.verdict
          : "unknown",
      notes: asArray(mcRaw.notes),
      disclaimer: safeStr(mcRaw.disclaimer, ""),
    };
  }

  const hasAny =
    deeperFindings.length ||
    qualityChecks.length ||
    redFlags.length ||
    whatToDoNext.length ||
    Boolean(pdfSummary) ||
    Boolean(marketComparison);

  if (!hasAny) return null;

  return {
    deeperFindings,
    qualityChecks,
    redFlags,
    whatToDoNext,
    pdfSummary,
    marketComparison,
  };
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

function verdictLabel(v: MarketComparison["verdict"]) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";
  return "Unknown / needs more detail";
}

function drawHeader(ctx: Ctx, title: string, reportId: string) {
  const { page, left, right, top, fontBold, font, icon } = ctx;

  page.drawRectangle({
    x: 0,
    y: top - 64,
    width: 612,
    height: 64,
    color: rgb(0.98, 0.98, 0.985),
  });

  if (icon) {
    page.drawImage(icon, {
      x: left,
      y: top - 52,
      width: 28,
      height: 28,
    });
  }

  page.drawText(sanitizeText(title), {
    x: left + (icon ? 38 : 0),
    y: top - 38,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const idText = sanitizeText(`Report ID: ${reportId}`);
  const idSize = 10;
  const idWidth = font.widthOfTextAtSize(idText, idSize);
  page.drawText(idText, {
    x: Math.max(left, right - idWidth),
    y: top - 36,
    size: idSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

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
    sanitizeText(
      "BuildGuide provides guidance, not a substitute for an on-site professional. Verify code/permits with local officials."
    ),
    {
      x: left,
      y: bottom + 12,
      size: 8.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  page.drawText(sanitizeText(`Page ${ctx.pageNumber}`), {
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
  return ctx.top - 92;
}

function ensureSpace(ctx: Ctx, y: number, needed: number, title: string, reportId: string) {
  if (y - needed < ctx.bottom + 40) {
    return newPage(ctx, title, reportId);
  }
  return y;
}

function drawSectionTitle(ctx: Ctx, y: number, title: string, reportTitle: string, reportId: string) {
  y = ensureSpace(ctx, y, 28, reportTitle, reportId);

  const { page, left, right, fontBold } = ctx;

  page.drawText(sanitizeText(title), {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawLine({
    start: { x: left, y: y - 6 },
    end: { x: right, y: y - 6 },
    thickness: 1,
    color: rgb(0.93, 0.93, 0.93),
  });

  return y - 20;
}

function drawBullets(ctx: Ctx, y: number, bullets: string[], reportTitle: string, reportId: string) {
  const { page, left, right, font } = ctx;

  const bodySize = 10;
  const lineH = 14;
  const maxWidth = right - left - 14;

  const list = bullets.length ? bullets : ["—"];
  for (const b of list) {
    y = ensureSpace(ctx, y, 22, reportTitle, reportId);

    page.drawText("-", {
      x: left,
      y,
      size: bodySize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const lines = wrapLines({ text: String(b), font, size: bodySize, maxWidth });
    for (const ln of lines) {
      y = ensureSpace(ctx, y, 18, reportTitle, reportId);
      page.drawText(sanitizeText(ln), {
        x: left + 14,
        y,
        size: bodySize,
        font,
        color: rgb(0.18, 0.18, 0.18),
      });
      y -= lineH;
    }
    y -= 2;
  }

  return y - 6;
}

function drawParagraph(ctx: Ctx, y: number, text: string, reportTitle: string, reportId: string) {
  const { page, left, right, font } = ctx;
  const size = 10;
  const lineH = 14;

  const lines = wrapLines({ text, font, size, maxWidth: right - left });
  for (const ln of lines) {
    y = ensureSpace(ctx, y, 18, reportTitle, reportId);
    page.drawText(sanitizeText(ln), {
      x: left,
      y,
      size,
      font,
      color: rgb(0.18, 0.18, 0.18),
    });
    y -= lineH;
  }
  return y - 6;
}

function drawMonoBox(ctx: Ctx, y: number, heading: string, text: string, reportTitle: string, reportId: string) {
  const { left, right, page, fontBold, fontMono } = ctx;

  const headingSize = 11;
  const monoSize = 9.5;
  const padding = 12;

  // measure how many lines this will take
  const lines = wrapLines({
    text,
    font: fontMono,
    size: monoSize,
    maxWidth: right - left - padding * 2,
  });

  // cap, but still allow page breaks if needed
  const maxLines = 220;
  const used = lines.slice(0, maxLines);

  // compute box height
  const lineH = 13;
  const boxH = 18 + padding + used.length * lineH + padding;

  y = ensureSpace(ctx, y, boxH + 10, reportTitle, reportId);

  // heading
  page.drawText(sanitizeText(heading), {
    x: left,
    y,
    size: headingSize,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  y -= 16;

  // box background
  const boxTop = y;
  page.drawRectangle({
    x: left,
    y: boxTop - boxH,
    width: right - left,
    height: boxH,
    color: rgb(0.98, 0.98, 0.985),
    borderColor: rgb(0.92, 0.92, 0.92),
    borderWidth: 1,
  });

  // text in box
  let ty = boxTop - padding - 10;
  for (const ln of used) {
    ty = ensureSpace(ctx, ty, 16, reportTitle, reportId);
    page.drawText(sanitizeText(ln), {
      x: left + padding,
      y: ty,
      size: monoSize,
      font: fontMono,
      color: rgb(0.18, 0.18, 0.18),
    });
    ty -= lineH;
  }

  return boxTop - boxH - 10;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const baseNorm = normalizePhotoBase(body?.base);
    if (!baseNorm?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const detailNorm = normalizePhotoDetail(body?.detail);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    let icon: any | undefined = undefined;
    try {
      const iconBytes = await readFile(tryReadIconPath());
      icon = await pdfDoc.embedPng(iconBytes);
    } catch {
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

    const reportTitle = "BuildGuide - Photo Report";
    drawHeader(ctx, reportTitle, baseNorm.id);
    drawFooter(ctx);

    let y = ctx.top - 92;

    // ✅ Clean "Summary Card" that actually includes the base summary
    const generated = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const identified = baseNorm.identified ? baseNorm.identified : "Unknown";
    const confidence = baseNorm.confidence ? baseNorm.confidence : "low";

    // compute summary lines for card
    const summaryText = baseNorm.summary || "—";
    const summaryLines = wrapLines({
      text: summaryText,
      font: ctx.font,
      size: 10,
      maxWidth: ctx.right - ctx.left - 28,
    }).slice(0, 10); // keep card tidy

    const cardH = 18 + 12 + summaryLines.length * 14 + 12 + 32; // title + summary + meta row
    y = ensureSpace(ctx, y, cardH + 12, reportTitle, baseNorm.id);

    ctx.page.drawRectangle({
      x: ctx.left,
      y: y - cardH,
      width: ctx.right - ctx.left,
      height: cardH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    ctx.page.drawText("Report Summary", {
      x: ctx.left + 14,
      y: y - 18,
      size: 12,
      font: ctx.fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    let sy = y - 36;
    for (const ln of summaryLines) {
      ctx.page.drawText(sanitizeText(ln), {
        x: ctx.left + 14,
        y: sy,
        size: 10,
        font: ctx.font,
        color: rgb(0.18, 0.18, 0.18),
      });
      sy -= 14;
    }

    // meta row
    ctx.page.drawText(sanitizeText(`Identified: ${identified}`), {
      x: ctx.left + 14,
      y: y - cardH + 18,
      size: 9,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    });

    ctx.page.drawText(sanitizeText(`Confidence: ${confidence}`), {
      x: ctx.left + 220,
      y: y - cardH + 18,
      size: 9,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    });

    ctx.page.drawText(sanitizeText(`Generated: ${generated}`), {
      x: ctx.right - 210,
      y: y - cardH + 18,
      size: 9,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    });

    y = y - cardH - 18;

    // Typical fix cost (if present)
    if (baseNorm.typicalFixCost?.minor || baseNorm.typicalFixCost?.moderate || baseNorm.typicalFixCost?.major) {
      y = ensureSpace(ctx, y, 58, reportTitle, baseNorm.id);

      ctx.page.drawRectangle({
        x: ctx.left,
        y: y - 42,
        width: ctx.right - ctx.left,
        height: 42,
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

      const rangeText = sanitizeText(
        `Minor: ${baseNorm.typicalFixCost?.minor ?? "—"}   Moderate: ${
          baseNorm.typicalFixCost?.moderate ?? "—"
        }   Major: ${baseNorm.typicalFixCost?.major ?? "—"}`
      );

      ctx.page.drawText(rangeText, {
        x: ctx.left + 14,
        y: y - 32,
        size: 10,
        font: ctx.font,
        color: rgb(0.2, 0.2, 0.2),
      });

      y -= 60;
    }

    // Base sections (always)
    y = drawSectionTitle(ctx, y, "[OK] What Looks Good", reportTitle, baseNorm.id);
    y = drawBullets(ctx, y, baseNorm.looksGood, reportTitle, baseNorm.id);

    y = drawSectionTitle(ctx, y, "[!] Concerns", reportTitle, baseNorm.id);
    y = drawBullets(ctx, y, baseNorm.concerns, reportTitle, baseNorm.id);

    y = drawSectionTitle(ctx, y, "Next Steps", reportTitle, baseNorm.id);
    y = drawBullets(ctx, y, baseNorm.whatToDoNext, reportTitle, baseNorm.id);

    // Paid detail sections (only if passed)
    if (detailNorm) {
      if (detailNorm.marketComparison) {
        const mc = detailNorm.marketComparison;

        y = drawSectionTitle(ctx, y, "Local Price Reality Check", reportTitle, baseNorm.id);
        y = drawParagraph(ctx, y, `Area: ${mc.area}`, reportTitle, baseNorm.id);
        y = drawParagraph(
          ctx,
          y,
          `Expected range: ${mc.expectedRange.low} / ${mc.expectedRange.mid} / ${mc.expectedRange.high}`,
          reportTitle,
          baseNorm.id
        );
        y = drawParagraph(ctx, y, `Verdict: ${verdictLabel(mc.verdict)}`, reportTitle, baseNorm.id);

        if (mc.notes?.length) {
          y = drawBullets(ctx, y, mc.notes, reportTitle, baseNorm.id);
        }
        if (mc.disclaimer) {
          y = drawParagraph(ctx, y, mc.disclaimer, reportTitle, baseNorm.id);
        }
      }

      if (detailNorm.qualityChecks.length) {
        y = drawSectionTitle(ctx, y, "Quality Checks", reportTitle, baseNorm.id);
        y = drawBullets(ctx, y, detailNorm.qualityChecks, reportTitle, baseNorm.id);
      }

      if (detailNorm.deeperFindings.length) {
        y = drawSectionTitle(ctx, y, "Deeper Findings", reportTitle, baseNorm.id);
        y = drawBullets(ctx, y, detailNorm.deeperFindings, reportTitle, baseNorm.id);
      }

      if (detailNorm.redFlags.length) {
        y = drawSectionTitle(ctx, y, "Red Flags", reportTitle, baseNorm.id);
        y = drawBullets(ctx, y, detailNorm.redFlags, reportTitle, baseNorm.id);
      }

      if (detailNorm.whatToDoNext.length) {
        y = drawSectionTitle(ctx, y, "Detailed Next Steps", reportTitle, baseNorm.id);
        y = drawBullets(ctx, y, detailNorm.whatToDoNext, reportTitle, baseNorm.id);
      }

      if (detailNorm.pdfSummary) {
        y = drawMonoBox(ctx, y, "PDF-ready Summary", detailNorm.pdfSummary, reportTitle, baseNorm.id);
      }
    } else {
      // If no paid detail was provided, include questions
      if (baseNorm.questionsToAsk.length) {
        y = drawSectionTitle(ctx, y, "Suggested Questions", reportTitle, baseNorm.id);
        y = drawBullets(ctx, y, baseNorm.questionsToAsk, reportTitle, baseNorm.id);
      }
    }

    const bytes = (await pdfDoc.save()) as Uint8Array;
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BuildGuide-PhotoReport-${baseNorm.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "PDF export failed." }, { status: 500 });
  }
}
