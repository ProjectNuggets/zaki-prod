import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import {
  buildMinutesReadRouter,
  bypassMinutesReadBodyParser,
} from "./minutes-read-routes.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildApp(overrides = {}) {
  const resolveUser = overrides.resolveUser || jest.fn().mockResolvedValue({
    zakiUser: { id: 42, verified: true },
  });
  const client = {
    fetchIndex: jest.fn().mockResolvedValue(jsonResponse({ items: [], truncated: false })),
    fetchItem: jest.fn().mockResolvedValue(jsonResponse({
      item: {
        id: "summary:17",
        kind: "summary",
        title: "Project Alpha summary",
        meeting_id: "meeting:17",
        occurred_at: "2026-07-18T09:00:00.000Z",
        updated_at: "2026-07-18T10:00:00.000Z",
        sensitivity: "sensitive_pii",
        retention: {
          scope: "minutes.summary",
          expires_at: "2099-10-01T00:00:00.000Z",
        },
        content: { format: "summary", text: "Decisions and action items." },
      },
      truncated: false,
    })),
    fetchSearch: jest.fn().mockResolvedValue(jsonResponse({ items: [], truncated: false })),
    ...overrides.client,
  };
  const app = express();
  app.use("/api/minutes", buildMinutesReadRouter({
    enabled: overrides.enabled ?? true,
    baseUrl: "http://minutes-api:8056",
    readToken: "m".repeat(32),
    timeoutMs: 5_000,
    resolveUser,
    getRequestId: () => "req-browser-01",
    fetchWithTimeout: jest.fn(),
    recordFailure: overrides.recordFailure,
    client,
  }));
  return { app, client, resolveUser };
}

