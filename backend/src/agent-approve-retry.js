// Retry-with-backoff for idempotent agent-control proxy calls (the /approve
// route). When nullalis is briefly unreachable during a restart the approve
// proxy used to surface a bare HTTP 500 and the user's click was silently lost.
// The frontend sends a stable `approval_id`, so re-POSTing the same approval is
// idempotent on the engine side — which makes a bounded, jittered retry safe.
//
// This module is intentionally pure (no I/O, no app boot) so it can be unit
// tested directly. The proxy in index.js wires `fetchWithUpstreamRetry` around
// its single upstream `fetchWithTimeout` call, gated to the /approve route only.
// Non-idempotent routes (compact, mode, cancel, ...) MUST NOT use it.

// Bounded attempt budget: the first try plus two retries (3 total).
export const APPROVE_RETRY_ATTEMPTS = 3;

// Base backoff before retry N (ms). Jitter is added on top so a fleet of
// browsers reconnecting after the same restart does not thunder simultaneously.
// Kept well within the client patience window so the click still lands.
export const APPROVE_RETRY_BACKOFF_MS = Object.freeze([250, 1000, 2000]);

// Connection-class error codes that mean "the upstream was unreachable", as
// opposed to an application error the engine deliberately returned. We walk the
// `.cause` chain because undici wraps the real cause inside a `fetch failed`
// TypeError.
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

// Upstream HTTP statuses that indicate a transient gateway/availability blip
// during a restart rather than a deliberate engine decision. 500 is NOT here:
// a 500 is an application error, not a connection-class outage.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function collectErrorCodes(error) {
  const codes = [];
  let current = error;
  let guard = 0;
  while (current && typeof current === "object" && guard < 8) {
    if (typeof current.code === "string" && current.code) {
      codes.push(current.code);
    }
    current = current.cause;
    guard += 1;
  }
  return codes;
}

// True only for connection-class failures. An application/abort timeout
// (".. timed out after Nms") is deliberately NOT retryable here — it has
// already consumed the patience window and is not a connection refusal.
export function isRetryableUpstreamError(error) {
  if (!error || typeof error !== "object") return false;

  for (const code of collectErrorCodes(error)) {
    if (RETRYABLE_ERROR_CODES.has(code)) return true;
  }

  const message = String(error.message || "");
  // Our own timeout wrapper (fetchWithTimeout) throws "... timed out after Nms";
  // that is not a connection refusal, so exclude it explicitly.
  if (/\btimed out after \d+ms\b/.test(message)) return false;

  // undici surfaces a connect refusal as a bare `TypeError: fetch failed` whose
  // cause may not carry a string code in every runtime — treat it as retryable.
  if (/\bfetch failed\b/i.test(message)) return true;

  return false;
}

export function isRetryableUpstreamStatus(status) {
  return RETRYABLE_STATUSES.has(Number(status));
}

// base..base*1.5 jitter (always >= base so the schedule never collapses to 0).
export function computeApproveRetryDelay(retryIndex, random = Math.random) {
  const base = APPROVE_RETRY_BACKOFF_MS[retryIndex] ?? APPROVE_RETRY_BACKOFF_MS[APPROVE_RETRY_BACKOFF_MS.length - 1];
  return Math.round(base + random() * (base * 0.5));
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (typeof timer.unref === "function") timer.unref();
  });
}

// Runs `doFetch()` (which must perform exactly one upstream request and return a
// Response-like object with a numeric `.status`) up to APPROVE_RETRY_ATTEMPTS
// times, retrying only on connection-class throws or retryable statuses.
//
// - On a connection-class throw: sleep with jittered backoff, then retry. If the
//   final attempt still throws, the error is rethrown (caller maps it to 502).
// - On a retryable status (502/503/504): sleep, retry. The final attempt's
//   response is returned as-is so the caller can forward it transparently.
// - On any non-retryable throw or any non-retryable status: returned/thrown
//   immediately with no retry (so a 4xx never triggers a retry).
export async function fetchWithUpstreamRetry(doFetch, options = {}) {
  const attempts = Math.max(1, Number(options.attempts) || APPROVE_RETRY_ATTEMPTS);
  const sleep = typeof options.sleep === "function" ? options.sleep : defaultSleep;
  const random = typeof options.random === "function" ? options.random : Math.random;
  const onRetry = typeof options.onRetry === "function" ? options.onRetry : null;

  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const isLast = attempt === attempts;
    try {
      const response = await doFetch(attempt);
      if (!isLast && isRetryableUpstreamStatus(response?.status)) {
        if (onRetry) {
          onRetry({ attempt, reason: "upstream_status", status: Number(response?.status) });
        }
        await sleep(computeApproveRetryDelay(attempt - 1, random));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (isLast || !isRetryableUpstreamError(error)) {
        throw error;
      }
      if (onRetry) {
        onRetry({ attempt, reason: "connection_error", code: getFirstErrorCode(error) });
      }
      await sleep(computeApproveRetryDelay(attempt - 1, random));
    }
  }
  // Unreachable for status-retry (returned in-loop) but keeps the contract
  // explicit if attempts === 0 were ever forced.
  if (lastError) throw lastError;
  return doFetch(attempts);
}

function getFirstErrorCode(error) {
  const codes = collectErrorCodes(error);
  return codes.length ? codes[0] : "";
}
