# Phase 1 — ZAKI Mints Sessions: Code Review

**Reviewer:** Claude (gsd-code-reviewer)
**Depth:** standard + cross-file
**Files Reviewed:** 5

---

## Summary

The Phase 1 implementation is structurally sound. The token minting, rotation, and revocation logic correctly follows the locked decisions: HS256/15-min access JWTs, sha256-hashed refresh tokens, 30-day TTL, HttpOnly cookies, atomic rotation via `FOR UPDATE`, and best-effort TYP integration with AbortController timeout. The `withDbTransaction` + `FOR UPDATE` pattern in `rotateRefreshToken` correctly handles concurrent rotation attempts.

Ten findings follow, ordered by severity. No critical data-loss or authentication bypass was found. The two highest-severity issues are: (1) `getSigningKey()` silently produces a zero-length or short key when `ZAKI_JWT_SIGNING_KEY` contains non-hex characters — the format check only runs in production; and (2) the pre-flight SELECT outside the transaction in `handleRefresh` introduces a double-lookup that is redundant and slightly inconsistent, though not a correctness bug.

---

## Findings

---

### F-01 — HIGH: `getSigningKey()` silently accepts malformed hex, producing a short or zero-length key

**File:** `zaki-auth.js`, line 22

**Description:** `getSigningKey()` checks only that `hex` is truthy (line 17–20), then calls `Buffer.from(hex, "hex")`. Node's `Buffer.from` with the `"hex"` encoding silently stops at the first invalid character and returns whatever bytes were decoded. A value like `"deadbeefXX..."` yields 4 bytes instead of 32; a value with no valid hex at all yields a 0-byte buffer. `jose` requires a minimum of 256 bits (32 bytes) for HS256 — it will throw at `sign()` time, but the error message will be a jose internal error, not a clear misconfiguration message. The format guard (`/^[0-9a-f]{64}$/i`) only runs inside `validateRuntimeConfig`'s production branch (config-validation.js line 248), so this bug is live in staging/dev where a misconfigured key would cause cryptic 500s on every login attempt.

**Fix:** Add the format check inside `getSigningKey()` so it fires in all environments:

```js
function getSigningKey() {
  const hex = process.env.ZAKI_JWT_SIGNING_KEY;
  if (!hex) {
    const err = new Error("[ZakiAuth] ZAKI_JWT_SIGNING_KEY not set");
    err.code = "SIGNING_KEY_MISSING";
    throw err;
  }
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    const err = new Error("[ZakiAuth] ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256-bit)");
    err.code = "SIGNING_KEY_INVALID";
    throw err;
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}
```

---

### F-02 — HIGH: Refresh handler has a redundant pre-flight SELECT outside the transaction (TOCTOU window + inconsistency)

**File:** `auth-endpoints.js`, lines 62–81

**Description:** `handleRefresh` performs a `dbGet` SELECT (outside any transaction, line 62–70) to fetch `user_id` and `email`, then immediately calls `rotateRefreshToken(tokenHash, zakiUser, req)`, which performs its own `SELECT ... FOR UPDATE` inside a transaction. This creates two problems:

1. **TOCTOU window:** The pre-flight SELECT reads the session as valid. Before `withDbTransaction` acquires the `FOR UPDATE` lock, a concurrent logout could revoke the session. The transaction will correctly catch this (SESSION_NOT_FOUND), but the pre-flight SELECT result is already being used to construct `zakiUser`. This is not a correctness bug today — `zakiUser.email` is stable data — but it sets a fragile precedent and adds an unnecessary DB round-trip on every refresh.

2. **Inconsistency:** The pre-flight SELECT uses `revoked_at IS NULL AND expires_at > NOW()` but does not join `zaki_users`. The subsequent transaction SELECT does not re-fetch user data. If `zakiUser` construction ever needs fresher fields (e.g., account suspended flag added in Phase 2), this pattern will silently use stale data.

**Fix:** Remove the pre-flight SELECT entirely. Look up the user inside `rotateRefreshToken`'s transaction by joining `zaki_users` from within the transaction's `SELECT ... FOR UPDATE` query. Pass only `tokenHash` and `req` to a revised `rotateRefreshToken` signature, and have it return the `zakiUser` fields alongside the new tokens.

---

### F-03 — MEDIUM: `cleanupExpiredSessions()` interpolates a module-scope constant directly into SQL

**File:** `zaki-auth.js`, lines 12 and 164

