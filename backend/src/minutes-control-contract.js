import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const MINUTES_CONTROL_API_VERSION = "zaki-control.v1";
export const MINUTES_CONTROL_RESPONSE_MAX_BYTES = 65_536;
export const MINUTES_CONTROL_CALLBACK_MAX_BYTES = 65_536;
export const MINUTES_CONTROL_CALLBACK_WINDOW_SECONDS = 300;
// The engine currently seals its visible-bot identity to this exact value.
// Keep it server-owned: browser input must never be able to alter the identity
// that the engine attests and invokes.
export const MINUTES_CONTROL_NOTETAKER_NAME = "ZAKI Notetaker";
// These bounds mirror the engine's ControlConfig safe range. The Hub uses the
// same deployment variable so its prepaid hold always spans the engine's
// maximum possible runtime plus time for the terminal usage callback.
export const MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MIN = 60;
export const MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MAX = 4 * 60 * 60;
export const MINUTES_CONTROL_CAPTURE_SETTLEMENT_GRACE_MS = 5 * 60 * 1_000;

export function requiredMinutesCaptureReservedUnits(maxCaptureSeconds) {
  const seconds = Number(maxCaptureSeconds);
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MIN ||
    seconds > MINUTES_CONTROL_MAX_CAPTURE_SECONDS_MAX
  ) {
    return null;
  }
  return Math.ceil(seconds / 60);
}

export function validateMinutesCaptureFundingWindow({
  maxCaptureSeconds,
  reservedUnits,
  holdTtlMs,
  settlementGraceMs = MINUTES_CONTROL_CAPTURE_SETTLEMENT_GRACE_MS,
} = {}) {
  const requiredUnits = requiredMinutesCaptureReservedUnits(maxCaptureSeconds);
  const reserve = Number(reservedUnits);
  const holdTtl = Number(holdTtlMs);
  const grace = Number(settlementGraceMs);
  const requiredHoldTtlMs = requiredUnits === null || !Number.isSafeInteger(grace) || grace < 0
    ? null
    : Number(maxCaptureSeconds) * 1_000 + grace;
  return {
    ok: requiredUnits !== null &&
      Number.isSafeInteger(reserve) &&
      reserve === requiredUnits &&
      Number.isSafeInteger(holdTtl) &&
      requiredHoldTtlMs !== null &&
      holdTtl >= requiredHoldTtlMs,
    requiredUnits,
    requiredHoldTtlMs,
  };
}

export class MinutesControlContractError extends Error {
  constructor(message, code = "minutes_control_upstream_contract_invalid", status = 502, options = {}) {
    super(message, { cause: options.cause });
    this.name = "MinutesControlContractError";
    this.code = code;
    this.status = status;
  }
}

const Identifier = z.string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const UserId = z.string().regex(/^[1-9][0-9]{0,18}$/);
const DateTime = z.string().datetime({ offset: true });
const LifecycleState = z.enum([
  "requested",
  "joining",
  "awaiting_admission",
  "active",
  "stopping",
  "completed",
  "failed",
]);
const FailureCode = z.enum([
  "join_denied",
  "kicked",
  "meeting_ended_early",
  "quota_exhausted",
  "invalid_meeting",
  "capture_timeout",
  "upstream_unavailable",
  "internal_failure",
]);

const Subject = z.strictObject({
  tenant_id: Identifier,
  user_id: UserId,
});

const RetentionPolicy = z.strictObject({
  audio_days: z.number().int().min(0).max(365),
  transcript_days: z.number().int().min(1).max(3_650),
  summary_days: z.number().int().min(1).max(3_650),
}).superRefine((value, context) => {
  if (value.summary_days > value.transcript_days) {
    context.addIssue({
      code: "custom",
      message: "summary retention cannot outlive transcript retention",
      path: ["summary_days"],
    });
  }
});

