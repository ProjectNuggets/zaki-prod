import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import {
  fetchTypWorkspaces,
  fetchTypWorkspaceSlugs,
  requestTypChatStream,
} from "./typ-client.js";

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
