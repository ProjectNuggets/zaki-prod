import { getEffectiveEntitlementState } from "./effective-entitlements.js";

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const DESIGN_QUOTA_POLICY_VERSION = "2026-05-27.v1";
export const DEFAULT_DESIGN_ABSOLUTE_MAX_REQUEST_BYTES = 200 * MB;

const ACTIVE_TIERS = new Set(["free", "student", "personal"]);

const PLAN_DEFAULTS = Object.freeze({
  free: Object.freeze({
    tier: "free",
    uploads: Object.freeze({
      maxRequestBytes: 25 * MB,
      maxFilesPerRequest: 8,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 500 * MB,
    }),
  }),
  student: Object.freeze({
    tier: "student",
    uploads: Object.freeze({
      maxRequestBytes: 100 * MB,
      maxFilesPerRequest: 24,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 5 * GB,
    }),
  }),
  personal: Object.freeze({
    tier: "personal",
    uploads: Object.freeze({
      maxRequestBytes: 200 * MB,
      maxFilesPerRequest: 48,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 20 * GB,
    }),
  }),
});

const TIER_ENV_PREFIX = Object.freeze({
  free: "ZAKI_DESIGN_FREE",
  student: "ZAKI_DESIGN_STUDENT",
  personal: "ZAKI_DESIGN_PERSONAL",
});

function parsePositiveInteger(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function normalizeTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  if (tier === "pro") return "personal";
  return ACTIVE_TIERS.has(tier) ? tier : "free";
}

function clonePlan(plan) {
  return {
    tier: plan.tier,
    uploads: { ...plan.uploads },
    storage: { ...plan.storage },
  };
}

function clampBytes(value, absoluteMaxRequestBytes) {
  const absoluteMax = parsePositiveInteger(
    absoluteMaxRequestBytes,
    DEFAULT_DESIGN_ABSOLUTE_MAX_REQUEST_BYTES
  );
  return Math.min(parsePositiveInteger(value, absoluteMax), absoluteMax);
}

function applyTierEnvOverrides(plan, tier, env, absoluteMaxRequestBytes) {
  const prefix = TIER_ENV_PREFIX[tier];
  if (!prefix) return plan;

  return {
    ...plan,
    uploads: {
      ...plan.uploads,
      maxRequestBytes: clampBytes(
        env?.[`${prefix}_MAX_REQUEST_BYTES`] ?? plan.uploads.maxRequestBytes,
        absoluteMaxRequestBytes
      ),
      maxFilesPerRequest: parsePositiveInteger(
        env?.[`${prefix}_MAX_FILES_PER_REQUEST`],
        plan.uploads.maxFilesPerRequest
      ),
    },
    storage: {
      ...plan.storage,
      tenantMaxBytes: parsePositiveInteger(
        env?.[`${prefix}_TENANT_STORAGE_BYTES`],
        plan.storage.tenantMaxBytes
      ),
    },
  };
}

export function resolveDesignQuotaTier(zakiUser, { nowDate = new Date() } = {}) {
  const effective = getEffectiveEntitlementState(zakiUser, nowDate);
  return normalizeTier(effective?.tier);
}

export function resolveDesignQuotaPolicy(
  zakiUser,
  {
    env = process.env,
    nowDate = new Date(),
    absoluteMaxRequestBytes = DEFAULT_DESIGN_ABSOLUTE_MAX_REQUEST_BYTES,
  } = {}
) {
  const tier = resolveDesignQuotaTier(zakiUser, { nowDate });
  const entitlement = getEffectiveEntitlementState(zakiUser, nowDate);
  const basePlan = clonePlan(PLAN_DEFAULTS[tier] || PLAN_DEFAULTS.free);
  const policy = applyTierEnvOverrides(basePlan, tier, env, absoluteMaxRequestBytes);
  policy.uploads.maxRequestBytes = clampBytes(policy.uploads.maxRequestBytes, absoluteMaxRequestBytes);

  return {
    policyVersion: DESIGN_QUOTA_POLICY_VERSION,
    tier,
    source: entitlement.source,
    premium: Boolean(entitlement.premium),
    uploads: policy.uploads,
    storage: policy.storage,
    enforcement: {
      requestBytes: "enforced",
      storageBytes: "enforced",
    },
  };
}

export function estimateDesignIncomingBytes(req, body) {
  const contentLength = Number(req?.headers?.["content-length"] || req?.headers?.["Content-Length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > 0) return Math.floor(contentLength);
  if (!body || typeof body !== "object") return 0;
  return Buffer.byteLength(JSON.stringify(body), "utf8");
}

export function checkDesignContentLength({ incomingBytes = 0, policy } = {}) {
  const maxBytes = parsePositiveInteger(
    policy?.uploads?.maxRequestBytes,
    PLAN_DEFAULTS.free.uploads.maxRequestBytes
  );
  const incoming = Math.max(0, Number.isFinite(Number(incomingBytes)) ? Math.floor(Number(incomingBytes)) : 0);
  if (incoming > maxBytes) {
    return {
      allowed: false,
      reason: "design_request_too_large",
      incomingBytes: incoming,
      maxBytes,
    };
  }
  return {
    allowed: true,
    incomingBytes: incoming,
    maxBytes,
  };
}

export function checkDesignStorageQuota({ currentBytes = 0, incomingBytes = 0, policy } = {}) {
  const maxBytes = parsePositiveInteger(
    policy?.storage?.tenantMaxBytes,
    PLAN_DEFAULTS.free.storage.tenantMaxBytes
  );
  const current = Math.max(0, Number.isFinite(Number(currentBytes)) ? Math.floor(Number(currentBytes)) : 0);
  const incoming = Math.max(0, Number.isFinite(Number(incomingBytes)) ? Math.floor(Number(incomingBytes)) : 0);
  const projectedBytes = current + incoming;
  if (current >= maxBytes || projectedBytes > maxBytes) {
    return {
      allowed: false,
      reason: "design_storage_limit_reached",
      currentBytes: current,
      incomingBytes: incoming,
      projectedBytes,
      maxBytes,
    };
  }
  return {
    allowed: true,
    currentBytes: current,
    incomingBytes: incoming,
    projectedBytes,
    maxBytes,
  };
}

export function buildDesignRequestTooLargePayload(decision, requestId, policy) {
  return {
    code: decision?.reason || "design_request_too_large",
    error: "Design request is too large.",
    message: "Design request is too large for your current plan.",
    incomingBytes: decision?.incomingBytes || 0,
    maxBytes: decision?.maxBytes || policy?.uploads?.maxRequestBytes || null,
    policyTier: policy?.tier || null,
    requestId,
  };
}

export function buildDesignStorageLimitPayload(decision, requestId, policy) {
  return {
    code: decision?.reason || "design_storage_limit_reached",
    error: "Design storage limit reached.",
    message: "Design storage limit reached for your current plan.",
    currentBytes: decision?.currentBytes || 0,
    incomingBytes: decision?.incomingBytes || 0,
    projectedBytes: decision?.projectedBytes || 0,
    maxBytes: decision?.maxBytes || policy?.storage?.tenantMaxBytes || null,
    policyTier: policy?.tier || null,
    requestId,
  };
}