**Description:** `CLEANUP_AGE_INTERVAL = "7 days"` is interpolated into the SQL string via a template literal: `` INTERVAL '${CLEANUP_AGE_INTERVAL}' ``. While this constant is never user-controlled, it is a module-scope `const` string. If the value is ever changed to something that embeds a quote (e.g., `` "7 days'; DROP TABLE" `` during a refactor or test), the interpolation becomes a SQL injection point. The pattern is also inconsistent with every other query in the codebase, which uses parameterized `$N` placeholders.

**Fix:** Use a hardcoded literal in the SQL string rather than a template variable, or — if the interval must be configurable — validate it against an allowlist before interpolation:

```js
// Option A: hardcode the interval directly
`DELETE FROM zaki_sessions WHERE expires_at < NOW() - INTERVAL '7 days' OR ...`

// Option B: allowlist check before interpolation
const ALLOWED_INTERVALS = ["7 days", "30 days"];
if (!ALLOWED_INTERVALS.includes(CLEANUP_AGE_INTERVAL)) throw new Error("Invalid interval");
```

---

### F-04 — MEDIUM: Plaintext user password forwarded to TYP admin API during nova user creation

**File:** `login-handler.js`, lines 138–144

**Description:** When a user logs in and has no `nova_user_id`, the handler calls `novaAdminFetch("/v1/admin/users/new", { body: JSON.stringify({ ..., password: String(password) }) })` with the user's plaintext login password. This means every new user's password is transmitted to the TYP admin service verbatim. The comment acknowledges this as legacy code scheduled for removal in Phase 4, but it represents an active credential-exposure risk: if TYP logs request bodies, the password appears in TYP's logs. This is Phase 1 scope because `loginHandler` was refactored into this file as part of Phase 1.

**Fix (interim until Phase 4):** Generate a random credential for TYP account creation instead of forwarding the user's password:

```js
body: JSON.stringify({
  username: normalizedEmail,
  password: crypto.randomBytes(24).toString("base64url"), // TYP credential, not user's password
  role: "default",
}),
```

---

### F-05 — MEDIUM: `bcrypt.compareSync` blocks the Node event loop during login

**File:** `login-handler.js`, line 118

**Description:** `bcrypt.compareSync` is synchronous. bcrypt with cost factor 10–12 takes 100–300 ms of CPU. On a single-threaded Node server, a burst of concurrent login attempts will serialize all other requests (including health checks, ongoing streams, etc.) behind the bcrypt work. `bcryptjs` exposes `bcrypt.compare()` (async, uses `setImmediate` to yield). This is particularly relevant now that Phase 1 added the ZAKI session mint after bcrypt — the blocking window is the same, but the call site is now the canonical login path.

**Fix:**

```js
// Replace:
if (!bcrypt.compareSync(String(password), user.password_hash)) {

// With:
if (!(await bcrypt.compare(String(password), user.password_hash))) {
```

---

### F-06 — MEDIUM: Cookie value not URL-decoded in `parseRefreshCookie`

**File:** `auth-endpoints.js`, lines 21–35

**Description:** The manual cookie parser returns the raw cookie value without calling `decodeURIComponent`. The refresh token is 64 hex characters (0-9a-f), which contains no characters requiring percent-encoding, so this is harmless today. However, if any intermediate proxy or browser were to percent-encode the value (e.g., `%3D` for padding, or if the token format changes), `sha256Hex(rawToken)` would hash the encoded string and fail to match the stored hash, producing a silent 401. The locked decision specifies `crypto.randomBytes(32).hex` which is always safe hex, but the parser is also used for logout and should be robust.

**Fix:** Add `decodeURIComponent` with a fallback:

```js
const value = trimmed.slice(eqIdx + 1).trim();
try {
  return decodeURIComponent(value);
} catch {
  return value;
}
```

---

### F-07 — MEDIUM: `mintZakiSession` does not validate `zakiUser.id` type before inserting

**File:** `zaki-auth.js`, lines 50–70

**Description:** `mintZakiSession` accepts `zakiUser.id` directly and passes it as `$1` to the INSERT. The `loginHandler` passes `user.id` from `SELECT *`, which could be a string or number depending on the pg driver and column type. `signAccessToken` correctly wraps it in `String(zakiUser.id)` for the JWT sub claim (line 37), but the DB insert at line 59 passes the raw value. If the pg driver returns `user.id` as a string and `user_id` column is `INTEGER`, pg will coerce it silently. The risk is that a non-numeric `user.id` (e.g., from a schema change to UUID) would insert `null` or throw without a clear error message.

**Fix:** Normalize at the entry point:

