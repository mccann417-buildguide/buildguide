// src/app/lib/history.ts
import type { AnyResult } from "./types";

const KEY = "buildguide_history_v1";
const MAX_ITEMS = 25;

export function loadHistory(): AnyResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnyResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToHistory(item: AnyResult) {
  if (typeof window === "undefined") return;
  const current = loadHistory();
  const next = [item, ...current].slice(0, MAX_ITEMS);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