const Policy = z.strictObject({
  capture_enabled: z.boolean(),
  agent_read_enabled: z.boolean(),
  capture_notice_policy_version: Identifier,
  retention: RetentionPolicy,
});

const CaptureAttestation = z.strictObject({
  bot_visible: z.literal(true),
  bot_display_name: z.literal(MINUTES_CONTROL_NOTETAKER_NAME),
  policy_version: Identifier,
  attested_at: DateTime,
  attested_by_user_id: UserId,
});

const MeterReservation = z.strictObject({
  reservation_id: Identifier,
  unit: z.literal("bot_minute"),
  reserved_units: z.number().int().min(1).max(1_000_000),
});

const UsageMetering = z.strictObject({
  reservation_id: Identifier,
  sequence: z.number().int().min(0).max(1_000_000),
  captured_seconds_total: z.number().int().min(0).max(31_536_000),
  terminal: z.boolean(),
});

const EnsureRequest = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  idempotency_key: Identifier,
  subject: Subject,
  policy: Policy,
});

const CaptureRequest = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  idempotency_key: Identifier,
  subject: Subject,
  platform: z.enum(["google_meet", "zoom", "teams", "jitsi"]),
  meeting_url: z.string().url().max(2_048).regex(/^https:\/\//),
  capture_attestation: CaptureAttestation,
  metering: MeterReservation,
}).superRefine((value, context) => {
  if (value.capture_attestation.attested_by_user_id !== value.subject.user_id) {
    context.addIssue({
      code: "custom",
      message: "capture attestation user must match the bound subject",
      path: ["capture_attestation", "attested_by_user_id"],
    });
  }
  if (!meetingUrlMatchesPlatform(value.platform, value.meeting_url)) {
    context.addIssue({
      code: "custom",
      message: "meeting URL must match the declared platform",
      path: ["meeting_url"],
    });
  }
});

const StopCaptureRequest = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  idempotency_key: Identifier,
  subject: Subject,
  capture_id: Identifier,
});

const EraseMeetingRequest = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  idempotency_key: Identifier,
  subject: Subject,
  meeting_id: Identifier,
});

const EraseAccountRequest = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  idempotency_key: Identifier,
  subject: Subject,
});

const EnsureResponse = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  operation_id: Identifier,
  subject: Subject,
  state: z.enum(["ready", "disabled"]),
  policy_version: Identifier,
});

const CaptureResponse = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  operation_id: Identifier,
  subject: Subject,
  capture_id: Identifier,
  meeting_id: Identifier.optional(),
  state: z.literal("requested"),
  metering: z.strictObject({ reservation_id: Identifier }),
});

const StatusResponse = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  subject: Subject,
  capture_id: Identifier,
  meeting_id: Identifier.optional(),
  state: LifecycleState,
  failure_code: FailureCode.optional(),
  metering: z.strictObject({
    reservation_id: Identifier,
    captured_seconds_total: z.number().int().min(0).max(31_536_000),
    terminal: z.boolean(),
  }),
}).superRefine((value, context) => {
  const terminal = ["completed", "failed"].includes(value.state);
  if (value.metering.terminal !== terminal) {
    context.addIssue({
      code: "custom",
      message: "terminal metering must match lifecycle state",
      path: ["metering", "terminal"],
    });
  }
  if (value.state === "failed" && !value.failure_code) {
    context.addIssue({ code: "custom", message: "failed state requires failure_code", path: ["failure_code"] });
  }
  if (value.state !== "failed" && value.failure_code) {
    context.addIssue({ code: "custom", message: "only failed state may contain failure_code", path: ["failure_code"] });
  }
});

