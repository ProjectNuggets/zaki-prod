import { z } from "zod";

export const PRODUCT_ERROR_CODES = Object.freeze({
  TEMPORARY_CONTENTION: "temporary_contention",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  INVALID_TELEGRAM_TOKEN: "invalid_telegram_token",
  PROVISION_FAILED: "provision_failed",
  SETTINGS_UPDATE_FAILED: "settings_update_failed",
  USAGE_UNAVAILABLE: "usage_unavailable",
});

export const UI_SPECIFIC_FIELDS = Object.freeze([
  "panel_tab",
  "screen_state",
  "view_mode",
  "mobile_compact",
  "layout_variant",
]);

export const BOT_CHAT_SESSION_KEY_ERROR_CODES = Object.freeze([
  "missing_session_key",
  "invalid_session_key",
  "session_key_user_mismatch",
  "invalid_session_lane",
]);

export const LOCK_RETRY_MAX_ATTEMPTS = 3;
export const LOCK_RETRY_MAX_WALL_TIME_MS = 1500;
export const LOCK_RETRY_FALLBACK_DELAYS_MS = Object.freeze([100, 250, 500]);

// Launch policy: scheduled return delivery is not yet safe enough to expose.
// Keep this enforcement at the authenticated product boundary so a direct API
// caller cannot bypass the disabled Settings control through either the tenant
// preference or per-user heartbeat plane. `false` patches remain valid so stale
// opt-ins can be cleared upstream.
export const PROACTIVE_UPDATES_LAUNCH_ENABLED = false;
const PROACTIVE_UPDATES_PAUSED_MESSAGE = "Proactive updates are paused for launch.";

// WP-C — the BFF must NEVER emit a bare machine code with no user-facing message.
// `error` historically carried the machine code (and a lot of server-side code and
// tests still switch on it), so we keep it — but every envelope now also carries an
// explicit `code` for the client to switch on AND a non-empty human `message` for
// the client to render. A client that renders `message` can never print
// "invalid_session_key" at a user again.
//
// This map is the server-side half of the frontend taxonomy in
// src/lib/userFacingErrors.ts — keep the two in step.
const PRODUCT_ERROR_FALLBACK_MESSAGES = Object.freeze({
  temporary_contention: "ZAKI is handling another request on this chat. Try again in a moment.",
  unauthorized: "Please sign in again to continue.",
  forbidden: "You don't have access to this resource.",
  invalid_telegram_token: "That Telegram token wasn't accepted. Check it and try again.",
  provision_failed: "ZAKI couldn't finish setting up. Try again in a moment.",
  settings_update_failed: "Your settings couldn't be saved. Try again.",
  usage_unavailable: "Usage information isn't available right now.",
  invalid_session_key: "This chat session is no longer valid. Start a new chat to continue.",
  missing_session_key: "This chat session is no longer valid. Start a new chat to continue.",
  session_key_user_mismatch: "This chat session belongs to another account.",
  invalid_session_lane: "This chat session is no longer valid. Start a new chat to continue.",
  session_not_owned: "This chat session belongs to another account.",
  invalid_user_id: "We couldn't verify your account. Sign in again to continue.",
  rate_limited: "You're sending messages faster than ZAKI can answer. Wait a moment, then retry.",
  content_filter: "ZAKI couldn't process that request. Try rephrasing it.",
  context_window_exceeded:
    "This conversation is too long for one request. Shorten your message or start a new chat.",
  timeout: "ZAKI took too long to respond. Try again.",
  model_overload: "The model is busy right now. Try again, or switch to another model.",
  gateway_draining: "ZAKI is restarting. Your message is safe — retry in a moment.",
  agent_unavailable: "ZAKI is temporarily unavailable. Try again in a moment.",
});

const GENERIC_PRODUCT_ERROR_MESSAGE = "Something went wrong. Try again.";

// Machine codes look like `snake_case_identifiers`. Human copy has spaces/punctuation.
// Used to reject a "message" that is really a code leaking into the copy slot.
const MACHINE_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

export function looksLikeMachineCode(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return MACHINE_CODE_PATTERN.test(normalized);
}

// Resolve a guaranteed human, user-facing sentence for a machine code. Never returns
// the code itself and never returns an empty string.
export function resolveProductErrorMessage(code, provided) {
  const suppliedMessage = normalizedString(provided);
  // A "message" that is actually a machine code is not a message.
  if (suppliedMessage && !looksLikeMachineCode(suppliedMessage)) return suppliedMessage;
  const normalizedCode = normalizedString(code).toLowerCase();
  return PRODUCT_ERROR_FALLBACK_MESSAGES[normalizedCode] || GENERIC_PRODUCT_ERROR_MESSAGE;
}

const botProvisionStatusSchema = z.object({ status: z.string().trim().min(1) }).strict();

