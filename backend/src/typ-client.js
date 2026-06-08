/**
 * typ-client.js — Pluggable adapter for all TYP (NOVA.TYP) API calls.
 *
 * Contract:
 *   - Single crossing point for every ZAKI backend → TYP network call.
 *   - Admin reads (workspace lists, provisioning) use NOVA_TYP_API_KEY.
 *   - CHAT to TYP's internal multi-user route requires a per-user TYP *session JWT*
 *     (stock AnythingLLM `validatedRequest` rejects the admin key there). ZAKI-native
 *     users hold no TYP JWT, so we MINT one via TYP Simple-SSO: issue a temporary auth
 *     token with the admin key, exchange it for a session JWT, cache it per user.
 *     See docs/saas-v1/FINDING-chat-upstream-auth.md (decision: Option A).
 *   - Swapping or deprecating TYP = change only this file.
 *   - No side effects beyond an in-process session-token cache. requestTypChatStream
 *     accepts an injected fetchWithTimeout (same pattern as agent-client.js).
 *
 * Security (T-04-01):
 *   NOVA_TYP_API_KEY and minted session JWTs are read/derived from process.env config;
 *   they are never logged or returned to callers. assertTypConfig() throws if env absent.
 *   Requires SIMPLE_SSO_ENABLED on the TYP instance.
 */

