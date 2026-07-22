/**
 * TDD tests for api.ts token functions and interceptor logic
 * Plan 03-02: Wire api.ts to Zustand store, add X-Zaki-Session-Upgrade interceptor,
 *             401 retry with _isRetry guard.
 *
 * RED phase: all tests written before implementation changes.
 */

// Mock the authStore so api.ts can import it without circular deps
const mockSetToken = jest.fn();
const mockLogout = jest.fn();
let _storeToken: string | null = null;
let _storeUser: { id?: string; username?: string } | null = null;

jest.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({
      token: _storeToken,
      user: _storeUser,
      setToken: mockSetToken,
      logout: mockLogout,
    }),
  },
}));

// Mock runtimeEnv to give stable URL
jest.mock("@/lib/runtimeEnv", () => ({
  getConfiguredApiBase: () => "http://test.local",
  getConfiguredLegacyApiBase: () => "",
}));

// We will spy on global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const mockLoginRedirect = jest.fn();

// Helper to create a mock Response
function makeResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
    blob: async () =>
      body instanceof Blob
        ? body
        : new Blob([typeof body === "string" ? body : JSON.stringify(body)]),
    clone: function () { return this; },
  } as unknown as Response;
}

function makeZakiAccessToken(subject = "user-1") {
  const payload = btoa(JSON.stringify({ iss: "zaki", sub: subject }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockSetToken.mockReset();
  mockLogout.mockReset();
  _storeToken = null;
  _storeUser = { id: "user-1", username: "user@example.com" };
  mockLoginRedirect.mockClear();
  window.history.replaceState({}, "", "/settings#settings-memory-data");
  const { __setLoginRedirectDispatcherForTests } = await import("@/lib/api");
  __setLoginRedirectDispatcherForTests(mockLoginRedirect);
});

// --------------------------------------------------------------------------
// getAuthToken / setAuthToken / clearAuthToken
// --------------------------------------------------------------------------

describe("getAuthToken", () => {
  it("returns the token from Zustand store (not localStorage)", async () => {
    _storeToken = "zustand-token-abc";
    const { getAuthToken } = await import("@/lib/api");
    expect(getAuthToken()).toBe("zustand-token-abc");
  });

  it("returns null when store has no token", async () => {
    _storeToken = null;
    const { getAuthToken } = await import("@/lib/api");
    expect(getAuthToken()).toBeNull();
  });
});

describe("getFreshAuthToken", () => {
  it("does not use a cached bearer when strict hydration refresh fails", async () => {
    _storeToken = "revoked-in-memory-token";
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: "Refresh revoked" }));

    const { getStrictFreshAuthToken } = await import("@/lib/api");

    await expect(getStrictFreshAuthToken()).resolves.toBeNull();
  });

  it("rejects a candidate refresh request that does not own the active transaction", async () => {
    const { getFreshAuthToken } = await import("@/lib/api");

    await expect(
      getFreshAuthToken({ persist: false, candidateAuthTransaction: {} as never })
    ).resolves.toBeNull();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("can read a candidate refresh token without committing it to the active session", async () => {
    _storeToken = "expired-token";
    mockFetch.mockResolvedValueOnce(makeResponse(200, { token: "candidate-token" }));

    const { beginCandidateAuthTransaction, completeCandidateAuthTransaction, getFreshAuthToken } =
      await import("@/lib/api");
    const transaction = beginCandidateAuthTransaction();
    try {
      await expect(
        getFreshAuthToken({ persist: false, candidateAuthTransaction: transaction })
      ).resolves.toBe("candidate-token");
    } finally {
      completeCandidateAuthTransaction(transaction);
    }

    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it("does not let a mounted request adopt a pending candidate account refresh", async () => {
    const {
      apiRequest,
      beginCandidateAuthTransaction,
      completeCandidateAuthTransaction,
      getFreshAuthToken,
    } = await import("@/lib/api");
    const transaction = beginCandidateAuthTransaction();
    try {
      _storeToken = "account-a-token";
      let resolveCandidateRefresh: (response: Response) => void = () => undefined;
      const candidateRefresh = new Promise<Response>((resolve) => {
        resolveCandidateRefresh = resolve;
      });
      mockFetch
        .mockImplementationOnce(() => candidateRefresh)
        .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
        .mockResolvedValueOnce(makeResponse(200, { data: "must-not-retry-as-account-b" }));
      mockSetToken.mockImplementation((token: string | null) => {
        _storeToken = token;
      });

      const candidateToken = getFreshAuthToken({
        persist: false,
        candidateAuthTransaction: transaction,
      });
      const mountedRequest = apiRequest("/api/protected", {
        method: "GET",
        redirectOnAuthFailure: false,
      });

      resolveCandidateRefresh(makeResponse(200, { token: "account-b-token" }));

      await expect(mountedRequest).resolves.toMatchObject({ status: 401 });
      await expect(candidateToken).resolves.toBe("account-b-token");

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(new Headers(mockFetch.mock.calls[1][1]?.headers).get("Authorization")).toBe(
        "Bearer account-a-token"
      );
    } finally {
      completeCandidateAuthTransaction(transaction);
    }
  });

  it("waits for an older refresh before allowing a candidate transaction to proceed", async () => {
    _storeToken = "account-a-token";
    let resolveRefresh: (response: Response) => void = () => undefined;
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockImplementationOnce(() => pendingRefresh);

    const {
      apiRequest,
      beginCandidateAuthTransaction,
      completeCandidateAuthTransaction,
      waitForCandidateAuthTransaction,
    } = await import("@/lib/api");
    const mountedRequest = apiRequest("/api/protected", {
      method: "GET",
      redirectOnAuthFailure: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const transaction = beginCandidateAuthTransaction();
    try {
      const candidateReady = waitForCandidateAuthTransaction(transaction);
      resolveRefresh(makeResponse(200, { token: "late-account-a-token" }));

      await expect(candidateReady).resolves.toBe(true);
      await expect(mountedRequest).resolves.toMatchObject({ status: 401 });
      expect(mockSetToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    } finally {
      completeCandidateAuthTransaction(transaction);
    }
  });

  it("waits for an older strict hydration refresh before allowing a candidate transaction to proceed", async () => {
    _storeToken = "account-a-token";
    let resolveStrictRefresh: (response: Response) => void = () => undefined;
    const pendingStrictRefresh = new Promise<Response>((resolve) => {
      resolveStrictRefresh = resolve;
    });
    mockFetch.mockImplementationOnce(() => pendingStrictRefresh);

    const {
      beginCandidateAuthTransaction,
      completeCandidateAuthTransaction,
      getStrictFreshAuthToken,
      waitForCandidateAuthTransaction,
    } = await import("@/lib/api");
    const strictRefresh = getStrictFreshAuthToken();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const transaction = beginCandidateAuthTransaction();
    try {
      const candidateReady = waitForCandidateAuthTransaction(transaction);
      let settled = false;
      void candidateReady.then(() => {
        settled = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(settled).toBe(false);

      resolveStrictRefresh(makeResponse(200, { token: "late-account-a-token" }));

      await expect(strictRefresh).resolves.toBeNull();
      await expect(candidateReady).resolves.toBe(true);
    } finally {
      completeCandidateAuthTransaction(transaction);
    }
  });
});

describe("setAuthToken", () => {
  it("calls useAuthStore.getState().setToken with the provided token", async () => {
    const { setAuthToken } = await import("@/lib/api");
    setAuthToken("new-token-xyz");
    expect(mockSetToken).toHaveBeenCalledWith("new-token-xyz");
  });

  it("does not write to localStorage", async () => {
    const spy = jest.spyOn(Storage.prototype, "setItem");
    const { setAuthToken } = await import("@/lib/api");
    setAuthToken("t");
    expect(spy).not.toHaveBeenCalledWith("zaki.auth.token", expect.anything());
    spy.mockRestore();
  });
});

describe("clearAuthToken", () => {
  it("calls useAuthStore.getState().setToken(null)", async () => {
    const { clearAuthToken } = await import("@/lib/api");
    clearAuthToken();
    expect(mockSetToken).toHaveBeenCalledWith(null);
  });

  it("does not call localStorage.removeItem", async () => {
    const spy = jest.spyOn(Storage.prototype, "removeItem");
    const { clearAuthToken } = await import("@/lib/api");
    clearAuthToken();
    expect(spy).not.toHaveBeenCalledWith("zaki.auth.token");
    spy.mockRestore();
  });
});

describe("requestLogout", () => {
  it("posts to the auth logout endpoint with the refresh cookie included", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { success: true }));

    const { requestLogout } = await import("@/lib/api");
    const { response, data } = await requestLogout();

    expect(response.ok).toBe(true);
    expect(data).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });
});

describe("requestCandidateSessionLogout", () => {
  it("revokes only the exact candidate bearer without sending the shared refresh cookie", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { success: true, revoked: true }));

    const { requestCandidateSessionLogout } = await import("@/lib/api");
    const { response, data } = await requestCandidateSessionLogout("candidate-token-b");

    expect(response.ok).toBe(true);
    expect(data).toEqual({ success: true, revoked: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/auth/logout/candidate",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
      })
    );
    const requestOptions = mockFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestOptions.headers).get("Authorization")).toBe(
      "Bearer candidate-token-b"
    );
  });
});

