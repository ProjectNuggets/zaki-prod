import { HIRE_SURFACE } from "./daily-quota.js";
import { classifyHireMeterAction } from "./hire-metering-contract.js";
import { ZAKI_PRODUCT_IDS } from "./platform-policy.js";
import {
  USAGE_EVENTS_SCHEMA_VERSION,
  recordUsageEvent,
} from "./usage-events.js";

export const HIRE_USAGE_EVENTS_VERSION = "2026-05-20.hire-usage-events.v1";

function normalizeIdentifier(value, fallback = null) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!/^[a-z0-9][a-z0-9._:-]{0,119}$/.test(text)) return fallback;
  return text;
}

function normalizeQuotaNumber(value) {
  if (value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function resolveHireUsagePlanId(zakiUser = {}) {
  return normalizeIdentifier(
    zakiUser.commercialPlanId ||
      zakiUser.commercial_plan_id ||
      zakiUser.plan_tier ||
      "free",
    "free"
  );
}

export function buildHireUsageEvent({
  req,
  quotaDecision,
  requestId,
} = {}) {
  const usage = classifyHireMeterAction(req || {});
  if (!usage) return null;

  const quota = quotaDecision?.quota || quotaDecision || {};
  const zakiUser = req?.hireAuthResult?.zakiUser || {};
  const quotaUnlimited = Boolean(quota?.unlimited);

  return {
    userId: zakiUser.id,
    productId: ZAKI_PRODUCT_IDS.HIRE,
    surface: HIRE_SURFACE,
    eventType: usage.eventType,
    usageUnitType: "request",
    usageUnits: 1,
    planId: resolveHireUsagePlanId(zakiUser),
    entitlement: quotaUnlimited ? "unlimited" : "metered",
    quotaBucket: quota?.bucket || null,
    quotaPeriod: quota?.period || null,
    quotaLimit: normalizeQuotaNumber(quota?.limit),
    quotaUsed: normalizeQuotaNumber(quota?.used),
    quotaRemaining: normalizeQuotaNumber(quota?.remaining),
    requestId,
    sourceRoute: usage.routeTemplate,
    metadata: {
      schemaVersion: USAGE_EVENTS_SCHEMA_VERSION,
      hireUsageVersion: HIRE_USAGE_EVENTS_VERSION,
      action: usage.action,
      sourceAction: usage.sourceAction,
      method: usage.method,
      routeTemplate: usage.routeTemplate,
      quotaSurface: quota?.surface || HIRE_SURFACE,
      quotaUnlimited,
    },
  };
}

export async function recordHireUsageEvent({
  req,
  quotaDecision,
  requestId,
  dbQuery,
  logStructured,
} = {}) {
  const event = buildHireUsageEvent({ req, quotaDecision, requestId });
  if (!event) {
    return { recorded: false, reason: "not_metered_hire_route" };
  }
  return recordUsageEvent({
    dbQuery,
    logStructured,
    event,
  });
}
