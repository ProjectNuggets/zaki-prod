function roundUnits(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 10_000) / 10_000;
}

function finiteUnits(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
}

function pickResetAt(limitingWindow, weekly, rolling) {
  if (limitingWindow === "rolling") return rolling?.resetAt || null;
  if (limitingWindow === "weekly") return weekly?.resetAt || null;
  return weekly?.resetAt || rolling?.resetAt || null;
}

export function computeAvailableNow({
  weekly = null,
  rolling = null,
  requiredUnits = 1,
} = {}) {
  const requiredReserveUnits = roundUnits(requiredUnits) || 1;
  const topupUnits = finiteUnits(weekly?.topupUnits) ?? 0;
  const weeklyRemaining =
    finiteUnits(weekly?.recurringRemaining) ??
    (finiteUnits(weekly?.remaining) == null
      ? null
      : Math.max(0, finiteUnits(weekly.remaining) - topupUnits));
  const rollingRemaining = finiteUnits(rolling?.remaining);
  const recurringCandidates = [weeklyRemaining, rollingRemaining].filter(
    (value) => typeof value === "number"
  );
  const recurringAvailable = recurringCandidates.length
    ? Math.min(...recurringCandidates)
    : 0;
  const effectiveRemaining = roundUnits(recurringAvailable + topupUnits);
  const limitingWindow =
    typeof rollingRemaining === "number" &&
    (typeof weeklyRemaining !== "number" || rollingRemaining < weeklyRemaining)
      ? "rolling"
      : typeof weeklyRemaining === "number"
        ? "weekly"
        : null;
  const shortfall = roundUnits(Math.max(0, requiredReserveUnits - effectiveRemaining));

  return {
    requiredReserveUnits,
    weeklyRemaining: weeklyRemaining == null ? null : roundUnits(weeklyRemaining),
    rollingRemaining: rollingRemaining == null ? null : roundUnits(rollingRemaining),
    topupUnits: roundUnits(topupUnits),
    effectiveRemaining,
    limitingWindow,
    constraint: shortfall > 0 ? limitingWindow || "unknown" : null,
    shortfall,
    available: shortfall <= 0,
    resetAt: shortfall > 0 ? pickResetAt(limitingWindow, weekly, rolling) : null,
  };
}

export function buildAvailableNow({
  meterSnapshot,
  agentRequiredUnits,
} = {}) {
  return {
    agent: computeAvailableNow({
      weekly: meterSnapshot?.weekly || null,
      rolling: meterSnapshot?.rolling || null,
      requiredUnits: agentRequiredUnits,
    }),
  };
}