const botOnboardingStateSchema = z
  .object({
    completed: z.boolean(),
    completed_at_s: z.number().int().nonnegative().nullable(),
    can_start_chat_now: z.boolean().optional(),
    minimum_required: z.array(z.string().trim().min(1)).optional(),
    operator_configure_model_provider: z.boolean().optional(),
    setup: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

const botOnboardingUpdateSchema = z.object({ completed: z.boolean() }).strict();

const botSettingsProfileSchema = z
  .object({
    group_activation: z.enum(["mention", "always"]),
    proactive_updates: z.boolean(),
    voice_replies: z.boolean(),
    session_timeout_minutes: z.number().int().min(5).max(180),
    assistant_mode: z.enum(["fast", "balanced", "deep"]).optional(),
    autonomy: z.enum(["read_only", "supervised", "full"]).optional(),
    dream_enabled: z.boolean().optional(),
    query_expansion_enabled: z.boolean().optional(),
    selected_model: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .passthrough()
  .transform(
    ({
      group_activation,
      proactive_updates,
      voice_replies,
      session_timeout_minutes,
      assistant_mode,
      autonomy,
      dream_enabled,
      query_expansion_enabled,
      selected_model,
    }) => ({
      group_activation,
      proactive_updates,
      voice_replies,
      session_timeout_minutes,
      ...(assistant_mode === undefined ? {} : { assistant_mode }),
      ...(autonomy === undefined ? {} : { autonomy }),
      ...(dream_enabled === undefined ? {} : { dream_enabled }),
      ...(query_expansion_enabled === undefined ? {} : { query_expansion_enabled }),
      ...(selected_model === undefined ? {} : { selected_model }),
    })
  );

const botSettingsPatchSchema = z
  .object({
    group_activation: z.enum(["mention", "always"]).optional(),
    proactive_updates: z.boolean().optional(),
    voice_replies: z.boolean().optional(),
    session_timeout_minutes: z.number().int().min(5).max(180).optional(),
    assistant_mode: z.enum(["fast", "balanced", "deep"]).optional(),
    autonomy: z.enum(["read_only", "supervised", "full"]).optional(),
    dream_enabled: z.boolean().optional(),
    query_expansion_enabled: z.boolean().optional(),
    selected_model: z.string().trim().min(1).max(64).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one settings field is required",
  });

const telegramConnectionStateSchema = z
  .object({
    status: z.enum(["connected", "disconnected"]),
    channel: z.literal("telegram"),
  })
  .strict();

const heartbeatStateSchema = z
  .object({
    enabled: z.boolean(),
    interval_minutes: z.number().int().nonnegative().optional(),
    prompt: z.string().nullable().optional(),
  })
  .strict();

const heartbeatPatchSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

const botUsageSummarySchema = z
  .object({
    state: z.string().trim().min(1),
    requests_day: z.number().int().nonnegative(),
    tokens_day: z.number().int().nonnegative(),
    tokens_month: z.number().int().nonnegative(),
  })
  .strict();

function normalizedString(value) {
  return String(value ?? "").trim();
}

function normalizedIntegerOrNull(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function sanitizeProductSetupValue(value) {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeProductSetupValue(entry));
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const uiFields = findUiSpecificFields(value);
  if (uiFields.length > 0) {
    throw new Error(`ui-specific fields are not allowed: ${uiFields.join(", ")}`);
  }

  const sanitized = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextValue = sanitizeProductSetupValue(nestedValue);
    if (typeof nextValue !== "undefined") {
      sanitized[key] = nextValue;
    }
  }
  return sanitized;
}

function extractPayloadMessage(payload) {
  return payload && typeof payload === "object" ? normalizedString(payload.message || payload.prompt) : "";
}

function extractSessionKeyOverride(payload) {
  if (!payload || typeof payload !== "object") {
    return { present: false, value: null };
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "session_key")) {
    return { present: false, value: null };
  }
  if (typeof payload.session_key !== "string") {
    return { present: true, value: null };
  }
  const normalized = normalizedString(payload.session_key);
  return { present: true, value: normalized || null };
}

export function isValidCanonicalChatSessionLane(lane) {
  const normalizedLane = normalizedString(lane);
  if (normalizedLane === "main") return true;

  for (const prefix of ["thread", "task", "cron"]) {
    const marker = `${prefix}:`;
    if (normalizedLane.startsWith(marker) && normalizedString(normalizedLane.slice(marker.length))) {
      return true;
    }
  }

  return false;
}

export function buildCanonicalThreadSessionKey(userId, threadId = "main") {
  const normalizedUserId = normalizedString(userId);
  const normalizedThreadId = normalizedString(threadId) || "main";
  return `agent:zaki-bot:user:${normalizedUserId}:thread:${normalizedThreadId}`;
}

export function resolveCanonicalChatSessionKey({ userId, payload }) {
  const normalizedUserId = normalizedString(userId);
  const override = extractSessionKeyOverride(payload);
  if (!normalizedUserId) {
    return { success: false, message: "invalid chat payload or session_key" };
  }

  if (override.present) {
    if (!override.value) {
      return { success: false, message: "invalid chat payload or session_key" };
    }
    const expectedPrefix = `agent:zaki-bot:user:${normalizedUserId}:`;
    if (!override.value.startsWith(expectedPrefix)) {
      return { success: false, message: "invalid chat payload or session_key" };
    }
    const lane = override.value.slice(expectedPrefix.length);
    if (!isValidCanonicalChatSessionLane(lane)) {
      return { success: false, message: "invalid chat payload or session_key" };
    }
    return { success: true, sessionKey: override.value };
  }

  return {
    success: true,
    sessionKey: buildCanonicalThreadSessionKey(normalizedUserId, payload?.threadId),
  };
}

function pickRetryAfterMs(headers, payload) {
  const bodyDelay = normalizedIntegerOrNull(payload?.retry_after_ms);
  if (bodyDelay !== null && bodyDelay > 0) return bodyDelay;
  const retryAfterHeader =
    headers && typeof headers.get === "function" ? headers.get("retry-after") : null;
  const retryAfterSeconds = normalizedIntegerOrNull(retryAfterHeader);
  if (retryAfterSeconds !== null && retryAfterSeconds > 0) return retryAfterSeconds * 1000;
  return null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readResponsePayload(response) {
  if (!response) return null;
  const contentType = normalizedString(response.headers?.get?.("content-type")).toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    if (!text) return null;
    const directJson = tryParseJson(text);
    if (directJson && typeof directJson === "object") return directJson;
    const sseDataMatch = text.match(/data:\s*(\{.*\})/s);
    if (!sseDataMatch) return { message: text.trim() };
    const sseJson = tryParseJson(sseDataMatch[1]);
    return sseJson && typeof sseJson === "object" ? sseJson : { message: text.trim() };
  } catch {
    return null;
  }
}

export function buildProductError({ error, message, retryable, requestId }) {
  // `error` stays the machine code for backward compatibility (server code and the
  // upstream-failure classifiers switch on it). `code` is the canonical machine field
  // for the CLIENT to switch on, and `message` is ALWAYS a human sentence — so a client
  // that renders `message` can never display a raw code. See resolveProductErrorMessage.
  return {
    error,
    code: error,
    message: resolveProductErrorMessage(error, message),
    retryable,
    request_id: normalizedString(requestId) || "unknown_request",
  };
}

export function buildSseProductError({ error, message, retryable }) {
  return { code: error, message: resolveProductErrorMessage(error, message), retryable };
}

export function isOwnershipLockConflict(statusCode, payload) {
  return (
    Number(statusCode) === 409 &&
    normalizedString(payload?.error || payload?.code).toLowerCase() === "ownership_lock_conflict"
  );
}

export function computeLockRetryDelayMs({
  attempt,
  retryAfterMs = null,
  jitterFn = Math.random,
}) {
  if (retryAfterMs !== null && retryAfterMs > 0) return retryAfterMs;
  const baseDelay =
    LOCK_RETRY_FALLBACK_DELAYS_MS[
      Math.min(Math.max(0, Number(attempt) || 0), LOCK_RETRY_FALLBACK_DELAYS_MS.length - 1)
    ];
  const jitter = (Math.max(0, Math.min(1, Number(jitterFn()) || 0.5)) * 0.4) - 0.2;
  return Math.max(0, Math.round(baseDelay * (1 + jitter)));
}

export async function withOwnershipLockRetry({
  performRequest,
  readConflictPayload = readResponsePayload,
  nowFn = Date.now,
  sleepFn = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  jitterFn = Math.random,
  maxAttempts = LOCK_RETRY_MAX_ATTEMPTS,
  maxWallTimeMs = LOCK_RETRY_MAX_WALL_TIME_MS,
}) {
  const startedAt = nowFn();
  let attempt = 0;

  while (true) {
    const response = await performRequest({ attempt });
    let conflictPayload = null;
    if (Number(response?.status) === 409) {
      conflictPayload = await readConflictPayload(response.clone());
    }

    if (!isOwnershipLockConflict(response?.status, conflictPayload)) {
      return { response, conflictPayload, attempts: attempt + 1, exhausted: false };
    }

    const elapsed = nowFn() - startedAt;
    if (attempt >= maxAttempts - 1 || elapsed >= maxWallTimeMs) {
      return { response, conflictPayload, attempts: attempt + 1, exhausted: true };
    }

    const delayMs = computeLockRetryDelayMs({
      attempt,
      retryAfterMs: pickRetryAfterMs(response.headers, conflictPayload),
      jitterFn,
    });
    if (elapsed + delayMs > maxWallTimeMs) {
      return { response, conflictPayload, attempts: attempt + 1, exhausted: true };
    }

    await sleepFn(delayMs);
    attempt += 1;
  }
}

export function findUiSpecificFields(payload) {
  const found = [];
  const visit = (value, path = "") => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (UI_SPECIFIC_FIELDS.includes(key)) {
        found.push(nextPath);
      }
      visit(nestedValue, nextPath);
    }
  };
  visit(payload);
  return found;
}