function getTypApiBase() {
  const raw = process.env.NOVA_TYP_BASE_URL;
  if (!raw) return null;
  const normalized = String(raw).replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

function assertTypConfig() {
  const base = getTypApiBase();
  const key = process.env.NOVA_TYP_API_KEY;
  if (!base) throw new Error("NOVA_TYP_BASE_URL is not configured.");
  if (!key) throw new Error("NOVA_TYP_API_KEY is not configured.");
  return { base, key };
}

// ── Per-user TYP session-JWT minting (Simple-SSO) ─────────────────────────────
// TYP session JWTs are short-lived; we cache per nova_user_id and refresh before expiry.
const _typSessionCache = new Map(); // novaUserId -> { token: string, expMs: number }
const _TYP_SESSION_REFRESH_MARGIN_MS = 60_000; // re-mint 60s before the JWT's exp

/** Decode a JWT's `exp` (seconds) without verifying the signature. Returns ms epoch or null. */
function _jwtExpMs(jwt) {
  try {
    const seg = String(jwt).split(".")[1];
    if (!seg) return null;
    const json = Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const exp = JSON.parse(json)?.exp;
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Mint a fresh TYP session JWT for a user via Simple-SSO (admin issue → exchange).
 * @param {number} novaUserId
 * @returns {Promise<string>} session JWT
 * @throws if SSO is disabled, the user is unknown, or exchange fails.
 */
export async function mintTypUserSession(novaUserId) {
  const { base, key } = assertTypConfig();
  const id = Number(novaUserId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("mintTypUserSession: invalid novaUserId");

  const issueRes = await fetch(`${base}/v1/users/${id}/issue-auth-token`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  const issueData = await issueRes.json().catch(() => ({}));
  if (!issueRes.ok || !issueData?.token) {
    throw new Error(`TYP issue-auth-token failed (${issueRes.status}): ${issueData?.error || "no token"}`);
  }

  const exchRes = await fetch(
    `${base}/request-token/sso/simple?token=${encodeURIComponent(issueData.token)}`,
    { method: "GET" }
  );
  const exchData = await exchRes.json().catch(() => ({}));
  if (!exchRes.ok || !exchData?.valid || !exchData?.token) {
    throw new Error(`TYP SSO exchange failed (${exchRes.status}): ${exchData?.message || "no session token"}`);
  }
  return String(exchData.token);
}

/**
 * Get a cached (or freshly minted) TYP session JWT for a user.
 * @param {number} novaUserId
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<string>}
 */
export async function getTypUserSessionToken(novaUserId, { forceRefresh = false } = {}) {
  const id = Number(novaUserId);
  const now = Date.now();
  const cached = _typSessionCache.get(id);
  if (!forceRefresh && cached && cached.expMs - _TYP_SESSION_REFRESH_MARGIN_MS > now) {
    return cached.token;
  }
  const token = await mintTypUserSession(id);
  // Fall back to a conservative 10-min TTL if the JWT has no decodable exp.
  const expMs = _jwtExpMs(token) ?? now + 10 * 60_000;
  _typSessionCache.set(id, { token, expMs });
  return token;
}

/** Test seam: clear the session cache. */
export function _clearTypSessionCache() {
  _typSessionCache.clear();
}

/**
 * Fetch the workspace list for a TYP user by their nova_user_id.
 * Replaces: novaSessionRequest("/workspaces", authHeader) in listWorkspacesHandler.
 * Returns the raw fetch Response so callers can call .json() and inspect .ok/.status.
 *
 * @param {number} novaUserId — from zakiUser.nova_user_id
 * @returns {Promise<Response>}
 */
export async function fetchTypWorkspaces(novaUserId) {
  const { base, key } = assertTypConfig();
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${key}`);
  // TYP admin API returns all workspaces; filter to those where the user has threads.
  // /v1/admin/users/:id/workspaces does not exist in TYP — thread ownership is the
  // only per-user signal available from the admin key.
  const response = await fetch(`${base}/v1/workspaces`, { method: "GET", headers });
  if (!response.ok) return response;
  const data = await response.json().catch(() => null);
  if (!data?.workspaces) return response;
  const userId = Number(novaUserId);
  // Use Number() coercion on both sides — TYP may return user_id as string or number.
  const filtered = data.workspaces.filter(
    (w) => Array.isArray(w.threads) && w.threads.some((t) => Number(t.user_id) === userId)
  );
  return new Response(JSON.stringify({ workspaces: filtered }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Fetch the list of workspace slugs visible to a TYP user.
 * Replaces: fetchSessionWorkspaceSlugs(authHeader) / workspaceVisibleForSession(authHeader, slug).
 * Returns { success, status, slugs, error? } — same shape as the old fetchSessionWorkspaceSlugs.
 *
 * @param {number} novaUserId — from zakiUser.nova_user_id
 * @returns {Promise<{ success: boolean, status: number, slugs: string[], error?: string }>}
 */
export async function fetchTypWorkspaceSlugs(novaUserId) {
  let response;
  try {
    response = await fetchTypWorkspaces(novaUserId);
  } catch (err) {
    return { success: false, status: 502, error: err.message, slugs: [] };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.workspaces)) {
    return {
      success: false,
      status: response.status || 502,
      error: data?.error || data?.message || "Unable to fetch workspaces.",
      slugs: [],
    };
  }
  return {
    success: true,
    status: response.status,
    slugs: data.workspaces
      .map((w) => String(w?.slug || "").trim().toLowerCase())
      .filter(Boolean),
  };
}

/**
 * Forward a chat stream request to TYP's internal route.
 * Auth: pass a per-user TYP session JWT (from getTypUserSessionToken) as `authToken` —
 * the internal `/api/workspace/.../stream-chat` route requires it in multi-user mode.
 * If `authToken` is omitted, falls back to the admin key (only valid on TYP's /api/v1
 * developer routes — kept for anonymous/dev-API callers).
 *
 * @param {string} targetUrl — full TYP stream URL already constructed by caller
 * @param {object} upstreamPayload — JSON body
 * @param {Function} fetchWithTimeout — injected by caller (same pattern as agent-client.js)
 * @param {number} timeoutMs
 * @param {string} [authToken] — per-user TYP session JWT; defaults to the admin key
 * @returns {Promise<Response>}
 */
export async function requestTypChatStream(targetUrl, upstreamPayload, fetchWithTimeout, timeoutMs, authToken) {
  const { key } = assertTypConfig();
  const bearer = authToken || key;
  return fetchWithTimeout(
    targetUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearer}`,
      },
      body: JSON.stringify(upstreamPayload),
    },
    timeoutMs,
    "Chat upstream request"
  );
}
