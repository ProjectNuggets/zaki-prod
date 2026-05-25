import crypto from "node:crypto";
import {
  PLATFORM_METER_CAPABILITIES,
  PLATFORM_POLICY_VERSION,
  PRODUCT_OPERATIONAL_STATES,
  PRODUCT_REGISTRY_VERSION,
  ZAKI_PRODUCT_IDS,
} from "./platform-policy.js";

export const CENTRAL_METER_CONTRACT_VERSION = "2026-05-22.central-meter.v1";

const DEFAULT_GRANT_TTL_SECONDS = 5 * 60;
const MAX_GRANT_TTL_SECONDS = 60 * 60;
const RAW_FACT_KEYS = Object.freeze([
  "inputTokens",
  "outputTokens",
  "toolCalls",
  "externalApiCalls",
  "durationMs",
  "storageBytes",
  "jobRuntimeMs",
]);

const PRODUCT_ALIASES = Object.freeze({
  spaces: { productId: "spaces", internalProductId: ZAKI_PRODUCT_IDS.SPACES },
  chat: { productId: "spaces", internalProductId: ZAKI_PRODUCT_IDS.SPACES },
  agent: { productId: "agent", internalProductId: ZAKI_PRODUCT_IDS.AGENT },
  learning: { productId: "learning", internalProductId: ZAKI_PRODUCT_IDS.LEARN },
  learn: { productId: "learning", internalProductId: ZAKI_PRODUCT_IDS.LEARN },
  hire: { productId: "hire", internalProductId: ZAKI_PRODUCT_IDS.HIRE },
  design: { productId: "design", internalProductId: ZAKI_PRODUCT_IDS.DESIGN },
  brain: { productId: "brain", internalProductId: ZAKI_PRODUCT_IDS.BRAIN },
});

function toIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeMeterAction(value) {
  return normalizeKey(value).slice(0, 120) || "request";
}

function roundUnits(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 10_000) / 10_000;
}

function normalizePositiveUnits(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return roundUnits(parsed);
}

function normalizeNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function resolveMeterProduct(value) {
  return PRODUCT_ALIASES[normalizeKey(value)] || null;
}

export function getProductGrantPolicy(productState, action = "") {
  const state = String(productState || PRODUCT_OPERATIONAL_STATES.HIDDEN).trim();
  if (state === PRODUCT_OPERATIONAL_STATES.ENABLED || state === PRODUCT_OPERATIONAL_STATES.DEGRADED) {
    return { allowed: true, reason: null, status: 200 };
  }
  if (state === PRODUCT_OPERATIONAL_STATES.READ_ONLY) {
    const normalizedAction = normalizeMeterAction(action);
    const readOnlyAllowed =
      normalizedAction === "status" ||
      normalizedAction === "health" ||
      normalizedAction.startsWith("read_") ||
      normalizedAction.startsWith("list_") ||
      normalizedAction.startsWith("search_");
    return readOnlyAllowed
      ? { allowed: true, reason: null, status: 200 }
      : { allowed: false, reason: "product_read_only", status: 403 };
  }
  if (state === PRODUCT_OPERATIONAL_STATES.MAINTENANCE) {
    return { allowed: false, reason: "product_maintenance", status: 503 };
  }
  if (state === PRODUCT_OPERATIONAL_STATES.HIDDEN) {
    return { allowed: false, reason: "product_hidden", status: 404 };
  }
  return { allowed: false, reason: "product_disabled", status: 403 };
}

export function resolveMeterCapabilityForAction(action = "") {
  const normalized = normalizeMeterAction(action);
  if (normalized.includes("research") || normalized.includes("deep")) {
    return PLATFORM_METER_CAPABILITIES.DEEP_RESEARCH;
  }
  if (normalized.includes("image")) return PLATFORM_METER_CAPABILITIES.IMAGE_GENERATION;
  if (normalized.includes("file") || normalized.includes("upload")) {
    return PLATFORM_METER_CAPABILITIES.FILE_UPLOAD;
  }
  if (normalized.includes("ingest") || normalized.includes("storage")) {
    return PLATFORM_METER_CAPABILITIES.FILE_INGEST_MB;
  }
  if (normalized.includes("tool") || normalized.includes("search") || normalized.includes("query")) {
    return PLATFORM_METER_CAPABILITIES.TOOL_CALL;
  }
  if (normalized.includes("voice")) return PLATFORM_METER_CAPABILITIES.VOICE_TURN;
  if (normalized.includes("memory_write")) return PLATFORM_METER_CAPABILITIES.MEMORY_WRITE;
  if (normalized.includes("memory") || normalized.includes("read")) {
    return PLATFORM_METER_CAPABILITIES.MEMORY_READ;
  }
  return PLATFORM_METER_CAPABILITIES.TEXT_PROMPT;
}