export function buildBotProvisionPayload(userId, payload = {}) {
  return {
    ...(payload && typeof payload === "object" ? payload : {}),
    user_id: normalizedString(userId),
  };
}

export function sanitizeBotProvisionStatus(payload) {
  const parsed = botProvisionStatusSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  return { status: "provisioned" };
}

export function sanitizeBotOnboardingState(payload, fallbackCompleted = false) {
  const source = payload && typeof payload === "object" ? payload : {};
  const completed =
    typeof source.completed === "boolean" ? source.completed : Boolean(fallbackCompleted);
  const completedAt = normalizedIntegerOrNull(source.completed_at_s ?? source.completedAtS);
  const minimumRequired = Array.isArray(source.minimum_required)
    ? source.minimum_required.map((entry) => normalizedString(entry)).filter(Boolean)
    : undefined;
  const setup =
    source.setup && typeof source.setup === "object" && !Array.isArray(source.setup)
      ? sanitizeProductSetupValue(source.setup)
      : null;
  return botOnboardingStateSchema.parse({
    completed,
    completed_at_s: completed ? completedAt : null,
    can_start_chat_now:
      typeof source.can_start_chat_now === "boolean" ? source.can_start_chat_now : undefined,
    minimum_required: minimumRequired,
    operator_configure_model_provider:
      typeof source.operator_configure_model_provider === "boolean"
        ? source.operator_configure_model_provider
        : undefined,
    setup: setup && typeof setup === "object" ? setup : null,
  });
}

