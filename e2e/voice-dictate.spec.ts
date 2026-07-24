import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

async function bootstrapSession(page: Page) {
  await page.addInitScript(({ tokenKey, localeKey }) => {
    window.localStorage.setItem(tokenKey, "e2e-token");
    window.localStorage.setItem(localeKey, "en");
  }, { tokenKey: AUTH_TOKEN_KEY, localeKey: LOCALE_KEY });
}

async function mockMediaRecorder(page: Page) {
  // Stub getUserMedia + MediaRecorder so the mic button works without real mic access.
  await page.addInitScript(() => {
    const testState = { recorderStops: 0, trackStops: 0 };
    Object.defineProperty(window, "__voiceDictateTest", {
      configurable: true,
      value: testState,
    });
    const fakeStream = {
      getTracks: () => [{ stop: () => { testState.trackStops += 1; } }],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => fakeStream },
    });

    class FakeRecorder {
      static isTypeSupported() { return true; }
      state: "inactive" | "recording" = "inactive";
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_stream: MediaStream, _opts?: { mimeType?: string }) {}
      start() { this.state = "recording"; }
      stop() {
        testState.recorderStops += 1;
        this.state = "inactive";
        const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
        this.ondataavailable?.({ data: blob });
        this.onstop?.();
      }
    }
    // @ts-expect-error test stub
    window.MediaRecorder = FakeRecorder;
  });
}

async function mockAppShell(page: Page) {
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token" }),
    }),
  );

  await page.route("**/api/profile", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: { username: "e2e@example.com", fullName: "E2E User" },
      }),
    }),
  );

  await page.route("**/system/refresh-user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: { id: 123, username: "e2e@example.com", role: "default" },
      }),
    }),
  );

  await page.route("**/api/legal/consent-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        authenticated: true,
        policyVersion: "2026-07-12.v4",
        hasConsent: true,
        isCurrent: true,
        requiresReconsent: false,
      }),
    }),
  );

  await page.route("**/api/entitlements", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        plan: { tier: "free", status: "inactive" },
        access: { active: true, readOnly: false, expiresAt: null, campaign: "e2e" },
        features: {},
      }),
    }),
  );

  await page.route("**/workspaces", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspaces: [{ id: 1, slug: "zaky", name: "ZAKI", description: "E2E" }],
      }),
    }),
  );

  await page.route("**/workspace/*/threads", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ threads: [{ id: "t-1", slug: "t-1", title: "Thread 1" }] }),
    }),
  );

  await page.route("**/workspace/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace: { id: 1, slug: "zaky", name: "ZAKI", description: "E2E" },
      }),
    }),
  );

  await page.route("**/workspace/*/thread/*/chats", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [] }),
    }),
  );

  await page.route("**/api/agent/sessions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: [] }),
    }),
  );

  await page.route("**/api/meter/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        identity: { type: "user", userId: "e2e@example.com" },
        plan: { tier: "free", label: "Free" },
        rolling: { windowHours: 5, limit: 10, used: 1, remaining: 9 },
        weekly: { limit: 100, used: 3, remaining: 97 },
      }),
    }),
  );

  await page.route("**/api/memory/status*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ pending: 0, conflicts: 0 }) }),
  );
  await page.route("**/api/memory/events", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      },
      body: `event: status\ndata: {"pending":0,"conflicts":0}\n\n`,
    }),
  );
  await page.route("**/api/memory/list*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ memories: [], nextCursor: null, hasMore: false }) }),
  );
  await page.route("**/api/documents/accepted-file-types", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ types: { "text/plain": [".txt"] } }) }),
  );
  await page.route("**/api/usage/quota*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        unlimited: false,
        limit: 5,
        used: 0,
        remaining: 5,
        resetAt: "2026-03-14T00:00:00.000Z",
        surface: "app_chat",
        bucket: "app_chat",
      }),
    }),
  );
  await page.route("**/api/telemetry/product-event", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) }),
  );

  await page.route("**/api/agent/voice/transcribe", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: "hello from voice dictation" }),
    }),
  );
}

test.describe("voice dictation", () => {
  test("records, transcribes, drops text into input without auto-send", async ({ page }) => {
    const telemetryEvents: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/telemetry/product-event")) {
        try {
          const body = req.postDataJSON() as { event?: string };
          if (body?.event) telemetryEvents.push(body.event);
        } catch {
          // ignore
        }
      }
    });

    await mockMediaRecorder(page);
    await mockAppShell(page);
    await bootstrapSession(page);

    // Register AFTER mockAppShell so Playwright's last-match-wins ordering
    // routes to this handler and we can observe the call.
    let transcribeCalled = false;
    await page.route("**/api/agent/voice/transcribe", (route) => {
      transcribeCalled = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "hello from voice dictation" }),
      });
    });

    await page.goto("/spaces/zaky/threads/t-1");

    const micButton = page.getByRole("button", { name: /tap to record/i });
    await expect(micButton).toBeVisible();
    await micButton.click();

    // Finish records/transcribes; discard is deliberately a separate action.
    const finishRecording = page.getByRole("button", { name: "Finish recording" });
    await expect(finishRecording).toHaveCount(1);
    await finishRecording.click();

    const input = page.locator("#chat-input");
    await expect(input).toHaveValue("hello from voice dictation");

    // Should not have been auto-sent — the text is still in the input.
    expect(transcribeCalled).toBe(true);

    await expect.poll(() => telemetryEvents).toContain("voice_dictate_started");
    await expect.poll(() => telemetryEvents).toContain("voice_dictate_completed");
  });

  test("names an unavailable transcription service and leaves the draft untouched", async ({ page }) => {
    await mockMediaRecorder(page);
    await mockAppShell(page);
    await bootstrapSession(page);

    // Last registered handler wins, so this models the staging/prod capability
    // endpoint returning its normal unavailable response without exposing internals.
    await page.route("**/api/agent/voice/transcribe", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "voice_unavailable" }),
      }),
    );

    await page.goto("/spaces/zaky/threads/t-1");
    await page.getByRole("button", { name: /tap to record/i }).click();
    await page.getByRole("button", { name: "Finish recording" }).click();

    await expect(
      page.getByText("Voice input is unavailable right now. Try again later."),
    ).toBeVisible();
    await expect(page.locator("#chat-input")).toHaveValue("");
  });

  test("cancels dictation before a typed Agent turn starts", async ({ page }) => {
    await mockMediaRecorder(page);
    await mockAppShell(page);
    await bootstrapSession(page);

    let transcribeCalled = false;
    await page.route("**/api/agent/voice/transcribe", (route) => {
      transcribeCalled = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ text: "this must not be inserted" }),
      });
    });
    await page.route("**/api/agent/chat/stream", (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: "event: done\ndata: {}\n\n",
      }),
    );

    await page.goto("/spaces/zaky/threads/t-1");
    await page.locator("#chat-input").fill("Send the typed draft instead");
    await page.getByRole("button", { name: /tap to record/i }).click();
    await expect(page.getByRole("button", { name: "Finish recording" })).toBeVisible();

    await page.locator('button[type="submit"]').click();

    await expect.poll(() => page.evaluate(() => {
      const state = (window as typeof window & {
        __voiceDictateTest?: { recorderStops: number; trackStops: number };
      }).__voiceDictateTest;
      return state ? [state.recorderStops, state.trackStops] : null;
    })).toEqual([1, 1]);
    expect(transcribeCalled).toBe(false);
  });
});
