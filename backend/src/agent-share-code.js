// Public share-code shape guard for the two unauthenticated share proxies
// (GET /api/agent/share/artifact/:shareCode and /api/agent/share/trace/:shareCode).
// Leading char class + {15,127} requires MIN total length 16 (1+15), max 128 —
// a conservative raise from the previous min of 8. The per-IP rate limiter on these
// routes is the primary brute-force mitigation; this is defense-in-depth.
// UPSTREAM FLOOR CONFIRMED (read from nullalis source): both share surfaces generate
// codes of EXACTLY 16 chars from alphabet [a-z0-9] — artifact via src/artifacts/store.zig
// (SHARE_CODE_LEN=16) and trace via src/gateway.zig (SHARE_CODE_LEN=16). So min 16
// accepts every valid link, but with ZERO margin. Do NOT bump to {23,127} (min 24):
// at min 24 today it would 400 every legitimate 16-char code. Raise it only in lockstep
// with a nullalis SHARE_CODE_LEN increase.
export const AGENT_SHARE_CODE_SAFE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{15,127}$/;

export function isSafeAgentShareCode(shareCode) {
  return AGENT_SHARE_CODE_SAFE_PATTERN.test(String(shareCode || "").trim());
}
