import { describe, it, expect } from "@jest/globals";
import { resolveAuthenticatedMemoryUser } from "./routes.js";

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("memory route auth scoping", () => {
  const authed = async () => ({
    email: "owner@example.com",
    zakiUser: { id: 1 },
  });

  it("scopes to authenticated user when request omits userId", async () => {
    const req = { params: {}, query: {}, body: {} };
    const res = createMockRes();

    const scope = await resolveAuthenticatedMemoryUser(req, res, authed);
    expect(scope).not.toBeNull();
    expect(scope?.userId).toBe("owner@example.com");
    expect(res.statusCode).toBe(200);
  });

  it("allows explicit matching userId", async () => {
    const req = {
      params: { userId: "OWNER@example.com" },
      query: {},
      body: {},
    };
    const res = createMockRes();

    const scope = await resolveAuthenticatedMemoryUser(req, res, authed);
    expect(scope).not.toBeNull();
    expect(scope?.userId).toBe("owner@example.com");
    expect(res.statusCode).toBe(200);
  });

  it("blocks cross-tenant userId mismatch", async () => {
    const req = {
      params: { userId: "other@example.com" },
      query: {},
      body: {},
    };
    const res = createMockRes();

    const scope = await resolveAuthenticatedMemoryUser(req, res, authed);
    expect(scope).toBeNull();
    expect(res.statusCode).toBe(403);
    expect(res.body?.error).toContain("scoped");
  });

  it("rejects conflicting userId values in one request", async () => {
    const req = {
      params: { userId: "owner@example.com" },
      query: {},
      body: { userId: "other@example.com" },
    };
    const res = createMockRes();

    const scope = await resolveAuthenticatedMemoryUser(req, res, authed);
    expect(scope).toBeNull();
    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toContain("Conflicting userId");
  });
});

