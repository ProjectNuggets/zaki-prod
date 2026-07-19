import {
  MINUTES_CONTROL_API_VERSION,
  parseMinutesCaptureRequest,
  parseMinutesEnsureRequest,
  parseMinutesEraseAccountRequest,
  parseMinutesEraseMeetingRequest,
  parseMinutesStopCaptureRequest,
} from "./minutes-control-contract.js";
import {
  isValidMinutesControlSigningKey,
  mintMinutesControlAccessToken,
} from "./minutes-control-secret.js";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const USER_ID = /^[1-9][0-9]{0,18}$/;

// The sealed profile fixes token scope while Hub and engine share this reviewed
// server-to-server header wire. Keep it centralized so the scope verifier stays
// auditable; the value is never emitted to a browser route.
export const MINUTES_CONTROL_AUTH_HEADER = "X-Zaki-Control-Token";

export function getMinutesControlBase(rawBaseUrl) {
  const raw = String(rawBaseUrl || "").trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_minutes_control_base_url");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error("invalid_minutes_control_base_url");
  }
  return parsed.origin;
}

function requiredConfig({ baseUrl, controlSigningKey, controlToken, userId, tenantId, requestId, fetchWithTimeout, timeoutMs, authHeaderName, nowMs, tokenTtlSeconds }) {
  const resolvedBase = getMinutesControlBase(baseUrl);
  if (!resolvedBase) throw new Error("MINUTES_ENGINE_BASE_URL is not configured.");
  const signingKey = String(controlSigningKey || controlToken || "");
  if (!isValidMinutesControlSigningKey(signingKey)) throw new Error("MINUTES_ENGINE_CONTROL_TOKEN is invalid.");
  const normalizedUserId = String(userId || "");
  const normalizedTenantId = String(tenantId || "");
  const normalizedRequestId = String(requestId || "");
  const header = String(authHeaderName || MINUTES_CONTROL_AUTH_HEADER);
  if (!USER_ID.test(normalizedUserId)) throw new Error("invalid_minutes_control_user_id");
  if (!IDENTIFIER.test(normalizedTenantId) || normalizedTenantId.length > 160) throw new Error("invalid_minutes_control_tenant_id");
  if (!IDENTIFIER.test(normalizedRequestId) || normalizedRequestId.length > 160) throw new Error("invalid_minutes_control_request_id");
  if (!/^[A-Za-z][A-Za-z0-9-]{0,127}$/.test(header)) throw new Error("invalid_minutes_control_auth_header");
  if (typeof fetchWithTimeout !== "function") throw new Error("invalid_minutes_control_transport");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("invalid_minutes_control_timeout");
  const resolvedNowMs = nowMs === undefined ? Date.now() : Number(nowMs);
  const resolvedTokenTtlSeconds = tokenTtlSeconds === undefined ? 60 : Number(tokenTtlSeconds);
  if (!Number.isFinite(resolvedNowMs)) throw new Error("invalid_minutes_control_token_time");
  if (!Number.isSafeInteger(resolvedTokenTtlSeconds) || resolvedTokenTtlSeconds < 30 || resolvedTokenTtlSeconds > 300) {
    throw new Error("invalid_minutes_control_token_ttl");
  }
  return {
    baseUrl: resolvedBase,
    controlSigningKey: signingKey,
    userId: normalizedUserId,
    tenantId: normalizedTenantId,
    requestId: normalizedRequestId,
    fetchWithTimeout,
    timeoutMs,
    authHeaderName: header,
    nowMs: resolvedNowMs,
    tokenTtlSeconds: resolvedTokenTtlSeconds,
  };
}

function requiredIdempotencyKey(value) {
  const key = String(value || "");
  if (!IDENTIFIER.test(key) || key.length > 160) throw new Error("invalid_minutes_control_idempotency_key");
  return key;
}

function headers(config, { idempotencyKey, json = false } = {}) {
  const value = {
    Accept: "application/json",
    [config.authHeaderName]: mintMinutesControlAccessToken({
      signingKey: config.controlSigningKey,
      tenantId: config.tenantId,
      userId: config.userId,
      nowMs: config.nowMs,
      ttlSeconds: config.tokenTtlSeconds,
    }),
    "X-Zaki-Tenant-Id": config.tenantId,
    "X-Zaki-User-Id": config.userId,
    "X-Request-Id": config.requestId,
  };
  if (idempotencyKey) value["Idempotency-Key"] = idempotencyKey;
  if (json) value["Content-Type"] = "application/json";
  return value;
}

