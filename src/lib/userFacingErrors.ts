// WP-C — ONE taxonomy for every error the user can see.
//
// The defect this replaces: ChatArea preferred `data.error` (the MACHINE code) over
// `data.message` (the human sentence), and the BFF happily returned bare codes like
// `{ error: "invalid_session_key" }`. Net effect: a brand-new account's first screen
// could render the literal string "invalid_session_key" in a banner AND a toast.
//
// Rules enforced here:
//   1. A machine code is NEVER rendered. `resolveErrorCopy` always returns a human
//      sentence — falling back to generic copy rather than echoing a code.
//   2. Every entry has EXACTLY ONE recovery action. Two buttons is a decision, not a
//      recovery.
//   3. The machine `code` stays in the payload so callers can switch on it. It just
//      never reaches the DOM.

import type { TFunction } from "i18next";

/** The single recovery affordance offered for an error. Exactly one per entry. */
export type ErrorActionKind =
  | "retry"
  | "new_chat"
  | "shorten"
  | "switch_model"
  | "sign_in"
  | "rephrase"
  | "reconnect";

export type UserFacingErrorEntry = {
  /** i18n key for the short headline. */
  titleKey: string;
  /** i18n key for the explanatory sentence. */
  bodyKey: string;
  /** The ONE recovery action. */
  action: ErrorActionKind;
  /** i18n key for the action's label. */
  actionLabelKey: string;
};

export type ResolvedUserFacingError = {
  code: string;
  title: string;
  body: string;
  action: ErrorActionKind;
  actionLabel: string;
};

export const GENERIC_ERROR_CODE = "unknown_error";

// Spec §G taxonomy. Keys are the canonical machine codes; ALIASES below fold the
// backend's many spellings onto them.
export const USER_FACING_ERRORS: Record<string, UserFacingErrorEntry> = {
  // 429 / rate limit — the user is going faster than we can serve.
  rate_limited: {
    titleKey: "chatErrors.rateLimited.title",
    bodyKey: "chatErrors.rateLimited.body",
    action: "retry",
    actionLabelKey: "chatErrors.rateLimited.action",
  },
  // The model refused the content.
  content_filter: {
    titleKey: "chatErrors.contentFilter.title",
    bodyKey: "chatErrors.contentFilter.body",
    action: "rephrase",
    actionLabelKey: "chatErrors.contentFilter.action",
  },
  // The connection dropped mid-stream.
  network_drop: {
    titleKey: "chatErrors.networkDrop.title",
    bodyKey: "chatErrors.networkDrop.body",
    action: "retry",
    actionLabelKey: "chatErrors.networkDrop.action",
  },
  // Too much context — the ONE action is to shorten.
  context_window_exceeded: {
    titleKey: "chatErrors.contextWindow.title",
    bodyKey: "chatErrors.contextWindow.body",
    action: "shorten",
    actionLabelKey: "chatErrors.contextWindow.action",
  },
  // The request did not settle in time.
  timeout: {
    titleKey: "chatErrors.timeout.title",
    bodyKey: "chatErrors.timeout.body",
    action: "retry",
    actionLabelKey: "chatErrors.timeout.action",
  },
  // The model is saturated — the ONE action is to switch models.
  model_overload: {
    titleKey: "chatErrors.modelOverload.title",
    bodyKey: "chatErrors.modelOverload.body",
    action: "switch_model",
    actionLabelKey: "chatErrors.modelOverload.action",
  },
  // The session key the client holds is stale/invalid. This is the code that used to
  // render verbatim on a brand-new account's first screen.
  invalid_session_key: {
    titleKey: "chatErrors.invalidSession.title",
    bodyKey: "chatErrors.invalidSession.body",
    action: "new_chat",
    actionLabelKey: "chatErrors.invalidSession.action",
  },
  // Auth lapsed.
  unauthorized: {
    titleKey: "chatErrors.unauthorized.title",
    bodyKey: "chatErrors.unauthorized.body",
    action: "sign_in",
    actionLabelKey: "chatErrors.unauthorized.action",
  },
  // Backend couldn't stand the agent up.
  provision_failed: {
    titleKey: "chatErrors.provisionFailed.title",
    bodyKey: "chatErrors.provisionFailed.body",
    action: "retry",
    actionLabelKey: "chatErrors.provisionFailed.action",
  },
  // Catch-all. Still human, still exactly one action.
  [GENERIC_ERROR_CODE]: {
    titleKey: "chatErrors.generic.title",
    bodyKey: "chatErrors.generic.body",
    action: "retry",
    actionLabelKey: "chatErrors.generic.action",
  },
};

