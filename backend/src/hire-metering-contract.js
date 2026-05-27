import crypto from "node:crypto";

import { HIRE_SURFACE } from "./daily-quota.js";
import { classifyHireIngressUsageEvent } from "./hire-bff-contract.js";
import { ZAKI_PRODUCT_IDS } from "./platform-policy.js";
import {
  USAGE_EVENTS_SCHEMA_VERSION,
  recordUsageEvent,
} from "./usage-events.js";

export const HIRE_METERING_CONTRACT_VERSION = "2026-05-22.central-meter.v1";
export const HIRE_METERING_ADAPTER_VERSION = "2026-05-22.hire-metering.v1";
export const DEFAULT_HIRE_METER_GRANT_TTL_MS = 2 * 60 * 1000;

export const HIRE_METER_ACTIONS = Object.freeze({
  PROFILE_PARSE: "hire.profile.parse",
  JOB_SEARCH: "hire.job.search",
  MATCH_SCORE: "hire.match.score",
  RESUME_TAILOR: "hire.resume.tailor",
  COVER_LETTER_GENERATE: "hire.cover_letter.generate",
  OUTREACH_DRAFT: "hire.outreach.draft",
  OUTREACH_SEND: "hire.outreach.send",
  AGENT_RUN: "hire.agent.run",
});

const SOURCE_TO_METER_ACTION = Object.freeze({
  help_chat: HIRE_METER_ACTIONS.AGENT_RUN,
  manual_lead: HIRE_METER_ACTIONS.JOB_SEARCH,
  manual_lead_generation: HIRE_METER_ACTIONS.RESUME_TAILOR,
  generated_package: HIRE_METER_ACTIONS.RESUME_TAILOR,
  generated_package_task: HIRE_METER_ACTIONS.RESUME_TAILOR,
  pipeline_run: HIRE_METER_ACTIONS.AGENT_RUN,
  form_read: HIRE_METER_ACTIONS.JOB_SEARCH,
  apply_preview: HIRE_METER_ACTIONS.OUTREACH_DRAFT,
  resume_ingest: HIRE_METER_ACTIONS.PROFILE_PARSE,
  linkedin_ingest: HIRE_METER_ACTIONS.PROFILE_PARSE,
  github_ingest: HIRE_METER_ACTIONS.PROFILE_PARSE,
  portfolio_ingest: HIRE_METER_ACTIONS.PROFILE_PARSE,
  source_scan: HIRE_METER_ACTIONS.JOB_SEARCH,
  lead_reevaluation: HIRE_METER_ACTIONS.MATCH_SCORE,
  free_source_scan: HIRE_METER_ACTIONS.JOB_SEARCH,
  auto_apply: HIRE_METER_ACTIONS.OUTREACH_SEND,
  automation_selectors_refresh: HIRE_METER_ACTIONS.AGENT_RUN,
});

const METER_HEADER_PREFIX = "X-Zaki-Meter";

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeIdentifier(value, fallback = null) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!/^[a-z0-9][a-z0-9._:-]{0,119}$/.test(text)) return fallback;
  return text;
}

