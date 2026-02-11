// src/app/lib/storage.ts
// Local storage helpers for BuildGuide (client-side only)

export type PlanId = "free" | "project_pass_14d" | "home_plus" | "contractor_pro";

export type Usage = {
  photoChecksLifetimeUsed: number;
  bidChecksLifetimeUsed: number;
};

export type AppState = {
  planId: PlanId;

  // ✅ If Project Pass is active, we store an expiry timestamp (ms)
  projectPassExpiresAt?: number | null;

  usage: Usage;
};

const STORAGE_KEY = "buildguide_state_v1";

// Same-tab update event (storage doesn't fire in same tab)
export const PLAN_EVENT = "buildguide:plan_updated";

const DEFAULT_STATE: AppState = {
  planId: "free",
  projectPassExpiresAt: null,
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

    const planId = (parsed.planId ?? DEFAULT_STATE.planId) as PlanId;
    const projectPassExpiresAt =
      typeof parsed.projectPassExpiresAt === "number" ? parsed.projectPassExpiresAt : DEFAULT_STATE.projectPassExpiresAt;

    return {
      planId,
      projectPassExpiresAt,
      usage: {
        photoChecksLifetimeUsed: parsed.usage?.photoChecksLifetimeUsed ?? DEFAULT_STATE.usage.photoChecksLifetimeUsed,
        bidChecksLifetimeUsed: parsed.usage?.bidChecksLifetimeUsed ?? DEFAULT_STATE.usage.bidChecksLifetimeUsed,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(next: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  // same-tab update (storage doesn't fire in same tab)
  try {
    window.dispatchEvent(new Event(PLAN_EVENT));
  } catch {}
}

export function setPlan(planId: PlanId) {
  const state = loadState();
  const next: AppState = { ...state, planId };
  saveState(next);
  return next;
}

// ✅ Start Project Pass for N days (we only use 14 right now)
export function startProjectPass(days: number) {
  const state = loadState();
  const ms = Math.max(1, Math.floor(days)) * 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + ms;

  const next: AppState = {
    ...state,
    planId: "project_pass_14d",
    projectPassExpiresAt: expiresAt,
  };

  saveState(next);
  return next;
}

// ✅ If Project Pass expired, auto-revert to free (unless user is Home Plus / Contractor)
export function getActivePlan(): { planId: PlanId; projectPassExpiresAt?: number | null } {
  const st = loadState();

  // Home Plus / Contractor Pro always override pass logic
  if (st.planId === "home_plus" || st.planId === "contractor_pro") return st;

  if (st.planId === "project_pass_14d") {
    const exp = st.projectPassExpiresAt ?? null;
    if (exp && Date.now() < exp) return st;

    // Expired -> revert to free
    const next: AppState = { ...st, planId: "free", projectPassExpiresAt: null };
    saveState(next);
    return next;
  }

  return st;
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
