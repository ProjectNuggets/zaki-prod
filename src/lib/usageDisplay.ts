export type UsageWindowInput = {
  used?: number | null;
  limit?: number | null;
};

export const USAGE_NEAR_CAP_PERCENT = 80;
export const USAGE_CAP_PERCENT = 100;

export function getUsagePercent({ used, limit }: UsageWindowInput) {
  if (
    typeof used !== "number" ||
    typeof limit !== "number" ||
    !Number.isFinite(used) ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return 0;
  }
  return Math.max(0, Math.min(USAGE_CAP_PERCENT, (used / limit) * 100));
}

export function getRoundedUsagePercent(percent: number) {
  if (!Number.isFinite(percent)) return 0;
  const clamped = Math.max(0, Math.min(USAGE_CAP_PERCENT, percent));
  return clamped >= USAGE_CAP_PERCENT ? USAGE_CAP_PERCENT : Math.floor(clamped);
}

export function formatUsagePercentLabel(percent: number) {
  return `${getRoundedUsagePercent(percent)}% of your weekly usage`;
}

export function isUsageAtCap(percent: number) {
  return Number.isFinite(percent) && percent >= USAGE_CAP_PERCENT;
}

export function isUsageNearCap(percent: number) {
  return (
    Number.isFinite(percent) &&
    percent >= USAGE_NEAR_CAP_PERCENT &&
    percent < USAGE_CAP_PERCENT
  );
}

// Display-only estimates so users can read the pooled weekly allowance as concrete actions
// ("≈ N agent runs · or M chats") instead of a bare percent. Measured on staging (2026): a
// chat/Spaces turn settles ~1 unit; an agent turn settles ~22 units (real, cache-inclusive cost).
// True per-turn cost varies, hence the "≈" — these are tunable if the model/context budget changes.
export const EST_UNITS_PER_AGENT_RUN = 22;
export const EST_UNITS_PER_CHAT = 1;

export type UsageRemainingEstimate = {
  agentRuns: number;
  chats: number;
};

// Estimate how many agent runs / chats the remaining pooled units buy. Returns null when there is
// no numeric remaining to reason about (unknown/unmetered), so callers can fall back to a percent.
export function estimateTurnsFromUnits(
  remainingUnits?: number | null
): UsageRemainingEstimate | null {
  if (
    typeof remainingUnits !== "number" ||
    !Number.isFinite(remainingUnits) ||
    remainingUnits < 0
  ) {
    return null;
  }
  return {
    agentRuns: Math.floor(remainingUnits / EST_UNITS_PER_AGENT_RUN),
    chats: Math.floor(remainingUnits / EST_UNITS_PER_CHAT),
  };
}

// Floor a units value for display (settles can be fractional, e.g. 22.083). Floor — not round —
// so "N of M left" agrees with estimateTurnsFromUnits (which floors): you never show more headroom
// than you actually have.
export function formatUnits(units?: number | null): string {
  if (typeof units !== "number" || !Number.isFinite(units)) return "—";
  return String(Math.max(0, Math.floor(units)));
}