// The BFF and its upstream speak several dialects for the same condition. Fold them
// onto the canonical codes above so the UI has one thing to reason about.
const ERROR_CODE_ALIASES: Record<string, string> = {
  // rate limiting
  too_many_requests: "rate_limited",
  rate_limit_exceeded: "rate_limited",
  ratelimited: "rate_limited",
  // content filtering
  content_filtered: "content_filter",
  content_policy_violation: "content_filter",
  moderation_blocked: "content_filter",
  // network
  network_error: "network_drop",
  connection_lost: "network_drop",
  stream_interrupted: "network_drop",
  // context window
  context_length_exceeded: "context_window_exceeded",
  prompt_too_long: "context_window_exceeded",
  max_tokens_exceeded: "context_window_exceeded",
  // timeouts
  request_timeout: "timeout",
  gateway_timeout: "timeout",
  upstream_timeout: "timeout",
  // overload / capacity
  overloaded: "model_overload",
  model_unavailable: "model_overload",
  capacity_exceeded: "model_overload",
  temporary_contention: "model_overload",
  gateway_draining: "model_overload",
  agent_unavailable: "model_overload",
  // session
  missing_session_key: "invalid_session_key",
  invalid_session_lane: "invalid_session_key",
  session_key_user_mismatch: "invalid_session_key",
  session_not_owned: "invalid_session_key",
  // auth
  invalid_user_id: "unauthorized",
  forbidden: "unauthorized",
};

/**
 * Machine codes are `snake_case_identifiers`; human copy has spaces and punctuation.
 * This is the last line of defence: if a string that looks like a code ever reaches a
 * render slot, we swap it for real copy instead of showing it.
 */
const MACHINE_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)+$/;

export function looksLikeMachineCode(value: string | null | undefined): boolean {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  return MACHINE_CODE_PATTERN.test(normalized);
}

/**
 * When a failure carries no machine code at all (a non-JSON error body, an HTML error
 * page from a proxy), the HTTP status is the only signal we have. Map it onto the
 * taxonomy so the user still gets tailored copy instead of a raw body dump.
 */
export function codeFromHttpStatus(status: number | null | undefined): string {
  const code = Number(status);
  if (!Number.isFinite(code)) return GENERIC_ERROR_CODE;
  if (code === 429) return "rate_limited";
  if (code === 408 || code === 504) return "timeout";
  if (code === 502 || code === 503) return "model_overload";
  if (code === 401) return "unauthorized";
  return GENERIC_ERROR_CODE;
}

/** Fold a raw backend code onto a canonical taxonomy code. */
export function canonicalizeErrorCode(code: string | null | undefined): string {
  const normalized = String(code ?? "").trim().toLowerCase();
  if (!normalized) return GENERIC_ERROR_CODE;
  if (USER_FACING_ERRORS[normalized]) return normalized;
  const aliased = ERROR_CODE_ALIASES[normalized];
  if (aliased && USER_FACING_ERRORS[aliased]) return aliased;
  return GENERIC_ERROR_CODE;
}

/**
 * THE taxonomy entry point. Given a machine code, return tailored, translated copy
 * plus exactly one recovery action. Never returns a machine code in any field.
 */
