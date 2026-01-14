// src/app/lib/storage.ts
// Local storage helpers for BuildGuide (client-side only)

export type PlanId = "free" | "home_plus" | "contractor_pro";

export type Usage = {
  photoChecksLifetimeUsed: number;
  bidChecksLifetimeUsed: number;
};

export type AppState = {
  planId: PlanId;
  usage: Usage;
};

const STORAGE_KEY = "buildguide_state_v1";

const DEFAULT_STATE: AppState = {
  planId: "free",
  usage: {
    photoChecksLifetimeUsed: 0,
    bidChecksLifetimeUsed: 0,
  },
};

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;

    return {
      planId: (parsed.planId ?? DEFAULT_STATE.planId) as PlanId,
      usage: {
        photoChecksLifetimeUsed:
          parsed.usage?.photoChecksLifetimeUsed ?? DEFAULT_STATE.usage.photoChecksLifetimeUsed,
        bidChecksLifetimeUsed:
          parsed.usage?.bidChecksLifetimeUsed ?? DEFAULT_STATE.usage.bidChecksLifetimeUsed,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(next: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function setPlan(planId: PlanId) {
  const state = loadState();
  const next: AppState = { ...state, planId };
  saveState(next);
  return next;
}

export function incrementUsage(kind: "photo" | "bid") {
  const state = loadState();
  const next: AppState = {
    ...state,
    usage: {
      ...state.usage,
      photoChecksLifetimeUsed:
        kind === "photo" ? state.usage.photoChecksLifetimeUsed + 1 : state.usage.photoChecksLifetimeUsed,
      bidChecksLifetimeUsed:
        kind === "bid" ? state.usage.bidChecksLifetimeUsed + 1 : state.usage.bidChecksLifetimeUsed,
    },
  };
  saveState(next);
  return next;
}