export function calculatePlatformWeightedUnits({
  internalProductId,
  capability = PLATFORM_METER_CAPABILITIES.TEXT_PROMPT,
  rawUnits = 1,
  policy,
} = {}) {
  const productWeight = normalizePositiveUnits(
    policy?.products?.[internalProductId]?.weight,
    1
  );
  const capabilityWeight = normalizePositiveUnits(
    policy?.capabilities?.[capability]?.weight,
    1
  );
  const raw = normalizePositiveUnits(rawUnits, 1);
  return {
    internalProductId,
    capability,
    rawUnits: raw,
    productWeight,
    capabilityWeight,
    weightedUnits: roundUnits(raw * productWeight * capabilityWeight),
  };
}

export function normalizeMeterUsageFacts(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const facts = {};
  for (const key of RAW_FACT_KEYS) facts[key] = normalizeNonNegativeNumber(source[key]);
  if (typeof source.model === "string") facts.model = source.model.trim().slice(0, 120);
  return facts;
}

export function calculateRawUnitsFromUsageFacts(facts = {}, { status = "success" } = {}) {
  const normalizedStatus = normalizeKey(status) || "success";
  const usage = normalizeMeterUsageFacts(facts);
  const tokenUnits = (usage.inputTokens + usage.outputTokens) / 1000;
  const toolUnits = usage.toolCalls * 0.25;
  const externalApiUnits = usage.externalApiCalls * 0.5;
  const runtimeMs = Math.max(usage.durationMs, usage.jobRuntimeMs);
  const runtimeUnits = runtimeMs / 60_000;
  const storageUnits = (usage.storageBytes / (1024 * 1024)) * 0.1;
  const computed = tokenUnits + toolUnits + externalApiUnits + runtimeUnits + storageUnits;
  if (computed > 0) return roundUnits(computed);
  return normalizedStatus === "success" ? 1 : 0;
}

function base64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signGrantPayload(encodedPayload, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(encodedPayload).digest("base64url");
}

export function signMeterGrant(payload, secret) {
  if (!secret) throw new Error("signMeterGrant requires a signing secret");
  const encodedPayload = base64UrlJson(payload);
  return `${encodedPayload}.${signGrantPayload(encodedPayload, secret)}`;
}

export function verifyMeterGrantSignature(signedGrant, secret, { nowDate = new Date() } = {}) {
  const [encodedPayload, signature] = String(signedGrant || "").split(".");
  if (!encodedPayload || !signature || !secret) return { valid: false, reason: "malformed" };
  const expected = signGrantPayload(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { valid: false, reason: "bad_signature" };
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "bad_payload" };
  }
  const expiresAt = new Date(payload?.expiresAt || 0).getTime();
  const nowMs = (nowDate instanceof Date ? nowDate : new Date(nowDate)).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
    return { valid: false, reason: "expired", payload };
  }
  return { valid: true, reason: null, payload };
}

export function isMeterGrantExpired(grant, { nowDate = new Date() } = {}) {
  const expiresAt = new Date(grant?.expiresAt || 0).getTime();
  const nowMs = (nowDate instanceof Date ? nowDate : new Date(nowDate)).getTime();
  return !Number.isFinite(expiresAt) || !Number.isFinite(nowMs) || expiresAt <= nowMs;
}

export function buildExpiredMeterGrantResponse(grant, meter = null) {
  return {
    allowed: false,
    status: 409,
    error: "meter_grant_expired",
    message: "The meter grant for this idempotency key has expired. Retry with a new idempotency key.",
    product: grant?.productId || null,
    productState: grant?.productState || null,
    meter,
  };
}