// --------------------------------------------------------------------------
// apiRequest — X-Zaki-Session-Upgrade interceptor
// --------------------------------------------------------------------------

describe("apiRequest — X-Zaki-Session-Upgrade interceptor", () => {
  it("fires a background /api/auth/refresh when header is '1'", async () => {
    const mainResponse = makeResponse(200, { ok: true }, { "x-zaki-session-upgrade": "1" });
    // First call = main request, second call = background refresh
    mockFetch
      .mockResolvedValueOnce(mainResponse)
      .mockResolvedValueOnce(makeResponse(200, { token: "refreshed" }));

    const { apiRequest } = await import("@/lib/api");
    _storeToken = "old-token";
    const res = await apiRequest("/api/some-endpoint", { method: "GET" });

    expect(res.status).toBe(200); // Caller gets original response immediately
    // Give microtasks time to flush (the background refresh is void/fire-and-forget)
    await new Promise((r) => setTimeout(r, 0));
    // Second fetch call should be the refresh
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const refreshCall = mockFetch.mock.calls[1];
    expect(refreshCall[0]).toContain("/api/auth/refresh");
    expect(refreshCall[1]).toMatchObject({ method: "POST", credentials: "include" });
  });

  it("does NOT call /api/auth/refresh when header is absent", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
    const { apiRequest } = await import("@/lib/api");
    _storeToken = "token";
    await apiRequest("/api/data", { method: "GET" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT call /api/auth/refresh when header value is not '1'", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { ok: true }, { "x-zaki-session-upgrade": "0" })
    );
    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/data", { method: "GET" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("skips interceptor when skipAuth=true", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { ok: true }, { "x-zaki-session-upgrade": "1" })
    );
    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/public", { skipAuth: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(1); // No background refresh
  });
});

