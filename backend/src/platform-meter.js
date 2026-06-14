import crypto from "node:crypto";
import { PLATFORM_PLAN_IDS } from "./platform-policy.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;
const WEEKLY_PERIOD = "entitlement_week";
const WEEKLY_RESET_POLICY = "fixed_7_day_no_rollover";

function toDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function toIso(value = new Date()) {
  return toDate(value).toISOString();
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function roundUnits(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 10_000) / 10_000;
}

function remainingUnits(limit, used) {
  return typeof limit === "number" ? roundUnits(Math.max(0, limit - used)) : null;
}

export function hashAnonymousSessionId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function resolvePlanMeterGroup(planId) {
  return String(planId || PLATFORM_PLAN_IDS.FREE).trim() === PLATFORM_PLAN_IDS.FREE
    ? "free"
    : "paid";
}

function resolveIdentityPredicate(identity, startingParamIndex = 2) {
  if (!identity) return null;
  if (identity.type === "user") {
    if (!identity.userId) return null;
    return {
      sql: `g.user_id = $${startingParamIndex}`,
      value: identity.userId,
    };
  }
  if (!identity.anonymousKeyHash) return null;
  return {
    sql: `g.anonymous_key_hash = $${startingParamIndex}`,
    value: identity.anonymousKeyHash,
  };
}

function buildWeeklyWindowFromAnchor({
  anchorAt,
  entitlementStartedAt = null,
  planMeterGroup = "free",
  nowDate = new Date(),
} = {}) {
  const now = toDate(nowDate);
  const nowIso = toIso(now);
  const entitlementStartedAtIso = toIsoOrNull(entitlementStartedAt);
  const anchorAtIso = toIsoOrNull(anchorAt);

  if (!anchorAtIso) {
    return {
      pendingFirstUse: true,
      period: WEEKLY_PERIOD,
      resetPolicy: WEEKLY_RESET_POLICY,
      rollover: false,
      anchorType: "first_metered_use",
      anchorAt: null,
      entitlementStartedAt: entitlementStartedAtIso,
      planMeterGroup,
      startedAt: null,
      resetAt: null,
      unusedUnitsExpireAt: null,
      queryStartedAt: nowIso,
      queryEndedAt: nowIso,
    };
  }

  const anchorDate = toDate(anchorAtIso);
  const anchorMs = Math.min(anchorDate.getTime(), now.getTime());
  const elapsedMs = Math.max(0, now.getTime() - anchorMs);
  const cycles = Math.floor(elapsedMs / MS_PER_WEEK);
  const startedAt = new Date(anchorMs + cycles * MS_PER_WEEK);
  const endedAt = new Date(startedAt.getTime() + MS_PER_WEEK);
  const startedAtIso = toIso(startedAt);
  const endedAtIso = toIso(endedAt);

  return {
    pendingFirstUse: false,
    period: WEEKLY_PERIOD,
    resetPolicy: WEEKLY_RESET_POLICY,
    rollover: false,
    anchorType: "first_metered_use",
    anchorAt: anchorAtIso,
    entitlementStartedAt: entitlementStartedAtIso,
    planMeterGroup,
    startedAt: startedAtIso,
    resetAt: endedAtIso,
    unusedUnitsExpireAt: endedAtIso,
    queryStartedAt: startedAtIso,
    queryEndedAt: nowIso,
  };
}

/**
 * Map a real `zaki_unit_wallets` row (the ENFORCEMENT ledger the spaces chat gate debits via
 * reserveUnits/settleHold) into the DISPLAY `weekly` window shape the frontend reads from
 * /api/meter/status. This is the source of truth for an authenticated ZAKI user, because spaces
 * chat NEVER writes a `zaki_meter_receipts` row — the receipts-based window would always read
 * used:0 / remaining:limit even when the user is out of chat credits.
 *
 * Remaining mirrors how the gate funds a reservation (unit-wallet.js computeRemaining/planFunding):
 * weekly recurring first, then persistent top-up on top. So weekly-window remaining =
 * max(0, allowance - used) + topup. Burst (the rolling 5h dimension) is intentionally NOT folded in
 * here — it is the separate `rolling` window.
 *
 * pendingFirstUse mirrors the receipts path: true until the wallet is anchored (weekly_reset_at IS
 * NULL, i.e. the lazy anchored reset in applyWeeklyResetLocked has not yet run for this user).
 * @returns {object} a weekly window with the SAME field names as buildWeeklyWindowFromAnchor.
 */
