import { expect, test, type Page, type Route } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

const SESSION_KEY = "agent:zaki-bot:user:1:thread:main";
const ENGINE_GREETING =
  "Hi — it’s my birthday. You brought me to life a moment ago. What should I call you, and what should I call myself?";
const SCREENSHOT_DIR = "e2e/__screenshots__/wp-j";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockFirstRunAgent(page: Page) {
  await signInForRelease(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("zaki:agentUserId", "1");
  });

  await page.route("**/v1/me/bot/onboarding", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { completed?: boolean; identity?: string };
      if (body.identity) {
        expect(body.completed).toBe(false);
        expect(body.identity).toContain("- **Name:**");
      } else {
        expect(body.completed).toBe(true);
      }
      await json(route, {
        completed: body.completed === true,
        completed_at_s: body.completed === true ? 1_784_000_000 : null,
      });
      return;
    }
    await json(route, {
      completed: false,
      completed_at_s: null,
      can_start_chat_now: true,
      minimum_required: [],
      setup: {},
    });
  });

  await page.route("**/api/agent/me", async (route) => {
    await json(route, { userId: "1" });
  });
  await page.route("**/api/agent/provision", async (route) => {
    await json(route, { status: "provisioned" });
  });
  await page.route("**/api/agent/sessions**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/history")) {
      await json(route, { messages: [] });
      return;
    }
    if (path.endsWith("/context")) {
      await json(route, {
        status: "live",
        session_key: SESSION_KEY,
        history_len: 1,
        context_pressure_percent: 1,
      });
      return;
    }
    if (path === "/api/agent/sessions") {
      await json(route, {
        sessions: [
          {
            session_key: SESSION_KEY,
            title: "First conversation",
            message_count: 1,
            last_active: 1_784_000_000,
            live: false,
            mode: "execute",
            pending_approval_count: 0,
          },
        ],
      });
      return;
    }
    await json(route, {
      session_key: SESSION_KEY,
      title: "Main",
      message_count: 1,
      live: false,
      mode: "execute",
      pending_approval_count: 0,
    });
  });
  await page.route("**/api/agent/chat/stream", async (route) => {
    const body = route.request().postDataJSON() as { message?: string };
    const firstRun = body.message?.startsWith("Begin our first conversation now.");
    await json(route, {
      type: "done",
      message: firstRun ? ENGINE_GREETING : "Nova it is. I’m yours — let’s begin.",
    });
  });
}

test.describe("WP-J first-run ceremony", () => {
  for (const [device, viewport] of Object.entries(RELEASE_VIEWPORTS)) {
    test(`${device} engine first turn and name-to-own`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium-desktop",
        "The test owns its required desktop/mobile viewports and runs once.",
      );
      await mockFirstRunAgent(page);
      await page.setViewportSize(viewport);
      await page.goto("/agent", { waitUntil: "domcontentloaded" });

      await expect(page.getByText(ENGINE_GREETING)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("first-run-name-card")).toBeVisible();
      await expect(page.getByText("Begin our first conversation now.")).toHaveCount(0);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${device}-first-run.png`,
        fullPage: false,
      });
    });
  }

  test("persists the chosen identity before continuing the conversation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);
    await page.goto("/agent", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("first-run-name-card")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("textbox", { name: "Name your agent" }).fill("Nova");
    await page.getByRole("button", { name: "Make Nova mine" }).click();

    await expect(page.getByText("Nova it is. I’m yours — let’s begin.")).toBeVisible();
    await expect(page.getByTestId("first-run-name-card")).toHaveCount(0);
  });

  test("waits for memory absorption and confirms the backend count", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await signInForRelease(page);
    const productEvents: Array<{ event?: string; source?: string }> = [];
    await page.route("**/api/telemetry/product-event", async (route) => {
      productEvents.push(route.request().postDataJSON() as { event?: string; source?: string });
      await json(route, { success: true });
    });
    await page.route("**/api/memory/capture", async (route) => {
      await json(route, {
        saved: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            content: "Prefers concise answers",
            type: "preference",
            state: "saved_reversible",
            undoUntil: "2026-07-14T16:00:00.000Z",
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            content: "Lives in Berlin",
            type: "identity",
            state: "saved_reversible",
            undoUntil: "2026-07-14T16:00:00.000Z",
          },
        ],
        superseded: [],
        duplicates: [{ content: "Uses TypeScript", type: "preference" }],
        skipped: [],
      });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Import memory" }).click();
    await page
      .getByPlaceholder("Paste the assistant's reply here.")
      .fill("Zaki: here are my facts. Save and update your memory accordingly.\nPrefers concise answers.");
    await page.getByRole("button", { name: "Absorb into Brain" }).click();

    await expect(page.getByText("I now remember 3 details from your import")).toBeVisible();
    await expect(page.getByText("2 new · 0 updated · 1 already known. Stored in your Brain.")).toBeVisible();
    await expect
      .poll(() => productEvents.some((event) => event.event === "first_memory_saved"))
      .toBe(true);
  });
});