// --------------------------------------------------------------------------
// apiRequest — 401 retry logic
// --------------------------------------------------------------------------

describe("apiRequest — 401 retry", () => {
  it("on 401, calls /api/auth/refresh then retries original request", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(200, { data: "success" }));

    const { apiRequest } = await import("@/lib/api");
    const res = await apiRequest("/api/protected", { method: "GET" });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // 2nd call is refresh
    expect(mockFetch.mock.calls[1][0]).toContain("/api/auth/refresh");
    // 3rd call is retry of original
    expect(mockFetch.mock.calls[2][0]).toContain("/api/protected");
  });

  it("on 401 from retry itself, redirects to login and does NOT retry again", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Still unauthorized" }));

    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/protected", { method: "GET" });

    // Should only call 3 times, not loop again
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("if /api/auth/refresh returns 401, redirects and does NOT retry", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Refresh also failed" }));

    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/protected", { method: "GET" });

    // No third call — refresh failed, should redirect
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("skips 401 retry when skipAuth=true", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }));
    const { apiRequest } = await import("@/lib/api");
    const res = await apiRequest("/api/public", { skipAuth: true });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh attempt
  });

  it("does not retry a request whose mounted session changed before its 401 arrived", async () => {
    _storeToken = "account-a-token";
    let resolveProtectedRequest: (response: Response) => void = () => undefined;
    const pendingProtectedRequest = new Promise<Response>((resolve) => {
      resolveProtectedRequest = resolve;
    });
    mockFetch.mockImplementationOnce(() => pendingProtectedRequest);

    const { apiRequest, markAuthSessionChanged } = await import("@/lib/api");
    const request = apiRequest("/api/protected", { method: "GET", redirectOnAuthFailure: false });

    _storeToken = "account-b-token";
    markAuthSessionChanged();
    resolveProtectedRequest(makeResponse(401, { error: "Unauthorized" }));

    await expect(request).resolves.toMatchObject({ status: 401 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  it("retries every concurrent request that joined the same same-principal refresh", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(200, { request: "first" }))
      .mockResolvedValueOnce(makeResponse(200, { request: "second" }));

    const { apiRequest } = await import("@/lib/api");
    const [first, second] = await Promise.all([
      apiRequest("/api/protected/one", { method: "GET" }),
      apiRequest("/api/protected/two", { method: "GET" }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(
      mockFetch.mock.calls.filter(([url]) => String(url).includes("/api/auth/refresh"))
    ).toHaveLength(1);
  });

  it("does not adopt a refreshed token whose principal belongs to another tab", async () => {
    _storeToken = "expired-account-a-token";
    _storeUser = { id: "account-a", username: "a@example.com" };
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken("account-b") }));

    const { apiRequest } = await import("@/lib/api");
    const response = await apiRequest("/api/protected", {
      method: "GET",
      redirectOnAuthFailure: false,
    });

    expect(response.status).toBe(401);
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// --------------------------------------------------------------------------
// 401 logout redirects to /?auth=login (LoginScreen), not the marketing site,
// and preserves the current protected route as a safe next target.
// --------------------------------------------------------------------------

// On a session-dead 401 the dead-session branches must (a) log the user out and
// (b) navigate to the LoginScreen at "/?auth=login" — NOT bare "/", which renders
// the marketing homepage with no login. The helper also carries next=/settings...
// so users return to the protected Settings section after re-authentication.
describe("session-dead 401 redirect target", () => {
  it("retries concurrent backend-auth requests that share one same-principal refresh", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(200, { request: "first" }))
      .mockResolvedValueOnce(makeResponse(200, { request: "second" }));

    const { backendAuthRequest } = await import("@/lib/api");
    const [first, second] = await Promise.all([
      backendAuthRequest("/api/profile/one", { method: "GET" }),
      backendAuthRequest("/api/profile/two", { method: "GET" }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      mockFetch.mock.calls.filter(([url]) => String(url).includes("/api/auth/refresh"))
    ).toHaveLength(1);
  });

  it("keeps the mounted app alive when it handles the reauthentication request", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Refresh also failed" }));
    const handleAuthRequired = jest.fn((event: Event) => event.preventDefault());
    window.addEventListener("zaki:auth-required", handleAuthRequired);

    try {
      const { apiRequest } = await import("@/lib/api");
      await apiRequest("/api/protected", { method: "GET" });

      expect(handleAuthRequired).toHaveBeenCalledTimes(1);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockLoginRedirect).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("zaki:auth-required", handleAuthRequired);
    }
  });

  it("builds safe login redirects with protected return targets", async () => {
    const { buildLoginRedirectUrl } = await import("@/lib/api");

    expect(buildLoginRedirectUrl("/settings#settings-memory-data")).toBe(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
    expect(buildLoginRedirectUrl("https://evil.example/settings")).toBe("/?auth=login");
    expect(buildLoginRedirectUrl("//evil.example/settings")).toBe("/?auth=login");

    for (const unsafeReturnTo of [
      "/./\\evil.example/settings",
      "/settings/../\\evil.example/settings",
      "/.//evil.example/settings",
      "/%5cevil.example/settings",
      "/%2f%2fevil.example/settings",
    ]) {
      expect(buildLoginRedirectUrl(unsafeReturnTo)).toBe("/?auth=login");
    }
  });

  it("does not nest next when already on the login screen", async () => {
    window.history.replaceState(
      {},
      "",
      "/?auth=login&next=%2Fspaces%2Fzaky%2Fthreads%2Ft-1"
    );
    const { buildLoginRedirectUrl } = await import("@/lib/api");

    expect(buildLoginRedirectUrl()).toBe(
      "/?auth=login&next=%2Fspaces%2Fzaky%2Fthreads%2Ft-1"
    );
  });

  it("apiRequest: retry-also-401 logs the dead session out", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Still unauthorized" }));

    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/protected", { method: "GET" });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("apiRequest: refresh-failed logs the dead session out", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Refresh also failed" }));

    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/protected", { method: "GET" });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("backendAuthRequest: refresh-failed logs the dead session out", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Refresh also failed" }));

    const { backendAuthRequest } = await import("@/lib/api");
    await backendAuthRequest("/api/profile", { method: "GET" });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("backendAuthRequest: retry-also-401 logs the dead session out", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Still unauthorized" }));

    const { backendAuthRequest } = await import("@/lib/api");
    await backendAuthRequest("/api/profile", { method: "GET" });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockLoginRedirect).toHaveBeenCalledWith(
      "/?auth=login&next=%2Fsettings%23settings-memory-data"
    );
  });

  it("backendAuthRequest can keep passive 401s local without logging out or redirecting", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Refresh also failed" }));

    const { backendAuthRequest } = await import("@/lib/api");
    const response = await backendAuthRequest("/api/agent/sessions", {
      method: "GET",
      redirectOnAuthFailure: false,
    });

    expect(response.status).toBe(401);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockLoginRedirect).not.toHaveBeenCalled();
  });

  it("backendAuthRequest can keep passive retry 401s local without logging out or redirecting", async () => {
    _storeToken = "expired-token";
    mockFetch
      .mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(makeResponse(200, { token: makeZakiAccessToken() }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Still unauthorized" }));

    const { backendAuthRequest } = await import("@/lib/api");
    const response = await backendAuthRequest("/api/agent/sessions", {
      method: "GET",
      redirectOnAuthFailure: false,
    });

    expect(response.status).toBe(401);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockLoginRedirect).not.toHaveBeenCalled();
  });

  it("the dead-session fallback never navigates to the bare marketing route", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path") as typeof import("path");
    const source = fs.readFileSync(path.join(__dirname, "api.ts"), "utf8");

    expect(source).not.toMatch(/window\.location\.href\s*=\s*"\/";/);
  });
});