export function validateBotOnboardingUpdate(payload) {
  const uiFields = findUiSpecificFields(payload);
  if (uiFields.length > 0) {
    return {
      success: false,
      message: `ui-specific fields are not allowed: ${uiFields.join(", ")}`,
    };
  }
  const parsed = botOnboardingUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "invalid onboarding payload",
    };
  }
  return { success: true, data: parsed.data };
}

export function sanitizeBotSettingsProfile(payload) {
  const profile = botSettingsProfileSchema.parse(payload);
  return {
    ...profile,
    proactive_updates: PROACTIVE_UPDATES_LAUNCH_ENABLED
      ? profile.proactive_updates
      : false,
  };
}

export function validateBotSettingsPatch(payload) {
  const uiFields = findUiSpecificFields(payload);
  if (uiFields.length > 0) {
    return {
      success: false,
      message: `ui-specific fields are not allowed: ${uiFields.join(", ")}`,
    };
  }
  const parsed = botSettingsPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "invalid settings payload",
    };
  }
  if (!PROACTIVE_UPDATES_LAUNCH_ENABLED && parsed.data.proactive_updates === true) {
    return {
      success: false,
      message: PROACTIVE_UPDATES_PAUSED_MESSAGE,
    };
  }
  return { success: true, data: parsed.data };
}

export function sanitizeTelegramConnectionState(status) {
  return telegramConnectionStateSchema.parse({ status, channel: "telegram" });
}

export function sanitizeHeartbeatState(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return heartbeatStateSchema.parse({
    enabled: PROACTIVE_UPDATES_LAUNCH_ENABLED ? Boolean(source.enabled) : false,
    interval_minutes: normalizedIntegerOrNull(source.interval_minutes ?? source.intervalMinutes) ?? undefined,
    prompt:
      typeof source.prompt === "string" || source.prompt === null
        ? source.prompt ?? null
        : undefined,
  });
}

export function validateHeartbeatPatch(payload) {
  const parsed = heartbeatPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "invalid heartbeat payload",
    };
  }
  if (!PROACTIVE_UPDATES_LAUNCH_ENABLED && parsed.data.enabled === true) {
    return {
      success: false,
      message: PROACTIVE_UPDATES_PAUSED_MESSAGE,
    };
  }
  return { success: true, data: parsed.data };
}

export function normalizeTelegramConnectPayload(payload) {
  if (!payload || typeof payload !== "object") return {};

  const source = payload;
  const normalized = {};
  const map = [
    ["bot_token", source.bot_token ?? source.botToken],
    ["webhook_url", source.webhook_url ?? source.webhookUrl],
    ["webhook_base_url", source.webhook_base_url ?? source.webhookBaseUrl],
    ["webhook_secret_token", source.webhook_secret_token ?? source.webhookSecretToken],
    ["account_id", source.account_id ?? source.accountId],
    ["chat_id", source.chat_id ?? source.chatId],
  ];
  for (const [key, value] of map) {
    const normalizedValue = normalizedString(value);
    if (normalizedValue) normalized[key] = normalizedValue;
  }

  const allowFrom = Array.isArray(source.allow_from ?? source.allowFrom)
    ? (source.allow_from ?? source.allowFrom)
        .map((entry) => normalizedString(entry))
        .filter(Boolean)
    : null;
  if (allowFrom && allowFrom.length > 0) normalized.allow_from = allowFrom;

  const dropPending = source.drop_pending_updates ?? source.dropPendingUpdates;
  if (typeof dropPending === "boolean") normalized.drop_pending_updates = dropPending;

  return normalized;
}