const ErasureResponse = z.strictObject({
  api_version: z.literal(MINUTES_CONTROL_API_VERSION),
  request_id: Identifier,
  operation_id: Identifier,
  subject: Subject,
  scope: z.enum(["meeting", "account"]),
  target_id: Identifier.optional(),
  status: z.enum(["completed", "already_absent"]),
  receipt: z.strictObject({
    receipt_id: Identifier,
    erased_at: DateTime,
    counts: z.strictObject({
      meeting_rows: z.number().int().min(0),
      transcript_rows: z.number().int().min(0),
      summary_rows: z.number().int().min(0),
      recording_objects: z.number().int().min(0),
    }),
  }),
}).superRefine((value, context) => {
  if (value.scope === "meeting" && !value.target_id) {
    context.addIssue({ code: "custom", message: "meeting erasure requires target_id", path: ["target_id"] });
  }
  if (value.scope === "account" && value.target_id) {
    context.addIssue({ code: "custom", message: "account erasure must not contain target_id", path: ["target_id"] });
  }
});

const StatusCallbackData = z.strictObject({
  subject: Subject,
  operation_id: Identifier,
  capture_id: Identifier,
  meeting_id: Identifier.optional(),
  state: LifecycleState,
  failure_code: FailureCode.optional(),
}).superRefine((value, context) => {
  if (value.state === "failed" && !value.failure_code) {
    context.addIssue({ code: "custom", message: "failed callback requires failure_code", path: ["failure_code"] });
  }
  if (value.state !== "failed" && value.failure_code) {
    context.addIssue({ code: "custom", message: "non-failed callback must not contain failure_code", path: ["failure_code"] });
  }
});

const UsageCallbackData = z.strictObject({
  subject: Subject,
  operation_id: Identifier,
  capture_id: Identifier,
  meeting_id: Identifier,
  metering: UsageMetering,
});

const CallbackEnvelope = z.union([
  z.strictObject({
    event_id: Identifier,
    event_type: z.literal("minutes.capture.status"),
    api_version: z.literal(MINUTES_CONTROL_API_VERSION),
    created_at: DateTime,
    data: StatusCallbackData,
  }),
  z.strictObject({
    event_id: Identifier,
    event_type: z.literal("minutes.capture.usage"),
    api_version: z.literal(MINUTES_CONTROL_API_VERSION),
    created_at: DateTime,
    data: UsageCallbackData,
  }),
]);

const BrowserConsentInput = z.strictObject({
  capture_enabled: z.boolean(),
  agent_read_enabled: z.boolean(),
  retention: RetentionPolicy,
  idempotency_key: Identifier,
});

const BrowserCaptureInput = z.strictObject({
  // Staging launches a single provider only. The runtime's egress policy is
  // intentionally Google-Meet-specific, so accepting another platform here
  // would reserve a hold for a bot that cannot safely join it.
  platform: z.literal("google_meet"),
  meeting_url: z.string().url().max(2_048).regex(/^https:\/\//),
  visible_bot_attested: z.literal(true),
  idempotency_key: Identifier,
}).superRefine((value, context) => {
  if (!meetingUrlMatchesPlatform(value.platform, value.meeting_url)) {
    context.addIssue({ code: "custom", message: "meeting URL must match the declared platform", path: ["meeting_url"] });
  }
});

const BrowserIdempotencyInput = z.strictObject({ idempotency_key: Identifier });

function parse(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new MinutesControlContractError(
      `Minutes ${label} violated zaki-control.v1.`,
      "minutes_control_upstream_contract_invalid"
    );
  }
  return result.data;
}

function parseBrowser(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new MinutesControlContractError(
      "Minutes control input is invalid.",
      "minutes_control_invalid_request",
      400
    );
  }
  return result.data;
}

export function parseMinutesEnsureRequest(value) {
  return parse(EnsureRequest, value, "ensure request");
}

export function parseMinutesCaptureRequest(value) {
  return parse(CaptureRequest, value, "capture request");
}

export function parseMinutesStopCaptureRequest(value) {
  return parse(StopCaptureRequest, value, "stop request");
}

export function parseMinutesEraseMeetingRequest(value) {
  return parse(EraseMeetingRequest, value, "meeting-erasure request");
}

export function parseMinutesEraseAccountRequest(value) {
  return parse(EraseAccountRequest, value, "account-erasure request");
}

