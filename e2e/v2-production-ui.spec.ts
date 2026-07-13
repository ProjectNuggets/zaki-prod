// V2 production-final UI gate.
//
// These checks assert the app-level structure that must stay stable for the
// public V1 surface: dashboard, Agent, Brain, Settings, and direct gated
// product routes. Pixel-perfect review remains a human step via the release
// screenshots; this spec makes route exposure and V2 chrome regressions fail CI.

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  RELEASE_GATED_ROUTES,
  RELEASE_VIEWPORTS,
  signInForRelease,
} from "./support/release-harness";

async function attachViewportShot(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = await page.screenshot({ fullPage: false });
  await testInfo.attach(name, { body: screenshot, contentType: "image/png" });
}

async function openInspectorIfNeeded(page: Page) {
  const inspector = page.locator(".zaki-agent-inspector").first();
  if ((await inspector.count()) > 0 && await inspector.isVisible()) return;
  const toggle = page.getByTestId("agent-inspector-toggle");
  if ((await toggle.count()) > 0) {
    await toggle.click();
    await expect(inspector).toBeVisible({ timeout: 10_000 });
  }
}

async function mockSettingsActivation(page: Page) {
  let adoptedKey = "";
  await page.route("**/api/agent/telos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        telos_in_prompt: true,
        telos: [{ key: "durable_fact/telos/goal/1", type: "goal", content: "Launch ZAKI" }],
      }),
    });
  });
  await page.route("**/api/agent/jobs**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobs: [
          { id: "dream_3am", command: "dream", next_run_secs: 1_800_000_000 },
          { id: "mine_330am", command: "mine", next_run_secs: 1_800_001_800 },
          { id: "weekday-brief", name: "Weekday brief", next_run_secs: 1_800_003_600 },
        ],
      }),
    });
  });
  await page.route("**/api/agent/suggestions/adopt", async (route) => {
    const body = route.request().postDataJSON() as { key?: string } | null;
    adoptedKey = body?.key || "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "adopted", key: adoptedKey }),
    });
  });
  await page.route("**/api/agent/suggestions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            key: "durable_fact/behavior/1",
            origin: "trace-miner",
            content: "Lead with outcomes",
          },
        ],
      }),
    });
  });
  return () => adoptedKey;
}

