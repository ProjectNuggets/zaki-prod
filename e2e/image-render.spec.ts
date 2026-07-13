import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

const IMAGE_URL =
  "https://api.together.xyz/imgproxy/abc/generated-image.png";
const LOCAL_PATH = "/workspace/images/img_1700000000_1.png";

const ASSISTANT_CONTENT = [
  "Here's your image:",
  `![generated image](${IMAGE_URL})`,
  `Saved: ${LOCAL_PATH}`,
  `Download: ${IMAGE_URL}`,
].join("\n");

const INLINE_PROSE_CONTENT =
  `Here's your logo: ![generated image](${IMAGE_URL}) Let me know if you want a variation.`;

const SENTINEL_CONTENT = [
  "Here you go.",
  `[IMAGE:/workspace/images/img_1700000000_2.png]`,
  `Transcript note: [AUDIO:/workspace/audio/clip_1.mp3] thanks.`,
  `[VOICE:/workspace/voice/note_1.webm]`,
].join("\n");

async function bootstrapSession(page: Page) {
  await page.addInitScript(({ tokenKey, localeKey }) => {
    window.localStorage.setItem(tokenKey, "e2e-token");
    window.localStorage.setItem(localeKey, "en");
    window.localStorage.setItem("zaki:onboarding:v1:e2e@example.com", "done");
  }, { tokenKey: AUTH_TOKEN_KEY, localeKey: LOCALE_KEY });
}

async function mockAppShell(page: Page, assistantContent: string = ASSISTANT_CONTENT) {
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
      body: JSON.stringify({
        history: [
          { role: "user", content: "draw me a logo", chatId: 1 },
          { role: "assistant", content: assistantContent, chatId: 2 },
        ],
      }),
    }),
  );

  await page.route("**/workspace/*/thread/*/stream-chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ type: "done", textResponse: "ok" }),
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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pending: 0, conflicts: 0 }),
    }),
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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ memories: [], nextCursor: null, hasMore: false }),
    }),
  );

  await page.route("**/api/memory/confirmations*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ confirmations: [] }),
    }),
  );

  await page.route("**/api/memory/conflicts*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conflicts: [] }),
    }),
  );

  await page.route("**/api/documents/accepted-file-types", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ types: { "text/plain": [".txt"] } }),
    }),
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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    }),
  );

  // Serve a small valid PNG for the generated image URL so onLoad fires.
  await page.route(IMAGE_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
}

test.describe("assistant image rendering", () => {
  test("renders inline image, dedupes download, hides saved path, fires telemetry", async ({ page }) => {
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

    await mockAppShell(page);
    await bootstrapSession(page);

    await page.goto("/spaces/zaky/threads/t-1");

    const generatedImage = page.getByTestId("assistant-generated-image");
    await expect(generatedImage).toBeVisible();
    await expect(generatedImage).toHaveAttribute("loading", "lazy");

    // Exactly one <img> rendered for the image URL (no duplicate for Download line).
    await expect(page.locator(`img[src="${IMAGE_URL}"]`)).toHaveCount(1);

    // Download button exists with download attribute.
    const downloadButton = page.getByTestId("assistant-image-download");
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toHaveAttribute("download", "");
    await expect(downloadButton).toHaveAttribute("href", IMAGE_URL);

    // Saved path is NOT exposed to the user.
    await expect(page.getByText(LOCAL_PATH)).toHaveCount(0);
    await expect(page.getByText("/workspace/images/")).toHaveCount(0);

    // Telemetry fired on successful image load.
    await expect.poll(() => telemetryEvents).toContain("image_rendered");
  });

  test("hides [IMAGE:]/[AUDIO:]/[VOICE:] sentinel paths from the user", async ({ page }) => {
    await mockAppShell(page, SENTINEL_CONTENT);
    await bootstrapSession(page);

    await page.goto("/spaces/zaky/threads/t-1");

    // Intro line still renders.
    await expect(page.getByText("Here you go.")).toBeVisible();

    // [IMAGE:/path] collapses to the discreet "saved locally" indicator.
    await expect(page.getByTestId("assistant-saved-locally")).toBeVisible();

    // The inline [AUDIO:] sentinel is stripped but surrounding prose survives.
    await expect(page.getByText(/Transcript note:\s+thanks\./)).toBeVisible();

    // Raw sentinel tokens and absolute filesystem paths must not leak to the DOM.
    await expect(page.getByText("[IMAGE:", { exact: false })).toHaveCount(0);
    await expect(page.getByText("[AUDIO:", { exact: false })).toHaveCount(0);
    await expect(page.getByText("[VOICE:", { exact: false })).toHaveCount(0);
    await expect(page.getByText("/workspace/images/img_1700000000_2")).toHaveCount(0);
    await expect(page.getByText("/workspace/audio/clip_1.mp3")).toHaveCount(0);
    await expect(page.getByText("/workspace/voice/note_1.webm")).toHaveCount(0);
  });

  test("hoists inline markdown image out of surrounding prose", async ({ page }) => {
    await mockAppShell(page, INLINE_PROSE_CONTENT);
    await bootstrapSession(page);

    await page.goto("/spaces/zaky/threads/t-1");

    // Image rendered once.
    await expect(page.getByTestId("assistant-generated-image")).toBeVisible();
    await expect(page.locator(`img[src="${IMAGE_URL}"]`)).toHaveCount(1);

    // Prose on both sides renders as text (not swallowed, not raw ![..](..) syntax).
    await expect(page.getByText("Here's your logo:")).toBeVisible();
    await expect(
      page.getByText("Let me know if you want a variation.", { exact: false }),
    ).toBeVisible();

    // The raw markdown token must not leak into the DOM as text.
    await expect(page.getByText(`![generated image](${IMAGE_URL})`)).toHaveCount(0);
  });
});
