// src/app/lib/history.ts
"use client";

import type { AnyResult } from "./types";

export const HISTORY_KEY = "buildguide_history"; // MUST match everywhere
export const HISTORY_EVENT = "buildguide:history_updated";
const MAX_ITEMS = 25;

export type HistoryItem = AnyResult & {
  createdAt?: string; // ISO
  unlocked?: boolean;
  unlockedAt?: string;
  detail?: any;
  detailUpdatedAt?: string;
};

function dispatchHistoryUpdated() {
  try {
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // ignore
  }
}

function toIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
  }
  if (typeof v === "number") {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
  }
  return new Date().toISOString();
}

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Normalize old items (createdAt number -> ISO string, etc.)
    return parsed
      .map((x: any) => {
        if (!x?.id) return null;
        return {
          ...x,
          createdAt: toIso(x.createdAt),
        } as HistoryItem;
      })
      .filter(Boolean) as HistoryItem[];
  } catch {
    return [];
  }
}

/**
 * Save or update a history item.
 * - de-dupes by id
 * - preserves existing detail/unlocked fields
 * - ensures createdAt is ISO string
 * - moves updated item to top
 */
export function saveToHistory(item: AnyResult) {
  if (typeof window === "undefined") return;

  try {
    if (!item?.id) return;

    const current = loadHistory();
    const idx = current.findIndex((x) => String(x?.id) === String(item.id));

    let next: HistoryItem[];

    if (idx >= 0) {
      const existing = current[idx];
      next = [
        {
          ...existing, // preserve unlocked/detail
          ...item, // overwrite base fields
          createdAt: toIso(existing.createdAt || (item as any).createdAt),
        },
        ...current.filter((_, i) => i !== idx),
      ];
    } else {
      next = [
        {
          ...(item as any),
          createdAt: toIso((item as any).createdAt),
        } as HistoryItem,
        ...current,
      ];
    }

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, MAX_ITEMS)));
    dispatchHistoryUpdated();
  } catch {
    // ignore
  }
}

export function attachDetailToHistory(resultId: string, detail: any) {
  if (typeof window === "undefined") return;

  try {
    const current = loadHistory();
    const idx = current.findIndex((x) => String(x?.id) === String(resultId));
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      detail,
      unlocked: true,
      detailUpdatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, MAX_ITEMS)));
    dispatchHistoryUpdated();
  } catch {
    // ignore
  }
}

export function markUnlocked(resultId: string) {
  if (typeof window === "undefined") return;

  try {
    const current = loadHistory();
    const idx = current.findIndex((x) => String(x?.id) === String(resultId));
    if (idx === -1) return;

    current[idx] = {
      ...current[idx],
      unlocked: true,
      unlockedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, MAX_ITEMS)));
    dispatchHistoryUpdated();
  } catch {
    // ignore
  }
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    dispatchHistoryUpdated();
  } catch {
    // ignore
  }
}
