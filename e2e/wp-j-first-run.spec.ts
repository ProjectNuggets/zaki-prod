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
const MEMORY_IMPORT_SCREENSHOT_DIR = "e2e/__screenshots__/wp-mem6";

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

  for (const [device, viewport] of Object.entries(RELEASE_VIEWPORTS)) {
    test(`${device} memory-import sheet describes the composer handoff truthfully`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "chromium-desktop",
        "The test owns its required desktop/mobile viewports and runs once.",
      );
      await signInForRelease(page);
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await page.getByRole("button", { name: "Import memory" }).click();
      const importSheet = page.getByRole("dialog", { name: "Bring your memory" });
      await expect(importSheet).toBeVisible();
      await expect(importSheet).toBeInViewport();
      await expect(importSheet).toHaveCSS("transform", "none");
      await importSheet
        .getByPlaceholder("Paste the assistant's reply here.")
        .fill("Zaki: here are my facts. Save and update your memory accordingly.");
      await expect(importSheet.getByRole("button", { name: "Continue in Agent" })).toBeVisible();
      await expect(importSheet.getByText(/carry its response into your Agent reply/i)).toBeVisible();

      await page.screenshot({
        path: `${MEMORY_IMPORT_SCREENSHOT_DIR}/${device}-composer-handoff.png`,
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

  test("carries a memory import into the ordinary Agent composer before sending", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);

    let captureCalls = 0;
    await page.route("**/api/memory/capture", async (route) => {
      captureCalls += 1;
      await json(route, { saved: [], superseded: [], duplicates: [], skipped: [] });
    });

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

    const dump = [
      "Zaki: here are my facts. Save and update your memory accordingly.",
      "",
      "Identity",
      "[2026-07-18] - Lives in Berlin",
      "",
      "Preferences",
      "[2026-07-18] - Prefers concise answers",
    ].join("\n");

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Import memory" }).click();
    await page.getByPlaceholder("Paste the assistant's reply here.").fill(dump);
    const continueButton = page.getByRole("button", { name: "Continue in Agent" });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    await expect(page).toHaveURL(/\/agent(?:\?|$)/);
    await expect(page.getByRole("combobox")).toHaveValue(dump, { timeout: 20_000 });
    expect(sentMessages).toEqual([]);
    expect(captureCalls).toBe(0);

    await page.getByRole("button", { name: "Send message" }).click();

    await expect.poll(() => sentMessages).toEqual([dump]);
    expect(captureCalls).toBe(0);

    // Re-importing the same export is valid (for example after correcting the destination Agent).
    // The route handoff must be consumable again after its prior private state has been cleared.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Import memory" }).click();
    await page.getByPlaceholder("Paste the assistant's reply here.").fill(dump);
    await page.getByRole("button", { name: "Continue in Agent" }).click();
    await expect(page.getByRole("combobox")).toHaveValue(dump, { timeout: 20_000 });
    expect(sentMessages).toEqual([dump]);
  });

  test("splits only an oversized composer import into bounded Agent turns", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);

    let captureCalls = 0;
    await page.route("**/api/memory/capture", async (route) => {
      captureCalls += 1;
      await json(route, { saved: [], superseded: [], duplicates: [], skipped: [] });
    });

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

    const dump = [
      "Zaki: here are my facts. Save and update your memory accordingly.",
      "",
      "Identity",
      `[2026-07-18] - ${"I".repeat(4100)}`,
      "",
      "Preferences",
      `[2026-07-18] - ${"P".repeat(4100)}`,
    ].join("\n");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Import memory" }).click();
    await page.getByPlaceholder("Paste the assistant's reply here.").fill(dump);
    await page.getByRole("button", { name: "Continue in Agent" }).click();

    await expect(page).toHaveURL(/\/agent(?:\?|$)/);
    await expect(page.getByRole("combobox")).toHaveValue(dump, { timeout: 20_000 });
    expect(sentMessages).toEqual([]);

    await page.getByRole("button", { name: "Send message" }).click();

    await expect.poll(() => sentMessages.length).toBe(2);
    expect(sentMessages[0]).toContain("Identity");
    expect(sentMessages[1]).toContain("Preferences");
    expect(sentMessages.every((message) => message.length < 8000)).toBe(true);
    expect(captureCalls).toBe(0);
  });

  test("restores only unsent oversized import parts after a later turn fails", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);

    const sentMessages: string[] = [];
    let importAttempt = 0;
    await page.route("**/api/agent/chat/stream", async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      const firstRun = body.message?.startsWith("Begin our first conversation now.");
      if (firstRun) {
        await json(route, { type: "done", message: ENGINE_GREETING });
        return;
      }

      importAttempt += 1;
      sentMessages.push(body.message ?? "");
      if (importAttempt === 2) {
        await json(
          route,
          { code: "invalid_import_part", message: "Part rejected", retryable: false },
          400,
        );
        return;
      }
      await json(route, { type: "done", message: "Saved." });
    });

    const dump = [
      "Zaki: here are my facts. Save and update your memory accordingly.",
      "",
      "Identity",
      `[2026-07-18] - ${"I".repeat(4100)}`,
      "",
      "Preferences",
      `[2026-07-18] - ${"P".repeat(4100)}`,
    ].join("\n");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Import memory" }).click();
    await page.getByPlaceholder("Paste the assistant's reply here.").fill(dump);
    await page.getByRole("button", { name: "Continue in Agent" }).click();
    await expect(page.getByRole("combobox")).toHaveValue(dump, { timeout: 20_000 });

    await page.getByRole("button", { name: "Send message" }).click();

    await expect.poll(() => sentMessages.length).toBe(2);
    await expect(page.getByRole("combobox")).toHaveValue(/Preferences/);
    await expect(page.getByRole("combobox")).not.toHaveValue(/Identity/);

    await page.getByRole("button", { name: "Send message" }).click();

    await expect.poll(() => sentMessages.length).toBe(3);
    expect(sentMessages.filter((message) => message.includes("Identity"))).toHaveLength(1);
    expect(sentMessages.filter((message) => message.includes("Preferences"))).toHaveLength(2);
  });

  test("keeps an unsplittable oversized import in the composer without sending", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Runs once on desktop Chromium.");
    await mockFirstRunAgent(page);

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

    const dump = `Identity\n[2026-07-18] - ${"x".repeat(8100)}`;

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Import memory" }).click();
    await page.getByPlaceholder("Paste the assistant's reply here.").fill(dump);
    await page.getByRole("button", { name: "Continue in Agent" }).click();
    await expect(page.getByRole("combobox")).toHaveValue(dump, { timeout: 20_000 });

    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("One line of this import is too long to send. Shorten it and try again.")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveValue(dump);
    expect(sentMessages).toEqual([]);
  });
});
