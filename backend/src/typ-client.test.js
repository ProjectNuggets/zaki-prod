import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import {
  fetchTypWorkspaces,
  fetchTypWorkspaceSlugs,
  requestTypChatStream,
  mintTypUserSession,
  getTypUserSessionToken,
  _clearTypSessionCache,
} from "./typ-client.js";

// Build a fake JWT whose payload carries the given exp (seconds since epoch).
function fakeJwt(expSeconds) {
  const b64u = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64u({ alg: "HS256", typ: "JWT" })}.${b64u({ p: "enc", exp: expSeconds })}.sig`;
}

// Save and restore env vars around each test
let originalTypBaseUrl;
let originalTypApiKey;

beforeEach(() => {
  originalTypBaseUrl = process.env.NOVA_TYP_BASE_URL;
  originalTypApiKey = process.env.NOVA_TYP_API_KEY;
  process.env.NOVA_TYP_BASE_URL = "https://typ.example.com";
  process.env.NOVA_TYP_API_KEY = "test-admin-key";
});

afterEach(() => {
  if (originalTypBaseUrl === undefined) {
    delete process.env.NOVA_TYP_BASE_URL;
  } else {
    process.env.NOVA_TYP_BASE_URL = originalTypBaseUrl;
  }
  if (originalTypApiKey === undefined) {
    delete process.env.NOVA_TYP_API_KEY;
  } else {
    process.env.NOVA_TYP_API_KEY = originalTypApiKey;
  }
  jest.restoreAllMocks();
});

// Test 1: fetchTypWorkspaces — calls TYP admin endpoint with Bearer admin key, filters by thread ownership
describe("fetchTypWorkspaces", () => {
  test("calls /v1/workspaces with Bearer admin key and returns only workspaces owned by user", async () => {
    const mockWorkspaces = [
      { slug: "ws-a", threads: [{ user_id: 42 }] },
      { slug: "ws-b", threads: [{ user_id: 99 }] }, // different user — filtered out
    ];
    const fakeResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ workspaces: mockWorkspaces }),
    };
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(fakeResponse);

    const result = await fetchTypWorkspaces(42);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://typ.example.com/api/v1/workspaces");
    expect(options.method).toBe("GET");

    // Must use admin key, not a user token
    const authHeader = options.headers.get("Authorization");
    expect(authHeader).toBe("Bearer test-admin-key");

    // Returns a synthetic Response with only the workspaces that have threads for user 42
    const data = await result.json();
    expect(data.workspaces).toHaveLength(1);
    expect(data.workspaces[0].slug).toBe("ws-a");
  });

  test("treats string user_id ('42') same as numeric user_id (42) when filtering", async () => {
    const mockWorkspaces = [
      { slug: "ws-string", threads: [{ user_id: "42" }] }, // TYP returns string
      { slug: "ws-number", threads: [{ user_id: 42 }] },   // TYP returns number
      { slug: "ws-other",  threads: [{ user_id: 99 }] },   // different user
    ];
    const fakeResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ workspaces: mockWorkspaces }),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(fakeResponse);

    const result = await fetchTypWorkspaces(42);
    const data = await result.json();
    expect(data.workspaces).toHaveLength(2);
    expect(data.workspaces.map((w) => w.slug)).toEqual(["ws-string", "ws-number"]);
  });
});

// Test 2: fetchTypWorkspaceSlugs — success path returns { success, slugs }
describe("fetchTypWorkspaceSlugs", () => {
  test("returns { success: true, slugs } on ok response with workspaces array", async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        workspaces: [
          { slug: "Space-One", threads: [{ user_id: 7 }] },
          { slug: "space_two", threads: [{ user_id: 7 }] },
          { slug: "  SPACE-THREE  ", threads: [{ user_id: 7 }] },
        ],
      }),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(fakeResponse);

    const result = await fetchTypWorkspaceSlugs(7);

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.slugs).toEqual(["space-one", "space_two", "space-three"]);
  });

  // Test 3: fetchTypWorkspaceSlugs — non-ok response returns { success: false, status, error }
  test("returns { success: false, status, error } on non-ok response", async () => {
    const fakeResponse = {
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({ error: "Unauthorized workspace access" }),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(fakeResponse);

    const result = await fetchTypWorkspaceSlugs(99);

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toBe("Unauthorized workspace access");
    expect(result.slugs).toEqual([]);
  });
});

// Test 4: requestTypChatStream — uses fetchWithTimeout with admin Authorization header, not user token
describe("requestTypChatStream", () => {
  test("calls fetchWithTimeout with admin Authorization header, not a user token", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const targetUrl = "https://typ.example.com/api/v1/chat/workspace/my-space/chat";
    const payload = { message: "hello", session_id: "abc" };

    await requestTypChatStream(targetUrl, payload, fetchWithTimeout, 30000);

    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    const [url, options, timeoutMs, label] = fetchWithTimeout.mock.calls[0];
    expect(url).toBe(targetUrl);
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify(payload));
    expect(options.headers["Authorization"]).toBe("Bearer test-admin-key");
    expect(timeoutMs).toBe(30000);
    expect(label).toBeDefined();
  });
});

// Per-user TYP session minting (Simple-SSO) + chat auth-token forwarding
describe("mintTypUserSession", () => {
  beforeEach(() => _clearTypSessionCache());

  test("issues a temp token with the admin key, exchanges it, returns the session JWT", async () => {
    const jwt = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/issue-auth-token")) {
        return { ok: true, status: 200, json: async () => ({ token: "temp-123", loginPath: "/sso/simple?token=temp-123" }) };
      }
      if (String(url).includes("/request-token/sso/simple")) {
        return { ok: true, status: 200, json: async () => ({ valid: true, token: jwt, user: { id: 42 } }) };
      }
      throw new Error(`unexpected url ${url}`);
    });

    const token = await mintTypUserSession(42);
    expect(token).toBe(jwt);

    const issueCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes("/issue-auth-token"));
    expect(issueCall[0]).toBe("https://typ.example.com/api/v1/users/42/issue-auth-token");
    expect(issueCall[1].headers.Authorization).toBe("Bearer test-admin-key");
    const exchCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes("/request-token/sso/simple"));
    expect(exchCall[0]).toContain("token=temp-123");
  });

  test("throws when SSO issue fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Instance is not in Multi-User mode." }) });
    await expect(mintTypUserSession(42)).rejects.toThrow(/issue-auth-token failed/);
  });

  test("throws when the exchange is invalid", async () => {
    jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/issue-auth-token")) return { ok: true, status: 200, json: async () => ({ token: "temp-123" }) };
      return { ok: false, status: 401, json: async () => ({ valid: false, message: "expired" }) };
    });
    await expect(mintTypUserSession(42)).rejects.toThrow(/SSO exchange failed/);
  });

  test("rejects an invalid novaUserId without any network call", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    await expect(mintTypUserSession(0)).rejects.toThrow(/invalid novaUserId/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("getTypUserSessionToken (cache)", () => {
  beforeEach(() => _clearTypSessionCache());

  function mockSso(jwt) {
    return jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/issue-auth-token")) return { ok: true, status: 200, json: async () => ({ token: "temp-x" }) };
      return { ok: true, status: 200, json: async () => ({ valid: true, token: jwt, user: { id: 7 } }) };
    });
  }

  test("mints once then serves the cached token for a valid (unexpired) JWT", async () => {
    const jwt = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchSpy = mockSso(jwt);
    const a = await getTypUserSessionToken(7);
    const b = await getTypUserSessionToken(7);
    expect(a).toBe(jwt);
    expect(b).toBe(jwt);
    // 2 fetches total (issue+exchange) for the FIRST call only
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("forceRefresh re-mints even when cached", async () => {
    const jwt = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
    const fetchSpy = mockSso(jwt);
    await getTypUserSessionToken(7);
    await getTypUserSessionToken(7, { forceRefresh: true });
    expect(fetchSpy).toHaveBeenCalledTimes(4); // two mints
  });

  test("re-mints when the cached JWT is within the refresh margin", async () => {
    const nearlyExpired = fakeJwt(Math.floor(Date.now() / 1000) + 5); // < 60s margin
    const fetchSpy = mockSso(nearlyExpired);
    await getTypUserSessionToken(7);
    await getTypUserSessionToken(7);
    expect(fetchSpy).toHaveBeenCalledTimes(4); // not served from cache
  });
});

describe("requestTypChatStream auth token", () => {
  test("uses the provided per-user session token instead of the admin key", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await requestTypChatStream("https://typ.example.com/api/workspace/s/thread/t/stream-chat", { message: "hi" }, fetchWithTimeout, 1000, "user-session-jwt");
    const [, options] = fetchWithTimeout.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer user-session-jwt");
  });

  test("falls back to the admin key when no session token is given", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await requestTypChatStream("https://typ.example.com/api/workspace/s/thread/t/stream-chat", { message: "hi" }, fetchWithTimeout, 1000);
    const [, options] = fetchWithTimeout.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer test-admin-key");
  });
});

// Test 5: missing env vars — all three functions throw with clear messages
describe("missing env configuration", () => {
  test("fetchTypWorkspaces throws when NOVA_TYP_BASE_URL is missing", async () => {
    delete process.env.NOVA_TYP_BASE_URL;
    await expect(fetchTypWorkspaces(1)).rejects.toThrow("NOVA_TYP_BASE_URL is not configured.");
  });

  test("fetchTypWorkspaces throws when NOVA_TYP_API_KEY is missing", async () => {
    delete process.env.NOVA_TYP_API_KEY;
    await expect(fetchTypWorkspaces(1)).rejects.toThrow("NOVA_TYP_API_KEY is not configured.");
  });

  test("fetchTypWorkspaceSlugs propagates missing config error as { success: false }", async () => {
    delete process.env.NOVA_TYP_BASE_URL;
    const result = await fetchTypWorkspaceSlugs(1);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/NOVA_TYP_BASE_URL is not configured/);
  });

  test("requestTypChatStream throws when NOVA_TYP_API_KEY is missing", async () => {
    delete process.env.NOVA_TYP_API_KEY;
    const fetchWithTimeout = jest.fn();
    await expect(
      requestTypChatStream("https://typ.example.com/stream", {}, fetchWithTimeout, 5000)
    ).rejects.toThrow("NOVA_TYP_API_KEY is not configured.");
  });

  test("requestTypChatStream throws when NOVA_TYP_BASE_URL is missing", async () => {
    delete process.env.NOVA_TYP_BASE_URL;
    const fetchWithTimeout = jest.fn();
    await expect(
      requestTypChatStream("https://typ.example.com/stream", {}, fetchWithTimeout, 5000)
    ).rejects.toThrow("NOVA_TYP_BASE_URL is not configured.");
  });
});
