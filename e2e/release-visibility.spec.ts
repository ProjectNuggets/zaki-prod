// Release visibility contract: exactly four spokes are user-facing.
// Agent and Chat/Spaces are live; Design is waitlisted; Minutes is coming soon.
// Brain remains the Agent memory view, not a fifth spoke. Learn and Hire/Career
// remain implemented behind the scenes but are hidden from every release surface.

import { expect, test } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

test.describe("ZAKI release product visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await signInForRelease(page);
  });

  test("ProductRail shows the four spokes, keeps Brain as an Agent view, and hides retired spokes", async ({ page }) => {
    await page.goto("/agent", { waitUntil: "domcontentloaded" });

    const rail = page.locator(".zaki-product-rail");
    await expect(rail).toBeVisible({ timeout: 20_000 });

    for (const label of ["Agent", "Chat", "Brain"]) {
      await expect(rail.getByTitle(new RegExp(`^${label}`, "i"))).toBeEnabled();
    }
    for (const label of ["Design", "Minutes"]) {
      await expect(rail.getByTitle(new RegExp(`^${label}`, "i"))).toBeDisabled();
    }

    await expect(rail.getByTitle(/^Learn/i)).toHaveCount(0);
    await expect(rail.getByTitle(/^Career/i)).toHaveCount(0);
    await expect(rail.getByTitle(/^Hire/i)).toHaveCount(0);
  });

  test("dashboard command strip is exactly Agent, Chat, Design, and Minutes", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });

    const strip = page.getByTestId("zaki-dashboard-command-strip");
    const hint = page.getByTestId("zaki-dashboard-product-hint");
    await expect(strip).toBeVisible({ timeout: 20_000 });

    await expect(strip.getByRole("tab")).toHaveCount(4);
    for (const label of ["Agent", "Chat", "Design", "Minutes"]) {
      await expect(strip.getByRole("tab", { name: label })).toBeVisible();
    }
    for (const label of ["Brain", "Learn", "Career", "Hire"]) {
      await expect(strip.getByRole("tab", { name: label })).toHaveCount(0);
    }

    await strip.getByRole("tab", { name: "Design" }).click();
    await expect(hint.getByText(/Design stays waitlisted until the project service/i)).toBeVisible();

    await strip.getByRole("tab", { name: "Minutes" }).click();
    await expect(hint.getByText(/Minutes is coming soon/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("dashboard-1440x1000.png"),
      fullPage: false,
    });
    await page.setViewportSize(RELEASE_VIEWPORTS.mobile);
    await page.screenshot({
      path: testInfo.outputPath("dashboard-390x844.png"),
      fullPage: false,
    });
  });

  test("hidden routes redirect home while Design and Minutes render their release gates", async ({ page }) => {
    for (const path of ["/learn", "/hire"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-product-gate="private_beta"]')).toHaveCount(0);
    }

    const gatedRoutes = [
      { path: "/design", gate: "product-gate-design", state: "waitlist" },
      { path: "/minutes", gate: "product-gate-minutes", state: "coming_soon" },
    ] as const;

    for (const route of gatedRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const gate = page.getByTestId(route.gate);
      await expect(gate).toBeVisible({ timeout: 20_000 });
      await expect(gate).toHaveAttribute("data-product-gate", route.state);
    }
  });
});