function post(config, path, body, label) {
  const idempotencyKey = requiredIdempotencyKey(body?.idempotency_key);
  return config.fetchWithTimeout(
    `${config.baseUrl}${path}`,
    {
      method: "POST",
      redirect: "error",
      headers: headers(config, { idempotencyKey, json: true }),
      body: JSON.stringify(body),
    },
    config.timeoutMs,
    label
  );
}

function requestSubject(config) {
  return { tenant_id: config.tenantId, user_id: config.userId };
}

export async function ensureMinutesControl(options) {
  const config = requiredConfig(options);
  const idempotencyKey = requiredIdempotencyKey(options.idempotencyKey);
  const body = parseMinutesEnsureRequest({
    api_version: MINUTES_CONTROL_API_VERSION,
    request_id: config.requestId,
    idempotency_key: idempotencyKey,
    subject: requestSubject(config),
    policy: options.policy,
  });
  return post(config, `/api/zaki/control/v1/${config.userId}/ensure`, body, options.label || "Minutes control ensure request");
}

export async function createMinutesCapture(options) {
  const config = requiredConfig(options);
  const idempotencyKey = requiredIdempotencyKey(options.idempotencyKey);
  const body = parseMinutesCaptureRequest({
    api_version: MINUTES_CONTROL_API_VERSION,
    request_id: config.requestId,
    idempotency_key: idempotencyKey,
    subject: requestSubject(config),
    platform: options.platform,
    meeting_url: options.meetingUrl,
    capture_attestation: options.captureAttestation,
    metering: options.metering,
  });
  return post(config, `/api/zaki/control/v1/${config.userId}/captures`, body, options.label || "Minutes capture request");
}

export async function getMinutesCapture(options) {
  const config = requiredConfig(options);
  const captureId = String(options.captureId || "");
  if (!IDENTIFIER.test(captureId) || captureId.length > 160) throw new Error("invalid_minutes_control_capture_id");
  return config.fetchWithTimeout(
    `${config.baseUrl}/api/zaki/control/v1/${config.userId}/captures/${encodeURIComponent(captureId)}`,
    {
      method: "GET",
      redirect: "error",
      headers: headers(config),
    },
    config.timeoutMs,
    options.label || "Minutes capture status request"
  );
}

export async function stopMinutesCapture(options) {
  const config = requiredConfig(options);
  const captureId = String(options.captureId || "");
  const idempotencyKey = requiredIdempotencyKey(options.idempotencyKey);
  const body = parseMinutesStopCaptureRequest({
    api_version: MINUTES_CONTROL_API_VERSION,
    request_id: config.requestId,
    idempotency_key: idempotencyKey,
    subject: requestSubject(config),
    capture_id: captureId,
  });
  return post(config, `/api/zaki/control/v1/${config.userId}/captures/${encodeURIComponent(captureId)}/stop`, body, options.label || "Minutes capture stop request");
}

export async function eraseMinutesMeeting(options) {
  const config = requiredConfig(options);
  const meetingId = String(options.meetingId || "");
  const idempotencyKey = requiredIdempotencyKey(options.idempotencyKey);
  const body = parseMinutesEraseMeetingRequest({
    api_version: MINUTES_CONTROL_API_VERSION,
    request_id: config.requestId,
    idempotency_key: idempotencyKey,
    subject: requestSubject(config),
    meeting_id: meetingId,
  });
  return post(config, `/api/zaki/control/v1/${config.userId}/meetings/${encodeURIComponent(meetingId)}/erase`, body, options.label || "Minutes meeting erasure request");
}

export async function eraseMinutesAccount(options) {
  const config = requiredConfig(options);
  const idempotencyKey = requiredIdempotencyKey(options.idempotencyKey);
  const body = parseMinutesEraseAccountRequest({
    api_version: MINUTES_CONTROL_API_VERSION,
    request_id: config.requestId,
    idempotency_key: idempotencyKey,
    subject: requestSubject(config),
  });
  return post(config, `/api/zaki/control/v1/${config.userId}/erase`, body, options.label || "Minutes account erasure request");
}
