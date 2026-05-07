import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function bootstrapSession(page: Page) {
  await page.addInitScript(({ tokenKey, localeKey }) => {
    window.localStorage.setItem(tokenKey, "e2e-token");
    window.localStorage.setItem(localeKey, "en");
    window.localStorage.setItem("zaki:onboarding:v1:e2e@example.com", "done");
  }, {
    tokenKey: AUTH_TOKEN_KEY,
    localeKey: LOCALE_KEY,
  });
}

async function mockAppShell(page: Page) {
  await page.route("**/api/auth/refresh", async (route) => {
    await json(route, { token: "e2e-token" });
  });

  await page.route("**/api/profile", async (route) => {
    await json(route, {
      success: true,
      user: { id: 123, username: "e2e@example.com", fullName: "E2E User" },
    });
  });

  await page.route("**/system/refresh-user", async (route) => {
    await json(route, {
      success: true,
      user: { id: 123, username: "e2e@example.com", role: "default" },
    });
  });

  await page.route("**/api/legal/consent-status", async (route) => {
    await json(route, {
      success: true,
      authenticated: true,
      policyVersion: "2026-02-17.v2",
      hasConsent: true,
      isCurrent: true,
      requiresReconsent: false,
    });
  });

  await page.route("**/api/entitlements", async (route) => {
    await json(route, {
      success: true,
      plan: { tier: "free", status: "inactive" },
      access: { active: true, readOnly: false, expiresAt: null, campaign: "e2e" },
      features: {},
    });
  });

  await page.route("**/workspaces", async (route) => {
    await json(route, {
      workspaces: [{ id: 1, slug: "zaky", name: "ZAKI", description: "E2E Workspace" }],
    });
  });

  await page.route("**/workspace/*/threads", async (route) => {
    await json(route, { threads: [{ id: "t-1", slug: "t-1", title: "Thread 1" }] });
  });

  await page.route("**/workspace/*", async (route) => {
    await json(route, {
      workspace: {
        id: 1,
        slug: "zaky",
        name: "ZAKI",
        description: "E2E Workspace",
      },
    });
  });

  await page.route("**/workspace/*/thread/*/chats", async (route) => {
    await json(route, { history: [] });
  });

  await page.route("**/api/documents/accepted-file-types", async (route) => {
    await json(route, { types: { "text/plain": [".txt"], "application/pdf": [".pdf"] } });
  });

  await page.route("**/api/usage/quota*", async (route) => {
    await json(route, {
      success: true,
      unlimited: false,
      limit: 20,
      used: 0,
      remaining: 20,
      resetAt: "2026-05-08T00:00:00.000Z",
      surface: "learning",
      bucket: "learning",
    });
  });

  await page.route("**/api/memory/status*", async (route) => {
    await json(route, { pending: 0, conflicts: 0 });
  });

  await page.route("**/api/memory/events", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      },
      body: `event: status\ndata: {"pending":0,"conflicts":0}\n\n`,
    });
  });

  await page.route("**/api/billing/config", async (route) => {
    await json(route, {
      success: true,
      configured: {
        provider: "stripe",
        checkoutEnabled: false,
        portalEnabled: false,
        cancelEnabled: false,
        webhookEnabled: false,
        accessCodePurchaseEnabled: false,
      },
    });
  });

  await page.route("**/api/telemetry/product-event", async (route) => {
    await json(route, { success: true });
  });
}

