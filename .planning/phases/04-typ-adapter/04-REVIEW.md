---
phase: 04-typ-adapter
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - backend/src/typ-client.js
  - backend/src/index.js
  - backend/src/login-handler.js
  - backend/src/db.js
  - backend/migrations/drop_typ_session_token.sql
  - backend/src/typ-client.test.js
  - backend/src/login-handler.test.js
  - backend/src/login-zaki.integration.test.js
status: fixed
critical: 0
high: 1
medium: 1
info: 2
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The Phase 4 TYP adapter is structurally sound. `typ-client.js` correctly isolates all TYP calls behind a single module boundary, reads `NOVA_TYP_API_KEY` exclusively from `process.env`, never logs it or exposes it to callers, and fails fast via `assertTypConfig()` when env vars are absent. The `db.js` migration is idempotent (`DROP COLUMN IF EXISTS`), correctly placed after `CREATE TABLE`, and duplicated cleanly in the standalone SQL migration file.

Two issues require attention:

1. **`streamChatHandler` in `index.js` skips workspace authorization.** It uses `requireAuthUser` (basic JWT validation only) rather than `requireWorkspaceAccess`, so an authenticated ZAKI user with `nova_user_id = NULL` — or any user — can send chat requests to arbitrary workspace slugs without the system verifying they have TYP visibility for that workspace. All other workspace-sensitive routes (document upload, thread create, workspace delete, etc.) go through `requireWorkspaceAccess`. The stream handler is the only gap.

2. **`loginHandler` has unreachable TYP TLS error branches.** Phase 4 removed the TYP network call from login entirely. The `catch` block still contains three TLS-specific branches (`CERT_HAS_EXPIRED`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `ERR_TLS_CERT_ALTNAME_INVALID`) that reference NOVA.TYP in their messages and codes. These branches can never be triggered from inside `loginHandler` — but they are a correctness hazard: any future error with a matching `.cause.code` (e.g., from a bcrypt library or DB driver) would produce a misleading 502 TYP TLS response instead of the correct 500.