```js
export async function mintZakiSession(zakiUser, req) {
  const userId = zakiUser.id != null ? String(zakiUser.id) : (() => { throw new Error("zakiUser.id required"); })();
  // use userId in INSERT and String(userId) in signAccessToken
```

Or accept that pg handles coercion and document the expected type in the JSDoc (`@param {{id:number, email:string}}`).

---

### F-08 — INFO: `novaUserId` is resolved but never read — dead code branch in Phase 1

**File:** `login-handler.js`, lines 127–181

**Description:** The novaUserId resolution block (lines 128–181) assigns to `novaUserId` through several branches but the variable is never referenced after line 181. The ZAKI session is minted with `user.id` (not `novaUserId`) and the response contains only the ZAKI JWT. The entire block runs — including two potential network calls to TYP — without any effect on the Phase 1 output. This is intentional legacy scaffolding, but the comment only says "Phase 4 removes this" without explaining what the block currently accomplishes. If TYP user creation fails mid-way (e.g., `createResp.status === 401`, line 154), it returns a `401` to the client, which means the block CAN gate the login response even though its output variable is unused.

**Fix:** Add a clear inline comment explaining that this block has side effects (DB `nova_user_id` update) even though `novaUserId` itself is unused in Phase 1 output, and that the early-return 401/400 paths are intentional gates:

```js
// Phase 1 NOTE: novaUserId is not used in ZAKI session minting.
// This block's value is its side effects: updating nova_user_id in DB, and gatekeeping
// on TYP multi-user mode (the 401 early return). Phase 4 removes this block entirely.
```

---

### F-09 — INFO: `sha256Hex` is duplicated across `zaki-auth.js` and `auth-endpoints.js`

**File:** `zaki-auth.js` line 29, `auth-endpoints.js` line 37

**Description:** Both files define an identical `sha256Hex` function. This is a minor DRY violation — if the hashing approach needs to change (e.g., to BLAKE3 or to add a HMAC), two callsites must be updated consistently.

**Fix:** Export `sha256Hex` from `zaki-auth.js` and import it in `auth-endpoints.js`:

```js
// zaki-auth.js
export function sha256Hex(value) { ... }

// auth-endpoints.js
import { ..., sha256Hex } from "./zaki-auth.js";
```

---

### F-10 — INFO: `REFRESH_TOKEN_TTL_MS` and cookie-builder constants are duplicated across `login-handler.js` and `auth-endpoints.js`

**File:** `login-handler.js` lines 17–21, `auth-endpoints.js` lines 11–14

**Description:** `REFRESH_TOKEN_TTL_MS`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_PATH`, and the `buildRefreshCookie` / `buildClearedRefreshCookie` functions exist in both files with identical implementations. A drift in any one constant (e.g., changing cookie path) requires two edits and risks inconsistency — notably, `buildClearedRefreshCookie` only exists in `auth-endpoints.js` while `buildRefreshCookie` exists in both.

**Fix:** Extract all cookie-related constants and builder functions into a shared `cookie-utils.js` (or into `zaki-auth.js`) and import from both `login-handler.js` and `auth-endpoints.js`.

---

## Correctness vs. Locked Decisions

| Decision | Status |
|---|---|
| HS256, TTL 15 min | Correct (line 10, 35, 40) |
| Payload `{iss, sub, email, jti, iat, exp}` | Correct (lines 34–41) |
| `kid` header from env, default "v1" | Correct (line 35 via `getKid()`) |
| Signing key: lazy-loaded, not module-scope | Correct (lines 15–23, comment confirms) |
| Refresh token: `randomBytes(32).hex` | Correct |
| Stored as sha256 hash | Correct |
| Refresh TTL 30 days | Correct (11ms constant) |
| Cookie: HttpOnly, Secure in prod, SameSite=Strict | Correct (lines 41–44) |
| Cookie Domain `.chatzaki.com`, Path `/api/auth/refresh` | Correct |
| No cookie-parser — manual parse | Correct |
| TYP: best-effort, 5s AbortController, login succeeds on failure | Correct |
| Rate limit refresh: 60/15min/IP | Correct |
| Login response `{valid:true, token:<ZAKI JWT>}` | Correct — TYP token never in response |
| Missing key → production startup failure | Correct via `enforceRuntimeConfig` |
| `X-Zaki-Session-Upgrade` in CORS `exposedHeaders` | Present (index.js line 2091) |
| Imports in index.js (lines 93–94) | Correct |
| Route registration (lines 5271–5273) | Correct order |

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard + cross-file_
