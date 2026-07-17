// Release visibility contract: exactly four spokes are user-facing.
// Agent and Spaces are live; Design and Minutes are BOTH "coming soon" (the "waitlist"
// synonym is banned). Brain remains the Agent memory view, not a fifth spoke. Learn and
// Hire/Career remain implemented behind the scenes but are hidden from every release surface.
// WP-K also locks: the chat lane is named "Spaces" everywhere, and no rail control is inert.

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

    // Every rail control is live — including the coming-soon spokes (spec A2: no dead controls).
    for (const label of ["Agent", "Spaces", "Brain", "Design", "Minutes"]) {
      await expect(rail.getByTitle(new RegExp(`^${label}`, "i"))).toBeEnabled();
    }

    // The chat lane has exactly ONE name, and it is not "Chat".
    await expect(rail.getByTitle(/^Spaces/i)).toHaveCount(1);
    await expect(rail.getByTitle(/^Chat/i)).toHaveCount(0);

    await expect(rail.getByTitle(/^Learn/i)).toHaveCount(0);
    await expect(rail.getByTitle(/^Career/i)).toHaveCount(0);
    await expect(rail.getByTitle(/^Hire/i)).toHaveCount(0);
  });

  test("coming-soon rail spokes navigate to their gate pages instead of no-opping", async ({ page }) => {
    const rail = page.locator(".zaki-product-rail");

    for (const spoke of [
      { label: "Design", path: "/design", gate: "product-gate-design" },
      { label: "Minutes", path: "/minutes", gate: "product-gate-minutes" },
    ]) {
      await page.goto("/agent", { waitUntil: "domcontentloaded" });
      await expect(rail).toBeVisible({ timeout: 20_000 });

      await rail.getByTitle(new RegExp(`^${spoke.label}`, "i")).click();

      await expect(page).toHaveURL(new RegExp(`${spoke.path}$`));
      await expect(page.getByTestId(spoke.gate)).toBeVisible({ timeout: 20_000 });
    }
  });

  test("the /chat legacy URL redirects to the canonical Spaces route", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/spaces$/);
  });

  test("dashboard command strip is exactly Agent, Spaces, Design, and Minutes", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });

    const strip = page.getByTestId("zaki-dashboard-command-strip");
    const hint = page.getByTestId("zaki-dashboard-product-hint");
    await expect(strip).toBeVisible({ timeout: 20_000 });

    await expect(strip.getByRole("tab")).toHaveCount(4);
    for (const label of ["Agent", "Spaces", "Design", "Minutes"]) {
      await expect(strip.getByRole("tab", { name: label })).toBeVisible();
    }
    for (const label of ["Chat", "Brain", "Learn", "Career", "Hire"]) {
      await expect(strip.getByRole("tab", { name: label })).toHaveCount(0);
    }

    // Design and Minutes are the same launch state and must read identically.
    await strip.getByRole("tab", { name: "Design" }).click();
    await expect(hint.getByText(/Design is coming soon/i)).toBeVisible();
    await expect(hint.getByText(/waitlist/i)).toHaveCount(0);

    await strip.getByRole("tab", { name: "Minutes" }).click();
    await expect(hint.getByText(/Minutes is coming soon/i)).toBeVisible();

    // A coming-soon lane never strands a typed prompt: recovery into Spaces is offered.
    await page.getByLabel(/Describe what you want ZAKI to do/i).fill("Summarize my standup");
    await expect(page.getByTestId("zaki-dashboard-continue-in-spaces")).toBeEnabled();

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

  test("mobile dashboard keeps every product tab and status item discoverable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });

    const strip = page.getByTestId("zaki-dashboard-command-strip");
    const statusStrip = page.locator(".zaki-dashboard-v2 > .v2-status-strip");
    const viewports = [
      { width: 320, height: 844 },
      { width: 375, height: 844 },
      RELEASE_VIEWPORTS.mobile,
    ] as const;

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      await expect
        .poll(() =>
          strip.evaluate((element) => {
            const host = element.getBoundingClientRect();
            const tabs = Array.from(element.querySelectorAll<HTMLElement>("[role='tab']"));
            return {
              hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
              everyTabContained: tabs.every((tab) => {
                const rect = tab.getBoundingClientRect();
                return rect.left >= host.left - 1 && rect.right <= host.right + 1;
              }),
              everyTabIsTouchSized: tabs.every((tab) => tab.getBoundingClientRect().height >= 44),
              everyTabLabelUnclipped: tabs.every((tab) => {
                const label = tab.querySelector<HTMLElement>(
                  ".zaki-dashboard-command__product-name"
                );
                return label != null && label.scrollWidth <= label.clientWidth + 1;
              }),
            };
          })
        )
        .toEqual({
          hasHorizontalOverflow: false,
          everyTabContained: true,
          everyTabIsTouchSized: true,
          everyTabLabelUnclipped: true,
        });

      await expect
        .poll(() =>
          statusStrip.evaluate((element) => {
            const host = element.getBoundingClientRect();
            const items = Array.from(
              element.querySelectorAll<HTMLElement>(".v2-status-strip__item")
            );
            return {
              hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
              everyItemContained: items.every((item) => {
                const rect = item.getBoundingClientRect();
                return rect.left >= host.left - 1 && rect.right <= host.right + 1;
              }),
            };
          })
        )
        .toEqual({ hasHorizontalOverflow: false, everyItemContained: true });

      await strip.getByRole("tab", { name: "Minutes" }).click();
      await expect(strip.getByRole("tab", { name: "Minutes" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      await expect(page.getByTestId("zaki-dashboard-product-hint")).toContainText(
        "Minutes is coming soon"
      );
    }
  });

  test("hidden routes redirect home while Design and Minutes render their release gates", async ({ page }) => {
    for (const path of ["/learn", "/hire"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-product-gate="private_beta"]')).toHaveCount(0);
    }

    const gatedRoutes = [
      { path: "/design", gate: "product-gate-design", state: "coming_soon" },
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
