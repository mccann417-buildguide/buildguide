// src/app/api/bid-pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

type MarketComparison = {
  area: string;
  expectedRange: { low: string; mid: string; high: string };
  verdict: "below_typical" | "within_typical" | "above_typical" | "unknown";
  notes: string[];
  disclaimer: string;
};

type BidDetailAI = {
  deeperIssues?: string[];
  paymentScheduleNotes?: string[];
  contractWarnings?: string[];
  negotiationTips?: string[];
  pdfSummary?: string;
  marketComparison?: MarketComparison;
};

type BidBase = {
  id: string;
  kind: "bid";
  included: string[];
  missing: string[];
  redFlags: string[];
  typicalRange?: { low: string; mid: string; high: string };
  questionsToAsk?: string[];
};

function asArray(v: any): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function safeStr(v: any, fallback = ""): string {
  if (typeof v === "string") return v;
  return fallback;
}

function verdictLabel(v?: string) {
  if (v === "below_typical") return "Likely below typical";
  if (v === "within_typical") return "Likely within typical";
  if (v === "above_typical") return "Likely above typical";
  return "Unknown / needs more detail";
}

function drawWrappedText(opts: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: any;
  size: number;
  lineHeight: number;
  color?: any;
}) {
  const { page, text, x, maxWidth, font, size, lineHeight } = opts;
  const color = opts.color ?? rgb(0, 0, 0);

  const words = (text ?? "").split(/\s+/).filter(Boolean);
  let line = "";
  let cursorY = opts.y;

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);

    if (width <= maxWidth) {
      line = test;
      continue;
    }

    if (line) {
      page.drawText(line, { x, y: cursorY, size, font, color });
      cursorY -= lineHeight;
    }
    line = w;
  }

  if (line) {
    page.drawText(line, { x, y: cursorY, size, font, color });
    cursorY -= lineHeight;
  }

  return cursorY;
}

function drawSection(opts: {
  page: any;
  title: string;
  bullets: string[];
  left: number;
  right: number;
  y: number;
  fontBold: any;
  font: any;
}) {
  const { page, title, bullets, left, right, fontBold, font } = opts;

  let y = opts.y;
  const titleSize = 12;
  const bodySize = 10;
  const maxWidth = right - left;

  page.drawText(title, { x: left, y, size: titleSize, font: fontBold, color: rgb(0, 0, 0) });
  y -= 16;

  if (!bullets.length) {
    y = drawWrappedText({
      page,
      text: "—",
      x: left,
      y,
      maxWidth,
      font,
      size: bodySize,
      lineHeight: 14,
      color: rgb(0.2, 0.2, 0.2),
    });
    return y - 6;
  }

  for (const b of bullets.slice(0, 24)) {
    const lineText = `• ${b}`;
    y = drawWrappedText({
      page,
      text: lineText,
      x: left,
      y,
      maxWidth,
      font,
      size: bodySize,
      lineHeight: 14,
      color: rgb(0.15, 0.15, 0.15),
    });

    if (y < 90) break;
  }

  return y - 6;
}