describe("billing API helpers", () => {
  it("createTopupCheckoutSession posts the selected pack and settings context", async () => {
    _storeToken = "valid-token";
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { success: true, url: "https://checkout.example/topup" })
    );

    const { createTopupCheckoutSession } = await import("@/lib/api");
    const result = await createTopupCheckoutSession("boost_500", { source: "settings" });

    expect(result.data.url).toBe("https://checkout.example/topup");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/billing/topups/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ packId: "boost_500", context: { source: "settings" } }),
      })
    );
  });
});

// --------------------------------------------------------------------------
// apiRequest — credentials: include
// --------------------------------------------------------------------------

describe("apiRequest — credentials include", () => {
  it("sends credentials: include on all requests", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));
    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/data", { method: "GET" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" })
    );
  });
});

describe("fetchAnonymousMeterStatus", () => {
  it("calls meter status without auth headers and keeps cookies attached", async () => {
    _storeToken = "signed-in-token";
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        success: true,
        identity: { type: "anonymous", anonymousSessionId: "anon-1" },
      })
    );

    const { fetchAnonymousMeterStatus } = await import("@/lib/api");
    const { data } = await fetchAnonymousMeterStatus();

    expect(data.identity?.type).toBe("anonymous");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/meter/status",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
    const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });
});