async function mockLearning(page: Page) {
  await page.route("**/api/learning/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/learning/health") {
      await json(route, { ok: true, mode: "hosted" });
      return;
    }

    if (path === "/api/learning/knowledge/list") {
      await json(route, { knowledge_bases: [] });
      return;
    }

    if (path === "/api/learning/books") {
      await json(route, { books: [] });
      return;
    }

    if (path === "/api/learning/notebooks") {
      await json(route, {
        notebooks: [
          {
            id: "nb-1",
            name: "Newton Notes",
            description: "Classical mechanics study notes.",
            record_count: 1,
            updated_at: "2026-05-07T10:00:00.000Z",
          },
        ],
      });
      return;
    }

    if (path === "/api/learning/notebooks/nb-1") {
      await json(route, {
        id: "nb-1",
        name: "Newton Notes",
        description: "Classical mechanics study notes.",
        updated_at: "2026-05-07T10:00:00.000Z",
        records: [
          {
            id: "rec-1",
            title: "Momentum lesson",
            type: "chat",
            summary: "Explains conservation of momentum.",
            output: "Momentum is conserved in a closed system.",
            metadata: { source: "chat", session_id: "session-1" },
            created_at: "2026-05-07T09:00:00.000Z",
          },
        ],
      });
      return;
    }

    if (path === "/api/learning/co-writer/documents") {
      await json(route, { documents: [] });
      return;
    }

    if (path === "/api/learning/questions/entries") {
      await json(route, { entries: [], total: 0 });
      return;
    }

    if (path === "/api/learning/questions/categories") {
      await json(route, { categories: [] });
      return;
    }

    if (path === "/api/learning/skills") {
      await json(route, { skills: [] });
      return;
    }

    if (path === "/api/learning/memory") {
      await json(route, { summary: "", profile: "" });
      return;
    }

    if (path === "/api/learning/sessions") {
      await json(route, { sessions: [] });
      return;
    }

    if (path === "/api/learning/solve/sessions") {
      await json(route, { sessions: [] });
      return;
    }

    if (path === "/api/learning/tutor-agents") {
      await json(route, {
        bots: [
          {
            bot_id: "agent-1",
            name: "Calculus Tutor",
            running: true,
            persona: "No persona returned.",
          },
        ],
      });
      return;
    }

    if (path === "/api/learning/tutor-agents/recent") {
      await json(route, { bots: [] });
      return;
    }

    if (path === "/api/learning/tutor-agents/souls") {
      await json(route, {
        souls: [{ id: "default", name: "Default", content: "Default tutor profile" }],
      });
      return;
    }

    if (path === "/api/learning/tutor-agents/channels/schema") {
      await json(route, {
        channels: {
          whatsapp: {
            name: "whatsapp",
            display_name: "WhatsApp",
            default_config: {},
            secret_fields: ["access_token"],
            json_schema: { type: "object", properties: {} },
          },
          telegram: {
            name: "telegram",
            display_name: "Telegram",
            default_config: {},
            secret_fields: ["bot_token"],
            json_schema: { type: "object", properties: {} },
          },
          discord: {
            name: "discord",
            display_name: "Discord",
            default_config: {},
            secret_fields: ["bot_token"],
            json_schema: { type: "object", properties: {} },
          },
          email: {
            name: "email",
            display_name: "Email",
            default_config: {},
            secret_fields: ["smtp_password"],
            json_schema: { type: "object", properties: {} },
          },
          slack: {
            name: "slack",
            display_name: "Slack",
            default_config: {},
            secret_fields: ["bot_token", "signing_secret"],
            json_schema: { type: "object", properties: {} },
          },
        },
      });
      return;
    }

    await json(route, {});
  });
}

test.describe("ZAKI Learn parity wiring", () => {
  test.beforeEach(async ({ page }) => {
    await mockAppShell(page);
    await mockLearning(page);
    await bootstrapSession(page);
  });

  test("renders DeepTutor-shaped primary Learn surfaces", async ({ page }) => {
    await page.goto("/learn?view=books");
    await expect(page.getByText("Generate, browse and study your AI-authored books.")).toBeVisible();
    await expect(page.getByText("No books yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /New book/i }).first()).toBeVisible();

    await page.goto("/learn?view=sources");
    await expect(page.getByText("Knowledge Bases").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /New knowledge base/i })).toBeVisible();

    await page.goto("/learn?view=chat");
    await expect(page.getByRole("button", { name: /Save to Notebook/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Download Markdown/i })).toBeVisible();

    await page.goto("/learn?view=agents");
    await expect(page.getByText("TutorBot Agents")).toBeVisible();
    await page.getByRole("button", { name: /^Channels$/ }).click();
    await expect(page.getByRole("button", { name: "WhatsApp" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Telegram" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discord" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Slack" })).toBeVisible();
  });

  test("exports notebook records through the ZAKI Learn notebook view", async ({ page }) => {
    await page.goto("/learn?view=notebooks");

    await expect(page.getByRole("heading", { name: "Your notebooks" })).toBeVisible();
    await expect(page.getByText("Newton Notes")).toBeVisible();
    await expect(page.getByText("Momentum lesson")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download notebook as Markdown" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Newton-Notes.md");
    const path = await download.path();
    expect(path).toBeTruthy();

    const markdown = await readFile(String(path), "utf8");
    expect(markdown).toContain("# Newton Notes");
    expect(markdown).toContain("## Momentum lesson");
    expect(markdown).toContain("Momentum is conserved in a closed system.");
  });
});