function drawMarketSnapshot(opts: {
  page: any;
  left: number;
  right: number;
  y: number;
  fontBold: any;
  font: any;
  market: MarketComparison;
}) {
  const { page, left, right, fontBold, font, market } = opts;

  let y = opts.y;

  // Section header
  page.drawText("📊 Market Snapshot", { x: left, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
  y -= 14;

  // Box
  const boxHeight = 74;
  page.drawRectangle({
    x: left,
    y: y - boxHeight,
    width: right - left,
    height: boxHeight,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  page.drawText(`Area: ${safeStr(market.area, "—")}`, { x: left + 12, y: y - 18, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

  const range = market.expectedRange ?? { low: "—", mid: "—", high: "—" };
  page.drawText(
    `Expected range: ${safeStr(range.low, "—")} · ${safeStr(range.mid, "—")} · ${safeStr(range.high, "—")}`,
    { x: left + 12, y: y - 34, size: 10, font, color: rgb(0.2, 0.2, 0.2) }
  );

  page.drawText(`Verdict: ${verdictLabel(market.verdict)}`, {
    x: left + 12,
    y: y - 50,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Disclaimer (small)
  page.drawText(safeStr(market.disclaimer, "This is a rough market snapshot. Exact pricing depends on scope and site conditions."), {
    x: left + 12,
    y: y - 64,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  y -= boxHeight + 10;

  // Notes (bullets)
  const notes = asArray(market.notes);
  if (notes.length) {
    y = drawSection({
      page,
      title: "Market notes (why pricing moves)",
      bullets: notes,
      left,
      right,
      y,
      fontBold,
      font,
    });
  }

  return y;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const base: BidBase | null = body?.base ?? null;
    const detail: BidDetailAI | null = body?.detail ?? null;

    if (!base?.id) {
      return NextResponse.json({ error: "Missing base result." }, { status: 400 });
    }

    // Normalize
    const included = asArray((base as any).included);
    const missing = asArray((base as any).missing);
    const redFlags = asArray((base as any).redFlags);
    const questions = asArray((base as any).questionsToAsk);
    const typicalRange = (base as any).typicalRange ?? null;

    const deeperIssues = asArray((detail as any)?.deeperIssues);
    const paymentScheduleNotes = asArray((detail as any)?.paymentScheduleNotes);
    const contractWarnings = asArray((detail as any)?.contractWarnings);
    const negotiationTips = asArray((detail as any)?.negotiationTips);
    const pdfSummary = safeStr((detail as any)?.pdfSummary, "");
    const market = (detail as any)?.marketComparison ?? null;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const left = 48;
    const right = 612 - 48;

    // Header
    page.drawText("BuildGuide — Bid Report", { x: left, y: 740, size: 18, font: fontBold });
    page.drawText(`Report ID: ${base.id}`, { x: left, y: 718, size: 10, font, color: rgb(0.25, 0.25, 0.25) });

    // Typical range box (optional)
    let y = 690;
    if (typicalRange?.low || typicalRange?.mid || typicalRange?.high) {
      page.drawRectangle({
        x: left,
        y: y - 44,
        width: right - left,
        height: 44,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
      });

      page.drawText("Typical Price Range (from bid analysis)", { x: left + 12, y: y - 18, size: 11, font: fontBold });
      const rangeText = `Low: ${safeStr(typicalRange.low)}   Mid: ${safeStr(typicalRange.mid)}   High: ${safeStr(typicalRange.high)}`;
      page.drawText(rangeText, { x: left + 12, y: y - 34, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

      y -= 66;
    }

    // ✅ Market snapshot (if provided)
    if (market?.area || market?.expectedRange) {
      y = drawMarketSnapshot({ page, left, right, y, fontBold, font, market });
    }

    // Base sections
    y = drawSection({ page, title: "✅ Clearly Included", bullets: included, left, right, y, fontBold, font });
    y = drawSection({ page, title: "⚠️ Missing / Common Scope Gaps", bullets: missing, left, right, y, fontBold, font });
    y = drawSection({ page, title: "🚩 Red Flags", bullets: redFlags, left, right, y, fontBold, font });
    y = drawSection({ page, title: "❓ Questions To Ask Before Signing", bullets: questions, left, right, y, fontBold, font });

    // Detail sections (optional — when you pass detail)
    if (deeperIssues.length) {
      y = drawSection({ page, title: "🔎 Deeper Issues (AI)", bullets: deeperIssues, left, right, y, fontBold, font });
    }
    if (paymentScheduleNotes.length) {
      y = drawSection({ page, title: "💳 Payment Schedule Notes (AI)", bullets: paymentScheduleNotes, left, right, y, fontBold, font });
    }
    if (contractWarnings.length) {
      y = drawSection({ page, title: "🧾 Contract Warnings (AI)", bullets: contractWarnings, left, right, y, fontBold, font });
    }
    if (negotiationTips.length) {
      y = drawSection({ page, title: "🤝 Negotiation Tips (AI)", bullets: negotiationTips, left, right, y, fontBold, font });
    }

    // PDF summary (optional)
    if (pdfSummary) {
      page.drawText("Summary", { x: left, y: Math.max(y, 90), size: 12, font: fontBold });
      y -= 16;
      y = drawWrappedText({
        page,
        text: pdfSummary,
        x: left,
        y,
        maxWidth: right - left,
        font,
        size: 10,
        lineHeight: 14,
        color: rgb(0.15, 0.15, 0.15),
      });
    }

    // Footer
    page.drawLine({ start: { x: left, y: 62 }, end: { x: right, y: 62 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    page.drawText("BuildGuide provides guidance, not legal advice. Verify permits/codes with local officials.", {
      x: left,
      y: 48,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });

    // ✅ Fix for TS BlobPart issues:
    const bytes = (await pdfDoc.save()) as Uint8Array;

    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BuildGuide-Bid-${base.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Bid PDF export failed." }, { status: 500 });
  }
}
