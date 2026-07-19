import { expect, test, type Page, type Route } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

const SESSION_KEY = "agent:zaki-bot:user:1:thread:main";
const ENGINE_GREETING = [
  "Hi — I’m ZAKI. I’m here to help turn what matters into forward motion.",
  "",
  "- **Shape the work:** clarify goals and next steps.",
  "- **Carry the context:** remember useful details across conversations.",
  "- **Act with you:** plan, research, and execute under your direction.",
  "",
  "What should I call you, and what would you like to call me?",
].join("\n");
const ENGINE_QUESTION = "What should I call you, and what would you like to call me?";
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
      const body = route.request().postDataJSON() as { completed?: boolean };
      expect(body).toEqual({ completed: true });
      await json(route, {
        completed: true,
        completed_at_s: 1_784_000_000,
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
    test(`${device} engine first turn leaves the ordinary composer ready`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium-desktop",
        "The test owns its required desktop/mobile viewports and runs once.",
      );
      await mockFirstRunAgent(page);
      await page.setViewportSize(viewport);
      await page.goto("/agent", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Shape the work:")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("listitem").filter({ hasText: "Carry the context:" })).toBeVisible();
      await expect(page.getByRole("listitem").filter({ hasText: "Act with you:" })).toBeVisible();
      await expect(page.getByText(ENGINE_QUESTION)).toBeVisible();
      await expect(page.getByTestId("first-run-name-card")).toHaveCount(0);
      await expect(page.getByRole("combobox")).toBeVisible();
      await expect(page.getByText("Begin our first conversation now.")).toHaveCount(0);
      await expect(page.getByText(/Experimental|invalid_session_key|\[\[ZAKI_/)).toHaveCount(0);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${device}-first-run.png`,
        fullPage: false,
      });
    });
  }

  test("completes onboarding after the user's natural first reply", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);
    await page.goto("/agent", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(ENGINE_QUESTION)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("combobox").fill("Call yourself Nova. I'm Sam.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("Nova it is. I’m yours — let’s begin.")).toBeVisible();
    await expect(page.getByTestId("first-run-name-card")).toHaveCount(0);
  });

  test("sends the import through the agent, never the Hub capture store", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await signInForRelease(page);
    await mockFirstRunAgent(page);

    // WP-MEM6. This used to POST /api/memory/capture, which writes the Hub store (public.memories,
    // keyed by email) — a store the AGENT cannot read. Users imported a profile, were told it was
    // stored, and the agent knew none of it. Counting the calls means a regression fails loudly here
    // instead of quietly reintroducing an unreadable write.
    let captureCalls = 0;
    await page.route("**/api/memory/capture", async (route) => {
      captureCalls += 1;
      await json(route, { saved: [], superseded: [], duplicates: [], skipped: [] });
    });

    // Registered after mockFirstRunAgent so this handler wins and can record what was sent. The
    // first-run bootstrap turn fires on mount and races the import, so exclude it the same way the
    // shared mock detects it — otherwise this asserts on arrival order, which is not the contract.
    const sentMessages: string[] = [];
    await page.route("**/api/agent/chat/stream", async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      const firstRun = body.message?.startsWith("Begin our first conversation now.");
      if (!firstRun) sentMessages.push(body.message ?? "");
      await json(route, {
        type: "done",
        message: firstRun ? ENGINE_GREETING : "Saved.",
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Import memory" }).click();
    await page
      .getByPlaceholder("Paste the assistant's reply here.")
      .fill(
        "Identity\n[2026-07-18] - Lives in Berlin\n\nPreferences\n[2026-07-18] - Prefers concise answers",
      );
    await page.getByRole("button", { name: "Absorb into Brain" }).click();

    // Two headers -> two turns, each carrying its own header: the split is on meaning, not on a
    // character count, so entries never arrive detached from the heading that explains them.
    await expect.poll(() => sentMessages.length, { timeout: 15_000 }).toBe(2);
    expect(sentMessages[0]).toContain("Identity");
    expect(sentMessages[0]).toContain("Lives in Berlin");
    expect(sentMessages[1]).toContain("Preferences");
    expect(sentMessages[1]).toContain("Prefers concise answers");
    expect(captureCalls).toBe(0);
  });
});