export function normalizeBotUsageSummaryFromQuota(payload) {
  const used = normalizedIntegerOrNull(payload?.used) ?? 0;
  const remaining = normalizedIntegerOrNull(payload?.remaining);
  const state = remaining !== null && remaining <= 0 ? "limit_reached" : "normal";
  return botUsageSummarySchema.parse({
    state,
    requests_day: used,
    tokens_day: 0,
    tokens_month: 0,
  });
}

function textFromPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  return [payload.error, payload.code, payload.message, payload.detail]
    .map((value) => normalizedString(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isTelegramTokenError(payload) {
  const text = textFromPayload(payload);
  return /invalid[_\s-]*token|telegram token|unauthorized|forbidden|401\b/.test(text);
}

export function isChatSessionKeyValidationFailure(payload) {
  const code = normalizedString(payload?.code || payload?.error).toLowerCase();
  if (BOT_CHAT_SESSION_KEY_ERROR_CODES.includes(code)) {
    return true;
  }
  const text = textFromPayload(payload);
  return BOT_CHAT_SESSION_KEY_ERROR_CODES.some((value) => text.includes(value));
}

// B4 (P1-16): classify an upstream chat/session failure as "the engine no longer
// holds this user" — i.e. a foreign-key violation or a user-not-found / 404 from
// nullALIS. These are the failures the server-side ensure-provisioned guard
// should re-provision-and-retry ONCE (mirroring the TYP re-provision pattern).
// Deliberately NARROW: a session-key validation failure has its own handling and
// must NOT trigger re-provision (returns false), and a generic 5xx outage is a
// transient engine problem, not a missing user (returns false unless it is a 404).
export function isUpstreamProvisioningFailure(payload, statusCode = 0) {
  if (isChatSessionKeyValidationFailure(payload)) {
    return false;
  }
  const text = textFromPayload(payload);
  if (
    /\buser[_\s-]*not[_\s-]*found\b|user does not exist|no such user|unknown user|unprovisioned/.test(
      text
    )
  ) {
    return true;
  }
  if (/foreign[_\s-]*key|fk[_\s-]*constraint|violates foreign key/.test(text)) {
    return true;
  }
  // A bare 404 (no descriptive body, or one we did not already match) means the
  // engine has no record for this user — re-provision-and-retry once.
  if (Number(statusCode) === 404) {
    return true;
  }
  return false;
}

function mapAuthError(type, requestId) {
  if (type === "unauthorized") {
    return {
      status: 401,
      body: buildProductError({
        error: PRODUCT_ERROR_CODES.UNAUTHORIZED,
        message: "Authentication is required.",
        retryable: false,
        requestId,
      }),
    };
  }
  return {
    status: 403,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.FORBIDDEN,
      message: "Access to this bot capability is not allowed.",
      retryable: false,
      requestId,
    }),
  };
}

function mapContentionError(requestId) {
  return {
    status: 503,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION,
      message: "Agent is busy on another node. Retry shortly.",
      retryable: true,
      requestId,
    }),
  };
}

function mapForbiddenError(message, requestId, status = 403) {
  return {
    status,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.FORBIDDEN,
      message,
      retryable: false,
      requestId,
    }),
  };
}

function mapProvisionError(status, payload, requestId) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  if (status === 403 || status === 404) {
    return mapForbiddenError("bot provisioning is not accessible", requestId, 403);
  }
  return {
    status: status >= 500 ? 502 : 400,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.PROVISION_FAILED,
      message: normalizedString(payload?.message || payload?.error) || "provision request invalid",
      retryable: false,
      requestId,
    }),
  };
}

function mapOnboardingError(status, payload, requestId, message) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  return mapForbiddenError(
    normalizedString(payload?.message || payload?.error) || message,
    requestId,
    status >= 500 ? 503 : 403
  );
}

function mapSettingsError(status, payload, requestId, fallbackMessage) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  return {
    status: status >= 500 ? 503 : 400,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.SETTINGS_UPDATE_FAILED,
      message: normalizedString(payload?.message || payload?.error) || fallbackMessage,
      retryable: false,
      requestId,
    }),
  };
}

function mapTelegramConnectError(status, payload, requestId) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  if (isTelegramTokenError(payload)) {
    return {
      status: 400,
      body: buildProductError({
        error: PRODUCT_ERROR_CODES.INVALID_TELEGRAM_TOKEN,
        message: "telegram token is invalid",
        retryable: false,
        requestId,
      }),
    };
  }
  return mapForbiddenError(
    normalizedString(payload?.message || payload?.error) || "telegram connect request invalid",
    requestId,
    status >= 500 ? 503 : 403
  );
}

function hasHttpsUrl(value) {
  return typeof value === "string" && /^https:\/\//i.test(String(value).trim());
}

