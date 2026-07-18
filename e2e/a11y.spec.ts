// Automated accessibility coverage (axe-core) for the Gate-3 UI fixes.
//
// Zero automated a11y coverage existed before this spec. It reuses the
// release-QA signed-in harness (see ./support/release-harness.ts) so axe
// scans the real, authenticated product surfaces — dashboard, Agent, Brain,
// Settings — rather than bouncing off a login redirect. It also drives open
// the TypeToConfirmDialog (the G3-06 focus-trap/contrast fix) from the
// Settings > Privacy "Delete account" action and scans it in its open state.
//
// Scope: only CRITICAL-impact violations fail the test. Serious violations
// are logged (not asserted) so the gate stays meaningful without becoming
// noisy on pre-existing, lower-severity issues.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

/** Only fail the build on critical-impact violations; log the rest. */
function assertNoCriticalViolations(
  results: Awaited<ReturnType<AxeBuilder["analyze"]>>,
  label: string,
) {
  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");

  if (serious.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[a11y] ${label}: ${serious.length} serious violation(s) (not failing): ` +
        serious.map((v) => v.id).join(", "),
    );
  }

  if (critical.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[a11y] ${label}: CRITICAL violations found:\n` +
        JSON.stringify(critical, null, 2),
    );
  }

  expect(critical, `${label} has critical a11y violations`).toEqual([]);
}

async function settle(page: Page) {
  await page.locator(".zaki-app-v2").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(300);
}

test.describe("Accessibility (axe) — critical violations gate", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
  });

  test("dashboard (/) has no critical a11y violations", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("zaki-command-center")).toBeVisible({ timeout: 20_000 });
    await settle(page);

    const results = await new AxeBuilder({ page }).analyze();
    assertNoCriticalViolations(results, "dashboard (/)");
  });

  test("Agent (/agent) has no critical a11y violations", async ({ page }) => {
    await page.goto("/agent", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".zaki-agent-v2")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("zaki-turn-controls")).toBeVisible();
    await settle(page);

    const results = await new AxeBuilder({ page }).analyze();
    assertNoCriticalViolations(results, "Agent (/agent)");
  });

  test("Brain (/brain) has no critical a11y violations", async ({ page }) => {
    await page.goto("/brain", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("brain-graph-slot")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("brain-home-slot")).toBeVisible();
    await settle(page);

    const results = await new AxeBuilder({ page }).analyze();
    assertNoCriticalViolations(results, "Brain (/brain)");
  });

  test("Settings (/settings) has no critical a11y violations", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-account")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("settings-privacy")).toHaveCount(0);
    await settle(page);

    const results = await new AxeBuilder({ page }).analyze();
    assertNoCriticalViolations(results, "Settings (/settings)");
  });

  test("TypeToConfirmDialog (delete account) has no critical a11y violations", async ({ page }) => {
    await page.goto("/settings#settings-privacy", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("settings-privacy")).toBeVisible({ timeout: 20_000 });
    await settle(page);

    await page.getByTestId("settings-privacy").getByRole("button", { name: "Delete account" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Wait for the dialog's stable, fully-rendered state (title, body, input,
    // and both action buttons all painted, plus the focus trap having moved
    // focus somewhere inside the dialog) before scanning.
    await expect(page.locator("#ttc-confirm-input")).toBeVisible();
    await expect(dialog.getByText("release-qa@zaki.test")).toBeVisible();
    await expect
      .poll(async () => dialog.locator(":focus").count(), { timeout: 10_000 })
      .toBeGreaterThan(0);

    const results = await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze();
    assertNoCriticalViolations(results, "TypeToConfirmDialog (delete account)");
  });
});
