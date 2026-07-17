import { expect, test, type Page, type Route } from "@playwright/test";
import { mockReleaseShell } from "./support/release-harness";

const DAILY_RESET = "2026-07-15T00:00:00.000Z";

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockExhaustedAnonymousSession(page: Page) {
  await mockReleaseShell(page);
  await page.addInitScript(() => {
    window.localStorage.removeItem("zaki.auth.token");
    window.localStorage.setItem("zaki:locale", "en");
    window.localStorage.setItem("zaki:dashboard-v2-intro-dismissed", "1");
  });

  // Registered after the shared shell so these signed-out contracts win.
  await page.route("**/api/auth/refresh", async (route) => {
    await json(route, { error: "unauthorized" }, 401);
  });
  await page.route("**/api/meter/status**", async (route) => {
    await json(route, {
      success: true,
      contractVersion: "2026-07-14.anonymous-daily-meter.v1",
      identity: {
        type: "anonymous",
        tenantId: "public",
        userId: null,
        anonymousSessionId: "anon-e2e",
      },
      plan: {
        tier: "anonymous",
        label: "Anonymous",
        source: "anonymous_daily_allowance",
      },
      enforced: {
        kind: "anonymous_daily_prompts",
        surface: "spaces",
        period: "day",
        limit: 10,
        used: 10,
        remaining: 0,
        resetAt: DAILY_RESET,
      },
    });
  });
}

test.describe("anonymous daily metering", () => {
  test("shows the enforced daily allowance and preserves an exhausted prompt", async ({ page }, testInfo) => {
    await mockExhaustedAnonymousSession(page);
    await page.setViewportSize(
      testInfo.project.name.includes("mobile")
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
    );
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const meter = page.getByTestId("zaki-dashboard-command-meter");
    await expect(meter).toBeVisible({ timeout: 20_000 });
    await expect(meter).toHaveAttribute("data-enforced-kind", "anonymous_daily_prompts");
    await expect(meter).toContainText("0 of 10 free chats left today");
    await expect(page.getByText("Free chats are used up for today.")).toBeVisible();
    const statusStrip = page.locator(".v2-status-strip");
    await expect(statusStrip.locator(".v2-status-strip__item", { hasText: /^Daily reset/ })).toBeVisible();
    await expect(statusStrip.locator(".v2-status-strip__item", { hasText: /^Weekly reset/ })).toHaveCount(0);
    await expect(page.getByText(/weekly usage is full/i)).toHaveCount(0);
    await expect(page.getByText(/250 chats/i)).toHaveCount(0);

    const prompt = page.getByLabel("Describe what you want ZAKI to do");
    await prompt.fill("Keep this anonymous prompt safe");
    await expect(page.getByRole("button", { name: "Start in Spaces" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save and sign up" })).toBeVisible();
    await expect(prompt).toHaveValue("Keep this anonymous prompt safe");

    await page.screenshot({
      path: testInfo.outputPath(
        testInfo.project.name.includes("mobile")
          ? "anonymous-meter-390x844.png"
          : "anonymous-meter-1440x1000.png",
      ),
      fullPage: false,
    });
  });
});