function mapTelegramDisconnectError(status, payload, requestId) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  if (isTelegramTokenError(payload)) {
    return {
      status: 400,
      body: buildProductError({
        error: PRODUCT_ERROR_CODES.INVALID_TELEGRAM_TOKEN,
        message: "telegram token is invalid",
        retryable: false,
        requestId,
      }),
    };
  }
  return mapForbiddenError(
    normalizedString(payload?.message || payload?.error) || "telegram channel not connected",
    requestId,
    status >= 500 ? 503 : 403
  );
}

function mapHeartbeatError(status, payload, requestId, fallbackMessage) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  return {
    status: status >= 500 ? 503 : 400,
    body: buildProductError({
      error: PRODUCT_ERROR_CODES.SETTINGS_UPDATE_FAILED,
      message: normalizedString(payload?.message || payload?.error) || fallbackMessage,
      retryable: false,
      requestId,
    }),
  };
}

function buildMidstreamSseError() {
  return buildSseProductError({
    error: PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION,
    message: "Agent stream interrupted. Retry shortly.",
    retryable: true,
  });
}

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function mapChatStreamError(status, payload, requestId) {
  if (status === 401) return mapAuthError("unauthorized", requestId);
  if (isChatSessionKeyValidationFailure(payload)) {
    return mapForbiddenError("invalid chat payload or session_key", requestId, 400);
  }
  return mapForbiddenError(
    normalizedString(payload?.message || payload?.error) || "invalid chat payload",
    requestId,
    status >= 500 ? 503 : 400
  );
}

async function proxySseResponse(upstream, res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let hasForwardedBytes = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const decoded = decoder.decode(value, { stream: true });
      if (!decoded) continue;
      hasForwardedBytes = true;
      res.write(decoded);
    }
  } catch {
    if (hasForwardedBytes) {
      writeSseEvent(res, "error", buildMidstreamSseError());
    }
  } finally {
    res.end();
  }
}

async function runJsonUpstreamRequest({
  req,
  res,
  method,
  path,
  body,
  requestId,
  idempotencyKey,
  sendUpstreamRequest,
  requestHeaders,
  mapSuccess,
  mapError,
  retryable = false,
  nowFn,
  sleepFn,
  jitterFn,
}) {
  const performRequest = () =>
    sendUpstreamRequest({
      method,
      path,
      userId: req.botBffContext.userId,
      requestId,
      idempotencyKey,
      body,
      headers: requestHeaders,
    });

  const result = retryable
    ? await withOwnershipLockRetry({ performRequest, nowFn, sleepFn, jitterFn })
    : {
        response: await performRequest(),
        conflictPayload: null,
        attempts: 1,
        exhausted: false,
      };

  if (result.exhausted) {
    const contention = mapContentionError(requestId);
    res.status(contention.status).json(contention.body);
    return;
  }

  const payload = await readResponsePayload(result.response.clone());
  if (!result.response.ok) {
    const normalized = mapError(result.response.status, payload, requestId);
    res.status(normalized.status).json(normalized.body);
    return;
  }

  res.status(result.response.status).json(mapSuccess(payload));
}

