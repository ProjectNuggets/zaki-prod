import { expect, test } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

test.describe("WP-P1 locale reachability", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
  });

  test("honors ?lang=ar and exposes the language switcher", async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes("mobile");
    const viewport = mobile ? RELEASE_VIEWPORTS.mobile : RELEASE_VIEWPORTS.desktop;
    await page.setViewportSize(viewport);

    await page.goto("/?lang=ar", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(600);

    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    const switcher = page.getByRole("button", { name: "التبديل إلى الإنجليزية" });
    await expect(switcher).toBeVisible();
    await testInfo.attach(`wp-p1-${mobile ? "mobile-390x844" : "desktop-1440x1000"}`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });

    await switcher.click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Switch to Arabic" })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("i18nextLng")))
      .toBe("en");
    await expect(page).toHaveURL(/\?lang=en(?:&|$)/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.evaluate(() => window.localStorage.setItem("i18nextLng", "ar"));
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("button", { name: "التبديل إلى الإنجليزية" })).toBeVisible();
  });
});