export function parseMinutesEnsureResponse(value) {
  return parse(EnsureResponse, value, "ensure response");
}

export function parseMinutesCaptureResponse(value) {
  return parse(CaptureResponse, value, "capture response");
}

export function parseMinutesStatusResponse(value) {
  return parse(StatusResponse, value, "status response");
}

export function parseMinutesErasureResponse(value) {
  return parse(ErasureResponse, value, "erasure response");
}

export function parseMinutesCallbackEnvelope(value) {
  return parse(CallbackEnvelope, value, "callback envelope");
}

export function parseMinutesBrowserConsent(value) {
  return parseBrowser(BrowserConsentInput, value);
}

export function parseMinutesBrowserCapture(value) {
  return parseBrowser(BrowserCaptureInput, value);
}

export function parseMinutesBrowserIdempotency(value) {
  return parseBrowser(BrowserIdempotencyInput, value);
}

export function minutesControlSubject({ tenantId = "default", userId } = {}) {
  return parse(Subject, {
    tenant_id: String(tenantId || ""),
    user_id: String(userId || ""),
  }, "subject");
}

export function assertMinutesControlResponseBinding(response, { subject, requestId, captureId, scope } = {}) {
  if (
    response?.subject?.tenant_id !== subject?.tenant_id ||
    response?.subject?.user_id !== subject?.user_id ||
    (requestId && response?.request_id !== requestId) ||
    (captureId && response?.capture_id !== captureId) ||
    (scope && response?.scope !== scope)
  ) {
    throw new MinutesControlContractError(
      "Minutes upstream response did not bind to the authenticated request.",
      "minutes_control_upstream_binding_mismatch"
    );
  }
  return response;
}

export function meetingUrlMatchesPlatform(platform, rawUrl, configuredJitsiHosts = []) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (platform === "google_meet") {
    if (host !== "meet.google.com" || url.pathname.startsWith("/lookup/")) return false;
    const code = url.pathname.split("/").filter(Boolean)[0] || "";
    return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(code) || /^[a-z0-9][a-z0-9-]{3,38}[a-z0-9]$/.test(code);
  }
  if (platform === "zoom") {
    const zoomHost = host === "zoom.us" || host.endsWith(".zoom.us") || host === "zoomgov.com" || host.endsWith(".zoomgov.com");
    return Boolean(zoomHost && (/^\/(?:j|w)\/\d{9,11}\/?$/.test(url.pathname) || /^\/wc\/join\/\d{9,11}\/?$/.test(url.pathname)));
  }
  if (platform === "teams") {
    const teamsHost = host === "teams.live.com" || host.endsWith(".teams.live.com") ||
      host === "teams.microsoft.com" || host.endsWith(".teams.microsoft.com") ||
      host === "gov.teams.microsoft.us" || host === "dod.teams.microsoft.us" || host.endsWith(".teams.microsoft.us");
    if (!teamsHost) return false;
    let fragmentPath = "";
    try {
      fragmentPath = new URL(`https://x${url.hash.slice(1)}`).pathname;
    } catch {
      fragmentPath = "";
    }
    return /^\/meet\/\d{10,15}\/?$/.test(url.pathname) ||
      url.pathname.includes("/l/meetup-join/") ||
      (url.pathname.replace(/\/$/, "") === "/v2" && /^\/meet\/\d{10,15}\/?$/.test(fragmentPath));
  }
  if (platform === "jitsi") {
    const configured = new Set(configuredJitsiHosts.map((value) => String(value).toLowerCase()));
    const room = url.pathname.replace(/^\/+|\/+$/g, "");
    return (host === "meet.jit.si" || configured.has(host)) && room.length > 0 && !/[/?#\s]/.test(room);
  }
  return false;
}

function responseHeader(response, name) {
  if (typeof response?.headers?.get === "function") return response.headers.get(name);
  return response?.headers?.[name] ?? response?.headers?.[name.toLowerCase()] ?? null;
}

