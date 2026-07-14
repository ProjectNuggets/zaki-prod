import { describe, expect, test } from "@jest/globals";
import { createDesignWorkbenchAccess } from "./design-workbench-access.js";

describe("Design workbench scoped access", () => {
  test("issues a session-bound HttpOnly cookie and verifies it without accepting tampering", () => {
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: true, now: () => 1_000_000 });
    const cookie = access.issue({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    });
    expect(cookie).toContain("Path=/api/design; HttpOnly; SameSite=Strict");
    expect(cookie).toContain("; Secure");
    const pair = cookie.split(";")[0];
    expect(access.resolve({ headers: { cookie: pair } })).toEqual({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    });
    expect(access.resolve({ headers: { cookie: `${pair}x` } })).toBeNull();
  });

  test("rejects expired cookies", () => {
    let now = 1_000_000;
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: false, now: () => now });
    const pair = access.issue({
      userId: "42",
      sessionId: "sess_01",
      projectId: "project_01",
      generation: 7,
    }).split(";")[0];
    now += 8 * 60 * 60 * 1000 + 1;
    expect(access.resolve({ headers: { cookie: pair } })).toBeNull();
  });

  test("keeps concurrent Design session credentials independently addressable", () => {
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: false });
    const first = access.issue({
      userId: "42", sessionId: "sess_01", projectId: "project_01", generation: 7,
    }).split(";")[0];
    const second = access.issue({
      userId: "42", sessionId: "sess_02", projectId: "project_02", generation: 3,
    }).split(";")[0];
    const req = { headers: { cookie: `${first}; ${second}` } };

    expect(first.split("=")[0]).not.toBe(second.split("=")[0]);
    expect(access.resolve(req, "sess_01")).toMatchObject({ sessionId: "sess_01", projectId: "project_01" });
    expect(access.resolve(req, "sess_02")).toMatchObject({ sessionId: "sess_02", projectId: "project_02" });
  });

  test("expires only the stopped session credential", () => {
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: true });

    expect(access.revoke("sess_01")).toBe(
      "zaki_design_workbench_sess_01=; Path=/api/design; HttpOnly; SameSite=Strict; Max-Age=0; Secure",
    );
    expect(() => access.revoke("../session")).toThrow("Design workbench session is invalid.");
  });
});
