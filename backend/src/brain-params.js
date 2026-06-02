// Brain endpoint query-param hardening.
//
// The brain routes proxy client query params straight to the Nullalis upstream.
// Unbounded values (max_nodes, depth, limit, …) are an abuse / DoS vector
// (huge upstream queries, multi-MB payloads, frontend OOM). These helpers clamp
// numeric params into safe ranges and validate the memory key/cursor before
// proxying. Pure + dependency-free so they unit-test without the server.

export const BRAIN_LIMITS = Object.freeze({
  MAX_NODES: 8000,
  DEPTH: 6,
  LIMIT: 1000,
  WINDOW_DAYS: 365,
  KEY_MAX_LEN: 512,
  CURSOR_MAX_LEN: 1024,
});

// True if the string contains an ASCII control char (NUL..US or DEL). Done by
// char code to avoid embedding literal control bytes in source.
function hasControlChars(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Clamp an integer query param into [min, max]. Returns a string (for
 * URLSearchParams) or undefined if the input isn't a finite number.
 */
export function clampIntParam(raw, min, max) {
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return undefined;
  return String(Math.min(max, Math.max(min, n)));
}

/** Clamp a float query param into [min, max]; undefined if not finite. */
export function clampFloatParam(raw, min, max) {
  const n = Number.parseFloat(String(raw));
  if (!Number.isFinite(n)) return undefined;
  return String(Math.min(max, Math.max(min, n)));
}

/**
 * Memory keys are path segments forwarded to the upstream. Accept a bounded,
 * control-char-free key. Returns true if safe to forward.
 */
export function isValidMemoryKey(key) {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > BRAIN_LIMITS.KEY_MAX_LEN) return false;
  return !hasControlChars(key);
}

/** Pagination cursors are opaque but should be bounded + control-char free. */
export function isValidCursor(cursor) {
  if (typeof cursor !== "string") return false;
  if (cursor.length === 0 || cursor.length > BRAIN_LIMITS.CURSOR_MAX_LEN) return false;
  return !hasControlChars(cursor);
}
