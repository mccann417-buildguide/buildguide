// src/app/ask/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { loadHistory, clearHistory } from "../lib/history";
type AnyResult = any;

type AskAIResponse = {
  answer: string;
  followUps: string[];
  redFlags: string[];
};

function summarizeContext(item: AnyResult): string {
  // Make this defensive so it never crashes due to shape differences
  if ((item as any).kind === "photo") {
    const p = item as any;
    return `PHOTO RESULT
Identified: ${p.identified ?? ""}
Confidence: ${p.confidence ?? ""}
Issues: ${(p.issues ?? []).slice(0, 3).join("; ")}
Looks good: ${(p.looksGood ?? []).slice(0, 2).join("; ")}
`;
  }

  const b = item as any;
  return `BID RESULT
Included: ${(b.included ?? []).slice(0, 3).join("; ")}
Missing: ${(b.missing ?? []).slice(0, 3).join("; ")}
Red flags: ${(b.redFlags ?? []).slice(0, 3).join("; ")}
`;
}

export default function AskPage() {
  const params = useSearchParams();
  const prefill = params.get("prefill") ?? "";

  const [question, setQuestion] = React.useState(prefill);
  const [history, setHistory] = React.useState<AnyResult[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");

  const [answer, setAnswer] = React.useState<AskAIResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setSelectedId(h[0]?.id ?? "");
  }, []);

  async function ask() {
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const ctxItem = history.find((x) => x.id === selectedId);
      const context = ctxItem ? summarizeContext(ctxItem) : "";

      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ask request failed.");

      setAnswer(data as AskAIResponse);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-14 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ask a Question</h1>
          <p className="mt-1 text-neutral-700">
            Ask anything — and optionally attach context from your last photo or bid check.
          </p>
        </div>
        <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
          Back home
        </Link>
      </div>

      <div className="rounded-2xl border p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-semibold">Context (optional)</div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 w-full rounded-xl border p-2 text-sm"
            >
              <option value="">No context</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {new Date(h.createdAt).toLocaleString()} — {(h as any).kind?.toUpperCase?.() ?? "RESULT"}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-neutral-600">
              Tip: Run a Photo Check or Bid Check first to add context here.
            </div>

            <button
              onClick={() => {
                clearHistory();
                setHistory([]);
                setSelectedId("");
              }}
              className="mt-3 text-xs rounded-xl border px-3 py-2 hover:bg-neutral-50"
            >
              Clear saved history
            </button>
          </div>

          <div>
            <div className="text-sm font-semibold">Your question</div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Example: "Is this safe long-term?" or "What should be included in this bid?"'
              className="mt-2 w-full min-h-[130px] rounded-2xl border p-3 text-sm"
            />
          </div>
        </div>

        <button
          onClick={ask}
          disabled={!question.trim() || loading}
          className="rounded-xl bg-black text-white px-5 py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/90"
        >
          {loading ? "Thinking..." : "Ask BuildGuide"}
        </button>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>

      {answer ? (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5">
            <div className="text-sm font-semibold">Answer</div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">{answer.answer}</div>
          </div>

          {answer.followUps?.length ? (
            <div className="rounded-2xl border p-5">
              <div className="text-sm font-semibold">Follow-up questions</div>
              <ul className="mt-3 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                {answer.followUps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {answer.redFlags?.length ? (
            <div className="rounded-2xl border p-5">
              <div className="text-sm font-semibold">Red flags to watch</div>
              <ul className="mt-3 list-disc pl-5 text-sm text-neutral-800 space-y-1">
                {answer.redFlags.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