export function walletToWeeklyWindow(wallet = {}) {
  const allowance = Math.max(0, Number(wallet?.weekly_allowance_units) || 0);
  const used = Math.max(0, Number(wallet?.weekly_used_units) || 0);
  const topup = Math.max(0, Number(wallet?.topup_units) || 0);
  const weeklyRemaining = Math.max(0, allowance - used);
  const anchorAtIso = toIsoOrNull(wallet?.weekly_anchor_at);
  const resetAtIso = toIsoOrNull(wallet?.weekly_reset_at);
  const pendingFirstUse = wallet?.weekly_reset_at == null;
  return {
    period: WEEKLY_PERIOD,
    resetPolicy: WEEKLY_RESET_POLICY,
    rollover: false,
    anchorType: "first_metered_use",
    anchorAt: anchorAtIso,
    entitlementStartedAt: null,
    planMeterGroup: resolvePlanMeterGroup(wallet?.plan_id),
    pendingFirstUse,
    unusedUnitsExpireAt: resetAtIso,
    used: roundUnits(used),
    receipts: 0,
    limit: allowance,
    recurringRemaining: roundUnits(weeklyRemaining),
    topupUnits: roundUnits(topup),
    remaining: roundUnits(weeklyRemaining + topup),
    startedAt: pendingFirstUse ? null : anchorAtIso,
    resetAt: resetAtIso,
  };
}

async function readFirstMeteredUseAnchor({
  dbGet,
  identity,
  platform,
} = {}) {
  if (typeof dbGet !== "function") return null;
  const identityPredicate = resolveIdentityPredicate(identity);
  if (!identityPredicate) return null;
  const tenantId = String(identity?.tenantId || "default").trim() || "default";
  const planMeterGroup = resolvePlanMeterGroup(platform?.plan?.id);
  const entitlementStartedAt = toIsoOrNull(platform?.usage?.weeklyAllowanceEntitlementStartedAt);
  const params = [tenantId, identityPredicate.value, PLATFORM_PLAN_IDS.FREE];
  const planPredicate =
    planMeterGroup === "free" ? "g.plan_id = $3" : "g.plan_id <> $3";
  const entitlementPredicate = entitlementStartedAt
    ? `AND g.created_at >= $${params.push(entitlementStartedAt)}::timestamptz`
    : "";
  const row = await dbGet(
    `
      SELECT MIN(g.created_at) AS anchor_at
      FROM zaki_meter_grants g
      WHERE g.tenant_id = $1
        AND ${identityPredicate.sql}
        AND ${planPredicate}
        ${entitlementPredicate}
    `,
    params
  );
  return toIsoOrNull(row?.anchor_at);
}

async function readMeterWindow({
  dbGet,
  identity,
  startedAtIso,
  endedAtIso,
}) {
  if (typeof dbGet !== "function") return { weightedUnits: 0, receipts: 0 };
  const tenantId = String(identity?.tenantId || "default").trim() || "default";
  const identityPredicate =
    identity.type === "user"
      ? "g.user_id = $2"
      : "g.anonymous_key_hash = $2";
  const identityValue =
    identity.type === "user" ? identity.userId : identity.anonymousKeyHash;
  const row = await dbGet(
    `
      SELECT
        COALESCE(SUM(r.weighted_units), 0)::float8 AS weighted_units,
        COUNT(r.id)::int AS receipts
      FROM zaki_meter_receipts r
      JOIN zaki_meter_grants g ON g.id = r.grant_id
      WHERE g.tenant_id = $1
        AND ${identityPredicate}
        AND r.created_at >= $3::timestamptz
        AND r.created_at < $4::timestamptz
    `,
    [tenantId, identityValue, startedAtIso, endedAtIso]
  );
  return {
    weightedUnits: roundUnits(row?.weighted_units),
    receipts: Math.max(0, Math.floor(Number(row?.receipts || 0))),
  };
}

async function readMeterProductWindow({
  dbAll,
  identity,
  startedAtIso,
  endedAtIso,
}) {
  if (typeof dbAll !== "function") return {};
  const tenantId = String(identity?.tenantId || "default").trim() || "default";
  const identityPredicate =
    identity.type === "user"
      ? "g.user_id = $2"
      : "g.anonymous_key_hash = $2";
  const identityValue =
    identity.type === "user" ? identity.userId : identity.anonymousKeyHash;
  const rows = await dbAll(
    `
      SELECT
        r.product_id,
        COALESCE(SUM(r.weighted_units), 0)::float8 AS weighted_units,
        COUNT(r.id)::int AS receipts
      FROM zaki_meter_receipts r
      JOIN zaki_meter_grants g ON g.id = r.grant_id
      WHERE g.tenant_id = $1
        AND ${identityPredicate}
        AND r.created_at >= $3::timestamptz
        AND r.created_at < $4::timestamptz
      GROUP BY r.product_id
    `,
    [tenantId, identityValue, startedAtIso, endedAtIso]
  );
  return Object.fromEntries(
    (Array.isArray(rows) ? rows : []).map((row) => [
      String(row?.product_id || ""),
      {
        used: roundUnits(row?.weighted_units),
        receipts: Math.max(0, Math.floor(Number(row?.receipts || 0))),
      },
    ]).filter(([productId]) => productId)
  );
}

