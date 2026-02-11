// src/app/api/bid-pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

/**
 * pdf-lib StandardFonts are WinAnsi-ish.
 * Emojis and many unicode chars can break output.
 * Convert common symbols to ASCII tags and strip remaining non-ascii.
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
    .replaceAll("🧾", "[DOC] ")
    .replaceAll("💵", "[$] ")
    .replaceAll("🤝", "[TIP] ")
    .replaceAll("➡️", "-> ")
    .replaceAll("—", "-")
    .replaceAll("•", "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ");

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

type Verdict =
  | "significantly_below_market"
  | "below_market"
  | "within_typical"
  | "above_market"
  | "significantly_above_market"
  | "unknown";

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: Verdict;
  notes: string[];
  disclaimer: string;
  bidTotal?: string;
  assumptions?: string[];
  confidence?: "low" | "medium" | "high";
};

type BidBase = {
  id: string;
  included: string[];
  missing: string[];
  redFlags: string[];
  questionsToAsk: string[];
};

type BidDetailAI = {
  deeperIssues: string[];
  paymentScheduleNotes: string[];
  contractWarnings: string[];
  negotiationTips: string[];
  pdfSummary: string;
  marketComparison?: MarketComparison;
};

// Normalize any shapes safely
function normalizeBase(input: any): BidBase | null {
  if (!input?.id) return null;
  return {
    id: sanitizeText(input.id),
    included: asArray(input?.included),
    missing: asArray(input?.missing),
    redFlags: asArray(input?.redFlags),
    questionsToAsk: asArray(input?.questionsToAsk),
  };
}

function normalizeDetail(input: any): BidDetailAI | null {
  if (!input || typeof input !== "object") return null;

  const deeperIssues = asArray(input?.deeperIssues);
  const paymentScheduleNotes = asArray(input?.paymentScheduleNotes);
  const contractWarnings = asArray(input?.contractWarnings);
  const negotiationTips = asArray(input?.negotiationTips);
  const pdfSummary = safeStr(input?.pdfSummary, "");

  const mcRaw = input?.marketComparison;
  let marketComparison: MarketComparison | undefined = undefined;

  if (mcRaw && typeof mcRaw === "object") {
    const verdict: Verdict =
      mcRaw.verdict === "significantly_below_market" ||
      mcRaw.verdict === "below_market" ||
      mcRaw.verdict === "within_typical" ||
      mcRaw.verdict === "above_market" ||
      mcRaw.verdict === "significantly_above_market" ||
      mcRaw.verdict === "unknown"
        ? mcRaw.verdict
        : "unknown";

    marketComparison = {
      area: safeStr(mcRaw.area, ""),
      expectedRange: {
        low: safeStr(mcRaw?.expectedRange?.low, "—"),
        mid: safeStr(mcRaw?.expectedRange?.mid, "—"),
        high: safeStr(mcRaw?.expectedRange?.high, "—"),
      },
      verdict,
      notes: asArray(mcRaw.notes),
      disclaimer: safeStr(mcRaw.disclaimer, ""),
      bidTotal: safeStr(mcRaw.bidTotal, "") || undefined,
      assumptions: asArray(mcRaw.assumptions),
      confidence:
        mcRaw.confidence === "low" || mcRaw.confidence === "medium" || mcRaw.confidence === "high"
          ? mcRaw.confidence
          : undefined,
    };
  }

  const hasAny =
    deeperIssues.length ||
    paymentScheduleNotes.length ||
    contractWarnings.length ||
    negotiationTips.length ||
    Boolean(pdfSummary) ||
    Boolean(marketComparison);

  if (!hasAny) return null;

  return {
    deeperIssues,
    paymentScheduleNotes,
    contractWarnings,
    negotiationTips,
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

function drawHeader(ctx: Ctx, title: string, reportId: string) {
  const { left, right, top, fontBold, font, icon } = ctx;

  ctx.page.drawRectangle({
    x: 0,
    y: top - 64,
    width: 612,
    height: 64,
    color: rgb(0.98, 0.98, 0.985),
  });

  if (icon) {
    ctx.page.drawImage(icon, {
      x: left,
      y: top - 52,
      width: 28,
      height: 28,
    });
  }

  ctx.page.drawText(sanitizeText(title), {
    x: left + (icon ? 38 : 0),
    y: top - 38,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const idText = sanitizeText(`Report ID: ${reportId}`);
  const idSize = 10;
  const idWidth = font.widthOfTextAtSize(idText, idSize);
  ctx.page.drawText(idText, {
    x: Math.max(left, right - idWidth),
    y: top - 36,
    size: idSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  // header separator
  ctx.page.drawLine({
    start: { x: left, y: top - 68 },
    end: { x: right, y: top - 68 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });
}

function drawFooter(ctx: Ctx) {
  const { left, right, bottom, font } = ctx;

  ctx.page.drawLine({
    start: { x: left, y: bottom + 26 },
    end: { x: right, y: bottom + 26 },
    thickness: 1,
    color: rgb(0.92, 0.92, 0.92),
  });

  ctx.page.drawText(
    sanitizeText(
      "BuildGuide provides guidance, not a substitute for an on-site professional. Verify permits/codes with local officials."
    ),
    {
      x: left,
      y: bottom + 12,
      size: 8.5,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  ctx.page.drawText(sanitizeText(`Page ${ctx.pageNumber}`), {
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
  return ctx.top - 104;
}

function ensureSpace(ctx: Ctx, y: number, needed: number, title: string, reportId: string) {
  if (y - needed < ctx.bottom + 40) {
    return newPage(ctx, title, reportId);
  }
  return y;
}

/**
 * SECTION TITLE FIX:
 * - More vertical spacing after title
 * - Divider line pushed down so it never looks like it's "underlining" or striking through
 */
