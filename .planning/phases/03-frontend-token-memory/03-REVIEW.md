---
phase: 03-frontend-token-memory
reviewed: 2026-05-02T00:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/stores/authStore.ts
  - src/lib/api.ts
  - src/app/App.tsx
  - src/queries/useAuth.ts
  - src/lib/productTelemetry.ts
  - src/stores/authStore.test.ts
  - src/lib/api.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

The Phase 03 implementation correctly achieves its primary goals. No localStorage auth token reads remain in `src/`. The `authStore` is a clean pure in-memory Zustand store with no external dependencies. `api.ts` reads the token from the store, the `X-Zaki-Session-Upgrade` fire-and-forget interceptor is in place, and the `_isRetry` flag prevents a recursive refresh loop. The boot hydration useEffect in `App.tsx` is well-structured with an `isMounted` guard and a `finally` block ensuring `isHydrating` is always set to `false`.

Three issues require attention before this phase is closed:

1. A logic gap in the 401 retry path: when refresh succeeds but the retried request also returns 401, the code silently returns 401 to the caller instead of redirecting to login. The accompanying test asserts this case redirects, but it does not actually do so, and the test's assertion is too weak to catch the failure.
2. No in-flight deduplication for `refreshAccessToken()`. Multiple concurrent 401 responses in the same page load (or a 401 coinciding with an `X-Zaki-Session-Upgrade` header) each fire their own `POST /api/auth/refresh`, sending several simultaneous refresh requests. This is a correctness and server-load issue.
3. `backendAuthRequest` routes through `backendRequest`, which does not send `credentials: "include"` and has no 401-retry behavior. All billing, admin, billing-portal, and entitlements calls go through this path and silently return 401 without triggering a refresh or redirect.

---

## Warnings

### WR-01: 401-on-retry does not redirect — silently returns 401 to caller

**File:** `src/lib/api.ts:171-184`

**Issue:** When a 401 triggers the refresh path and refresh succeeds (newToken is truthy), the code calls `apiRequest(path, options, true)`. If that retried request also returns 401, the inner call has `_isRetry=true` so it skips the 401 block entirely and returns the 401 `Response` object back to the outer call. The outer call returns that value directly (line 184: `return response` — but the outer call has already exited via `return apiRequest(...)` at line 175). The net result: `apiRequest` returns the 401 to the caller with no logout and no redirect. The user session is in a broken state: token in store, but server rejecting it.

The test at `api.test.ts:193-208` is titled "on 401 from retry itself, redirects to login" but the assertion only checks that `window` is defined (which is always true from `beforeEach`) — it does not check `window.location.href === "/"`. The test passes regardless of whether the redirect happens.

**Fix:**

```typescript
// In apiRequest, change the retry call to handle its result:
if (!skipAuth && response.status === 401 && !_isRetry) {
  const newToken = await refreshAccessToken();
  if (newToken) {
    const retryResponse = await apiRequest(path, options, true);
    // If the retry also 401s, treat it the same as a failed refresh
    if (retryResponse.status === 401) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        window.location.href = "/";
      }
      return retryResponse;
    }
    return retryResponse;
  }
  // Refresh failed — redirect to login
  if (typeof window !== "undefined") {
    useAuthStore.getState().logout();
    window.location.href = "/";
  }
}
```

Also update `api.test.ts:207` to assert `window.location.href === "/"` rather than just `expect(window).toBeDefined()`.

---

### WR-02: No in-flight deduplication for `refreshAccessToken()` — concurrent refresh storms possible

**File:** `src/lib/api.ts:112-128, 164-175`

**Issue:** `refreshAccessToken()` is a plain `async` function with no singleton lock. Two scenarios produce concurrent refresh calls:

**Scenario A.** Multiple `apiRequest` calls fire simultaneously (e.g., five components each fetch on mount). If the token is expired and the server returns 401 for all five, each enters the 401 block independently and calls `refreshAccessToken()`. Five concurrent `POST /api/auth/refresh` requests are sent. Most will use a stale cookie and may each try to rotate the refresh cookie, causing race conditions on the server.

**Scenario B.** A single response carries both `X-Zaki-Session-Upgrade: 1` AND `status: 401` (unusual but possible if the backend emits the header before finalizating the status, or during a transient degraded state). The session-upgrade block (line 166-168) fires `void refreshAccessToken()`, then the 401 block (line 171-182) immediately calls `refreshAccessToken()` again awaited. Two refresh calls race for the same cookie.

**Fix:** Introduce a module-level refresh promise singleton:

```typescript
let _refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(buildApiUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      if (data.token) {
        useAuthStore.getState().setToken(data.token);
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}
```

This collapses all concurrent callers onto one in-flight refresh. All waiting callers receive the same resolved token (or null) without sending duplicate requests.

---

### WR-03: `backendAuthRequest` has no 401-retry behavior and does not send `credentials: "include"`

**File:** `src/lib/api.ts:214-225`

