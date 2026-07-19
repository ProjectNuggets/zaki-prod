import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  RELEASE_VIEWPORTS,
  releaseMeterStatus,
  signInForRelease,
} from "./support/release-harness";

const RESET_AT = "2026-07-19T16:30:00.000Z";
const OUT_DIR = "e2e/__screenshots__/last-turn-warning";

test.describe("Agent last-turn warning", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
    await page.route("**/api/meter/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...releaseMeterStatus(),
          availableNow: {
            agent: {
              available: true,
              lastTurnWarning: true,
              resetAt: RESET_AT,
            },
          },
        }),
      });
    });
  });

  for (const [device, viewport] of Object.entries(RELEASE_VIEWPORTS)) {
    test(`${device} warning is visible and non-blocking`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium-desktop",
        "The test sets both required viewports explicitly and runs once.",
      );
      await page.setViewportSize(viewport);
      await page.goto("/agent", { waitUntil: "domcontentloaded" });

      const warning = page.getByTestId("zaki-agent-last-turn-warning");
      await expect(warning).toBeVisible({ timeout: 20_000 });
      await expect(warning).toHaveAttribute("role", "status");
      await expect(warning).toHaveAttribute("data-reset-at", RESET_AT);
      await expect(warning).toContainText("This is likely your last turn");
      await expect(warning).toContainText("Capacity returns");

      const composer = page.getByRole("combobox");
      await expect(composer).toBeEditable();
      await composer.fill("Use the remaining turn carefully");
      await expect(composer).toHaveValue("Use the remaining turn carefully");

      const accessibility = await new AxeBuilder({ page })
        .include('[data-testid="zaki-agent-last-turn-warning"]')
        .analyze();
      expect(accessibility.violations).toEqual([]);

      await page.screenshot({
        path: `${OUT_DIR}/${device}-${viewport.width}x${viewport.height}.png`,
        fullPage: false,
      });
    });
  }
});
