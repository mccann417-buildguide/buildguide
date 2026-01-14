// src/app/history/page.tsx
"use client";

import React from "react";
import Link from "next/link";

const HISTORY_KEY = "buildguide_history";

type HistoryItem = {
  id: string;
  kind: "photo" | "bid";
  createdAt?: string;
  identified?: string; // photo
  confidence?: string; // photo
  detail?: any; // optional saved detail
  detailUpdatedAt?: string;
};

function safeArr(v: any) {
  return Array.isArray(v) ? v : [];
}

function parseHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryItem[];
  } catch {
    return [];
  }
}

function sortNewestFirst(items: HistoryItem[]) {
  return [...items].sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bd - ad;
  });
}

export default function HistoryPage() {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "photo" | "bid">("all");

  React.useEffect(() => {
    setItems(sortNewestFirst(parseHistory()));
  }, []);

  function clearHistory() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
    setItems([]);
  }

  const filtered = items.filter((x) => {
    if (filter !== "all" && x.kind !== filter) return false;
    if (!query.trim()) return true;

    const q = query.trim().toLowerCase();
    const title =
      x.kind === "photo"
        ? (x.identified || "Photo Report").toLowerCase()
        : "bid report";
    const id = String(x.id || "").toLowerCase();

    return title.includes(q) || id.includes(q);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="mt-1 text-neutral-700">
            Reports saved on this device.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Home
          </Link>
          <button
            onClick={clearHistory}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Search by report ID or title..."
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="photo">Photo</option>
            <option value="bid">Bid</option>
          </select>

          <div className="text-sm text-neutral-600 flex items-center justify-end">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-2xl border p-6 text-sm text-neutral-700">
          No history found on this device yet.
          <div className="mt-4 flex gap-2">
            <Link
              href="/photo"
              className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/90"
            >
              Try Photo Check
            </Link>
            <Link
              href="/bid"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Check a Bid
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((x) => {
            const title =
              x.kind === "photo"
                ? x.identified || "Photo Report"
                : "Bid Report";

            const subtitle =
              x.kind === "photo"
                ? `Confidence: ${x.confidence || "—"}`
                : "Estimate / scope review";

            const hasDetail = !!x.detail;

            return (
              <Link
                key={x.id}
                href={`/history/${encodeURIComponent(x.id)}`}
                className="rounded-2xl border p-5 hover:bg-neutral-50 transition"
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  {x.kind === "photo" ? "Photo Check" : "Bid Check"}
                </div>

                <div className="mt-1 text-lg font-semibold">{title}</div>
                <div className="mt-1 text-sm text-neutral-700">{subtitle}</div>

                <div className="mt-3 text-xs text-neutral-600">
                  Report ID: {x.id}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-neutral-600">
                    {x.createdAt ? new Date(x.createdAt).toLocaleString() : ""}
                  </div>
                  <div className="text-xs">
                    {hasDetail ? (
                      <span className="rounded-full border px-2 py-1">✅ Detailed</span>
                    ) : (
                      <span className="rounded-full border px-2 py-1">Basic</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
