// src/app/components/SuggestedQuestions.tsx
"use client";

import React from "react";

export function SuggestedQuestions({
  questions,
  onPick,
}: {
  questions: string[];
  onPick: (q: string) => void;
}) {
  const [custom, setCustom] = React.useState("");

  return (
    <div className="rounded-2xl border p-4">
      <div className="font-semibold">💬 Suggested questions</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {questions?.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="text-sm rounded-xl border px-3 py-2 hover:bg-neutral-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4 border-t pt-4">
        <div className="text-sm font-semibold">Ask your own</div>
        <div className="mt-2 flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder='Type your question…'
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (!custom.trim()) return;
              onPick(custom.trim());
              setCustom("");
            }}
            className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