describe("Minutes authenticated read BFF routes", () => {
  test("authenticates before parsing the search body", async () => {
    const resolveUser = jest.fn().mockImplementation(async (_req, res) => {
      res.status(401).json({ error: "unauthorized" });
      return null;
    });
    const app = express();
    app.use(bypassMinutesReadBodyParser(express.json({ limit: "10mb" })));
    app.use("/api/minutes", buildMinutesReadRouter({
      enabled: true,
      baseUrl: "http://minutes-api:8056",
      readToken: "m".repeat(32),
      resolveUser,
      getRequestId: () => "req-auth-first-01",
      fetchWithTimeout: jest.fn(),
    }));

    const response = await request(app)
      .post("/api/minutes/search")
      .set("content-type", "application/json")
      .send('{"query":');

    expect(response.status).toBe(401);
    expect(resolveUser).toHaveBeenCalledTimes(1);
  });

  test("stays fail-closed while the Minutes operator gate is disabled", async () => {
    const { app, client, resolveUser } = buildApp({ enabled: false });
    const response = await request(app).get("/api/minutes/index");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "minutes_disabled", retryable: false });
    expect(resolveUser).not.toHaveBeenCalled();
    expect(client.fetchIndex).not.toHaveBeenCalled();
  });

  test("derives index identity from auth and ignores spoofed browser service headers", async () => {
    const { app, client } = buildApp();
    const response = await request(app)
      .get("/api/minutes/index?limit=25")
      .set("authorization", "Bearer browser-session")
      .set("cookie", "refresh=browser-secret")
      .set("x-zaki-user-id", "999")
      .set("x-zaki-read-token", "browser-controlled");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-request-id"]).toBe("req-browser-01");
    expect(client.fetchIndex).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      requestId: "req-browser-01",
      limit: "25",
      readToken: "m".repeat(32),
    }));
    expect(client.fetchIndex.mock.calls[0][0]).not.toHaveProperty("req");
  });

  test("serves a strictly validated item from the fixed item route", async () => {
    const { app, client } = buildApp();
    const response = await request(app).get("/api/minutes/items/summary%3A17?variant=full");

    expect(response.status).toBe(200);
    expect(response.body.item.id).toBe("summary:17");
    expect(client.fetchItem).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      itemId: "summary:17",
      variant: "full",
    }));
  });

  test("accepts search only as bounded browser POST JSON", async () => {
    const { app, client } = buildApp();
    const response = await request(app)
      .post("/api/minutes/search")
      .send({ query: "project alpha budget", limit: 20, cursor: "page-2" });

    expect(response.status).toBe(200);
    expect(client.fetchSearch).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      query: "project alpha budget",
      limit: 20,
      cursor: "page-2",
    }));
    expect((await request(app).get("/api/minutes/search?q=project+alpha")).status).toBe(404);
  });

  test("authenticates before parsing search JSON and normalizes parser failures", async () => {
    const authFirst = jest.fn().mockImplementation(async (_req, res) => {
      res.status(401).json({ error: "auth_required" });
      return null;
    });
    const unauthenticated = buildApp({ resolveUser: authFirst });
    const authResponse = await request(unauthenticated.app)
      .post("/api/minutes/search")
      .set("content-type", "application/json")
      .send("{not-json");
    expect(authResponse.status).toBe(401);
    expect(unauthenticated.client.fetchSearch).not.toHaveBeenCalled();

    const { app, client } = buildApp();
    const malformed = await request(app)
      .post("/api/minutes/search")
      .set("content-type", "application/json")
      .send("{not-json");
    expect(malformed.status).toBe(400);
    expect(malformed.body).toMatchObject({
      code: "minutes_invalid_request",
      requestId: "req-browser-01",
    });
    expect(malformed.headers["cache-control"]).toBe("no-store");
    expect(client.fetchSearch).not.toHaveBeenCalled();
  });

  test("preserves 413 semantics for search bodies above the parser cap", async () => {
    const { app, client } = buildApp();
    const response = await request(app)
      .post("/api/minutes/search")
      .set("content-type", "application/json")
      .send(JSON.stringify({ query: "x".repeat(5_000) }));

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({
      code: "minutes_request_too_large",
      requestId: "req-browser-01",
    });
    expect(client.fetchSearch).not.toHaveBeenCalled();
  });

  test("preserves the auth-first 4 KB parser boundary for route case variants", async () => {
    const client = {
      fetchSearch: jest.fn().mockResolvedValue(jsonResponse({ items: [], truncated: false })),
    };
    const app = express();
    app.use(bypassMinutesReadBodyParser(express.json({ limit: "10mb" })));
    app.use("/api/minutes", buildMinutesReadRouter({
      enabled: true,
      baseUrl: "http://minutes-api:8056",
      readToken: "m".repeat(32),
      timeoutMs: 5_000,
      resolveUser: jest.fn().mockResolvedValue({ zakiUser: { id: 42 } }),
      getRequestId: () => "req-case-variant-01",
      fetchWithTimeout: jest.fn(),
      client,
    }));

    const response = await request(app)
      .post("/API/MINUTES/search")
      .send({ query: "project alpha", padding: "x".repeat(5_000) });

    expect(response.status).toBe(413);
    expect(response.body.code).toBe("minutes_request_too_large");
    expect(client.fetchSearch).not.toHaveBeenCalled();
  });

  test("rejects arbitrary downstream paths and all read-plane mutations", async () => {
    const { app, client } = buildApp();
    expect((await request(app).get("/api/minutes/proxy/api/admin/users")).status).toBe(404);
    expect((await request(app).post("/api/minutes/items/meeting%3A1").send({})).status).toBe(404);
    expect(client.fetchIndex).not.toHaveBeenCalled();
    expect(client.fetchItem).not.toHaveBeenCalled();
    expect(client.fetchSearch).not.toHaveBeenCalled();
  });

  test("maps service auth, non-enumeration, scope, cap, and invalid-success failures safely", async () => {
    const cases = [
      [401, 503, "minutes_unavailable"],
      [403, 403, "minutes_read_disabled"],
      [404, 404, "minutes_not_found"],
      [413, 413, "minutes_item_too_large"],
    ];
    for (const [upstreamStatus, expectedStatus, code] of cases) {
      const { app } = buildApp({
        client: { fetchIndex: jest.fn().mockResolvedValue(jsonResponse({ secret: "not-returned" }, upstreamStatus)) },
      });
      const response = await request(app).get("/api/minutes/index");
      expect(response.status).toBe(expectedStatus);
      expect(response.body).toMatchObject({ code, requestId: "req-browser-01" });
      expect(JSON.stringify(response.body)).not.toContain("not-returned");
    }

    const { app } = buildApp({
      client: { fetchIndex: jest.fn().mockResolvedValue(jsonResponse({ items: [], truncated: false, native: "leak" })) },
    });
    const invalid = await request(app).get("/api/minutes/index");
    expect(invalid.status).toBe(502);
    expect(invalid.body.code).toBe("minutes_invalid_response");
    expect(JSON.stringify(invalid.body)).not.toContain("leak");
  });

  test("records content-free failure telemetry for upstream failures", async () => {
    const recordFailure = jest.fn();
    const { app } = buildApp({
      recordFailure,
      client: {
        fetchSearch: jest.fn().mockResolvedValue(jsonResponse({ secret: "never-record" }, 401)),
      },
    });

    await request(app)
      .post("/api/minutes/search")
      .send({ query: "sensitive acquisition discussion" });

    expect(recordFailure).toHaveBeenCalledWith({
      requestId: "req-browser-01",
      operation: "search",
      failure: "upstream_status",
      upstreamStatus: 401,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("sensitive acquisition");
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("never-record");
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("mmmmmmmm");
  });

  test("records the stable contract error code without recording response content", async () => {
    const recordFailure = jest.fn();
    const { app } = buildApp({
      recordFailure,
      client: {
        fetchItem: jest.fn().mockResolvedValue(jsonResponse({ native_vexa_id: "private-source" })),
      },
    });

    await request(app).get("/api/minutes/items/transcript_example_01");

    expect(recordFailure).toHaveBeenCalledWith({
      requestId: "req-browser-01",
      operation: "item",
      failure: "minutes_upstream_contract_invalid",
      upstreamStatus: 200,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("private-source");
  });

  test("records a stable availability code without recording thrown error detail", async () => {
    const recordFailure = jest.fn();
    const { app } = buildApp({
      recordFailure,
      client: {
        fetchIndex: jest.fn().mockRejectedValue(new Error("socket failed for private query text")),
      },
    });

    await request(app).get("/api/minutes/index");

    expect(recordFailure).toHaveBeenCalledWith({
      requestId: "req-browser-01",
      operation: "index",
      failure: "minutes_unavailable",
      upstreamStatus: null,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("private query text");
  });

  test("records configuration failures without recording configuration values", async () => {
    const recordFailure = jest.fn();
    const { app } = buildApp({
      recordFailure,
      client: {
        fetchIndex: jest.fn().mockRejectedValue(
          new Error("MINUTES_ENGINE_READ_TOKEN is invalid.")
        ),
      },
    });

    await request(app).get("/api/minutes/index");

    expect(recordFailure).toHaveBeenCalledWith({
      requestId: "req-browser-01",
      operation: "index",
      failure: "minutes_config_invalid",
      upstreamStatus: null,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(recordFailure.mock.calls)).not.toContain("READ_TOKEN");
  });
});
