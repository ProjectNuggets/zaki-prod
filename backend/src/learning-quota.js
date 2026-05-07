import { getEffectiveEntitlementState } from "./effective-entitlements.js";

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const LEARNING_QUOTA_POLICY_VERSION = "2026-05-07.v1";
export const DEFAULT_LEARNING_ABSOLUTE_MAX_REQUEST_BYTES = 100 * MB;

const ACTIVE_TIERS = new Set(["free", "student", "personal"]);

const PLAN_DEFAULTS = Object.freeze({
  free: Object.freeze({
    tier: "free",
    uploads: Object.freeze({
      maxRequestBytes: 25 * MB,
      maxFilesPerRequest: 20,
      imageUpload: true,
      folderUpload: true,
      archiveUpload: true,
      cloudFolderConnectors: false,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 250 * MB,
      artifactMaxBytes: 100 * MB,
    }),
    generation: Object.freeze({
      booksPerDay: 1,
      externalSearchesPerDay: 3,
      concurrentSessions: 1,
    }),
  }),
  student: Object.freeze({
    tier: "student",
    uploads: Object.freeze({
      maxRequestBytes: 100 * MB,
      maxFilesPerRequest: 100,
      imageUpload: true,
      folderUpload: true,
      archiveUpload: true,
      cloudFolderConnectors: false,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 2 * GB,
      artifactMaxBytes: 1 * GB,
    }),
    generation: Object.freeze({
      booksPerDay: 5,
      externalSearchesPerDay: 25,
      concurrentSessions: 3,
    }),
  }),
  personal: Object.freeze({
    tier: "personal",
    uploads: Object.freeze({
      maxRequestBytes: 100 * MB,
      maxFilesPerRequest: 250,
      imageUpload: true,
      folderUpload: true,
      archiveUpload: true,
      cloudFolderConnectors: false,
    }),
    storage: Object.freeze({
      tenantMaxBytes: 10 * GB,
      artifactMaxBytes: 5 * GB,
    }),
    generation: Object.freeze({
      booksPerDay: 20,
      externalSearchesPerDay: 100,
      concurrentSessions: 5,
    }),
  }),
});

const TIER_ENV_PREFIX = Object.freeze({
  free: "ZAKI_LEARNING_FREE",
  student: "ZAKI_LEARNING_STUDENT",
  personal: "ZAKI_LEARNING_PERSONAL",
});

function parsePositiveInteger(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

function parseBoolean(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
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
    generation: { ...plan.generation },
  };
}

function clampBytes(value, absoluteMaxRequestBytes) {
  const absoluteMax = parsePositiveInteger(
    absoluteMaxRequestBytes,
    DEFAULT_LEARNING_ABSOLUTE_MAX_REQUEST_BYTES
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
      cloudFolderConnectors: parseBoolean(
        env?.[`${prefix}_CLOUD_FOLDER_CONNECTORS`],
        plan.uploads.cloudFolderConnectors
      ),
    },
    storage: {
      ...plan.storage,
      tenantMaxBytes: parsePositiveInteger(
        env?.[`${prefix}_TENANT_STORAGE_BYTES`],
        plan.storage.tenantMaxBytes
      ),
      artifactMaxBytes: parsePositiveInteger(
        env?.[`${prefix}_ARTIFACT_STORAGE_BYTES`],
        plan.storage.artifactMaxBytes
      ),
    },
    generation: {
      ...plan.generation,
      booksPerDay: parsePositiveInteger(
        env?.[`${prefix}_BOOKS_PER_DAY`],
        plan.generation.booksPerDay
      ),
      externalSearchesPerDay: parsePositiveInteger(
        env?.[`${prefix}_EXTERNAL_SEARCHES_PER_DAY`],
        plan.generation.externalSearchesPerDay
      ),
      concurrentSessions: parsePositiveInteger(
        env?.[`${prefix}_CONCURRENT_SESSIONS`],
        plan.generation.concurrentSessions
      ),
    },
  };
}

export function resolveLearningQuotaTier(zakiUser, { nowDate = new Date() } = {}) {
  const effective = getEffectiveEntitlementState(zakiUser, nowDate);
  return normalizeTier(effective.tier);
}

export function resolveLearningQuotaPolicy(
  zakiUser,
  {
    env = process.env,
    nowDate = new Date(),
    absoluteMaxRequestBytes = DEFAULT_LEARNING_ABSOLUTE_MAX_REQUEST_BYTES,
  } = {}
) {
  const tier = resolveLearningQuotaTier(zakiUser, { nowDate });
  const entitlement = getEffectiveEntitlementState(zakiUser, nowDate);
  const basePlan = clonePlan(PLAN_DEFAULTS[tier] || PLAN_DEFAULTS.free);
  const policy = applyTierEnvOverrides(basePlan, tier, env, absoluteMaxRequestBytes);
  policy.uploads.maxRequestBytes = clampBytes(policy.uploads.maxRequestBytes, absoluteMaxRequestBytes);

  return {
    policyVersion: LEARNING_QUOTA_POLICY_VERSION,
    tier,
    source: entitlement.source,
    premium: Boolean(entitlement.premium),
    uploads: policy.uploads,
    storage: policy.storage,
    generation: policy.generation,
    enforcement: {
      promptRequests: "enforced",
      requestBytes: "enforced",
      storageBytes: "planned",
      artifactBytes: "planned",
      booksPerDay: "planned",
      externalSearchesPerDay: "planned",
      concurrentSessions: "planned",
    },
  };
}

export function buildLearningQuotaStatus({
  zakiUser,
  promptQuota = null,
  env = process.env,
  nowDate = new Date(),
  absoluteMaxRequestBytes = DEFAULT_LEARNING_ABSOLUTE_MAX_REQUEST_BYTES,
} = {}) {
  const policy = resolveLearningQuotaPolicy(zakiUser, {
    env,
    nowDate,
    absoluteMaxRequestBytes,
  });

  return {
    policy,
    dailyPrompts: promptQuota
      ? {
          surface: promptQuota.surface,
          bucket: promptQuota.bucket,
          limit: promptQuota.limit,
          used: promptQuota.used,
          remaining: promptQuota.remaining,
          resetAt: promptQuota.resetAt,
          unlimited: Boolean(promptQuota.unlimited),
        }
      : null,
  };
}

export function checkLearningQuotaContentLength(headers = {}, policy) {
  const raw = headers["content-length"] ?? headers["Content-Length"];
  const maxBytes = parsePositiveInteger(
    policy?.uploads?.maxRequestBytes,
    DEFAULT_LEARNING_ABSOLUTE_MAX_REQUEST_BYTES
  );
  if (raw === undefined || raw === null || raw === "") {
    return { allowed: true, contentLength: null, maxBytes };
  }
  const contentLength = Number(raw);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return { allowed: false, contentLength: null, maxBytes, reason: "invalid_content_length" };
  }
  if (contentLength > maxBytes) {
    return { allowed: false, contentLength, maxBytes, reason: "request_too_large" };
  }
  return { allowed: true, contentLength, maxBytes };
}

export function buildLearningRequestTooLargePayload(decision, requestId, policy = null) {
  return {
    code: decision?.reason || "request_too_large",
    error:
      decision?.reason === "invalid_content_length"
        ? "Invalid learning request size."
        : "Learning request is too large.",
    maxBytes: decision?.maxBytes || policy?.uploads?.maxRequestBytes || null,
    contentLength: decision?.contentLength ?? null,
    policyTier: policy?.tier || null,
    requestId,
  };
}