Two additional informational items are noted: `novaSessionRequest` still forwards the user JWT to TYP for session validation (an intentional but undocumented exception to `typ-client.js`'s stated contract), and `streamChatHandler` logs `originalMessage.length` before checking if `originalMessage` is empty, producing a minor log noise risk on invalid requests.

---

## High

### HR-01: `streamChatHandler` missing workspace authorization — users can chat against any workspace slug

**File:** `backend/src/index.js:7513`
**Issue:** `streamChatHandler` calls `requireAuthUser` (ZAKI JWT validation only) and then forwards the request directly to TYP via `requestTypChatStream` without verifying that the authenticated user has TYP visibility for the requested `slug`. Every other workspace-sensitive handler goes through `requireWorkspaceAccess`, which (a) checks `zakiUser.nova_user_id` is non-null and (b) calls `workspaceVisibleForSession` to confirm the slug appears in the user's TYP workspace list. `streamChatHandler` has neither check.

Consequence: A ZAKI user whose `nova_user_id` is NULL can still POST chat requests. More broadly, any authenticated ZAKI user can send messages to a workspace slug they do not own or have access to in TYP. TYP's own auth may reject these requests, but ZAKI should enforce the boundary at its own layer — consistent with every other route in the file.

**Fix:** Replace the `requireAuthUser` call with `requireWorkspaceAccess`, which already returns `{ zakiUser, email, slug }`. The handler already reads `slug` from `req.params` anyway:

```js
// Before (line 7513-7519):
const authResult = await requireAuthUser(req, res);
if (!authResult) {
  console.error("[Chat] Authorization failed");
  return;
}
const userEmail = authResult.email;
const zakiUser = authResult.zakiUser;

// After:
const access = await requireWorkspaceAccess(req, res);
if (!access) return;
const { email: userEmail, zakiUser } = access;
// access.slug is already normalized — use it instead of re-deriving req.params.slug at line 7598
```

If the looser behavior for stream-chat is intentional (e.g., TYP enforces auth downstream), add an explicit code comment explaining the deliberate decision and add a `nova_user_id` null guard at minimum:

```js
if (!zakiUser.nova_user_id) {
  return res.status(403).json({ error: "Chat requires a linked TYP account." });
}
```

---

## Medium

### MR-01: Dead TYP TLS error branches in `loginHandler` catch block

**File:** `backend/src/login-handler.js:69-97`
**Issue:** The `catch` block inspects `err?.cause?.code` for TLS-specific codes (`CERT_HAS_EXPIRED`, `DEPTH_ZERO_SELF_SIGNED_CERT`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ERR_TLS_CERT_ALTNAME_INVALID`) and returns 502 responses referencing `NOVA.TYP`. Phase 4 removed the TYP `fetch()` call from `loginHandler` entirely — the only remaining async operations are `dbGet` and `bcrypt.compare`. Neither can produce TLS certificate errors.

These branches are dead code, but they are also a correctness hazard: if any library ever throws with a matching `.cause.code` the login route will return a 502 TYP-TLS error body instead of the correct 500, and the client will display a misleading message about the TYP certificate.

**Fix:** Remove the three TLS-specific branches. The final `err.message === "fetch failed"` fallback can also be removed or simplified since no `fetch()` is called:

```js
// Replace the entire catch block with:
} catch (err) {
  const message = err?.message || "Server error.";
  res.status(500).json({ valid: false, token: null, message, error: message });
}
```

---

## Info

### IN-01: `novaSessionRequest` forwards user JWT to TYP — undocumented exception to `typ-client.js` contract

**File:** `backend/src/index.js:1990-2007` (called at lines 3483-3486 and 8351)
**Issue:** `novaSessionRequest` forwards the raw `Authorization: Bearer <userJWT>` header from the incoming request to TYP's `/system/refresh-user` endpoint. This is a session-validation path (not a data path), but it directly contradicts the stated contract in `typ-client.js` ("Never forwards a user session token to TYP"). There is no comment explaining the exception.

This is not a regression from Phase 4, but the new module-level contract creates a documentation gap that could confuse future reviewers or lead to incorrect refactors.

**Fix:** Add a comment at `novaSessionRequest` explaining why it is exempt from the `typ-client.js` adapter pattern:

```js
/**
 * Session validation path only. Forwards the user's ZAKI JWT to TYP's
 * /system/refresh-user endpoint so TYP can validate and return the user profile.
 * This is the ONE sanctioned place where a user token crosses to TYP.
 * All workspace/chat data calls MUST go through typ-client.js (admin key only).
 */
async function novaSessionRequest(path, authHeader, options = {}) {
```

### IN-02: `streamChatHandler` logs `originalMessage.length` before empty-message guard

**File:** `backend/src/index.js:7526`
**Issue:** `console.log('[Chat] Message length: ${originalMessage.length}')` executes before the `if (!originalMessage)` check at line 7528. If `originalMessage` is an empty string (or a string that `extractStreamMessage` returns as `""`), the length is logged as `0` and the handler then returns 400 — but a request with a missing body or unparseable payload could also result in `originalMessage` being `undefined` or `null`, in which case `.length` would throw a `TypeError` that bypasses the 400 and falls into the 500 catch path.

**Fix:** Move the empty-message guard above the log line, or ensure `extractStreamMessage` always returns a string (add a `|| ""` fallback in the return):

```js
const originalMessage = extractStreamMessage(requestPayload) || "";
// Now .length is always safe:
console.log(`[Chat] Message length: ${originalMessage.length}`);
if (!originalMessage) {
  return res.status(400).json({ error: "Message is required." });
}
```

---

## Items Confirmed Clean

- **`typ-client.js`**: Admin key read from `process.env` only, never logged, `assertTypConfig()` throws early. All three exports (`fetchTypWorkspaces`, `fetchTypWorkspaceSlugs`, `requestTypChatStream`) use admin credentials exclusively. No user token forwarding.
- **`db.js` lines 936-939**: `ALTER TABLE zaki_sessions DROP COLUMN IF EXISTS typ_session_token` is idempotent, correctly placed after the `CREATE TABLE IF NOT EXISTS zaki_sessions` block.
- **`migrations/drop_typ_session_token.sql`**: Matches the inline migration in `db.js`. Idempotency note is accurate.
- **`typ-client.test.js`**: Covers all three exports plus missing-env-var cases. `beforeEach`/`afterEach` correctly save and restore env vars. The admin-key assertion (`expect(authHeader).toBe("Bearer test-admin-key")`) directly verifies the security contract.
- **`login-handler.test.js`**: TYP mock removed cleanly. No lingering `fetch` mocks.
- **`login-zaki.integration.test.js`**: OATH-05 test now verifies login completes without any TYP network call (no `fetch` mock required — passes by absence).
- **`listWorkspacesHandler` (index.js:3523)**: Has `nova_user_id` null guard before calling `fetchTypWorkspaces`. Clean.
- **`requireWorkspaceAccess` (index.js:2356)**: Has `nova_user_id` null guard. All handlers that call it are protected.

---

_Reviewed: 2026-05-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
