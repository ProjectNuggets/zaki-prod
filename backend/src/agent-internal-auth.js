export const INTERNAL_AGENT_SMOKE_PATHS = Object.freeze([
  "/api/agent/chat/stream",
  "/api/agent/diagnostics",
  "/v1/me/bot/chat/stream",
]);

function getHeader(headers, name) {
  if (!headers || typeof headers !== "object") return "";
  const target = String(name || "").trim().toLowerCase();
  for (const [rawKey, rawValue] of Object.entries(headers)) {
    if (String(rawKey || "").trim().toLowerCase() !== target) continue;
    if (Array.isArray(rawValue)) {
      return String(rawValue[0] || "").trim();
    }
    return String(rawValue || "").trim();
  }
  return "";
}

export function resolveInternalAgentSmokeRequest(req, expectedToken) {
  const configuredToken = String(expectedToken || "").trim();
  if (!configuredToken) {
    return { mode: "disabled" };
  }

  const requestPath = String(req?.path || req?.originalUrl || "")
    .split("?")[0]
    .trim();
  if (!INTERNAL_AGENT_SMOKE_PATHS.includes(requestPath)) {
    return { mode: "disabled" };
  }

  const presentedToken = getHeader(req?.headers, "x-internal-token");
  const presentedUserId = getHeader(req?.headers, "x-zaki-user-id");

  if (!presentedToken && !presentedUserId) {
    return { mode: "none" };
  }
  if (!presentedToken) {
    return { mode: "error", status: 401, body: { error: "Missing internal token." } };
  }
  if (presentedToken !== configuredToken) {
    return { mode: "error", status: 401, body: { error: "Invalid internal token." } };
  }
  if (!/^[1-9][0-9]*$/.test(presentedUserId)) {
    return {
      mode: "error",
      status: 400,
      body: { error: "Invalid user.", code: "invalid_user_id" },
    };
  }

  return {
    mode: "authorized",
    userId: presentedUserId,
  };
}
