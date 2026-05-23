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

jest.mock("@/stores/authStore", () => ({
  useAuthStore: {
    getState: () => ({
      token: _storeToken,
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
    clone: function () { return this; },
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  _storeToken = null;
  mockSetToken.mockClear();
  mockLogout.mockClear();
  // Reset window.location mock
  delete (global as Record<string, unknown>).window;
  (global as Record<string, unknown>).window = {
    location: { href: "" },
  };
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
      .mockResolvedValueOnce(makeResponse(200, { token: "new-token" }))
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
      .mockResolvedValueOnce(makeResponse(200, { token: "new-token" }))
      .mockResolvedValueOnce(makeResponse(401, { error: "Still unauthorized" }));

    const { apiRequest } = await import("@/lib/api");
    await apiRequest("/api/protected", { method: "GET" });

    // Should only call 3 times, not loop again
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Should redirect
    expect((global as Record<string, unknown>).window).toBeDefined();
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
  });

  it("skips 401 retry when skipAuth=true", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: "Unauthorized" }));
    const { apiRequest } = await import("@/lib/api");
    const res = await apiRequest("/api/public", { skipAuth: true });
    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No refresh attempt
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