**Issue:** `backendAuthRequest` delegates to `backendRequest`, which uses a plain `fetch` call with no `credentials: "include"` and no 401 interceptor. This means all calls routed through `backendAuthRequest` — including billing checkout, billing cancel, billing portal, admin endpoints, entitlements, profile updates, legal re-consent, and access code redemption — will silently return 401 to the caller when the token expires during a user session, with no automatic refresh or redirect. The user will experience silent failures on these operations with no feedback unless each call site individually handles 401 (which none currently do — they only check `response.ok`).

This also means the refresh cookie is not sent on these requests. If the backend relies on the refresh cookie for any of these endpoints (e.g., to validate session continuity alongside the Bearer token), those checks will fail.

**Fix:** Route `backendAuthRequest` through `apiRequest` instead of `backendRequest`, or duplicate the 401-retry logic into `backendRequest`. The minimal change:

```typescript
export async function backendAuthRequest(
  path: string,
  options: ApiRequestOptions = {}
) {
  // Use apiRequest for the 401-retry and session-upgrade interceptor.
  // buildApiUrl handles the backend base resolution.
  const base = getBackendBase();
  if (!base) throw new Error("Backend URL not configured.");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url =
    base.endsWith("/api") && normalizedPath.startsWith("/api/")
      ? `${base}${normalizedPath.slice(4)}`
      : `${base}${normalizedPath}`;
  return apiRequest(url, options);
}
```

If routing all backend calls through `apiRequest` creates URL-building conflicts, the alternative is to add `credentials: "include"` to `backendRequest` and implement the same `_isRetry` guard there. Either approach closes the silent-401 gap.

---

## Info

### IN-01: `useLogout` double-clears the token (redundant but harmless)

**File:** `src/queries/useAuth.ts:73-74`

**Issue:** `useLogout.mutationFn` calls both `clearAuthToken()` and `logout()` sequentially. `clearAuthToken()` calls `setToken(null)` which sets `{token: null, user: null, isHydrating: false}`. `logout()` sets the same state. This is two Zustand state writes with identical outcome. The plan acknowledges this as "harmless" but it is unnecessary noise.

**Fix:** Remove `clearAuthToken()` from `useLogout`. `logout()` alone is sufficient:

```typescript
mutationFn: async () => {
  logout(); // clears token, user, isHydrating in one write
},
```

---

### IN-02: After 401-redirect fires, `return response` still executes

**File:** `src/lib/api.ts:178-184`

**Issue:** The redirect path calls `logout()` and `window.location.href = "/"` but does not return early. Execution falls through to the final `return response` on line 184, returning the original 401 `Response` to any caller that awaits the promise (before the page unloads). In practice the browser navigates away before callers can act on it, so there is no user-facing impact. But it is unclear code.

**Fix:** Add an explicit `return response` inside the redirect block, or a `return` before the final `return response`:

```typescript
if (typeof window !== "undefined") {
  useAuthStore.getState().logout();
  window.location.href = "/";
  return response; // page is navigating; caller won't process this
}
```

---

### IN-03: `api.test.ts` redirect assertion is non-functional

**File:** `src/lib/api.test.ts:193-208`

**Issue:** The test titled "on 401 from retry itself, redirects to login and does NOT retry again" asserts `expect((global as Record<string, unknown>).window).toBeDefined()`. This is always true — `window` is set in `beforeEach`. The test never verifies that `window.location.href` was set to `"/"`. This means WR-01 (no redirect on retry-401) is undetected by the test suite.

**Fix:**

```typescript
it("on 401 from retry itself, redirects to login and does NOT retry again", async () => {
  // ... mock setup ...
  const { apiRequest } = await import("@/lib/api");
  await apiRequest("/api/protected", { method: "GET" });

  await new Promise((r) => setTimeout(r, 0));
  expect(mockFetch).toHaveBeenCalledTimes(3);
  // Assert the redirect happened
  expect((global as Record<string, unknown>).window as { location: { href: string } })
    .toMatchObject({ location: { href: "/" } });
});
```

---

### IN-04: Boot hydration has no timeout — slow `POST /api/auth/refresh` blocks the app indefinitely

**File:** `src/app/App.tsx:133-183`

**Issue:** The `hydrate()` function awaits `fetch(buildApiUrl("/api/auth/refresh"), ...)` with no timeout. If the backend is unresponsive, the `isHydrating` spinner renders indefinitely. The user cannot reach the login screen or any public route because the `isHydrating` guard (line 336-348) shows the spinner until `setHydrating(false)` is called, which only happens in the `finally` block — which only fires when the `fetch` settles. A hung connection will block indefinitely.

**Fix:** Wrap the refresh fetch in an `AbortController` with a reasonable timeout (e.g., 10 seconds):

```typescript
async function hydrate() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    // ... rest of hydration logic
  } catch {
    // AbortError from timeout lands here — treat as unauthenticated
    if (isMounted) logout();
  } finally {
    if (isMounted) setHydrating(false);
  }
}
```

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
