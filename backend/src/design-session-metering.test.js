import { describe, expect, test } from "@jest/globals";
import { createDesignSessionProxyAuthorizer } from "./design-session-metering.js";

// POST /api/projects classifies as the metered action `design_project_create`, so these inputs
// exercise the grant-issuer path (not the read fast-path).
function mutationInput(overrides = {}) {
  return {
    req: { headers: { "content-length": "42" } },
    res: { setHeader: () => {}, headersSent: false },
    auth: { zakiUser: { id: "154" } },
    session: { userId: "154", tenantId: "default" },
    targetPath: "/api/projects",
    method: "POST",
    requestId: "req_test",
    ...overrides,
  };
}

describe("design session proxy metering", () => {
  test("FAILS OPEN when the grant issuer THROWS (infra failure) — allows the mutation, does not 500", async () => {
    const authorize = createDesignSessionProxyAuthorizer({
      absoluteMaxRequestBytes: 1_000_000,
      issueMeterGrantForIdentity: async () => {
        throw new Error("meter backend unavailable");
      },
    });
    const result = await authorize(mutationInput());
    expect(result.allowed).toBe(true);
    expect(result.meterFailOpen).toBe(true);
    expect(result.grant).toBeNull();
  });

  test("still ENFORCES a genuine policy denial (issuer returns allowed:false)", async () => {
    const authorize = createDesignSessionProxyAuthorizer({
      absoluteMaxRequestBytes: 1_000_000,
      issueMeterGrantForIdentity: async () => ({
        allowed: false,
        status: 402,
        error: "insufficient_balance",
        message: "no funds",
      }),
    });
    const result = await authorize(mutationInput());
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(402);
  });

  test("allows a successful grant normally (no fail-open marker)", async () => {
    const authorize = createDesignSessionProxyAuthorizer({
      absoluteMaxRequestBytes: 1_000_000,
      issueMeterGrantForIdentity: async () => ({
        allowed: true,
        grant: { grantId: "g1", action: "design_project_create" },
        meter: {},
      }),
    });
    const result = await authorize(mutationInput());
    expect(result.allowed).toBe(true);
    expect(result.grant?.grantId).toBe("g1");
    expect(result.meterFailOpen).toBeUndefined();
  });

  test("reads skip metering entirely (no grant issuer call)", async () => {
    let called = false;
    const authorize = createDesignSessionProxyAuthorizer({
      absoluteMaxRequestBytes: 1_000_000,
      issueMeterGrantForIdentity: async () => {
        called = true;
        return { allowed: true, grant: null };
      },
    });
    const result = await authorize(mutationInput({ method: "GET", targetPath: "/api/runs" }));
    expect(result.allowed).toBe(true);
    expect(called).toBe(false);
  });
});