describe("fetchBillingConfig", () => {
  it("uses the public pricing config endpoint when signed out", async () => {
    _storeToken = null;
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        success: true,
        configured: {
          platformPlanAllowances: {
            free: { weeklyAllowanceUnits: 100 },
            personal: { weeklyAllowanceUnits: 1000 },
          },
        },
      })
    );

    const { fetchBillingConfig } = await import("@/lib/api");
    const { data } = await fetchBillingConfig();

    expect(data.configured?.platformPlanAllowances?.free.weeklyAllowanceUnits).toBe(100);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/billing/public-config",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
    const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("uses the authenticated billing config endpoint when signed in", async () => {
    _storeToken = "signed-in-token";
    mockFetch.mockResolvedValueOnce(makeResponse(200, { success: true, configured: {} }));

    const { fetchBillingConfig } = await import("@/lib/api");
    await fetchBillingConfig();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/billing/config",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
    const headers = mockFetch.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer signed-in-token");
  });
});

describe("requestPublicSignup", () => {
  it("includes the Turnstile token when supplied", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { success: true }));

    const { requestPublicSignup } = await import("@/lib/api");
    await requestPublicSignup({
      email: "signup@example.com",
      password: "Password123",
      name: "Signup User",
      legalConsentAccepted: true,
      legalPolicyVersion: "2026-07-12.v4",
      turnstileToken: "turnstile-token",
      returnTo: "/brain?panel=clusters",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/signup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "signup@example.com",
          password: "Password123",
          name: "Signup User",
          legalConsentAccepted: true,
          legalPolicyVersion: "2026-07-12.v4",
          turnstileToken: "turnstile-token",
          returnTo: "/brain?panel=clusters",
        }),
      })
    );
  });

  // WP-M (a) — the wire format carries no birthdate. This is the last line of
  // defence: even if a caller somehow held one, the request body must not.
  it("sends NO date of birth on the wire", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { success: true }));

    const { requestPublicSignup } = await import("@/lib/api");
    await requestPublicSignup({
      email: "signup@example.com",
      password: "Password123",
      name: "Signup User",
      legalConsentAccepted: true,
      legalPolicyVersion: "2026-07-12.v4",
    });

    const body = String(mockFetch.mock.calls[0][1]?.body ?? "");
    expect(body).not.toMatch(/dateOfBirth|date_of_birth|bday/i);

    // `legalPolicyVersion` ("2026-07-12.v4") is date-shaped by design, so exclude it
    // and assert that nothing ELSE in the payload looks like a calendar date — i.e.
    // no birthdate smuggled in under a different key.
    const { legalPolicyVersion: _policyVersion, ...rest } = JSON.parse(body);
    expect(JSON.stringify(rest)).not.toMatch(/\d{4}-\d{2}-\d{2}/);

    // Consent still travels — WP-M removes the birthdate, not the attestation.
    expect(JSON.parse(body)).toMatchObject({ legalConsentAccepted: true });
  });
});

describe("buildGoogleOAuthStartUrl", () => {
  it("includes signed-state consent inputs only for an explicit Google signup acceptance", async () => {
    const { buildGoogleOAuthStartUrl } = await import("@/lib/api");
    const url = new URL(
      buildGoogleOAuthStartUrl("/agent", {
        legalConsentAccepted: true,
        legalPolicyVersion: "2026-07-12.v4",
      })
    );

    expect(url.searchParams.get("returnTo")).toBe("/agent");
    expect(url.searchParams.get("legalConsentAccepted")).toBe("true");
    expect(url.searchParams.get("legalPolicyVersion")).toBe("2026-07-12.v4");
  });
});

