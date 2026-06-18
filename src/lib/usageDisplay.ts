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
