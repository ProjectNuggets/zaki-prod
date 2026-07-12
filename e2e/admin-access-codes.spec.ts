import { expect, test, type Route } from "@playwright/test";
import { signInForRelease } from "./support/release-harness";

const SUPER_ADMIN = "as@novanuggets.com";

test("renders the hidden super-admin access grant controls", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name.includes("mobile");
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await signInForRelease(page);

  const fulfill = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/profile", (route) =>
    fulfill(route, {
      success: true,
      user: { id: 1, username: SUPER_ADMIN, fullName: "ZAKI Operator" },
    })
  );
  await page.route("**/system/refresh-user", (route) =>
    fulfill(route, {
      success: true,
      user: { id: 1, username: SUPER_ADMIN, role: "super_admin" },
    })
  );
  await page.route("**/api/admin/access-codes**", (route) =>
    fulfill(route, {
      success: true,
      total: 1,
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          code: "MANU7K9P2Q4R",
          campaign: "manual_grant",
          durationDays: 30,
          maxRedemptions: 1,
          redeemedCount: 0,
          remainingRedemptions: 1,
          active: true,
          expiresAt: null,
          createdAt: "2026-07-12T12:00:00.000Z",
        },
      ],
    })
  );
  await page.route("**/api/admin/admins", (route) =>
    fulfill(route, {
      success: true,
      actor: { email: SUPER_ADMIN, role: "super_admin", isSuperAdmin: true },
      items: [
        {
          email: SUPER_ADMIN,
          role: "super_admin",
          isSuperAdmin: true,
          active: true,
          createdBy: SUPER_ADMIN,
          createdAt: "2026-07-12T12:00:00.000Z",
          updatedAt: "2026-07-12T12:00:00.000Z",
        },
      ],
    })
  );
  await page.route("**/api/admin/rate-limits", (route) =>
    fulfill(route, {
      success: true,
      settings: {
        appChatDailyPromptLimit: 100,
        appChatDailyPromptBucket: "app_chat",
        appChatPromptPeriod: "day",
        zakiBotDailyPromptLimit: 1000,
        zakiBotDailyPromptBucket: "agent",
        zakiBotPromptPeriod: "week",
        agentPerMinuteLimit: 10,
      },
    })
  );
  await page.route("**/api/internal/learning/ai-stack", (route) =>
    fulfill(route, {
      success: true,
      operatorManaged: true,
      status: { enabled: true, configured: true },
      aiStack: {},
      deploymentReadiness: { ready: true, gates: [] },
    })
  );

  await page.goto("/internal/operator", { waitUntil: "domcontentloaded" });
  const heading = page.getByRole("heading", { name: "Generate access codes" });
  await expect(heading).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("retrying the same code returns the original expiry")).toBeVisible();
  await expect(page.getByLabel("Grant label")).toHaveValue("manual_grant");
  await expect(page.getByRole("spinbutton", { name: "Count" })).toHaveValue("1");

  await heading.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath(`admin-access-codes-${mobile ? "mobile" : "desktop"}.png`),
  });
});
