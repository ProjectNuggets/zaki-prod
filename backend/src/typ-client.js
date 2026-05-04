/**
 * typ-client.js — Pluggable adapter for all TYP (NOVA.TYP) API calls.
 *
 * Contract:
 *   - Single crossing point for every ZAKI backend → TYP network call.
 *   - Uses NOVA_TYP_API_KEY (admin credentials) for every request.
 *   - Never forwards a user session token to TYP.
 *   - Swapping or deprecating TYP = change only this file.
 *   - No side effects. Pure named exports. requestTypChatStream accepts an
 *     injected fetchWithTimeout for timeout control (same pattern as agent-client.js).
 *
 * Security (T-04-01):
 *   NOVA_TYP_API_KEY is read exclusively from process.env; it is never logged
 *   or returned to callers. assertTypConfig() throws early if env vars are absent.
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
 * Forward a chat stream request to TYP using admin credentials.
 * Replaces: the Authorization: authHeader forwarding in streamChatHandler.
 * Returns the raw fetch Response for streaming.
 *
 * @param {string} targetUrl — full TYP stream URL already constructed by caller
 * @param {object} upstreamPayload — JSON body
 * @param {Function} fetchWithTimeout — injected by caller (same pattern as agent-client.js)
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
export async function requestTypChatStream(targetUrl, upstreamPayload, fetchWithTimeout, timeoutMs) {
  const { key } = assertTypConfig();
  return fetchWithTimeout(
    targetUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(upstreamPayload),
    },
    timeoutMs,
    "Chat upstream request"
  );
}