function normalizeNumber(value) {
  if (value === null || typeof value === "undefined" || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function resolvePlanId(zakiUser = {}) {
  return normalizeIdentifier(
    zakiUser.commercialPlanId ||
      zakiUser.commercial_plan_id ||
      zakiUser.plan_tier ||
      "free",
    "free"
  );
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function signingKeyOrThrow(signingKey) {
  const key = String(signingKey || "").trim();
  if (key.length < 32) {
    throw new Error("hire_meter_signing_key_required");
  }
  return key;
}

function signEncodedPayload(encodedPayload, signingKey) {
  return crypto
    .createHmac("sha256", signingKey)
    .update(String(encodedPayload || ""))
    .digest("base64url");
}

function signLegacyStablePayload(payload, signingKey) {
  return crypto
    .createHmac("sha256", signingKey)
    .update(stableJson(payload))
    .digest("base64url");
}

function encodePayload(payload) {
  return Buffer.from(stableJson(payload), "utf8").toString("base64url");
}

function decodePayload(encoded) {
  return JSON.parse(Buffer.from(String(encoded || ""), "base64url").toString("utf8"));
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function uuidFromHexDigest(hex) {
  const bytes = Buffer.from(String(hex || "").slice(0, 32).padEnd(32, "0"), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function grantIdForPayload(payload, signingKey) {
  const digest = crypto
    .createHmac("sha256", signingKey)
    .update(stableJson({
      action: payload.action,
      requestId: payload.requestId,
      userId: payload.userId,
      issuedAt: payload.issuedAt,
    }))
    .digest("hex");
  return uuidFromHexDigest(digest);
}

function quotaSnapshot(quota = {}) {
  return {
    surface: quota.surface || HIRE_SURFACE,
    bucket: quota.bucket || null,
    period: quota.period || null,
    limit: quota.limit ?? null,
    used: quota.used ?? null,
    remaining: quota.remaining ?? null,
    unlimited: Boolean(quota.unlimited),
    resetAt: quota.resetAt || null,
  };
}

function grantMaxUnits(quota = {}) {
  if (quota.unlimited) return null;
  return 1;
}

export function classifyHireMeterAction(req = {}) {
  const usage = classifyHireIngressUsageEvent(req);
  if (!usage) return null;
  const action = SOURCE_TO_METER_ACTION[usage.action] || HIRE_METER_ACTIONS.AGENT_RUN;
  return {
    ...usage,
    sourceAction: usage.action,
    action,
    eventType: action,
  };
}

export function buildSignedHireMeterGrant({
  payload,
  signingKey,
} = {}) {
  const key = signingKeyOrThrow(signingKey);
  const body = payload && typeof payload === "object" ? payload : {};
  const encoded = encodePayload(body);
  const signature = signEncodedPayload(encoded, key);
  return `${encoded}.${signature}`;
}

export function verifySignedHireMeterGrant(signedGrant, {
  signingKey,
  nowDate = new Date(),
  allowExpired = false,
} = {}) {
  const key = signingKeyOrThrow(signingKey);
  const parts = String(signedGrant || "").split(".");
  if (parts.length !== 2) {
    throw new Error("hire_meter_grant_invalid");
  }
  const [encoded, signature] = parts;
  if (!encoded || !signature) {
    throw new Error("hire_meter_grant_invalid");
  }
  const payload = decodePayload(encoded);
  const expected = signEncodedPayload(encoded, key);
  const legacyExpected = signLegacyStablePayload(payload, key);
  if (
    !timingSafeEqualText(signature, expected) &&
    !timingSafeEqualText(signature, legacyExpected)
  ) {
    throw new Error("hire_meter_grant_invalid_signature");
  }
  if (!allowExpired) {
    const expiresAt = new Date(payload.expiresAt || 0).getTime();
    const nowMs = (nowDate instanceof Date ? nowDate : new Date(nowDate)).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
      throw new Error("hire_meter_grant_expired");
    }
  }
  return payload;
}

export function buildHireMeterGrant({
  req,
  quotaDecision,
  signingKey,
  productState = "enabled",
  nowDate = new Date(),
  ttlMs = DEFAULT_HIRE_METER_GRANT_TTL_MS,
} = {}) {
  const metered = classifyHireMeterAction(req || {});
  if (!metered) return null;
  const key = signingKeyOrThrow(signingKey);
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const expiresAt = new Date(now.getTime() + Math.max(1_000, Number(ttlMs) || DEFAULT_HIRE_METER_GRANT_TTL_MS));
  const quota = quotaDecision?.quota || {};
  const zakiUser = req?.hireAuthResult?.zakiUser || {};
  const userId = normalizeText(req?.hireUserId || zakiUser.id);
  const requestId = normalizeText(req?.requestId || req?.headers?.["x-request-id"]);
  if (!userId) {
    throw new Error("hire_meter_user_required");
  }
  if (!requestId) {
    throw new Error("hire_meter_request_id_required");
  }
  const basePayload = {
    contractVersion: HIRE_METERING_CONTRACT_VERSION,
    adapterVersion: HIRE_METERING_ADAPTER_VERSION,
    version: HIRE_METERING_CONTRACT_VERSION,
    product: ZAKI_PRODUCT_IDS.HIRE,
    internalProductId: ZAKI_PRODUCT_IDS.HIRE,
    surface: HIRE_SURFACE,
    action: metered.action,
    capability: "text_prompt",
    sourceAction: metered.sourceAction,
    routeTemplate: metered.routeTemplate,
    method: metered.method,
    subject: {
      type: "user",
      userId,
      anonymousKeyHash: null,
    },
    userId,
    tenantId: userId,
    anonymousSessionId: null,
    planId: resolvePlanId(zakiUser),
    planTier: resolvePlanId(zakiUser),
    entitlement: quota?.unlimited ? "unlimited" : "metered",
    productState,
    maxUnits: grantMaxUnits(quota),
    estimatedRawUnits: 1,
    quota: quotaSnapshot(quota),
    requestId,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const payload = {
    ...basePayload,
    grantId: grantIdForPayload(basePayload, key),
  };
  const signedGrant = buildSignedHireMeterGrant({ payload, signingKey: key });
  return {
    ...payload,
    signedGrant,
  };
}

export function buildHireMeterForwardHeaders(grant) {
  if (!grant?.signedGrant) return {};
  return {
    [`${METER_HEADER_PREFIX}-Contract`]: HIRE_METERING_CONTRACT_VERSION,
    [`${METER_HEADER_PREFIX}-Grant-Id`]: String(grant.grantId || ""),
    [`${METER_HEADER_PREFIX}-Grant`]: String(grant.signedGrant || ""),
    [`${METER_HEADER_PREFIX}-Action`]: String(grant.action || ""),
    [`${METER_HEADER_PREFIX}-Product`]: ZAKI_PRODUCT_IDS.HIRE,
    "X-Zaki-Product-Id": ZAKI_PRODUCT_IDS.HIRE,
  };
}

function normalizeUsageFacts(payload = {}, upstreamHeaders = null) {
  const usage = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload.usage || payload.usageFacts || payload.metering || {}
    : {};
  const headers = upstreamHeaders && typeof upstreamHeaders.get === "function" ? upstreamHeaders : null;
  return {
    inputTokens: normalizeNumber(usage.input_tokens ?? usage.inputTokens ?? headers?.get("x-zaki-usage-input-tokens")),
    outputTokens: normalizeNumber(usage.output_tokens ?? usage.outputTokens ?? headers?.get("x-zaki-usage-output-tokens")),
    totalTokens: normalizeNumber(usage.total_tokens ?? usage.totalTokens ?? headers?.get("x-zaki-usage-total-tokens")),
    toolCalls: normalizeNumber(usage.tool_calls ?? usage.toolCalls ?? headers?.get("x-zaki-usage-tool-calls")),
    externalApiCalls: normalizeNumber(usage.external_api_calls ?? usage.externalApiCalls ?? headers?.get("x-zaki-usage-external-api-calls")),
    durationMs: normalizeNumber(usage.duration_ms ?? usage.durationMs ?? headers?.get("x-zaki-usage-duration-ms")),
    jobRuntimeMs: normalizeNumber(usage.job_runtime_ms ?? usage.jobRuntimeMs ?? headers?.get("x-zaki-usage-job-runtime-ms")),
    storageBytes: normalizeNumber(usage.storage_bytes ?? usage.storageBytes ?? headers?.get("x-zaki-usage-storage-bytes")),
    model: normalizeText(usage.model ?? headers?.get("x-zaki-usage-model"), null),
    provider: normalizeText(usage.provider ?? headers?.get("x-zaki-usage-provider"), null),
  };
}

export function buildHireMeterReceiptEvent({
  req,
  grant,
  quotaDecision,
  upstreamStatus,
  finalStatus,
  responsePayload,
  upstreamHeaders,
  durationMs,
  createdAt = new Date(),
} = {}) {
  if (!grant?.grantId || !grant?.action) return null;
  const zakiUser = req?.hireAuthResult?.zakiUser || {};
  const quota = quotaDecision?.quota || grant.quota || {};
  const status = Number(upstreamStatus);
  const visibleStatus = Number(finalStatus ?? upstreamStatus);
  const receiptStatus = Number.isInteger(visibleStatus) && visibleStatus >= 200 && visibleStatus < 400
    ? "success"
    : "failed";
  const idempotencyKey = `${grant.grantId}:receipt`;
  const rawUsageFacts = {
    ...normalizeUsageFacts(responsePayload, upstreamHeaders),
    status: receiptStatus,
  };
  return {
    userId: zakiUser.id || grant.userId,
    productId: ZAKI_PRODUCT_IDS.HIRE,
    surface: HIRE_SURFACE,
    eventType: `hire.receipt.${String(grant.action).replace(/^hire\./, "")}`,
    usageUnitType: "meter_unit",
    usageUnits: 1,
    planId: grant.planId || resolvePlanId(zakiUser),
    entitlement: grant.entitlement || (quota?.unlimited ? "unlimited" : "metered"),
    quotaBucket: quota?.bucket || null,
    quotaPeriod: quota?.period || null,
    quotaLimit: normalizeNumber(quota?.limit),
    quotaUsed: normalizeNumber(quota?.used),
    quotaRemaining: normalizeNumber(quota?.remaining),
    requestId: grant.requestId || req?.requestId || null,
    sourceRoute: grant.routeTemplate || null,
    createdAt: (createdAt instanceof Date ? createdAt : new Date(createdAt)).toISOString(),
    metadata: {
      schemaVersion: USAGE_EVENTS_SCHEMA_VERSION,
      contractVersion: HIRE_METERING_CONTRACT_VERSION,
      grantId: grant.grantId,
      idempotencyKey,
      product: ZAKI_PRODUCT_IDS.HIRE,
      action: grant.action,
      sourceAction: grant.sourceAction || null,
      routeTemplate: grant.routeTemplate || null,
      status: receiptStatus,
      upstreamStatus: Number.isInteger(status) ? status : null,
      finalStatus: Number.isInteger(visibleStatus) ? visibleStatus : null,
      durationMs: normalizeNumber(durationMs),
      rawUsageFacts,
    },
  };
}

export async function recordHireMeterReceipt({
  req,
  grant,
  quotaDecision,
  upstreamStatus,
  finalStatus,
  responsePayload,
  upstreamHeaders,
  durationMs,
  dbQuery,
  logStructured,
} = {}) {
  const event = buildHireMeterReceiptEvent({
    req,
    grant,
    quotaDecision,
    upstreamStatus,
    finalStatus,
    responsePayload,
    upstreamHeaders,
    durationMs,
  });
  if (!event) {
    return { recorded: false, reason: "hire_meter_receipt_not_applicable" };
  }
  return recordUsageEvent({
    dbQuery,
    logStructured,
    event,
  });
}

export function buildHireMeterUnavailablePayload(requestId) {
  return {
    code: "hire_meter_unavailable",
    error: "Hire meter is unavailable.",
    message: "Hire is temporarily unable to reserve usage safely.",
    retryable: true,
    requestId: normalizeText(requestId),
  };
}
