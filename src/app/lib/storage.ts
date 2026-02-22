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

// ✅ Legacy keys written by older SuccessClient logic (bridge them into AppState)
const LEGACY_PASS_EXPIRES_KEY = "bg_project_pass_expires";
const LEGACY_HOME_PLUS_KEY = "bg_home_plus_active";

const DEFAULT_STATE: AppState = {
  planId: "free",
  projectPassExpiresAt: null,
  usage: {
    photoChecksLifetimeUsed: 0,
    bidChecksLifetimeUsed: 0,
  },
};

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readLegacyPassExpires(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_PASS_EXPIRES_KEY);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

function readLegacyHomePlusActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LEGACY_HOME_PLUS_KEY) === "1";
  } catch {
    return false;
  }
}

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  // 1) Load primary state
  const parsed = safeParseJson<Partial<AppState>>(window.localStorage.getItem(STORAGE_KEY)) || {};

  const planId = (parsed.planId ?? DEFAULT_STATE.planId) as PlanId;

  const projectPassExpiresAt =
    typeof parsed.projectPassExpiresAt === "number"
      ? parsed.projectPassExpiresAt
      : DEFAULT_STATE.projectPassExpiresAt;

  const st: AppState = {
    planId,
    projectPassExpiresAt,
    usage: {
      photoChecksLifetimeUsed: parsed.usage?.photoChecksLifetimeUsed ?? DEFAULT_STATE.usage.photoChecksLifetimeUsed,
      bidChecksLifetimeUsed: parsed.usage?.bidChecksLifetimeUsed ?? DEFAULT_STATE.usage.bidChecksLifetimeUsed,
    },
  };

  // 2) Bridge legacy keys into state (so purchases activate app-wide immediately)
  // Home Plus overrides everything
  const legacyHomePlus = readLegacyHomePlusActive();
  if (legacyHomePlus && st.planId !== "home_plus") {
    const next: AppState = { ...st, planId: "home_plus" };
    saveState(next);
    return next;
  }

  // Project Pass legacy expiry
  const legacyExp = readLegacyPassExpires();
  if (legacyExp && legacyExp > Date.now()) {
    // Only apply if not already home_plus/contractor_pro
    if (st.planId !== "home_plus" && st.planId !== "contractor_pro") {
      // Ensure state reflects active pass
      if (st.planId !== "project_pass_14d" || st.projectPassExpiresAt !== legacyExp) {
        const next: AppState = { ...st, planId: "project_pass_14d", projectPassExpiresAt: legacyExp };
        saveState(next);
        return next;
      }
    }
  }

  return st;
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

  // If setting away from project pass, clear expiry
  if (planId !== "project_pass_14d") {
    next.projectPassExpiresAt = null;
  }

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

  // Also write legacy key for backwards compatibility (optional, but harmless)
  try {
    window.localStorage.setItem(LEGACY_PASS_EXPIRES_KEY, String(expiresAt));
  } catch {}

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

    // Clear legacy expiry too
    try {
      window.localStorage.removeItem(LEGACY_PASS_EXPIRES_KEY);
    } catch {}

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