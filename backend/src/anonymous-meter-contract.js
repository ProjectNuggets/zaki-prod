export const ANONYMOUS_DAILY_METER_CONTRACT_VERSION =
  "2026-07-14.anonymous-daily-meter.v1";

function toIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

export function buildAnonymousMeterStatusPayload({
  identity,
  allowance,
  nowDate = new Date(),
} = {}) {
  return {
    success: true,
    contractVersion: ANONYMOUS_DAILY_METER_CONTRACT_VERSION,
    generatedAt: toIso(nowDate),
    identity: {
      type: "anonymous",
      tenantId: identity?.tenantId || "default",
      userId: null,
      anonymousSessionId: identity?.anonymousSessionId || null,
    },
    plan: {
      tier: "anonymous",
      label: "Anonymous",
      source: "anonymous_daily_allowance",
    },
    enforced: {
      kind: allowance?.kind || "anonymous_daily_prompts",
      surface: allowance?.surface || "spaces",
      period: allowance?.period || "day",
      limit: allowance?.limit ?? null,
      used: allowance?.used ?? null,
      remaining: allowance?.remaining ?? null,
      resetAt: allowance?.resetAt || null,
    },
  };
}

export function createAnonymousMeterStatusResponder({ readAllowance } = {}) {
  if (typeof readAllowance !== "function") {
    throw new TypeError("createAnonymousMeterStatusResponder requires readAllowance");
  }

  return async function respondToAnonymousMeterStatus(req, res, identity) {
    if (identity?.type !== "anonymous") return false;
    const allowance = await readAllowance(req, res, identity);
    res.status(200).json(
      buildAnonymousMeterStatusPayload({
        identity,
        allowance,
      })
    );
    return true;
  };
}

export function buildAnonymousUnitMeterDenial(identity) {
  if (identity?.type !== "anonymous") return null;
  return {
    status: 403,
    body: {
      success: false,
      error: "anonymous_unit_meter_retired",
      code: "anonymous_unit_meter_retired",
      message:
        "Anonymous usage uses the daily free-turn allowance. Use an anonymous product endpoint or sign in.",
      retryable: false,
    },
  };
}
