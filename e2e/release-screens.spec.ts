// Release screenshot flow — desktop 1440x1000 and mobile 390x844.
// Agent 5 (codex/v2-release-e2e). Captures signed-in screenshots for the four
// V1 routes at the two contract viewports (AGENTS.md §8). Output lands in
// e2e/__screenshots__/release/ so reviewers and the orchestrator can eyeball
// the signed-in shell without standing up the backend gateway.

import { test, type Page } from "@playwright/test";
import { RELEASE_ROUTES, RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

const OUT_DIR = "e2e/__screenshots__/release";

async function settle(page: Page) {
  // Give the shell time to hydrate + paint without coupling to a specific
  // surface element (which may still be unstable).
  await page.locator(".zaki-app-v2").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(600);
}

test.describe("ZAKI V1 release screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
  });

  for (const [device, viewport] of Object.entries(RELEASE_VIEWPORTS)) {
    for (const route of RELEASE_ROUTES) {
      test(`${device} ${viewport.width}x${viewport.height} - ${route.name}`, async ({ page }, testInfo) => {
        test.skip(
          testInfo.project.name !== "chromium-desktop",
          "Screenshot matrix sets its own desktop/mobile viewports and runs once.",
        );
        await page.setViewportSize(viewport);
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await settle(page);
        await page.screenshot({
          path: `${OUT_DIR}/${device}-${route.name}.png`,
          fullPage: false,
        });
      });
    }
  }
});
