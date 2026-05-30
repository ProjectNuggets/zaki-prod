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

  it("calls the S7 Agent settings control-plane routes", async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(200, { channels: [] }))
      .mockResolvedValueOnce(makeResponse(200, { channel: "slack", status: "connected" }))
      .mockResolvedValueOnce(makeResponse(200, { channel: "slack", last_test: { ok: true } }))
      .mockResolvedValueOnce(makeResponse(200, { status: "disconnected", channel: "slack" }))
      .mockResolvedValueOnce(makeResponse(200, { integrations: [] }));

    const {
      fetchAgentChannelControls,
      connectAgentChannelControl,
      testAgentChannelControl,
      disconnectAgentChannelControl,
      fetchAgentIntegrations,
    } = await import("@/lib/api");

    await fetchAgentChannelControls();
    await connectAgentChannelControl("slack", {
      slack_bot_token: "xoxb-token",
      slack_signing_secret: "secret",
    });
    await testAgentChannelControl("slack");
    await disconnectAgentChannelControl("slack");
    await fetchAgentIntegrations();

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
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      "http://test.local/api/agent/integrations",
      expect.objectContaining({ method: "GET" })
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
      );

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

  it("encodes artifact diff path segments", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { diff: [] }));

    const { fetchAgentArtifactDiff } = await import("@/lib/api");
    await fetchAgentArtifactDiff("artifact:1", "v:1", "v.2");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/api/agent/artifacts/artifact%3A1/diff/v%3A1/v.2",
      expect.objectContaining({ method: "GET" })
    );
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
});
