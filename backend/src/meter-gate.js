// Meter-gate orchestration (H-02 request-path wiring): ties one metered operation to the wallet
// ledger — reserve units → run the work → settle on the ACTUAL cost. Provisions the wallet lazily
// (only if missing) so the hot path is a single locked reserve, not a write-per-request.
// Correctness-critical math/SQL lives in unit-wallet.js / unit-ledger.js (heavily tested, incl.
// real-Postgres concurrency). This thin glue is proven by meter-gate.pg.integration.test.js.
import crypto from "node:crypto";
import { ensureWallet, reserveUnits, settleHold } from "./unit-ledger.js";

const DEFAULT_HOLD_TTL_MS = 5 * 60 * 1000;
const SETTLE_MAX_ATTEMPTS = 3;

async function settleWithRetry(args) {
  let lastErr;
  for (let i = 0; i < SETTLE_MAX_ATTEMPTS; i += 1) {
    try {
      return await settleHold(args);
    } catch (err) {
      lastErr = err;
    }
  }
  // Fail-closed: the reserve stays debited; the scheduled expiry sweeper will reconcile at TTL.
  // Logged loudly with the holdId for manual reconciliation (durable-settle outbox is a follow-up).
  console.error(
    `[MeterGate] CRITICAL settle failed after ${SETTLE_MAX_ATTEMPTS} attempts hold=${args.holdId}: ${lastErr?.message}`
  );
  return { ok: false, reason: "settle_failed", deferred: true };
}

/**
 * Run a metered operation against the user's wallet.
 * `doWork` returns `{ units?, providerCostUsdMicros?, provider?, providerModel?, result? }`.
 *  - units: the ACTUAL weighted units consumed (defaults to the estimate; clamped to [0, estimate]).
 * On insufficient balance → { ok:false, status:429 }. On work failure → full release (not charged).
 * On an idempotent retry → returns without re-running work (result is NOT replayed).
 */
export async function runMeteredOperation(
  { userId, planId = "free", productId, action, estimatedUnits, grantId = crypto.randomUUID(), idempotencyKey, expiresAt },
  doWork
) {
  const key = idempotencyKey || `${grantId}:${productId}:${action}`;
  const exp = expiresAt || new Date(Date.now() + DEFAULT_HOLD_TTL_MS).toISOString();
  const reserveArgs = { userId, grantId, productId, action, reservedUnits: estimatedUnits, reserveIdempotencyKey: key, expiresAt: exp };

  // Reserve first; only provision the wallet if it doesn't exist yet (keeps the hot path lock-only).
  let reserved = await reserveUnits(reserveArgs);
  if (!reserved.ok && reserved.reason === "no_wallet") {
    await ensureWallet({ userId, planId });
    reserved = await reserveUnits(reserveArgs);
  }
  if (!reserved.ok) {
    return { ok: false, status: 429, reason: reserved.reason, shortfall: reserved.shortfall, remaining: reserved.remaining };
  }
  if (reserved.idempotent) {
    // Retry of an already-processed op — do NOT re-run work or re-charge. result is not replayed.
    return { ok: true, idempotent: true, holdId: reserved.hold?.id };
  }

  let actualUnits = estimatedUnits;
  let providerCostUsdMicros = null, provider = null, providerModel = null, result, failed = false;
  try {
    const out = (await doWork()) || {};
    const u = Number(out.units);
    actualUnits = Number.isFinite(u) ? Math.min(Math.max(0, u), estimatedUnits) : estimatedUnits; // clamp to [0, estimate]
    if (Number.isFinite(u) && u > estimatedUnits) {
      console.warn(`[MeterGate] under-estimate: actual ${u} > reserved ${estimatedUnits} (product=${productId} action=${action})`);
    }
    providerCostUsdMicros = out.providerCostUsdMicros ?? null;
    provider = out.provider ?? null;
    providerModel = out.providerModel ?? null;
    result = out.result ?? out;
  } catch {
    failed = true; // work failed → release the full hold (user not charged for a failed op)
  }

  const settle = await settleWithRetry({
    holdId: reserved.hold.id,
    settleIdempotencyKey: `${key}:settle`,
    settledUnits: failed ? 0 : actualUnits,
    finalState: failed ? "released" : "settled",
    provider, providerModel, providerCostUsdMicros,
  });

  if (failed) return { ok: false, status: 502, reason: "work_failed", refunded: settle.ok, holdId: reserved.hold.id };
  return {
    ok: true,
    holdId: reserved.hold.id,
    settledUnits: settle.refund?.settledUnits ?? actualUnits,
    settleDeferred: settle.ok ? undefined : true,
    result,
  };
}
