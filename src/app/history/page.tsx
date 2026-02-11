// src/app/history/page.tsx
"use client";

import React from "react";
import Link from "next/link";

import { loadHistory, clearHistory, HISTORY_KEY, HISTORY_EVENT, type HistoryItem } from "../lib/history";

// keep consistent with FeatureGate.tsx
const USAGE_EVENT = "buildguide:usage_updated";

function sortNewestFirst(items: HistoryItem[]) {
  return [...items].sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bd - ad;
  });
}

function formatDate(d?: string) {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString();
}

function safeKind(x: any): "photo" | "bid" | "unknown" {
  const k = String(x?.kind ?? "").toLowerCase().trim();
  if (k === "photo") return "photo";
  if (k === "bid") return "bid";
  return "unknown";
}

function titleFor(x: any) {
  const k = safeKind(x);
  if (k === "photo") return String(x?.identified || x?.summary || "Photo Report");
  if (k === "bid") return "Bid Report";
  return "Report";
}

function subtitleFor(x: any) {
  const k = safeKind(x);
  if (k === "photo") return "Photo check";
  if (k === "bid") return "Estimate / scope review";
  return "Saved report";
}

export default function HistoryPage() {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "photo" | "bid">("all");

  const reload = React.useCallback(() => {
    setItems(sortNewestFirst(loadHistory()));
  }, []);

  React.useEffect(() => {
    reload();

    const onStorage = (e: StorageEvent) => {
      // storage only fires across tabs, but keep it anyway
      if (!e.key || e.key === HISTORY_KEY) reload();
    };

    const onUsage = () => reload();
    const onHistory = () => reload();

    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(USAGE_EVENT, onUsage);
    window.addEventListener(HISTORY_EVENT, onHistory);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(USAGE_EVENT, onUsage);
      window.removeEventListener(HISTORY_EVENT, onHistory);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  function onClear() {
    clearHistory();
    setItems([]);
  }

  const filtered = items.filter((x: any) => {
    const k = safeKind(x);

    if (filter !== "all" && k !== filter) return false;
    if (!query.trim()) return true;

    const q = query.trim().toLowerCase();
    const id = String(x?.id || "").toLowerCase();
    const title = String(titleFor(x)).toLowerCase();

    return title.includes(q) || id.includes(q);
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="mt-1 text-neutral-700">Reports saved on this device.</p>
        </div>

        <div className="flex gap-2">
          <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Home
          </Link>
          <button onClick={onClear} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
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
            <Link href="/bid" className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Check a Bid
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((x: any) => {
            const k = safeKind(x);
            const title = titleFor(x);
            const subtitle = subtitleFor(x);

            const hasDetail = !!x.detail;
            const isUnlocked = !!x.unlocked || hasDetail;

            return (
              <Link
                key={String(x.id)}
                href={`/history/${encodeURIComponent(String(x.id))}`}
                className="rounded-2xl border p-5 hover:bg-neutral-50 transition"
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  {k === "photo" ? "Photo Check" : k === "bid" ? "Bid Check" : "Report"}
                </div>

                <div className="mt-1 text-lg font-semibold">{title}</div>
                <div className="mt-1 text-sm text-neutral-700">{subtitle}</div>

                <div className="mt-3 text-xs text-neutral-600">Report ID: {String(x.id)}</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-neutral-600">{formatDate(x.createdAt)}</div>

                  <div className="text-xs flex gap-2">
                    {isUnlocked ? (
                      <span className="rounded-full border px-2 py-1">🔓 Unlocked</span>
                    ) : (
                      <span className="rounded-full border px-2 py-1">Basic</span>
                    )}

                    {hasDetail ? <span className="rounded-full border px-2 py-1">✅ Detailed</span> : null}
                  </div>
                </div>

                {x.detailUpdatedAt ? (
                  <div className="mt-2 text-[11px] text-neutral-500">
                    Full report updated: {formatDate(x.detailUpdatedAt)}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