test.describe("V2 production-final app surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await signInForRelease(page);
  });

  test("dashboard mounts as the commercial command center", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("zaki-command-center")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("zaki-dashboard-command-strip")).toBeVisible();
    await expect(page.getByTestId("zaki-dashboard-command-meter")).toBeVisible();
    await expect(page.getByTestId("zaki-dashboard-product-hint")).toBeVisible();
    await expect(page.getByTestId("zaki-dashboard-command")).toBeVisible();
    await expect(page.getByTestId("zaki-dashboard-products")).toHaveCount(0);
    await attachViewportShot(page, testInfo, "dashboard-1440x1000");
  });

  test("Agent desktop exposes composer controls and delivery tabs", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await page.goto("/agent", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".zaki-agent-v2")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("zaki-turn-controls")).toBeVisible();
    await expect(page.getByTestId("zaki-composer-mode")).toBeVisible();
    await expect(page.getByTestId("zaki-composer-reasoning")).toBeVisible();
    await expect(page.getByTestId("zaki-composer-autonomy")).toBeVisible();
    await expect(page.getByTestId("zaki-context-meter")).toBeVisible();

    await openInspectorIfNeeded(page);
    const inspector = page.locator(".zaki-agent-inspector").first();
    await expect(inspector).toBeVisible();
    for (const label of ["Artifacts", "Schedules"]) {
      await expect(inspector.getByRole("tab", { name: new RegExp(label, "i") })).toBeVisible();
    }
    await expect(inspector.getByRole("tab")).toHaveCount(2);
    await expect(inspector.getByRole("region", { name: "Artifacts" })).toBeVisible();
    await attachViewportShot(page, testInfo, "agent-1440x1000");
  });

  test("Agent mobile keeps the V2 composer reachable", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.mobile);
    await page.goto("/agent", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".zaki-agent-v2")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /add options/i }).click();
    await expect(page.getByTestId("zaki-composer-upload")).toBeVisible();
    await expect(page.getByTestId("zaki-turn-controls")).toBeVisible();
    await expect(page.getByTestId("zaki-context-meter")).toBeVisible();
    await attachViewportShot(page, testInfo, "agent-390x844");
  });

  test("Chat/Spaces stays public and renders the workspace shell", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await page.goto("/spaces", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("zaki-spaces-shell")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Workspaces for focused, ongoing work.")).toBeVisible();
    await expect(page.getByText("Start a blank workspace with a custom master prompt.")).toBeVisible();
    await attachViewportShot(page, testInfo, "spaces-1440x1000");
  });

  test("Brain renders graph first with overview below", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await page.goto("/brain", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("brain-graph-slot")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("brain-graph-canvas-wrap")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("brain-home-slot")).toBeVisible();
    const positions = await page.evaluate(() => {
      const graph = document.querySelector('[data-testid="brain-graph-slot"]');
      const home = document.querySelector('[data-testid="brain-home-slot"]');
      return {
        graphTop: graph?.getBoundingClientRect().top ?? 0,
        homeTop: home?.getBoundingClientRect().top ?? 0,
      };
    });
    expect(positions.graphTop).toBeLessThan(positions.homeTop);
    await attachViewportShot(page, testInfo, "brain-graph-1440x1000");

    await page.getByTestId("brain-home-slot").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("brain-home")).toBeVisible();
    await attachViewportShot(page, testInfo, "brain-overview-1440x1000");
  });

  test("Brain mobile keeps graph controls reachable and overview scrollable", async ({ page }, testInfo) => {
    await page.setViewportSize(RELEASE_VIEWPORTS.mobile);
    await page.goto("/brain", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("brain-graph-slot")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("brain-controls-toggle")).toBeVisible();
    await page.getByTestId("brain-home-slot").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("brain-home")).toBeVisible();
    await attachViewportShot(page, testInfo, "brain-390x844");
  });

  test("Settings exposes the final control-plane sections without secrets", async ({ page }, testInfo) => {
    const adoptedKey = await mockSettingsActivation(page);
    await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    for (const testId of [
      "settings-account",
      "settings-billing",
      "settings-platform-usage",
      "settings-agent",
      "settings-automations",
      "settings-suggestions",
      "settings-telos",
      "settings-connections",
      "settings-channels",
      "settings-secrets",
      "settings-devices",
      "settings-memory-data",
      "settings-memory-governance",
      "settings-privacy",
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible({ timeout: 20_000 });
    }
    for (const removedTestId of [
      "settings-products-access",
      "settings-providers",
      "settings-developer-access",
    ]) {
      await expect(page.getByTestId(removedTestId)).toHaveCount(0);
    }
    await expect(page.getByTestId("settings-channels").getByText("Telegram", { exact: true })).toBeVisible();
    await expect(page.getByTestId("settings-channels").getByText("Slack", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("settings-channels").getByText("Discord", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("settings-channels").getByText("Email", { exact: true })).toHaveCount(0);
    const slackChannel = page.getByTestId("settings-channel-slack");
    await slackChannel.getByRole("button", { name: "Manage Slack" }).click();
    const slackPanel = page.getByTestId("settings-channel-panel-slack");
    await expect(slackPanel.getByText(/Bot User OAuth Token \(xoxb-/i)).toBeVisible();
    await expect(slackPanel.getByText(/Both the Bot token and Signing secret are required for first-time setup/i)).toBeVisible();
    await expect(slackPanel.getByText(/workspace OAuth app-install is not available yet/i)).toBeVisible();
    await expect(slackPanel.getByLabel("Slack Bot token")).toHaveAttribute("type", "password");
    await attachViewportShot(page, testInfo, "settings-slack-1440x1000");
    const connections = page.getByTestId("settings-connections");
    await expect(connections.getByText("Gmail & Google Drive")).toBeVisible();
    await expect(connections.getByRole("button", { name: "Connect Gmail" })).toBeDisabled();
    await expect(connections.getByText(/never asks for an IMAP or SMTP password/i)).toBeVisible();
    await expect(
      connections.getByText(/require approval before private data is sent elsewhere/i),
    ).toBeVisible();
    await expect(page.getByTestId("settings-secrets").getByText("telegram_bot_token")).toBeVisible();
    await expect(page.getByTestId("settings-secrets").getByText(/xoxb-|Discord bot token|IMAP password/i)).toHaveCount(0);
    await expect(page.getByTestId("settings-billing").getByText("ZAKI CLI")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Default model" })).toBeVisible();
    await expect(page.getByRole("option", { name: /Claude Haiku 4\.5/ })).toHaveCount(1);
    await expect(page.getByTestId("settings-telos").getByText("Active in prompts")).toBeVisible();
    await expect(page.getByTestId("settings-automations").getByText("Dream reflection")).toBeVisible();
    await expect(page.getByTestId("settings-automations").getByText("Learning miner")).toBeVisible();
    await expect(page.getByTestId("settings-automations").getByText("Weekday brief")).toBeVisible();
    const suggestions = page.getByTestId("settings-suggestions");
    await expect(suggestions.getByText("Lead with outcomes")).toBeVisible();
    await suggestions.getByRole("button", { name: "Adopt" }).click();
    await expect.poll(adoptedKey).toBe("durable_fact/behavior/1");
    await expect(suggestions.getByText("Lead with outcomes")).toHaveCount(0);
    await attachViewportShot(page, testInfo, "settings-1440x1000");
  });

  test("Settings activation remains reachable on mobile", async ({ page }, testInfo) => {
    await mockSettingsActivation(page);
    await page.setViewportSize(RELEASE_VIEWPORTS.mobile);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("settings-telos")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("settings-agent").scrollIntoViewIfNeeded();
    await expect(page.getByRole("combobox", { name: "Default model" })).toBeVisible();
    await page.getByTestId("settings-suggestions").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Adopt" })).toBeVisible();
    await page.getByTestId("settings-automations").scrollIntoViewIfNeeded();
    await expect(
      page.getByTestId("settings-automations").getByText("Dream reflection", { exact: true }),
    ).toBeVisible();
    await page.getByTestId("settings-channel-slack").scrollIntoViewIfNeeded();
    await page.getByTestId("settings-channel-slack").getByRole("button", { name: "Manage Slack" }).click();
    const mobileSlackGuidance = page
      .getByTestId("settings-channel-panel-slack")
      .getByText(/Both the Bot token and Signing secret are required for first-time setup/i);
    await mobileSlackGuidance.scrollIntoViewIfNeeded();
    await expect(mobileSlackGuidance).toBeVisible();
    await attachViewportShot(page, testInfo, "settings-slack-390x844");
    await page.getByTestId("settings-connections").scrollIntoViewIfNeeded();
    await expect(page.getByText("Gmail & Google Drive")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Gmail" })).toBeDisabled();
    await attachViewportShot(page, testInfo, "settings-390x844");
  });

  for (const route of RELEASE_GATED_ROUTES) {
    test(`direct ${route.path} route stays gated`, async ({ page }) => {
      await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(route.gate)).toBeVisible({ timeout: 20_000 });
    });
  }

  for (const route of [
    { path: "/products/agent", target: /\/agent$/, signal: ".zaki-agent-v2" },
    { path: "/ar/products/agent", target: /\/agent$/, signal: ".zaki-agent-v2" },
    { path: "/zaki-bot", target: /\/agent$/, signal: ".zaki-agent-v2" },
    { path: "/products/spaces", target: /\/spaces$/, testId: "zaki-spaces-shell" },
    { path: "/products/learn", target: /\/products\/learn$/, heading: "ZAKI Learn" },
    { path: "/products/hire", target: /\/products\/hire$/, heading: "ZAKI Career" },
    { path: "/products/design", target: /\/products\/design$/, heading: "ZAKI Design" },
  ] as const) {
    test(`signed-in product marketing path ${route.path} resolves to truthful surface`, async ({ page }) => {
      await page.setViewportSize(RELEASE_VIEWPORTS.desktop);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(route.target, { timeout: 20_000 });
      if ("signal" in route) {
        await expect(page.locator(route.signal).first()).toBeVisible({ timeout: 20_000 });
      }
      if ("testId" in route) {
        await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 20_000 });
      }
      if ("heading" in route) {
        await expect(page.getByRole("heading", { name: route.heading })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByRole("link", { name: /Open dashboard/i })).toBeVisible();
        await expect(page.locator('[data-product-gate]')).toHaveCount(0);
      }
    });
  }
});