export function resolveUserFacingError(
  code: string | null | undefined,
  t: TFunction | ((key: string, opts?: Record<string, unknown>) => string)
): ResolvedUserFacingError {
  const canonical = canonicalizeErrorCode(code);
  // canonicalizeErrorCode only ever returns a key present in both maps, but keep the
  // lookups total so an unknown code can NEVER produce an undefined render slot.
  const entry = USER_FACING_ERRORS[canonical] ?? USER_FACING_ERRORS[GENERIC_ERROR_CODE]!;
  const fallback =
    ERROR_FALLBACK_COPY[canonical] ?? ERROR_FALLBACK_COPY[GENERIC_ERROR_CODE]!;
  const translate = t as (key: string, opts?: Record<string, unknown>) => string;
  return {
    code: canonical,
    title: translate(entry.titleKey, { defaultValue: fallback.title }),
    body: translate(entry.bodyKey, { defaultValue: fallback.body }),
    action: entry.action,
    actionLabel: translate(entry.actionLabelKey, { defaultValue: fallback.action }),
  };
}

/**
 * Resolve the sentence to actually SHOW for a failed response.
 *
 * Precedence — THE inversion that fixes WP-C:
 *   1. `message` from the server, if it is real copy (not a code).
 *   2. `error` from the server, but ONLY if it is real copy (not a code). The BFF is
 *      inconsistent: some routes put a human sentence in `error` ("Invalid user."),
 *      others put a raw machine code ("invalid_session_key"). Honour the former,
 *      NEVER render the latter.
 *   3. Tailored taxonomy copy resolved from the machine `code`.
 *   4. Generic copy.
 *
 * The old code did `error || message`, so a bare `{ error: "invalid_session_key" }`
 * rendered the code verbatim. The code-shape guard is what makes `error` safe to read.
 */
export function resolveErrorMessage(
  {
    code,
    message,
    error,
  }: { code?: string | null; message?: string | null; error?: string | null },
  t: TFunction | ((key: string, opts?: Record<string, unknown>) => string)
): string {
  const fromMessage = String(message ?? "").trim();
  if (fromMessage && !looksLikeMachineCode(fromMessage)) return fromMessage;
  const fromError = String(error ?? "").trim();
  if (fromError && !looksLikeMachineCode(fromError)) return fromError;
  // A code-shaped `error` is not COPY — but it IS a code. Legacy routes send
  // `{ error: "invalid_session_key" }` with no `code` field at all, so read the code from
  // there rather than degrading to generic copy: the user gets the TAILORED sentence.
  const effectiveCode =
    String(code ?? "").trim() || (looksLikeMachineCode(fromError) ? fromError : "");
  return resolveUserFacingError(effectiveCode, t).body;
}

// English fallbacks so this module is honest even before i18n loads (and so tests that
// render without a provider still never see a machine code).
const ERROR_FALLBACK_COPY: Record<string, { title: string; body: string; action: string }> = {
  rate_limited: {
    title: "Too many requests",
    body: "You're sending messages faster than ZAKI can answer. Wait a few seconds, then retry.",
    action: "Retry",
  },
  content_filter: {
    title: "ZAKI can't answer that",
    body: "That request was blocked by the content filter. Try rephrasing it.",
    action: "Rephrase and resend",
  },
  network_drop: {
    title: "Connection lost",
    body: "Your connection dropped before ZAKI finished. Your message is safe.",
    action: "Retry",
  },
  context_window_exceeded: {
    title: "This chat is too long",
    body: "This conversation no longer fits in one request. Shorten your message or start a new chat.",
    action: "Shorten and resend",
  },
  timeout: {
    title: "That took too long",
    body: "ZAKI didn't respond in time. Your message is safe.",
    action: "Retry",
  },
  model_overload: {
    title: "The model is busy",
    body: "This model is overloaded right now. Switching to another model usually gets through.",
    action: "Switch model",
  },
  invalid_session_key: {
    title: "This chat session expired",
    body: "This chat session is no longer valid. Start a new chat to continue.",
    action: "Start a new chat",
  },
  unauthorized: {
    title: "You've been signed out",
    body: "Your session ended. Sign in again to pick up where you left off.",
    action: "Sign in",
  },
  provision_failed: {
    title: "ZAKI couldn't start",
    body: "ZAKI couldn't finish setting up. This is usually temporary.",
    action: "Retry",
  },
  [GENERIC_ERROR_CODE]: {
    title: "Something went wrong",
    body: "ZAKI couldn't finish that reply. Your message is safe.",
    action: "Retry",
  },
};