export async function readMeterSnapshotForIdentity({
  dbGet,
  dbAll,
  identity,
  platform,
  wallet = null,
  nowDate = new Date(),
} = {}) {
  // An authenticated ZAKI user with a real unit wallet: the wallet (the ENFORCEMENT ledger the
  // spaces chat gate debits) is the source of truth for the DISPLAY weekly window. Spaces chat
  // never writes a receipt, so the receipts-based weekly would always read used:0 / remaining:limit.
  // Anonymous identities and the agent/learning/design surfaces have no wallet here and keep the
  // existing receipts-based path unchanged.
  const useWalletWeekly = identity?.type === "user" && wallet != null;
  const now = toDate(nowDate);
  const rollingHours = Math.max(1, Number(platform?.usage?.burstWindowHours || 5));
  const rollingStartedAt = new Date(now.getTime() - rollingHours * MS_PER_HOUR);
  const planMeterGroup = resolvePlanMeterGroup(platform?.plan?.id);
  const firstMeteredUseAnchor = await readFirstMeteredUseAnchor({
    dbGet,
    identity,
    platform,
  });
  const weeklyWindow = buildWeeklyWindowFromAnchor({
    anchorAt: firstMeteredUseAnchor,
    entitlementStartedAt: platform?.usage?.weeklyAllowanceEntitlementStartedAt,
    planMeterGroup,
    nowDate: now,
  });
  const rollingStartedAtIso = toIso(rollingStartedAt);
  const nowIso = toIso(now);
  const rollingLimit =
    typeof platform?.usage?.rollingAllowanceUnits === "number"
      ? platform.usage.rollingAllowanceUnits
      : null;
  const weeklyLimit =
    typeof platform?.usage?.weeklyAllowanceUnits === "number"
      ? platform.usage.weeklyAllowanceUnits
      : null;
  const rollingUsage = await readMeterWindow({
    dbGet,
    identity,
    startedAtIso: rollingStartedAtIso,
    endedAtIso: nowIso,
  });
  const weeklyUsage =
    useWalletWeekly || weeklyWindow.pendingFirstUse
      ? { weightedUnits: 0, receipts: 0 }
      : await readMeterWindow({
          dbGet,
          identity,
          startedAtIso: weeklyWindow.queryStartedAt,
          endedAtIso: weeklyWindow.queryEndedAt,
        });
  const rollingProducts = await readMeterProductWindow({
    dbAll,
    identity,
    startedAtIso: rollingStartedAtIso,
    endedAtIso: nowIso,
  });
  const weeklyProducts = weeklyWindow.pendingFirstUse
    ? {}
    : await readMeterProductWindow({
        dbAll,
        identity,
        startedAtIso: weeklyWindow.queryStartedAt,
        endedAtIso: weeklyWindow.queryEndedAt,
      });
  const productIds = new Set([
    ...Object.keys(rollingProducts),
    ...Object.keys(weeklyProducts),
  ]);

  // Receipts-based weekly window (the legitimate path for anonymous identities and the
  // agent/learning/design surfaces). Same SHAPE as the wallet-sourced window below.
  const receiptsWeekly = {
    period: weeklyWindow.period,
    resetPolicy: weeklyWindow.resetPolicy,
    rollover: false,
    anchorType: weeklyWindow.anchorType,
    anchorAt: weeklyWindow.anchorAt,
    entitlementStartedAt: weeklyWindow.entitlementStartedAt,
    planMeterGroup: weeklyWindow.planMeterGroup,
    pendingFirstUse: weeklyWindow.pendingFirstUse,
    unusedUnitsExpireAt: weeklyWindow.unusedUnitsExpireAt,
    used: weeklyUsage.weightedUnits,
    receipts: weeklyUsage.receipts,
    limit: weeklyLimit,
    remaining: remainingUnits(weeklyLimit, weeklyUsage.weightedUnits),
    startedAt: weeklyWindow.startedAt,
    resetAt: weeklyWindow.resetAt,
  };

  return {
    plan: {
      id: platform?.plan?.id || PLATFORM_PLAN_IDS.FREE,
      label: platform?.plan?.label || "Free",
    },
    rolling: {
      windowHours: rollingHours,
      used: rollingUsage.weightedUnits,
      receipts: rollingUsage.receipts,
      limit: rollingLimit,
      remaining: remainingUnits(rollingLimit, rollingUsage.weightedUnits),
      startedAt: rollingStartedAtIso,
      resetAt: nowIso,
    },
    weekly: useWalletWeekly ? walletToWeeklyWindow(wallet) : receiptsWeekly,
    products: Object.fromEntries(
      [...productIds].map((productId) => [
        productId,
        {
          rolling: rollingProducts[productId] || { used: 0, receipts: 0 },
          weekly: weeklyProducts[productId] || { used: 0, receipts: 0 },
        },
      ])
    ),
  };
}
