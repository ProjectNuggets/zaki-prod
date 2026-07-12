// Product visibility gate — Agent/Chat/Brain public; Learn/Career gated; Design waitlist.
// Agent 5 (codex/v2-release-e2e).
//
// Two layers:
//   1. FIRM (always run): the ProductRail shell nav is a small, stable
//      component. It reliably encodes public-vs-gated: Agent/Chat/Brain
//      are interactive; Learn/Career are gated; Design is disabled until its
//      backend is configured. These assertions are safe today.
//   2. Dashboard command strip: the app front door exposes public launch
//      surfaces while Learn/Career/Design stay visible as gated/waitlist context,
//      not generally available app surfaces.

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
    await expect(rail.getByTitle(/^Career/i)).toBeDisabled();
    await expect(rail.getByTitle(/^Design/i)).toBeDisabled();
  });

  test("dashboard command strip keeps beta and waitlist products contextual", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });

    const strip = page.getByTestId("zaki-dashboard-command-strip");
    const hint = page.getByTestId("zaki-dashboard-product-hint");
    await expect(strip).toBeVisible({ timeout: 20_000 });

    // Brain remains public in the product rail above. The command strip is
    // intentionally limited to lanes that accept a dashboard prompt.
    for (const label of ["Agent", "Chat"]) {
      await expect(strip.getByRole("tab", { name: label })).toBeVisible();
    }
    await expect(strip.getByRole("tab", { name: "Brain" })).toHaveCount(0);

    await strip.getByRole("tab", { name: "Learn" }).click();
    await expect(hint.getByText(/Learn stays gated until learner state/i)).toBeVisible();

    await strip.getByRole("tab", { name: "Design" }).click();
    await expect(hint.getByText(/Design stays waitlisted until the project service/i)).toBeVisible();

    await strip.getByRole("tab", { name: "Career" }).click();
    await expect(hint.getByText(/Career stays gated until the private workflow/i)).toBeVisible();
  });

  test("direct beta and waitlist routes render gates instead of product surfaces", async ({ page }) => {
    const gatedRoutes = [
      {
        path: "/learn",
        gate: "product-gate-learning",
        hiddenSurface: '[data-product-id="learning"]',
        label: "Private access",
      },
      {
        path: "/hire",
        gate: "product-gate-hire",
        hiddenSurface: '[data-product-id="hire"]',
        label: "Private access",
      },
      {
        path: "/design",
        gate: "product-gate-design",
        hiddenSurface: '[data-product-id="design"]',
        label: "Waitlist",
      },
    ] as const;

    for (const route of gatedRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(route.gate)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId(route.gate).getByText(route.label).first()).toBeVisible();
      await expect(page.locator(route.hiddenSurface)).toHaveCount(0);
    }
  });
});
