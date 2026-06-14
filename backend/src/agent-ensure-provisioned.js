import { isUpstreamProvisioningFailure } from "./bot-bff.js";

// B4 (P1-16): server-side ensure-provisioned guard for the chat path.
//
// Provisioning is otherwise gated only by a client in-memory flag
// (zakiBotProvisionedRef in the FE), so a long-lived tab or a direct API client
// can drive chat for a user the engine no longer holds. This module gives the
// BFF two defense-in-depth checks, both engine-side and independent of the
// client ref:
//
//   1. PROACTIVE (ensureProvisionedBeforeChat): if the BFF lacks a recent
//      provision confirmation for the user, (re)provision before streaming. A
//      provision failure cleanly BLOCKS chat (the caller turns this into a
//      retryable 503) instead of trusting the client.
//
//   2. REACTIVE (streamChatWithProvisionRetry): if the first session write to
//      the engine fails with a foreign-key / user-not-found error, re-provision
//      and retry the stream EXACTLY ONCE — mirroring the existing TYP
//      re-provision-and-retry pattern (ensureValidNovaUserIdForUser).

const DEFAULT_PROVISION_CONFIRMATION_TTL_MS = 5 * 60 * 1000;

// A small per-user TTL cache of "the BFF recently saw the engine confirm this
// user is provisioned". Bounds how often we make a lazy provision call on the
// hot chat path without ever trusting the client to have provisioned.
export function createProvisionConfirmationCache({
  ttlMs = DEFAULT_PROVISION_CONFIRMATION_TTL_MS,
  nowFn = Date.now,
} = {}) {
  const confirmedAt = new Map();
  const normalizeKey = (userId) => String(userId || "").trim();

  return {
    hasRecentConfirmation(userId) {
      const key = normalizeKey(userId);
      if (!key) return false;
      const at = confirmedAt.get(key);
      if (at === undefined) return false;
      if (nowFn() - at > ttlMs) {
        confirmedAt.delete(key);
        return false;
      }
      return true;
    },
    recordConfirmation(userId) {
      const key = normalizeKey(userId);
      if (!key) return;
      confirmedAt.set(key, nowFn());
    },
    invalidate(userId) {
      const key = normalizeKey(userId);
      if (!key) return;
      confirmedAt.delete(key);
    },
  };
}

// Proactive guard. Resolves to { ok, skipped, status }:
//   - ok=true,  skipped=true  → a recent confirmation existed; no upstream call.
//   - ok=true,  skipped=false → (re)provisioned successfully and recorded it.
//   - ok=false                → provision failed; the caller MUST block chat with
//                               a retryable 503 (do NOT rely on the client ref).
export async function ensureProvisionedBeforeChat({
  userId,
  cache,
  ensureProvisioned,
}) {
  if (cache && cache.hasRecentConfirmation(userId)) {
    return { ok: true, skipped: true, status: null };
  }

  const result = await ensureProvisioned();
  if (result && result.ok) {
    if (cache) cache.recordConfirmation(userId);
    return { ok: true, skipped: false, status: result.status ?? null };
  }
  return {
    ok: false,
    skipped: false,
    status: result ? (result.status ?? null) : null,
    error: result ? result.error ?? null : null,
  };
}

async function readUpstreamJsonError(upstream) {
  const contentType = String(upstream?.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return null;
  if (typeof upstream.clone !== "function") return null;
  try {
    return await upstream.clone().json();
  } catch (_e) {
    return null;
  }
}

// Reactive guard. Streams chat; on an FK/not-found first-write failure,
// re-provisions and retries the stream ONCE. Resolves to:
//   { upstream, reprovisioned, provisionFailed }
//   - upstream      : the response to forward to the client (retried one if any).
//   - reprovisioned : a re-provision-and-retry happened.
//   - provisionFailed: an FK failure was seen but the re-provision itself failed
//                      (caller forwards the original upstream / blocks as a 503).
export async function streamChatWithProvisionRetry({
  userId,
  cache,
  requestChatStream,
  ensureProvisioned,
}) {
  const upstream = await requestChatStream();
  if (!upstream || upstream.ok) {
    return { upstream, reprovisioned: false, provisionFailed: false };
  }

  const payloadError = await readUpstreamJsonError(upstream);
  if (payloadError === null) {
    return { upstream, reprovisioned: false, provisionFailed: false };
  }
  if (!isUpstreamProvisioningFailure(payloadError, upstream.status)) {
    return { upstream, reprovisioned: false, provisionFailed: false };
  }

  // The engine no longer holds this user. Drop any stale confirmation, then
  // re-provision and retry the write exactly once.
  if (cache) cache.invalidate(userId);
  const provision = await ensureProvisioned();
  if (!provision || !provision.ok) {
    return { upstream, reprovisioned: false, provisionFailed: true };
  }
  if (cache) cache.recordConfirmation(userId);

  const retried = await requestChatStream();
  return { upstream: retried, reprovisioned: true, provisionFailed: false };
}
