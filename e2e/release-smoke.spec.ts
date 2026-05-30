// Release confidence gate — signed-in smoke for the four V1 routes.
// Agent 5 (codex/v2-release-e2e), Wave 1: smoke scaffolding only.
//
// The hard assertion here is intentionally minimal and stable: each route must
// mount as a signed-in user without tripping the app ErrorBoundary or leaving
// the login screen. Surface-specific (brittle) assertions are deferred until
// the product surfaces stabilize — see docs/release-qa-matrix-2026-05-30.md.

import { expect, test, type Page } from "@playwright/test";
import { RELEASE_ROUTES, signInForRelease } from "./support/release-harness";

const ERROR_BOUNDARY_TEXT = "Something went wrong";
const LOGIN_HEADINGS = [/Welcome back/i, /Create your account/i, /Sign in to ZAKI/i];

async function assertMounted(page: Page) {
  // App shell present (App.tsx root) — proves we are past hydration + login.
  await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
  // ErrorBoundary fallback must not be showing.
  await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
  // We must not be stuck on the login screen.
  for (const heading of LOGIN_HEADINGS) {
    await expect(page.getByRole("heading", { name: heading })).toHaveCount(0);
  }
}

test.describe("ZAKI V1 release smoke (signed-in)", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
  });

  for (const route of RELEASE_ROUTES) {
    test(`renders ${route.path} signed-in without crashing`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await assertMounted(page);

      // Smoke-level signal only: surface a hard React render failure if one
      // bubbles to the console. Network/mock noise is filtered out.
      const fatal = consoleErrors.filter((text) =>
        /Minified React error|Maximum update depth|is not a function|Cannot read propert/i.test(text),
      );
      expect(fatal, `fatal console errors on ${route.path}:\n${fatal.join("\n")}`).toHaveLength(0);
    });
  }

  test("backend-unavailable: refresh 502 falls back to login, not a crash", async ({ page }) => {
    // Re-arm the shell with the gateway down. signInForRelease already ran in
    // beforeEach; this overrides the auth/refresh route for this test.
    await page.unroute("**/api/auth/refresh");
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "backend_unavailable" }) });
    });

    await page.goto("/agent", { waitUntil: "domcontentloaded" });
    // Failure must be user-safe: no ErrorBoundary crash...
    await expect(page.getByText(ERROR_BOUNDARY_TEXT)).toHaveCount(0);
    // ...and we must fall back to login, not the signed-in shell. Access
    // tokens are memory-only, so a 502 refresh yields a logged-out app.
    await expect(page.getByRole("tablist")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".zaki-app-v2")).toHaveCount(0);
  });
});
