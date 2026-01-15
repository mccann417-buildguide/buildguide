// src/app/question/QuestionClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type AskAIResponse = {
  answer: string;
  followUps: string[];
  redFlags: string[];
};

export default function QuestionClient() {
  const searchParams = useSearchParams();

  const prefill = searchParams.get("prefill") ?? "";

  const [question, setQuestion] = React.useState(prefill);
  const [answer, setAnswer] = React.useState<AskAIResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // keep in sync if user navigates with a different prefill
  React.useEffect(() => {
    if (prefill) setQuestion(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  async function ask() {
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: "" }),
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
            Ask anything in plain English and get a structured answer.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Back home
        </Link>
      </div>

      <div className="rounded-2xl border p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold">Your question</div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Example: "Is this safe long-term?"'
            className="mt-2 w-full min-h-[140px] rounded-2xl border p-3 text-sm"
          />
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
            <div className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">
              {answer.answer}
            </div>
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
