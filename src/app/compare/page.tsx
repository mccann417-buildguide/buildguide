// src/app/compare/page.tsx
"use client";

import React from "react";
import Link from "next/link";

const HISTORY_KEY = "buildguide_history";

type AnyReport = any;

function normalize(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(v: any): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean).map(String) : [];
}

function uniqueByNormalized(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = normalize(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function diffLists(a: string[], b: string[]) {
  const A = uniqueByNormalized(a);
  const B = uniqueByNormalized(b);

  const setA = new Set(A.map(normalize));
  const setB = new Set(B.map(normalize));

  const onlyA = A.filter((x) => !setB.has(normalize(x)));
  const onlyB = B.filter((x) => !setA.has(normalize(x)));
  const both = A.filter((x) => setB.has(normalize(x)));

  return { onlyA, onlyB, both };
}

function SectionCompare(props: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftItems: string[];
  rightItems: string[];
}) {
  const { title, leftLabel, rightLabel, leftItems, rightItems } = props;
  const { onlyA, onlyB, both } = diffLists(leftItems, rightItems);

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="font-semibold">{title}</div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* LEFT */}
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-neutral-500 mb-2">{leftLabel}</div>

          {onlyA.length ? (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-neutral-700">Only in {leftLabel}</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {onlyA.slice(0, 30).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No unique items.</div>
          )}
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-neutral-500 mb-2">{rightLabel}</div>

          {onlyB.length ? (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-neutral-700">Only in {rightLabel}</div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {onlyB.slice(0, 30).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No unique items.</div>
          )}
        </div>
      </div>

      {/* BOTH */}
      {both.length ? (
        <div className="rounded-2xl border bg-neutral-50 p-3">
          <div className="text-xs font-semibold text-neutral-700">Shared</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-neutral-800 space-y-1">
            {both.slice(0, 25).map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function ComparePage() {
  const [items, setItems] = React.useState<AnyReport[]>([]);
  const [kind, setKind] = React.useState<"bid" | "photo">("bid");

  const [leftId, setLeftId] = React.useState<string>("");
  const [rightId, setRightId] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch (e) {
      console.error("Failed to load history", e);
      setItems([]);
    }
  }, []);

  const filtered = React.useMemo(() => {
    return items
      .filter((x) => x?.kind === kind && x?.id)
      // newest-ish first if your array is appended
      .slice()
      .reverse();
  }, [items, kind]);

  const left = React.useMemo(
    () => filtered.find((x) => String(x.id) === String(leftId)) ?? null,
    [filtered, leftId]
  );
  const right = React.useMemo(
    () => filtered.find((x) => String(x.id) === String(rightId)) ?? null,
    [filtered, rightId]
  );

  // Auto-pick first two when kind changes (nice UX)
  React.useEffect(() => {
    if (filtered.length >= 2) {
      setLeftId(String(filtered[0].id));
      setRightId(String(filtered[1].id));
    } else {
      setLeftId(filtered[0]?.id ? String(filtered[0].id) : "");
      setRightId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, filtered.length]);

  const leftLabel =
    kind === "photo" ? `Photo ${left?.confidence ? `(${left.confidence})` : ""}` : "Bid A";
  const rightLabel =
    kind === "photo" ? `Photo ${right?.confidence ? `(${right.confidence})` : ""}` : "Bid B";

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Compare</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Compare two saved reports from your History. This runs locally on your device.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/history"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            History
          </Link>
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Home
          </Link>
        </div>
      </div>

      {/* KIND TOGGLE */}
      <div className="rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setKind("bid")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              kind === "bid" ? "bg-black text-white border-black" : "hover:bg-neutral-50"
            }`}
          >
            Compare Bids
          </button>
          <button
            onClick={() => setKind("photo")}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              kind === "photo" ? "bg-black text-white border-black" : "hover:bg-neutral-50"
            }`}
          >
            Compare Photos
          </button>
        </div>

        <div className="text-xs text-neutral-600">
          Found <span className="font-semibold">{filtered.length}</span> {kind} report(s) in history.
        </div>
      </div>

      {/* PICKERS */}
      <div className="rounded-2xl border p-4 grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-semibold">Left</div>
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {filtered.map((x) => (
              <option key={String(x.id)} value={String(x.id)}>
                {kind === "photo"
                  ? `${String(x.id).slice(0, 8)} — ${x.identified || "Photo"}`
                  : `${String(x.id).slice(0, 8)} — Bid`}
              </option>
            ))}
          </select>

          {left ? (
            <div className="mt-3 rounded-2xl border p-3 text-sm">
              {kind === "photo" ? (
                <>
                  <div className="font-semibold">{left.identified || "Photo Report"}</div>
                  <div className="mt-1 text-xs text-neutral-600">Confidence: {left.confidence || "—"}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Bid Report</div>
                  <div className="mt-1 text-xs text-neutral-600">ID: {left.id}</div>
                </>
              )}
              <div className="mt-2">
                <Link className="underline text-xs" href={`/history/${encodeURIComponent(String(left.id))}`}>
                  Open report
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-sm font-semibold">Right</div>
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {filtered.map((x) => (
              <option key={String(x.id)} value={String(x.id)}>
                {kind === "photo"
                  ? `${String(x.id).slice(0, 8)} — ${x.identified || "Photo"}`
                  : `${String(x.id).slice(0, 8)} — Bid`}
              </option>
            ))}
          </select>

          {right ? (
            <div className="mt-3 rounded-2xl border p-3 text-sm">
              {kind === "photo" ? (
                <>
                  <div className="font-semibold">{right.identified || "Photo Report"}</div>
                  <div className="mt-1 text-xs text-neutral-600">Confidence: {right.confidence || "—"}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Bid Report</div>
                  <div className="mt-1 text-xs text-neutral-600">ID: {right.id}</div>
                </>
              )}
              <div className="mt-2">
                <Link className="underline text-xs" href={`/history/${encodeURIComponent(String(right.id))}`}>
                  Open report
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* COMPARE */}
      {!left || !right ? (
        <div className="rounded-2xl border p-6 text-sm text-neutral-600">
          Pick two reports to compare.
        </div>
      ) : kind === "bid" ? (
        <div className="space-y-4">
          <SectionCompare
            title="📄 Included"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.included)}
            rightItems={asArray(right.included)}
          />
          <SectionCompare
            title="⚠️ Missing / Scope Gaps"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.missing)}
            rightItems={asArray(right.missing)}
          />
          <SectionCompare
            title="🚩 Red Flags"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.redFlags)}
            rightItems={asArray(right.redFlags)}
          />
          <SectionCompare
            title="❓ Questions To Ask"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.questionsToAsk)}
            rightItems={asArray(right.questionsToAsk)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <SectionCompare
            title="✅ Looks Good"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.looksGood)}
            rightItems={asArray(right.looksGood)}
          />
          <SectionCompare
            title="⚠️ Possible Issues"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.issues)}
            rightItems={asArray(right.issues)}
          />
          <SectionCompare
            title="💬 Suggested Questions"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            leftItems={asArray(left.suggestedQuestions)}
            rightItems={asArray(right.suggestedQuestions)}
          />
        </div>
      )}
    </main>
  );
}
