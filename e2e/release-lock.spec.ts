// Final release lock: marketing handoff contracts and hidden operator guard.

import { expect, test } from "@playwright/test";
import { mockReleaseShell, signInForRelease } from "./support/release-harness";

test.describe("ZAKI V1 release lock", () => {
  test("marketing product CTAs include source and intent before entering the app", async ({ page }) => {
    await mockReleaseShell(page);
    await page.unroute("**/api/auth/refresh");
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "not_authenticated" }) });
    });

    await page.goto("/products/agent", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Choose Agent/i })).toHaveAttribute(
      "href",
      "/agent?source=website_product_agent&intent=agent",
    );
    await expect(page.getByRole("link", { name: /Compare plans/i }).first()).toHaveAttribute(
      "href",
      "/pricing?source=website_product_agent&intent=plans",
    );

    await page.goto("/products/brain", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Open Brain/i })).toHaveAttribute(
      "href",
      "/brain?source=website_product_brain&intent=memory",
    );

    await page.goto("/products/design", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Open dashboard/i })).toHaveAttribute(
      "href",
      "/?source=website_product_design&intent=dashboard",
    );

    for (const path of ["/products/learn", "/products/hire"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-product-id="learning"], [data-product-id="hire"]')).toHaveCount(0);
    }
  });

  test("operator routes stay hidden from signed-in non-superadmins", async ({ page }) => {
    await signInForRelease(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('a[href*="/internal/operator"], a[href*="/internal/admin-access-codes"]')).toHaveCount(0);

    for (const path of ["/internal/operator", "/internal/admin-access-codes"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
      await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
    }
  });
});