function drawSectionTitle(ctx: Ctx, y: number, title: string) {
  const { left, right, fontBold } = ctx;

  y -= 10;

  ctx.page.drawText(sanitizeText(title), {
    x: left,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Divider line moved further down
  ctx.page.drawLine({
    start: { x: left, y: y - 14 },
    end: { x: right, y: y - 14 },
    thickness: 1,
    color: rgb(0.93, 0.93, 0.93),
  });

  // More breathing room so content never collides with the divider
  return y - 34;
}

/**
 * IMPORTANT FIX:
 * Do NOT destructure ctx.page into a local variable here.
 * ensureSpace() may create a new page and update ctx.page, and we must draw on the CURRENT ctx.page.
 */
function drawBullets(ctx: Ctx, y: number, bullets: string[], title: string, reportId: string) {
  const { left, right, font } = ctx;

  const bodySize = 10;
  const lineH = 14;
  const maxWidth = right - left - 14;

  const list = bullets.length ? bullets : ["—"];
  for (const b of list) {
    y = ensureSpace(ctx, y, 26, title, reportId);

    ctx.page.drawText("-", {
      x: left,
      y,
      size: bodySize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const lines = wrapLines({ text: String(b), font, size: bodySize, maxWidth });
    for (const ln of lines) {
      y = ensureSpace(ctx, y, 18, title, reportId);

      ctx.page.drawText(sanitizeText(ln), {
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

  return y - 8;
}

/**
 * IMPORTANT FIX:
 * Same stale-page issue as drawBullets().
 */
function drawParagraph(ctx: Ctx, y: number, text: string, title: string, reportId: string) {
  const { left, right, font } = ctx;
  const size = 10;
  const lineH = 14;

  const lines = wrapLines({ text, font, size, maxWidth: right - left });
  for (const ln of lines) {
    y = ensureSpace(ctx, y, 18, title, reportId);

    ctx.page.drawText(sanitizeText(ln), {
      x: left,
      y,
      size,
      font,
      color: rgb(0.18, 0.18, 0.18),
    });

    y -= lineH;
  }
  return y - 8;
}

function parseMoneyToNumber(s?: string): number | null {
  if (!s) return null;
  const m = String(s).replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function verdictLabel(v: Verdict) {
  switch (v) {
    case "significantly_below_market":
      return "Significantly below market (red flags)";
    case "below_market":
      return "Below typical (look closer)";
    case "within_typical":
      return "Within typical range";
    case "above_market":
      return "Above typical (may be overpriced)";
    case "significantly_above_market":
      return "Significantly above market (major red flags)";
    default:
      return "Unknown (needs more detail)";
  }
}

function verdictShort(v: Verdict) {
  switch (v) {
    case "significantly_below_market":
      return "LOW";
    case "below_market":
      return "LOW";
    case "within_typical":
      return "MID";
    case "above_market":
      return "HIGH";
    case "significantly_above_market":
      return "HIGH";
    default:
      return "—";
  }
}

/**
 * A small visual bar that shows Low | Mid | High and where the bid falls.
 * (No fancy colors required—simple, clean, readable.)
 */
function drawRangeBar(ctx: Ctx, y: number, opts: { low: number; mid: number; high: number; bid?: number | null }) {
  const { left, right, font, fontBold } = ctx;

  const w = right - left;
  const barH = 10;
  const barY = y - 6;

  ctx.page.drawRectangle({
    x: left,
    y: barY,
    width: w,
    height: barH,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  // Segment dividers
  ctx.page.drawLine({
    start: { x: left + w / 3, y: barY },
    end: { x: left + w / 3, y: barY + barH },
    thickness: 1,
    color: rgb(0.87, 0.87, 0.87),
  });
  ctx.page.drawLine({
    start: { x: left + (2 * w) / 3, y: barY },
    end: { x: left + (2 * w) / 3, y: barY + barH },
    thickness: 1,
    color: rgb(0.87, 0.87, 0.87),
  });

  const labelY = barY - 14;
  ctx.page.drawText("LOW", { x: left, y: labelY, size: 9, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
  ctx.page.drawText("MID", {
    x: left + w / 2 - 10,
    y: labelY,
    size: 9,
    font: fontBold,
    color: rgb(0.35, 0.35, 0.35),
  });
  ctx.page.drawText("HIGH", {
    x: right - 24,
    y: labelY,
    size: 9,
    font: fontBold,
    color: rgb(0.35, 0.35, 0.35),
  });

  if (opts.bid && Number.isFinite(opts.bid) && opts.high > opts.low) {
    const clamped = Math.max(opts.low * 0.5, Math.min(opts.bid, opts.high * 1.8));
    const pct = (clamped - opts.low * 0.5) / (opts.high * 1.8 - opts.low * 0.5);
    const x = left + pct * w;

    ctx.page.drawLine({
      start: { x, y: barY - 2 },
      end: { x, y: barY + barH + 2 },
      thickness: 1,
      color: rgb(0.25, 0.25, 0.25),
    });

    ctx.page.drawText("Bid", {
      x: Math.min(Math.max(left, x - 10), right - 18),
      y: barY + barH + 6,
      size: 9,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
  }

  return y - 44;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const baseNorm = normalizeBase(body?.base);
    if (!baseNorm?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    const detailNorm = normalizeDetail(body?.detail);

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

    const title = "BuildGuide - Bid Report";
    drawHeader(ctx, title, baseNorm.id);
    drawFooter(ctx);

    let y = ctx.top - 104;

    // Metadata card
    y = ensureSpace(ctx, y, 96, title, baseNorm.id);
    ctx.page.drawRectangle({
      x: ctx.left,
      y: y - 66,
      width: ctx.right - ctx.left,
      height: 66,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    const generated = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    ctx.page.drawText("Bid Summary", {
      x: ctx.left + 14,
      y: y - 20,
      size: 12,
      font: ctx.fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    ctx.page.drawText(sanitizeText(`Generated: ${generated}`), {
      x: ctx.left + 14,
      y: y - 42,
      size: 9,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    });

    y -= 96;

    // Paid detail at the top if present
    if (detailNorm?.marketComparison) {
      const mc = detailNorm.marketComparison;

      y = drawSectionTitle(ctx, y, "Local Price Reality Check");
      y = drawParagraph(ctx, y, `Area: ${mc.area}`, title, baseNorm.id);

      const conf = mc.confidence ? ` (confidence: ${mc.confidence})` : "";
      if (mc.bidTotal) {
        y = drawParagraph(ctx, y, `Bid total detected: ${mc.bidTotal}${conf}`, title, baseNorm.id);
      } else {
        y = drawParagraph(ctx, y, `Bid total detected: Unknown${conf}`, title, baseNorm.id);
      }

      y = drawParagraph(
        ctx,
        y,
        `Expected range: Low ${mc.expectedRange.low}   Mid ${mc.expectedRange.mid}   High ${mc.expectedRange.high}`,
        title,
        baseNorm.id
      );

      const lowN = parseMoneyToNumber(mc.expectedRange.low);
      const midN = parseMoneyToNumber(mc.expectedRange.mid);
      const highN = parseMoneyToNumber(mc.expectedRange.high);
      const bidN = parseMoneyToNumber(mc.bidTotal);

      if (lowN && midN && highN) {
        y = ensureSpace(ctx, y, 58, title, baseNorm.id);
        y = drawRangeBar(ctx, y, { low: lowN, mid: midN, high: highN, bid: bidN });
      }

      y = drawParagraph(
        ctx,
        y,
        `Verdict: ${verdictLabel(mc.verdict)} (sits: ${verdictShort(mc.verdict)})`,
        title,
        baseNorm.id
      );

      if (mc.notes?.length) {
        y = drawBullets(ctx, y, mc.notes, title, baseNorm.id);
      }

      if (mc.assumptions?.length) {
        y = drawSectionTitle(ctx, y, "Assumptions Used");
        y = drawBullets(ctx, y, mc.assumptions, title, baseNorm.id);
      }

      if (mc.disclaimer) {
        y = drawParagraph(ctx, y, mc.disclaimer, title, baseNorm.id);
      }
    }

    // Base sections
    y = drawSectionTitle(ctx, y, "What's Included");
    y = drawBullets(ctx, y, baseNorm.included, title, baseNorm.id);

    y = drawSectionTitle(ctx, y, "What's Missing");
    y = drawBullets(ctx, y, baseNorm.missing, title, baseNorm.id);

    y = drawSectionTitle(ctx, y, "Red Flags");
    y = drawBullets(ctx, y, baseNorm.redFlags, title, baseNorm.id);

    // Paid sections if present
    if (detailNorm) {
      if (detailNorm.deeperIssues.length) {
        y = drawSectionTitle(ctx, y, "Deeper Issues");
        y = drawBullets(ctx, y, detailNorm.deeperIssues, title, baseNorm.id);
      }

      if (detailNorm.paymentScheduleNotes.length) {
        y = drawSectionTitle(ctx, y, "Payment Schedule Notes");
        y = drawBullets(ctx, y, detailNorm.paymentScheduleNotes, title, baseNorm.id);
      }

      if (detailNorm.contractWarnings.length) {
        y = drawSectionTitle(ctx, y, "Contract Warnings");
        y = drawBullets(ctx, y, detailNorm.contractWarnings, title, baseNorm.id);
      }

      if (detailNorm.negotiationTips.length) {
        y = drawSectionTitle(ctx, y, "Negotiation Tips");
        y = drawBullets(ctx, y, detailNorm.negotiationTips, title, baseNorm.id);
      }

      if (detailNorm.pdfSummary) {
        y = drawSectionTitle(ctx, y, "PDF-ready Summary");

        const lines = wrapLines({
          text: detailNorm.pdfSummary,
          font: ctx.fontMono,
          size: 9.5,
          maxWidth: ctx.right - ctx.left,
        });

        for (const ln of lines.slice(0, 240)) {
          y = ensureSpace(ctx, y, 16, title, baseNorm.id);

          ctx.page.drawText(sanitizeText(ln), {
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
      // Free-only: include suggested questions
      if (baseNorm.questionsToAsk.length) {
        y = drawSectionTitle(ctx, y, "Suggested Questions");
        y = drawBullets(ctx, y, baseNorm.questionsToAsk, title, baseNorm.id);
      }
    }

    const bytes = (await pdfDoc.save()) as Uint8Array;
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BuildGuide-BidReport-${baseNorm.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid PDF export failed." }, { status: 500 });
  }
}
