// Public share-code shape guard for the two unauthenticated share proxies
// (GET /api/agent/share/artifact/:shareCode and /api/agent/share/trace/:shareCode).
// Leading char class + {15,127} requires MIN total length 16 (1+15), max 128 —
// a conservative raise from the previous min of 8. The per-IP rate limiter on these
// routes is the primary brute-force mitigation; this is defense-in-depth. Bump to
// {23,127} (min 24) once Nullclaw's minimum share-code length is confirmed.
export const AGENT_SHARE_CODE_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;

export function isSafeAgentShareCode(shareCode) {
  return AGENT_SHARE_CODE_SAFE_PATTERN.test(String(shareCode || "").trim());
}