function buildProductWindowSnapshot(windowSnapshot = {}, productWindow = {}) {
  return {
    period: windowSnapshot?.period || null,
    resetPolicy: windowSnapshot?.resetPolicy || null,
    rollover:
      typeof windowSnapshot?.rollover === "boolean" ? windowSnapshot.rollover : null,
    anchorType: windowSnapshot?.anchorType || null,
    anchorAt: windowSnapshot?.anchorAt || null,
    entitlementStartedAt: windowSnapshot?.entitlementStartedAt || null,
    planMeterGroup: windowSnapshot?.planMeterGroup || null,
    pendingFirstUse: Boolean(windowSnapshot?.pendingFirstUse),
    unusedUnitsExpireAt: windowSnapshot?.unusedUnitsExpireAt || null,
    windowHours: windowSnapshot?.windowHours,
    used: productWindow?.used ?? 0,
    receipts: productWindow?.receipts ?? 0,
    limit: null,
    remaining: null,
    startedAt: windowSnapshot?.startedAt || null,
    resetAt: windowSnapshot?.resetAt || null,
  };
}

export function buildMeterStatusPayload({
  identity,
  platform,
  meterSnapshot,
  productRegistry,
  nowDate = new Date(),
} = {}) {
  const products = Array.isArray(productRegistry?.products) ? productRegistry.products : [];
  const productUsage = meterSnapshot?.products || {};
  return {
    success: true,
    contractVersion: CENTRAL_METER_CONTRACT_VERSION,
    productRegistryVersion: productRegistry?.contractVersion || PRODUCT_REGISTRY_VERSION,
    platformPolicyVersion: platform?.policyVersion || PLATFORM_POLICY_VERSION,
    generatedAt: toIso(nowDate),
    identity: {
      type: identity?.type || "anonymous",
      tenantId: identity?.tenantId || "default",
      userId: identity?.type === "user" ? identity.userId || null : null,
      anonymousSessionId: identity?.type === "anonymous" ? identity.anonymousSessionId || null : null,
    },
    plan: {
      tier: platform?.plan?.id || "free",
      label: platform?.plan?.label || "Free",
      source: platform?.plan?.source || "meter",
    },
    rolling: meterSnapshot?.rolling || null,
    weekly: meterSnapshot?.weekly || null,
    products: Object.fromEntries(
      products.map((product) => [
        product.productId,
        {
          id: product.productId,
          state: product.state,
          lifecycle: product.lifecycle,
          route: product.route || null,
          quotaPolicyId: product.quotaPolicyId || null,
          grantPolicy: getProductGrantPolicy(product.state),
          rolling: buildProductWindowSnapshot(
            meterSnapshot?.rolling,
            productUsage?.[product.productId]?.rolling
          ),
          weekly: buildProductWindowSnapshot(
            meterSnapshot?.weekly,
            productUsage?.[product.productId]?.weekly
          ),
        },
      ])
    ),
  };
}

