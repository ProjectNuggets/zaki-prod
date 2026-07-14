import { describe, expect, test } from "@jest/globals";
import { createDesignWorkbenchAccess } from "./design-workbench-access.js";

describe("Design workbench scoped access", () => {
  test("issues a scoped HttpOnly cookie and verifies it without accepting tampering", () => {
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: true, now: () => 1_000_000 });
    const cookie = access.issue("42");
    expect(cookie).toContain("Path=/api/design/workbench; HttpOnly; SameSite=Strict");
    expect(cookie).toContain("; Secure");
    const pair = cookie.split(";")[0];
    expect(access.resolve({ headers: { cookie: pair } })).toEqual({ userId: "42" });
    expect(access.resolve({ headers: { cookie: `${pair}x` } })).toBeNull();
  });

  test("rejects expired cookies", () => {
    let now = 1_000_000;
    const access = createDesignWorkbenchAccess({ secret: "controller-secret-at-least-16", secure: false, now: () => now });
    const pair = access.issue("42").split(";")[0];
    now += 8 * 60 * 60 * 1000 + 1;
    expect(access.resolve({ headers: { cookie: pair } })).toBeNull();
  });
});
