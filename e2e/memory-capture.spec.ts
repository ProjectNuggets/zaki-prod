import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

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
  await page.route("**/api/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: {
          username: "e2e@example.com",
          fullName: "E2E User",
        },
      }),
    });
  });

  await page.route("**/system/refresh-user", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        user: {
          id: 123,
          username: "e2e@example.com",
          role: "default",
        },
      }),
    });
  });

  await page.route("**/api/legal/consent-status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        authenticated: true,
        policyVersion: "2026-02-17.v2",
        hasConsent: true,
        isCurrent: true,
        requiresReconsent: false,
      }),
    });
  });

  await page.route("**/api/entitlements", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        plan: { tier: "free", status: "inactive" },
        access: { active: true, readOnly: false, expiresAt: null, campaign: "e2e" },
        features: {},
      }),
    });
  });

  await page.route("**/workspaces", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspaces: [
          {
            id: 1,
            slug: "zaky",
            name: "ZAKI",
            description: "E2E Workspace",
          },
        ],
      }),
    });
  });

  await page.route("**/workspace/*/threads", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ threads: [{ id: "t-1", slug: "t-1", title: "Thread 1" }] }),
    });
  });

  await page.route("**/workspace/*/thread/*/chats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [] }),
    });
  });

  await page.route("**/workspace/*/thread/*/stream-chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "done",
        textResponse: "Understood.",
      }),
    });
  });

  await page.route("**/api/memory/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pending: 1, conflicts: 1 }),
    });
  });

  await page.route("**/api/memory/events", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      },
      body: `event: status\ndata: {"pending":1,"conflicts":1}\n\n`,
    });
  });

  await page.route("**/api/memory/list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        memories: [],
        nextCursor: null,
        hasMore: false,
      }),
    });
  });

  await page.route("**/api/memory/confirmations*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        confirmations: [
          {
            id: "pending-1",
            content: "Sensitive phone detail",
            type: "fact",
            confidence_score: 0.72,
          },
        ],
      }),
    });
  });

  await page.route("**/api/memory/conflicts*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conflicts: [
          {
            id: "conflict-1",
            new_content: "Lives in Berlin",
            new_type: "fact",
            conflicting_content: "Lives in Hamburg",
            conflicting_type: "fact",
          },
        ],
      }),
    });
  });

  await page.route("**/api/documents/accepted-file-types", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        types: {
          "text/plain": [".txt"],
          "application/pdf": [".pdf"],
        },
      }),
    });
  });

  await page.route("**/api/usage/quota*", async (route) => {
    await route.fulfill({
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
    });
  });

  await page.route("**/api/telemetry/product-event", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

test.describe("memory capture UX", () => {
  test("review CTA opens the pending queue", async ({ page }) => {
    await mockAppShell(page);
    await bootstrapSession(page);

    await page.route("**/api/memory/capture", async (route) => {
      const body = route.request().postDataJSON();
      if (String(body?.message || "").includes("phone")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            saved: [],
            review: [
              {
                id: "pending-1",
                content: "Sensitive phone detail",
                type: "fact",
                state: "needs_review",
                reason: "pii_phone",
              },
            ],
            duplicates: [],
            conflicts: [],
            skipped: [],
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          saved: [],
          review: [],
          duplicates: [],
          conflicts: [],
          skipped: [],
        }),
      });
    });

    await page.goto("/spaces/zaky/threads/t-1");

    const textarea = page.locator(".zaki-input-field");
    await expect(textarea).toBeVisible();
    await textarea.fill("My phone number is +49 170 123 4567");
    await textarea.press("Enter");

    await expect(page.getByText("Something may be worth remembering")).toBeVisible();
    await page.getByRole("button", { name: "Review" }).first().click();

    const memoryViewer = page.getByRole("dialog", { name: "Memory viewer" });
    await expect(memoryViewer).toBeVisible();
    await expect(memoryViewer.getByText("Sensitive phone detail")).toBeVisible();
  });

  test("undo failure stays visible and offers retry", async ({ page }) => {
    await mockAppShell(page);
    await bootstrapSession(page);

    await page.route("**/api/memory/capture", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          saved: [
            {
              id: "mem-fail",
              content: "Prefers concise answers",
              type: "preference",
              state: "saved_reversible",
              undoUntil: "2026-03-13T12:34:56.000Z",
            },
          ],
          review: [],
          duplicates: [],
          conflicts: [],
          skipped: [],
        }),
      });
    });

    await page.route("**/api/memory/undo/*", async (route) => {
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Undo window expired.",
        }),
      });
    });

    await page.goto("/spaces/zaky/threads/t-1");

    const textarea = page.locator(".zaki-input-field");
    await expect(textarea).toBeVisible();
    await textarea.fill("I prefer concise answers");
    await textarea.press("Enter");

    await expect(page.getByText("Memory updated")).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();

    await expect(page.getByText("Undo window expired.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry undo" })).toBeVisible();
  });
});