export function createBotBffHandlers({
  getAuthContext,
  sendUpstreamRequest,
  buildUsageSummary,
  loadEntitlement = null,
  telegramWebhookBaseUrl = "",
  nowFn = Date.now,
  sleepFn = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
  jitterFn = Math.random,
  createRequestId,
  createIdempotencyKey,
}) {
  const wrapHandler = (handler, fallbackBuilder) => async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (res.headersSent) {
        if (!res.writableEnded) res.end();
        return;
      }
      const requestId = createRequestId(req);
      const normalized = fallbackBuilder(requestId, error);
      res.status(normalized.status).json(normalized.body);
    }
  };

  const ensureContext = async (req, res) => {
    if (req.botBffContext?.userId) return req.botBffContext;
    const requestId = createRequestId(req);
    const authResult = await getAuthContext(req, res, requestId);
    if (!authResult) return null;
    req.botBffContext = authResult;
    return authResult;
  };

  return {
    provision: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const idempotencyKey = createIdempotencyKey(req, requestId);
      const basePayload = buildBotProvisionPayload(context.userId, req.body);
      // Pass the authenticated email so loadEntitlement can apply the
      // owner-only super-admin entitlement override (engine-bound payload only).
      const entitlement = loadEntitlement
        ? await loadEntitlement(context.userId, { email: context.email })
        : null;
      const payload = entitlement ? { ...basePayload, ...entitlement } : basePayload;

      await runJsonUpstreamRequest({
        req,
        res,
        method: "POST",
        path: "/api/v1/users/provision",
        body: payload,
        requestId,
        idempotencyKey,
        sendUpstreamRequest,
        mapSuccess: sanitizeBotProvisionStatus,
        mapError: mapProvisionError,
        retryable: true,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) => mapProvisionError(502, { message: error?.message }, requestId)),

    getOnboarding: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);

      await runJsonUpstreamRequest({
        req,
        res,
        method: "GET",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/onboarding`,
        requestId,
        idempotencyKey: null,
        sendUpstreamRequest,
        mapSuccess: (payload) => sanitizeBotOnboardingState(payload, false),
        mapError: (status, payload, currentRequestId) =>
          mapOnboardingError(status, payload, currentRequestId, "onboarding state not accessible"),
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapOnboardingError(503, { message: error?.message }, requestId, "onboarding state not accessible")),

    putOnboarding: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const validation = validateBotOnboardingUpdate(req.body);
      if (!validation.success) {
        const normalized = mapOnboardingError(
          400,
          { message: validation.message },
          requestId,
          "onboarding payload invalid"
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      await runJsonUpstreamRequest({
        req,
        res,
        method: "PUT",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/onboarding`,
        body: validation.data,
        requestId,
        idempotencyKey: createIdempotencyKey(req, requestId),
        sendUpstreamRequest,
        mapSuccess: (payload) => sanitizeBotOnboardingState(payload, validation.data.completed),
        mapError: (status, payload, currentRequestId) =>
          mapOnboardingError(status, payload, currentRequestId, "onboarding payload invalid"),
        retryable: true,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapOnboardingError(503, { message: error?.message }, requestId, "onboarding payload invalid")),

    getSettings: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);

      await runJsonUpstreamRequest({
        req,
        res,
        method: "GET",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/settings`,
        requestId,
        idempotencyKey: null,
        sendUpstreamRequest,
        mapSuccess: sanitizeBotSettingsProfile,
        mapError: (status, payload, currentRequestId) =>
          mapSettingsError(status, payload, currentRequestId, "settings unavailable"),
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapSettingsError(503, { message: error?.message }, requestId, "settings unavailable")),

    patchSettings: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const validation = validateBotSettingsPatch(req.body);
      if (!validation.success) {
        const normalized = mapSettingsError(
          400,
          { message: validation.message },
          requestId,
          validation.message
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      await runJsonUpstreamRequest({
        req,
        res,
        method: "PATCH",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/settings`,
        body: validation.data,
        requestId,
        idempotencyKey: createIdempotencyKey(req, requestId),
        sendUpstreamRequest,
        mapSuccess: sanitizeBotSettingsProfile,
        mapError: (status, payload, currentRequestId) =>
          mapSettingsError(status, payload, currentRequestId, "settings update failed"),
        retryable: true,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapSettingsError(503, { message: error?.message }, requestId, "settings update failed")),

    getHeartbeat: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);

      await runJsonUpstreamRequest({
        req,
        res,
        method: "GET",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/heartbeat`,
        requestId,
        idempotencyKey: null,
        sendUpstreamRequest,
        mapSuccess: sanitizeHeartbeatState,
        mapError: (status, payload, currentRequestId) =>
          mapHeartbeatError(status, payload, currentRequestId, "heartbeat unavailable"),
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapHeartbeatError(503, { message: error?.message }, requestId, "heartbeat unavailable")),

    putHeartbeat: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const validation = validateHeartbeatPatch(req.body);
      if (!validation.success) {
        const normalized = mapHeartbeatError(
          400,
          { message: validation.message },
          requestId,
          validation.message
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      await runJsonUpstreamRequest({
        req,
        res,
        method: "PUT",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/heartbeat`,
        body: validation.data,
        requestId,
        idempotencyKey: createIdempotencyKey(req, requestId),
        sendUpstreamRequest,
        mapSuccess: sanitizeHeartbeatState,
        mapError: (status, payload, currentRequestId) =>
          mapHeartbeatError(status, payload, currentRequestId, "heartbeat update failed"),
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapHeartbeatError(503, { message: error?.message }, requestId, "heartbeat update failed")),

    chatStream: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const payload = req.body && typeof req.body === "object" ? req.body : {};
      const uiFields = findUiSpecificFields(payload);
      if (uiFields.length > 0) {
        const normalized = mapForbiddenError(
          `invalid chat payload: ${uiFields.join(", ")}`,
          requestId,
          400
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      const message = extractPayloadMessage(payload);
      if (!message) {
        const normalized = mapForbiddenError("invalid chat payload", requestId, 400);
        res.status(normalized.status).json(normalized.body);
        return;
      }

      const sessionKey = resolveCanonicalChatSessionKey({
        userId: context.userId,
        payload,
      });
      if (!sessionKey.success) {
        const normalized = mapForbiddenError(sessionKey.message, requestId, 400);
        res.status(normalized.status).json(normalized.body);
        return;
      }

      const existingContext = payload.context && typeof payload.context === "object" ? payload.context : {};
      const upstreamPayload = {
        ...payload,
        message,
        session_key: sessionKey.sessionKey,
        stream: true,
        context: {
          ...existingContext,
          surface: "zaki_bot",
        },
      };
      delete upstreamPayload.user_id;

      const result = await withOwnershipLockRetry({
        performRequest: () =>
          sendUpstreamRequest({
            method: "POST",
            path: "/api/v1/chat/stream",
            userId: context.userId,
            requestId,
            idempotencyKey: createIdempotencyKey(req, requestId),
            body: upstreamPayload,
          }),
        nowFn,
        sleepFn,
        jitterFn,
      });

      if (result.exhausted) {
        const contention = mapContentionError(requestId);
        res.status(contention.status).json(contention.body);
        return;
      }

      if (!result.response.ok) {
        const payloadError = await readResponsePayload(result.response.clone());
        const normalized = mapChatStreamError(result.response.status, payloadError, requestId);
        res.status(normalized.status).json(normalized.body);
        return;
      }

      if (!result.response.body) {
        res.status(502).json(
          buildProductError({
            error: PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION,
            message: "Agent stream interrupted. Retry shortly.",
            retryable: true,
            requestId,
          })
        );
        return;
      }

      await proxySseResponse(result.response, res);
    }, (requestId, error) => ({
      status: 503,
      body: buildProductError({
        error: PRODUCT_ERROR_CODES.TEMPORARY_CONTENTION,
        message: normalizedString(error?.message) || "Agent stream interrupted. Retry shortly.",
        retryable: true,
        requestId,
      }),
    })),

    telegramConnect: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      const uiFields = findUiSpecificFields(req.body);
      if (uiFields.length > 0) {
        const normalized = mapForbiddenError(
          `telegram connect payload invalid: ${uiFields.join(", ")}`,
          requestId,
          400
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }
      const payload = normalizeTelegramConnectPayload(req.body);
      const hasWebhookUrl =
        typeof payload.webhook_url === "string" && payload.webhook_url.length > 0;
      const hasWebhookBaseUrl =
        typeof payload.webhook_base_url === "string" && payload.webhook_base_url.length > 0;
      const configuredWebhookBase = normalizedString(telegramWebhookBaseUrl);

      if (!hasWebhookUrl && !hasWebhookBaseUrl && !configuredWebhookBase) {
        const normalized = mapForbiddenError(
          "Webhook base URL is not configured. Ask the operator to configure ZAKI_AGENT_WEBHOOK_BASE_URL.",
          requestId,
          400
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      if (hasWebhookUrl && !hasHttpsUrl(payload.webhook_url)) {
        const normalized = mapForbiddenError("Webhook URL must start with https://.", requestId, 400);
        res.status(normalized.status).json(normalized.body);
        return;
      }

      if (hasWebhookBaseUrl && !hasHttpsUrl(payload.webhook_base_url)) {
        const normalized = mapForbiddenError(
          "Webhook base URL must start with https://.",
          requestId,
          400
        );
        res.status(normalized.status).json(normalized.body);
        return;
      }

      await runJsonUpstreamRequest({
        req,
        res,
        method: "POST",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/channels/telegram/connect`,
        body: payload,
        requestId,
        idempotencyKey: createIdempotencyKey(req, requestId),
        sendUpstreamRequest,
        requestHeaders:
          !hasWebhookUrl && !hasWebhookBaseUrl && configuredWebhookBase
            ? { "X-Webhook-Base-Url": configuredWebhookBase }
            : undefined,
        mapSuccess: () => sanitizeTelegramConnectionState("connected"),
        mapError: mapTelegramConnectError,
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapTelegramConnectError(503, { message: error?.message }, requestId)),

    telegramDisconnect: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);

      await runJsonUpstreamRequest({
        req,
        res,
        method: "POST",
        path: `/api/v1/users/${encodeURIComponent(context.userId)}/channels/telegram/disconnect`,
        body: {},
        requestId,
        idempotencyKey: createIdempotencyKey(req, requestId),
        sendUpstreamRequest,
        mapSuccess: () => sanitizeTelegramConnectionState("disconnected"),
        mapError: mapTelegramDisconnectError,
        retryable: false,
        nowFn,
        sleepFn,
        jitterFn,
      });
    }, (requestId, error) =>
      mapTelegramDisconnectError(503, { message: error?.message }, requestId)),

    usage: wrapHandler(async (req, res) => {
      const context = await ensureContext(req, res);
      if (!context) return;
      const requestId = createRequestId(req);
      try {
        const usagePayload = await buildUsageSummary({
          req,
          requestId,
          userId: context.userId,
          zakiUser: context.zakiUser,
        });
        res.status(200).json(usagePayload);
      } catch {
        const normalized = {
          status: 503,
          body: buildProductError({
            error: PRODUCT_ERROR_CODES.USAGE_UNAVAILABLE,
            message: "usage telemetry unavailable",
            retryable: true,
            requestId,
          }),
        };
        res.status(normalized.status).json(normalized.body);
      }
    }, (requestId) => ({
      status: 503,
      body: buildProductError({
        error: PRODUCT_ERROR_CODES.USAGE_UNAVAILABLE,
        message: "usage telemetry unavailable",
        retryable: true,
        requestId,
      }),
    })),
  };
}

export function mapBotBffAuthFailure(type, requestId) {
  return mapAuthError(type, requestId);
}
