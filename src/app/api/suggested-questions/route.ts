import { NextResponse } from "next/server";
import { getOpenAI } from "../../lib/openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const openai = getOpenAI();
    // ...your existing logic, using openai...
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "failed" }, { status: 500 });
  }
}
