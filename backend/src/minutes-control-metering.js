import { deterministicGrantId as defaultDeterministicGrantId } from "./chat-meter.js";
import {
  ensureWallet as defaultEnsureWallet,
  releaseHold as defaultReleaseHold,
  reserveUnits as defaultReserveUnits,
  settleHold as defaultSettleHold,
} from "./unit-ledger.js";

export class MinutesControlMeteringError extends Error {
  constructor(message, { code = "upstream_unavailable", status = 503, retryable = true, cause } = {}) {
    super(message, { cause });
    this.name = "MinutesControlMeteringError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function validPositiveInteger(value, max = 1_000_000) {
  return Number.isSafeInteger(value) && value > 0 && value <= max;
}

export function minutesUnitsFromCapturedSeconds(value) {
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 31_536_000) {
    throw new MinutesControlMeteringError("Minutes usage is invalid.", {
      code: "invalid_state",
      status: 409,
      retryable: false,
    });
  }
  return Math.ceil(seconds / 60);
}

export async function reserveMinutesCapture({
  zakiUser,
  tenantId = "default",
  idempotencyKey,
  reservedUnits,
  holdTtlMs = 6 * 60 * 60 * 1_000,
  resolvePlan,
  ensureWallet = defaultEnsureWallet,
  reserveUnits = defaultReserveUnits,
  deterministicGrantId = defaultDeterministicGrantId,
  nowMs = Date.now(),
} = {}) {
  const userId = String(zakiUser?.id || "");
  const key = String(idempotencyKey || "");
  if (!/^[1-9][0-9]{0,18}$/.test(userId) || !key) {
    throw new MinutesControlMeteringError("Minutes reservation identity is invalid.", {
      code: "invalid_request",
      status: 400,
      retryable: false,
    });
  }
  if (!validPositiveInteger(reservedUnits) || !Number.isFinite(holdTtlMs) || holdTtlMs < 60_000) {
    throw new MinutesControlMeteringError("Minutes reservation is not configured.", {
      code: "upstream_unavailable",
      status: 503,
      retryable: true,
    });
  }

  const reserveArgs = {
    userId,
    // The ledger's UUID derives from the entire server-owned namespace, so one
    // browser key cannot collide across tenants/users/products.
    grantId: deterministicGrantId(`minutes-control:${tenantId}:${userId}:${key}`),
    productId: "minutes",
    action: "minutes_capture",
    reservedUnits,
    reserveIdempotencyKey: key,
    expiresAt: new Date(nowMs + holdTtlMs).toISOString(),
  };

  let result;
  try {
    result = await reserveUnits(reserveArgs);
    if (!result?.ok && result?.reason === "no_wallet") {
      await ensureWallet({
        userId,
        planId: typeof resolvePlan === "function" ? resolvePlan(zakiUser) : "free",
      });
      result = await reserveUnits(reserveArgs);
    }
  } catch (cause) {
    throw new MinutesControlMeteringError("Minutes metering is unavailable.", { cause });
  }

  if (result?.ok && result.hold) {
    return { hold: result.hold, idempotent: Boolean(result.idempotent), reservedUnits };
  }
  if (result?.reason === "insufficient_units") {
    throw new MinutesControlMeteringError("Minutes capture quota is exhausted.", {
      code: "quota_exhausted",
      status: 429,
      retryable: false,
    });
  }
  if (result?.reason === "idempotency_replayed") {
    throw new MinutesControlMeteringError("This Minutes request has already completed.", {
      code: "idempotency_conflict",
      status: 409,
      retryable: false,
    });
  }
  throw new MinutesControlMeteringError("Minutes metering is unavailable.");
}

export async function settleMinutesCapture({ holdId, idempotencyKey, capturedSecondsTotal, client, settleHold = defaultSettleHold } = {}) {
  const settledUnits = minutesUnitsFromCapturedSeconds(capturedSecondsTotal);
  try {
    const result = await settleHold({
      holdId,
      settleIdempotencyKey: `minutes-control:settle:${String(idempotencyKey || "")}`,
      settledUnits,
      finalState: "settled",
      // Minutes bills final cumulative bot time, including a bounded overage
      // if the provider reports more than the original reservation. The
      // ledger deliberately defaults this off for products that bill caps.
      recordTrueCost: true,
    }, client);
    if (result?.ok && result?.idempotent && result?.hold?.state === "expired") {
      // Configuration keeps this unreachable in normal operation (the hold
      // outlives the engine maximum plus callback grace). Do not silently
      // acknowledge a late terminal callback after an expiry refunded it.
      throw new MinutesControlMeteringError("Minutes capture hold expired before terminal settlement.", {
        code: "upstream_unavailable",
        status: 503,
        retryable: true,
      });
    }
    if (!result?.ok) {
      throw new MinutesControlMeteringError("Minutes metering could not be finalized.", {
        code: "upstream_unavailable",
        status: 503,
      });
    }
    return result;
  } catch (error) {
    if (error instanceof MinutesControlMeteringError) throw error;
    throw new MinutesControlMeteringError("Minutes metering could not be finalized.", { cause: error });
  }
}

export async function releaseMinutesCapture({ holdId, idempotencyKey, releaseHold = defaultReleaseHold } = {}) {
  if (!holdId || !idempotencyKey) return null;
  try {
    return await releaseHold({
      holdId,
      settleIdempotencyKey: `minutes-control:release:${String(idempotencyKey)}`,
    });
  } catch {
    // A failed release deliberately leaves the hold for the unit-ledger expiry
    // sweeper; callers must not turn an uncertain upstream capture into free use.
    return null;
  }
}