describe("agent runtime API clients", () => {
  it("calls the canonical Agent diagnostics facade", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { active: true }));

    const { fetchContextDiagnostics } = await import("@/lib/api");
    const { data } = await fetchContextDiagnostics();

    expect(data.active).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/diagnostics/context",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads runtime sandbox status from the authenticated Agent diagnostics facade", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { sandbox: { enabled: true, backend: "docker" } })
    );

    const { fetchBotRuntimeStatus } = await import("@/lib/api");
    const { data } = await fetchBotRuntimeStatus();

    expect(data.sandbox?.enabled).toBe(true);
    expect(data.sandbox?.backend).toBe("docker");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/diagnostics",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads per-user extension diagnostics through the Agent BFF", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        user_id: "42",
        paired: true,
        connected_at_unix: 1770000000,
        last_command_tool: "extension_navigate",
        last_command_result: "ok",
      })
    );

    const { fetchAgentExtensionDiagnostics } = await import("@/lib/api");
    const { data } = await fetchAgentExtensionDiagnostics();

    expect(data.paired).toBe(true);
    expect(data.last_command_tool).toBe("extension_navigate");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/diagnostics/extension",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads launch Agent channel status through the central channel facade", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        channels: [
          {
            id: "slack",
            label: "Slack",
            configured: true,
            bindings: { count: 1, items: [] },
          },
        ],
      })
    );

    const { fetchAgentChannels } = await import("@/lib/api");
    const { data } = await fetchAgentChannels();

    expect(data.channels?.[0]?.id).toBe("slack");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/channels",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("manages Agent channel identity bindings through channel-scoped BFF routes", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(200, { channel: "discord", items: [] }))
      .mockResolvedValueOnce(makeResponse(200, { status: "upserted", id: "bnd_1" }))
      .mockResolvedValueOnce(makeResponse(200, { status: "deleted" }));

    const {
      listAgentChannelBindings,
      upsertAgentChannelBinding,
      deleteAgentChannelBinding,
    } = await import("@/lib/api");

    await listAgentChannelBindings("discord");
    await upsertAgentChannelBinding("discord", {
      account_id: "main",
      principal_key: "U123",
      scope_key: "C123",
    });
    await deleteAgentChannelBinding("discord", "bnd_1");

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://test.local/api/agent/channels/discord/bindings",
      expect.objectContaining({ method: "GET" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://test.local/api/agent/channels/discord/bindings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          account_id: "main",
          principal_key: "U123",
          scope_key: "C123",
        }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "http://test.local/api/agent/channels/discord/bindings/bnd_1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("calls the Agent channel-control routes", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(200, { channels: [] }))
      .mockResolvedValueOnce(makeResponse(200, { channel: "slack", status: "connected" }))
      .mockResolvedValueOnce(makeResponse(200, { channel: "slack", last_test: { ok: true } }))
      .mockResolvedValueOnce(makeResponse(200, { status: "disconnected", channel: "slack" }));

    const {
      fetchAgentChannelControls,
      connectAgentChannelControl,
      testAgentChannelControl,
      disconnectAgentChannelControl,
    } = await import("@/lib/api");

    await fetchAgentChannelControls();
    await connectAgentChannelControl("slack", {
      slack_bot_token: "xoxb-token",
      slack_signing_secret: "secret",
    });
    await testAgentChannelControl("slack");
    await disconnectAgentChannelControl("slack");

    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://test.local/api/agent/channel-control",
      expect.objectContaining({ method: "GET" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://test.local/api/agent/channel-control/slack/connect",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          slack_bot_token: "xoxb-token",
          slack_signing_secret: "secret",
        }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "http://test.local/api/agent/channel-control/slack/test",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      "http://test.local/api/agent/channel-control/slack/disconnect",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("manages Agent providers, extension devices, and memory governance through BFF routes", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(200, { providers: [] }))
      .mockResolvedValueOnce(makeResponse(201, { id: "prov_1", label: "Local" }))
      .mockResolvedValueOnce(makeResponse(200, { id: "prov_1", last_test: { ok: true } }))
      .mockResolvedValueOnce(makeResponse(200, { status: "deleted", id: "prov_1" }))
      .mockResolvedValueOnce(makeResponse(200, { devices: [] }))
      .mockResolvedValueOnce(makeResponse(201, { device_id: "dev_1", label: "Laptop" }))
      .mockResolvedValueOnce(makeResponse(200, { status: "revoked", device_id: "dev_1" }))
      .mockResolvedValueOnce(makeResponse(200, { total: 12, pii: { all: 2 } }))
      .mockResolvedValueOnce(
        makeResponse(200, {
          category: "all",
          dry_run: true,
          candidate_count: 2,
          deleted: null,
          sample_keys: ["mem_1"],
        })
      )
      .mockResolvedValueOnce(makeResponse(200, { key: "mem_1", forgotten: true }))
      .mockResolvedValueOnce(makeResponse(200, { user_id: "42", count: 1, memories: [] }));

    const {
      fetchAgentProviderProfiles,
      createAgentProviderProfile,
      testAgentProviderProfile,
      deleteAgentProviderProfile,
      fetchAgentExtensionDevices,
      pairAgentExtensionDevice,
      revokeAgentExtensionDevice,
      fetchAgentMemoryGovernance,
      purgeAgentMemoryPii,
      forgetAgentMemory,
      exportAgentMemory,
    } = await import("@/lib/api");

    await fetchAgentProviderProfiles();
    await createAgentProviderProfile({
      provider_kind: "openai_compatible",
      label: "Local",
      base_url: "https://models.example.com/v1",
      api_key: "sk-test",
      model_allowlist: ["gpt-4.1"],
      default_model: "gpt-4.1",
    });
    await testAgentProviderProfile("prov_1");
    await deleteAgentProviderProfile("prov_1");
    await fetchAgentExtensionDevices();
    await pairAgentExtensionDevice({ label: "Laptop" });
    await revokeAgentExtensionDevice("dev_1");
    await fetchAgentMemoryGovernance();
    await purgeAgentMemoryPii({ category: "all", dry_run: true });
    await forgetAgentMemory("mem_1");
    await exportAgentMemory();

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://test.local/api/agent/providers",
      expect.objectContaining({ method: "GET" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://test.local/api/agent/providers",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "http://test.local/api/agent/providers/prov_1/test",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      "http://test.local/api/agent/providers/prov_1",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      "http://test.local/api/agent/extension/devices",
      expect.objectContaining({ method: "GET" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      6,
      "http://test.local/api/agent/extension/devices",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ label: "Laptop" }) })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      7,
      "http://test.local/api/agent/extension/devices/dev_1/revoke",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      8,
      "http://test.local/api/agent/memory/governance",
      expect.objectContaining({ method: "GET" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      9,
      "http://test.local/api/agent/memory/purge-pii",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ category: "all", dry_run: true }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      10,
      "http://test.local/api/agent/memory/forget",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "mem_1" }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      11,
      "http://test.local/api/agent/memory/export",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("cancels active Agent turns through the session-scoped BFF route", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        status: "cancellation_signalled",
        session_key: "agent:zaki-bot:user:42:thread:main",
        was_active: true,
      })
    );

    const { cancelAgentSession } = await import("@/lib/api");
    const { data } = await cancelAgentSession("agent:zaki-bot:user:42:thread:main");

    expect(data.was_active).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/cancel",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("loads Agent context through the encoded session-scoped BFF route", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        active: true,
        live: true,
        context_pressure_percent: 21,
      })
    );

    const { fetchAgentSessionContext } = await import("@/lib/api");
    const { data } = await fetchAgentSessionContext("agent:zaki-bot:user:42:thread:main");

    expect(data.context_pressure_percent).toBe(21);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/context",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("loads Agent todos through the encoded session-scoped BFF route", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        session_key: "agent:zaki-bot:user:42:thread:main",
        current_list_id: "list-a",
        lists: [
          {
            list_id: "list-a",
            title: "Work",
            items: [{ id: 1, title: "Wire API", status: "pending" }],
          },
        ],
      })
    );

    const { fetchAgentSessionTodos } = await import("@/lib/api");
    const controller = new AbortController();
    const { data } = await fetchAgentSessionTodos("agent:zaki-bot:user:42:thread:main", {
      signal: controller.signal,
    });

    expect(data.current_list_id).toBe("list-a");
    expect(data.lists[0].items[0].title).toBe("Wire API");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/todos",
      expect.objectContaining({ method: "GET", signal: controller.signal })
    );
  });

  it("updates Agent todo items through encoded session and list routes", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        session_key: "agent:zaki-bot:user:42:thread:main",
        current_list_id: "list a",
        list: {
          list_id: "list a",
          title: "Work",
          items: [{ id: 2, title: "Render rail", status: "completed" }],
        },
      })
    );

    const { updateAgentSessionTodoItem } = await import("@/lib/api");
    const { data } = await updateAgentSessionTodoItem(
      "agent:zaki-bot:user:42:thread:main",
      "list a",
      2,
      { status: "completed", note: "verified" }
    );

    expect(data.list?.items[0].status).toBe("completed");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/todos/list%20a/items/2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "completed", note: "verified" }),
      })
    );
  });

  it("loads Agent active plans through the encoded session-scoped BFF route", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        session_key: "agent:zaki-bot:user:42:thread:main",
        active: false,
        plan: null,
      })
    );

    const { fetchAgentSessionPlan } = await import("@/lib/api");
    const controller = new AbortController();
    const { data } = await fetchAgentSessionPlan("agent:zaki-bot:user:42:thread:main", {
      signal: controller.signal,
    });

    expect(data.active).toBe(false);
    expect(data.plan).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/plan",
      expect.objectContaining({ method: "GET", signal: controller.signal })
    );
  });

  it("keeps the operator-only Agent history append facade typed", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(201, {
        ok: true,
        status: "inserted",
        message: { id: "bot-1-assistant", role: "assistant" },
      })
    );

    const { appendAgentHistoryMessage } = await import("@/lib/api");
    const { data } = await appendAgentHistoryMessage({
      spaceId: "zaki-bot",
      threadId: "main",
      sessionKey: "agent:zaki-bot:user:42:thread:main",
      role: "assistant",
      content: "Approved continuation",
    });

    expect(data.status).toBe("inserted");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/history/append",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          spaceId: "zaki-bot",
          threadId: "main",
          sessionKey: "agent:zaki-bot:user:42:thread:main",
          role: "assistant",
          content: "Approved continuation",
        }),
      })
    );
  });

  it("loads trace events through the JSON BFF route", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        run_id: "run:1",
        events: [{ type: "tool_result", summary: "Shell approved" }],
      })
    );

    const { fetchAgentTraceEvents } = await import("@/lib/api");
    const { data } = await fetchAgentTraceEvents("run:1");

    expect(data.events?.[0]?.summary).toBe("Shell approved");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/traces/run%3A1/events",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("uses focused Agent cron mutation routes", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(201, { status: "created", job: { id: "cron-1" } }))
      .mockResolvedValueOnce(makeResponse(200, { status: "updated", job: { id: "cron-1" } }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true, deleted: true }));

    const { createAgentCron, updateAgentCron, deleteAgentCron } = await import("@/lib/api");
    await createAgentCron({ expression: "0 9 * * *", prompt: "Check status" });
    await updateAgentCron("cron:1", { paused: true });
    await deleteAgentCron("cron:1");

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://test.local/api/agent/cron",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expression: "0 9 * * *", prompt: "Check status" }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://test.local/api/agent/cron/cron%3A1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ paused: true }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "http://test.local/api/agent/cron/cron%3A1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("lists Agent tasks with allowlisted query params", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { tasks: [] }));

    const { listAgentTasks } = await import("@/lib/api");
    await listAgentTasks({ status: "running", limit: 20, cursor: "abc" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/tasks?status=running&limit=20&cursor=abc",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("lists Agent artifacts with the active session key as a query parameter", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { artifacts: [] }));

    const { listAgentArtifacts } = await import("@/lib/api");
    await listAgentArtifacts({
      limit: 12,
      cursor: "next",
      session_key: "agent:zaki-bot:user:42:thread:main",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/artifacts?limit=12&cursor=next&session_key=agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("encodes artifact diff path segments", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { diff: [] }));

    const { fetchAgentArtifactDiff } = await import("@/lib/api");
    await fetchAgentArtifactDiff("artifact:1", "v:1", "v.2");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/artifacts/artifact%3A1/diff/v%3A1/v.2",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("normalizes Nullalis produced-file URLs through the Agent export BFF bridge", async () => {
    const { normalizeAgentExportDownloadUrl } = await import("@/lib/api");

    expect(
      normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/report.pdf")
    ).toBe("/api/agent/exports/report.pdf");
    expect(
      normalizeAgentExportDownloadUrl("http://nullalis.local/api/v1/users/42/exports/research_brief.docx")
    ).toBe("/api/agent/exports/research_brief.docx");
    expect(normalizeAgentExportDownloadUrl("/api/agent/exports/report.pdf")).toBe(
      "/api/agent/exports/report.pdf"
    );
    expect(normalizeAgentExportDownloadUrl("https://download.local/artifact.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("report.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/../secret.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/.hidden.pdf")).toBeNull();
    expect(normalizeAgentExportDownloadUrl("/api/v1/users/42/exports/report.pdf/extra")).toBeNull();
  });

  it("downloads Agent exports through an authenticated BFF blob request", async () => {
    _storeToken = "agent-token";
    const createObjectURL = jest.fn(() => "blob:agent-export");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    Object.defineProperty(window, "setTimeout", {
      configurable: true,
      value: (callback: () => void) => {
        callback();
        return 1;
      },
    });
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, "pdf-bytes", {
        "content-disposition": "attachment; filename=\"report.pdf\"",
      })
    );

    const { downloadAgentExportFile } = await import("@/lib/api");
    const result = await downloadAgentExportFile(
      "/api/v1/users/42/exports/report.pdf",
      "fallback.pdf"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/exports/report.pdf",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      })
    );
    const headers = (mockFetch.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer agent-token");
    expect(result.filename).toBe("report.pdf");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:agent-export");
  });

  it("normalizes Nullalis artifact share URLs through the Agent public-share BFF bridge", async () => {
    const { normalizeAgentArtifactShareUrl, shareAgentArtifact } = await import("@/lib/api");

    expect(
      normalizeAgentArtifactShareUrl("/api/v1/share/artifact/abc12345def67890")
    ).toBe("/artifact/abc12345def67890");
    expect(
      normalizeAgentArtifactShareUrl("http://nullalis.local/api/v1/share/artifact/abc12345def67890")
    ).toBe("/artifact/abc12345def67890");
    expect(
      normalizeAgentArtifactShareUrl("/api/agent/share/artifact/abc12345def67890")
    ).toBe("/artifact/abc12345def67890");
    expect(normalizeAgentArtifactShareUrl("/artifact/abc12345def67890")).toBe(
      "/artifact/abc12345def67890"
    );
    expect(normalizeAgentArtifactShareUrl("/api/v1/share/artifact/../secret")).toBeNull();
    expect(normalizeAgentArtifactShareUrl("/api/v1/share/artifact/x")).toBeNull();
    expect(normalizeAgentArtifactShareUrl("https://example.com/share/artifact/abc12345")).toBeNull();

    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        id: "artifact-1",
        share_url: "/api/v1/share/artifact/abc12345def67890",
      })
    );
    const { data } = await shareAgentArtifact("artifact-1");
    expect(data.share_url).toBe("/artifact/abc12345def67890");
    expect(data.public_url).toBe("/artifact/abc12345def67890");
  });

  it("fetches Brain documents through the Agent BFF", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { documents: [] }));

    const { fetchBrainDocuments } = await import("@/lib/api");
    await fetchBrainDocuments("42", { q: "source", limit: 10 });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/brain/documents?q=source&limit=10",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("renames Agent sessions through the title BFF route", async () => {
    _storeToken = "agent-token";
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        status: "updated",
        session: {
          key: "agent:zaki-bot:user:42:thread:main",
          title: "Market research",
        },
      })
    );

    const { renameAgentSession } = await import("@/lib/api");
    const { data } = await renameAgentSession(
      "agent:zaki-bot:user:42:thread:main",
      "Market research"
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/sessions/agent%3Azaki-bot%3Auser%3A42%3Athread%3Amain/title",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Market research" }),
      })
    );
    const headers = (mockFetch.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer agent-token");
    expect(data.session.title).toBe("Market research");
  });
});