export function buildMeterGrantDecision({
  tenantId = "default",
  identity,
  product,
  productState,
  action,
  estimatedUnits = 1,
  requestId = null,
  idempotencyKey = null,
  metadata = {},
  platform,
  meterSnapshot,
  policy,
  signingSecret,
  grantId = crypto.randomUUID(),
  nowDate = new Date(),
  ttlSeconds = DEFAULT_GRANT_TTL_SECONDS,
} = {}) {
  const resolvedProduct = resolveMeterProduct(product);
  if (!resolvedProduct) return { allowed: false, status: 400, reason: "invalid_product" };
  const normalizedAction = normalizeMeterAction(action);
  const grantPolicy = getProductGrantPolicy(productState, normalizedAction);
  if (!grantPolicy.allowed) {
    return {
      allowed: false,
      status: grantPolicy.status,
      reason: grantPolicy.reason,
      productId: resolvedProduct.productId,
      internalProductId: resolvedProduct.internalProductId,
      productState,
    };
  }
  const capability = resolveMeterCapabilityForAction(normalizedAction);
  const usage = calculatePlatformWeightedUnits({
    internalProductId: resolvedProduct.internalProductId,
    capability,
    rawUnits: estimatedUnits,
    policy,
  });
  const remainingCandidates = [
    meterSnapshot?.rolling?.remaining,
    meterSnapshot?.weekly?.remaining,
  ].filter((value) => typeof value === "number");
  const effectiveRemaining = remainingCandidates.length ? Math.min(...remainingCandidates) : null;
  if (typeof effectiveRemaining === "number" && usage.weightedUnits > effectiveRemaining) {
    return {
      allowed: false,
      status: 429,
      reason: "meter_allowance_exhausted",
      productId: resolvedProduct.productId,
      internalProductId: resolvedProduct.internalProductId,
      productState,
      estimatedWeightedUnits: usage.weightedUnits,
      remaining: effectiveRemaining,
    };
  }
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const safeTtl = Math.max(30, Math.min(MAX_GRANT_TTL_SECONDS, Math.floor(Number(ttlSeconds || DEFAULT_GRANT_TTL_SECONDS))));
  const expiresAt = new Date(now.getTime() + safeTtl * 1000);
  const planTier = platform?.plan?.id || "free";
  const grantPayload = {
    contractVersion: CENTRAL_METER_CONTRACT_VERSION,
    grantId,
    tenantId: String(tenantId || "default").trim() || "default",
    subject: {
      type: identity?.type || "anonymous",
      userId: identity?.type === "user" ? String(identity.userId || "") : null,
      anonymousKeyHash: identity?.type === "anonymous" ? String(identity.anonymousKeyHash || "") : null,
    },
    product: resolvedProduct.productId,
    internalProductId: resolvedProduct.internalProductId,
    action: normalizedAction,
    capability,
    maxUnits: usage.weightedUnits,
    estimatedRawUnits: usage.rawUnits,
    planTier,
    productState,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    requestId: requestId || null,
  };
  return {
    allowed: true,
    status: 200,
    reason: null,
    grantId,
    signedGrant: signMeterGrant(grantPayload, signingSecret),
    expiresAt: expiresAt.toISOString(),
    maxUnits: usage.weightedUnits,
    estimatedRawUnits: usage.rawUnits,
    planTier,
    productId: resolvedProduct.productId,
    internalProductId: resolvedProduct.internalProductId,
    productState,
    action: normalizedAction,
    capability,
    requestId: requestId || null,
    idempotencyKey: idempotencyKey || null,
    metadata: normalizeMetadata(metadata),
    grantPayload,
  };
}

export function buildMeterReceiptDebit({
  product,
  action,
  status = "success",
  usageFacts = {},
  maxUnits = null,
  policy,
} = {}) {
  const resolvedProduct = resolveMeterProduct(product);
  if (!resolvedProduct) return { valid: false, reason: "invalid_product" };
  const normalizedAction = normalizeMeterAction(action);
  const normalizedStatus = normalizeKey(status) || "success";
  if (!["success", "failed", "cancelled"].includes(normalizedStatus)) {
    return { valid: false, reason: "invalid_status" };
  }
  const facts = normalizeMeterUsageFacts(usageFacts);
  const rawUnits = calculateRawUnitsFromUsageFacts(facts, { status: normalizedStatus });
  const capability = resolveMeterCapabilityForAction(normalizedAction);
  const usage =
    rawUnits > 0
      ? calculatePlatformWeightedUnits({
          internalProductId: resolvedProduct.internalProductId,
          capability,
          rawUnits,
          policy,
        })
      : {
          internalProductId: resolvedProduct.internalProductId,
          capability,
          rawUnits: 0,
          productWeight: policy?.products?.[resolvedProduct.internalProductId]?.weight ?? 1,
          capabilityWeight: policy?.capabilities?.[capability]?.weight ?? 1,
          weightedUnits: 0,
        };
  const numericMaxUnits = typeof maxUnits === "number" ? maxUnits : Number(maxUnits);
  const boundedMaxUnits = Number.isFinite(numericMaxUnits) ? numericMaxUnits : null;
  return {
    valid: true,
    reason: null,
    productId: resolvedProduct.productId,
    internalProductId: resolvedProduct.internalProductId,
    action: normalizedAction,
    status: normalizedStatus,
    facts,
    capability,
    rawUnits: usage.rawUnits,
    productWeight: usage.productWeight,
    capabilityWeight: usage.capabilityWeight,
    weightedUnits: usage.weightedUnits,
    maxUnits: boundedMaxUnits,
    maxExceeded: typeof boundedMaxUnits === "number" && usage.weightedUnits > boundedMaxUnits,
  };
}
