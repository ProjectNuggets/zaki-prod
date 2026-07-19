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
  // Owner metering decision 2026-07-18: the reserve is a worst-case ceiling, not an entitlement to
  // spend. Admission is "does the user have ANY units left", not "can the user afford the ceiling" —
  // the latter refused users with most of their window unspent whenever a tier's allowance sat below
  // the reserve. The shortfall is still reported (it drives the last-turn warning) but no longer
  // gates. The turn after the wallet drains to zero is the one that is refused.
  const available = effectiveRemaining > 0;
  // True when this is very likely the user's final admitted turn: they still have units (so they are
  // admitted) but fewer than the worst-case reserve, so the settle may drain them. Surfaced so the UI
  // can warn BEFORE the turn instead of dead-ending after it.
  const lastTurnWarning = available && shortfall > 0;

  return {
    requiredReserveUnits,
    weeklyRemaining: weeklyRemaining == null ? null : roundUnits(weeklyRemaining),
    rollingRemaining: rollingRemaining == null ? null : roundUnits(rollingRemaining),
    topupUnits: roundUnits(topupUnits),
    effectiveRemaining,
    limitingWindow,
    constraint: available ? null : limitingWindow || "unknown",
    shortfall,
    available,
    lastTurnWarning,
    // The reset instant is now also needed while the user is still ADMITTED (the warning names when
    // capacity returns), so it is no longer conditional on being blocked.
    resetAt:
      available && !lastTurnWarning ? null : pickResetAt(limitingWindow, weekly, rolling),
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
