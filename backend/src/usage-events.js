export const USAGE_EVENTS_SCHEMA_VERSION = "2026-05-20.usage-events.v1";

const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,119}$/;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ARRAY_ITEMS = 20;
const MAX_METADATA_OBJECT_KEYS = 40;
const MAX_METADATA_STRING_LENGTH = 500;

function normalizePositiveIntegerString(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || /^0+$/.test(text)) return null;
  return text;
}

function normalizeIdentifier(value, fallback = null) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!text || !IDENTIFIER_PATTERN.test(text)) return fallback;
  return text;
}

function normalizeText(value, maxLength = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function normalizeSourceRoute(value) {
  const text = normalizeText(value, 240);
  if (!text) return null;
  return text.split("?")[0].split("#")[0] || null;
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function normalizeUsageUnits(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(1_000_000, parsed);
}

function sanitizeMetadataKey(key) {
  const text = String(key ?? "").trim().replace(/[^A-Za-z0-9_.:-]/g, "_");
  return text.slice(0, 80);
}

export function sanitizeUsageEventMetadata(value, depth = 0) {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "string") return value.slice(0, MAX_METADATA_STRING_LENGTH);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (depth >= MAX_METADATA_DEPTH) return null;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((item) => sanitizeUsageEventMetadata(item, depth + 1))
      .filter((item) => item !== null);
  }
  if (typeof value !== "object") return null;

  const output = {};
  for (const [rawKey, nested] of Object.entries(value).slice(0, MAX_METADATA_OBJECT_KEYS)) {
    const key = sanitizeMetadataKey(rawKey);
    if (!key) continue;
    const sanitized = sanitizeUsageEventMetadata(nested, depth + 1);
    if (sanitized !== null) output[key] = sanitized;
  }
  return output;
}

export function normalizeUsageEventInput(input = {}) {
  const userId = normalizePositiveIntegerString(input.userId ?? input.zakiUser?.id);
  if (!userId) {
    throw new Error("usage_event_user_required");
  }

  const productId = normalizeIdentifier(input.productId, null);
  const surface = normalizeIdentifier(input.surface, null);
  const eventType = normalizeIdentifier(input.eventType, null);
  if (!productId || !surface || !eventType) {
    throw new Error("usage_event_identity_required");
  }

  const createdAt = input.createdAt instanceof Date
    ? input.createdAt.toISOString()
    : normalizeText(input.createdAt, 120);

  return {
    userId,
    productId,
    surface,
    eventType,
    usageUnitType: normalizeIdentifier(input.usageUnitType, "request"),
    usageUnits: normalizeUsageUnits(input.usageUnits),
    planId: normalizeIdentifier(input.planId, null),
    entitlement: normalizeIdentifier(input.entitlement, null),
    quotaBucket: normalizeIdentifier(input.quotaBucket, null),
    quotaPeriod: normalizeIdentifier(input.quotaPeriod, null),
    quotaLimit: normalizeNonNegativeInteger(input.quotaLimit),
    quotaUsed: normalizeNonNegativeInteger(input.quotaUsed),
    quotaRemaining: normalizeNonNegativeInteger(input.quotaRemaining),
    requestId: normalizeText(input.requestId, 120),
    sourceRoute: normalizeSourceRoute(input.sourceRoute),
    metadata: sanitizeUsageEventMetadata({
      schemaVersion: USAGE_EVENTS_SCHEMA_VERSION,
      ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
        ? input.metadata
        : {}),
    }) || { schemaVersion: USAGE_EVENTS_SCHEMA_VERSION },
    createdAt,
  };
}

export async function recordUsageEvent({
  dbQuery,
  logStructured,
  event,
} = {}) {
  if (typeof dbQuery !== "function") {
    const error = new Error("recordUsageEvent requires dbQuery");
    logStructured?.("error", "usage.event.persist_failed", {
      message: error.message,
    });
    return { recorded: false, error };
  }

  let payload;
  try {
    payload = normalizeUsageEventInput(event || {});
    await dbQuery(
      `INSERT INTO zaki_usage_events
        (user_id, product_id, surface, event_type, usage_unit_type, usage_units,
         plan_id, entitlement, quota_bucket, quota_period, quota_limit, quota_used,
         quota_remaining, request_id, source_route, metadata, created_at)
       VALUES
        ($1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16::jsonb, COALESCE($17::timestamptz, NOW()))`,
      [
        payload.userId,
        payload.productId,
        payload.surface,
        payload.eventType,
        payload.usageUnitType,
        payload.usageUnits,
        payload.planId,
        payload.entitlement,
        payload.quotaBucket,
        payload.quotaPeriod,
        payload.quotaLimit,
        payload.quotaUsed,
        payload.quotaRemaining,
        payload.requestId,
        payload.sourceRoute,
        JSON.stringify(payload.metadata),
        payload.createdAt,
      ]
    );
    return { recorded: true, event: payload };
  } catch (error) {
    logStructured?.("error", "usage.event.persist_failed", {
      requestId: payload?.requestId || null,
      userId: payload?.userId || null,
      productId: payload?.productId || null,
      surface: payload?.surface || null,
      eventType: payload?.eventType || null,
      message: error?.message || String(error),
    });
    return { recorded: false, event: payload || null, error };
  }
}