async function discardResponseBody(response) {
  try {
    await response?.body?.cancel?.();
  } catch {
    // Rejection is authoritative; body cleanup must never reveal upstream content.
  }
}

async function readBodyWithLimit(response) {
  if (!response?.body || typeof response.body.getReader !== "function") {
    throw new MinutesControlContractError("Minutes upstream response body was unavailable.", "minutes_control_upstream_invalid_body");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = Buffer.from(value);
    total += chunk.byteLength;
    if (total > MINUTES_CONTROL_RESPONSE_MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // The cap is already authoritative.
      }
      throw new MinutesControlContractError("Minutes upstream response exceeded the control cap.", "minutes_control_upstream_response_too_large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

export async function readMinutesControlResponseJson(response) {
  if (response?.redirected || (response?.status >= 300 && response?.status < 400)) {
    await discardResponseBody(response);
    throw new MinutesControlContractError("Minutes upstream redirect was rejected.", "minutes_control_upstream_redirect_rejected");
  }
  const contentType = String(responseHeader(response, "content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    await discardResponseBody(response);
    throw new MinutesControlContractError("Minutes upstream response was not JSON.", "minutes_control_upstream_invalid_content_type");
  }
  const rawLength = responseHeader(response, "content-length");
  if (rawLength !== null && rawLength !== "" && Number(rawLength) > MINUTES_CONTROL_RESPONSE_MAX_BYTES) {
    await discardResponseBody(response);
    throw new MinutesControlContractError("Minutes upstream response exceeded the control cap.", "minutes_control_upstream_response_too_large");
  }
  const text = await readBodyWithLimit(response);
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new MinutesControlContractError("Minutes upstream returned invalid JSON.", "minutes_control_upstream_invalid_json", 502, { cause });
  }
}

export function canonicalizeMinutesControlValue(value) {
  if (Array.isArray(value)) return value.map(canonicalizeMinutesControlValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalizeMinutesControlValue(value[key])])
    );
  }
  return value;
}

export function canonicalMinutesControlJson(value) {
  return JSON.stringify(canonicalizeMinutesControlValue(value));
}

export function minutesControlPayloadFingerprint(value) {
  return createHash("sha256").update(canonicalMinutesControlJson(value), "utf8").digest("hex");
}

export function verifyMinutesCallbackSignature({ rawBody, contentType, timestamp, signature, secret, nowMs = Date.now() } = {}) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : null;
  const rawTimestamp = String(timestamp || "");
  const rawSignature = String(signature || "");
  if (!body || body.byteLength > MINUTES_CONTROL_CALLBACK_MAX_BYTES) return { ok: false, reason: "invalid_request" };
  if (String(contentType || "") !== "application/json") return { ok: false, reason: "invalid_request" };
  if (!/^\d{10}$/.test(rawTimestamp) || !/^sha256=[0-9a-f]{64}$/.test(rawSignature)) {
    return { ok: false, reason: "auth_failed" };
  }
  const signedAt = Number(rawTimestamp);
  if (!Number.isSafeInteger(signedAt) || Math.abs(Math.floor(nowMs / 1000) - signedAt) > MINUTES_CONTROL_CALLBACK_WINDOW_SECONDS) {
    return { ok: false, reason: "auth_failed" };
  }
  const key = String(secret || "");
  if (!key) return { ok: false, reason: "auth_failed" };
  const signedPayload = Buffer.concat([Buffer.from(`${rawTimestamp}.`, "utf8"), body]);
  const expected = Buffer.from(`sha256=${createHmac("sha256", key).update(signedPayload).digest("hex")}`, "utf8");
  const received = Buffer.from(rawSignature, "utf8");
  if (received.byteLength !== expected.byteLength || !timingSafeEqual(received, expected)) {
    return { ok: false, reason: "auth_failed" };
  }
  return { ok: true };
}
