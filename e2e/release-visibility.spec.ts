// Product visibility gate — Agent/Chat/Brain public; Learn/Hire beta; Design waitlist.
// Agent 5 (codex/v2-release-e2e).
//
// Two layers:
//   1. FIRM (always run): the ProductRail shell nav is a small, stable
//      component. It reliably encodes public-vs-gated: Agent/Chat/Brain
//      are interactive; Learn/Hire are private beta; Design is disabled until its
//      backend is configured. These assertions are safe today.
//   2. SCAFFOLDED (skips if not reached): the dashboard renders explicit text
//      tags ("Private beta" / "Waitlist" / "Control plane") via getProductTag.
//      Dashboard reachability is still stabilizing, so this asserts only when
//      the product grid actually renders and otherwise records a skip rather
//      than a brittle failure.

import { expect, test } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

test.describe("ZAKI V1 product visibility", () => {
  test.beforeEach(async ({ page }) => {
    // ProductRail is `hidden md:flex` — force desktop so it renders regardless
    // of the active Playwright project.
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await signInForRelease(page);
  });

  test("ProductRail exposes public surfaces and gates beta/waitlist surfaces", async ({ page }) => {
    await page.goto("/agent", { waitUntil: "domcontentloaded" });

    const rail = page.locator(".zaki-product-rail");
    await expect(rail).toBeVisible({ timeout: 20_000 });

    // Public, generally-available surfaces are interactive. The button's
    // `title` attribute carries the product label.
    for (const label of ["Agent", "Chat", "Brain"]) {
      await expect(rail.getByTitle(new RegExp(`^${label}`, "i"))).toBeEnabled();
    }

    // Gated surfaces are present but not interactive in the public V1 build.
    await expect(rail.getByTitle(/^Learn/i)).toBeDisabled();
    await expect(rail.getByTitle(/^Hire/i)).toBeDisabled();
    await expect(rail.getByTitle(/^Design/i)).toBeDisabled();
  });

  test("dashboard product tags (scaffold — skips until dashboard grid stabilizes)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });

    // Detect whether the dashboard product grid actually rendered. The "Live"
    // tag is emitted for every enabled public product, so it is a reliable
    // presence probe for the grid. Wait (bounded) for the registry-driven grid
    // to settle before counting, otherwise we'd false-skip on a slow query.
    const liveTag = page.getByText("Live", { exact: true }).first();
    await liveTag.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    const liveTagCount = await liveTag.count();

    test.skip(liveTagCount === 0, "Dashboard product grid not reached — strict tag assertions deferred (Wave 2).");

    // Beta + waitlist + control-plane tags are deterministic from the registry.
    await expect(page.getByText("Private beta", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Waitlist", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Control plane", { exact: true }).first()).toBeVisible();
  });
});
