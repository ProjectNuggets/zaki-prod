import crypto from "node:crypto";
import { PLATFORM_PLAN_IDS } from "./platform-policy.js";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;

function toDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function toIso(value = new Date()) {
  return toDate(value).toISOString();
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

function getUtcWeekStartDate(nowDate = new Date()) {
  const now = toDate(nowDate);
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0
    )
  );
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

export async function readMeterSnapshotForIdentity({
  dbGet,
  identity,
  platform,
  nowDate = new Date(),
} = {}) {
  const now = toDate(nowDate);
  const rollingHours = Math.max(1, Number(platform?.usage?.burstWindowHours || 5));
  const rollingStartedAt = new Date(now.getTime() - rollingHours * MS_PER_HOUR);
  const weekStartedAt = getUtcWeekStartDate(now);
  const weekEndedAt = new Date(weekStartedAt.getTime() + MS_PER_WEEK);
  const rollingStartedAtIso = toIso(rollingStartedAt);
  const nowIso = toIso(now);
  const weekStartedAtIso = toIso(weekStartedAt);
  const weekEndedAtIso = toIso(weekEndedAt);
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
  const weeklyUsage = await readMeterWindow({
    dbGet,
    identity,
    startedAtIso: weekStartedAtIso,
    endedAtIso: weekEndedAtIso,
  });

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
    weekly: {
      used: weeklyUsage.weightedUnits,
      receipts: weeklyUsage.receipts,
      limit: weeklyLimit,
      remaining: remainingUnits(weeklyLimit, weeklyUsage.weightedUnits),
      startedAt: weekStartedAtIso,
      resetAt: weekEndedAtIso,
    },
  };
}
