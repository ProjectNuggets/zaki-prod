import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

async function bootstrapSession(page: Page) {
  await page.addInitScript(({ tokenKey, localeKey }) => {
    window.localStorage.setItem(tokenKey, "e2e-token");
    window.localStorage.setItem(localeKey, "en");
  }, {
    tokenKey: AUTH_TOKEN_KEY,
    localeKey: LOCALE_KEY,
  });
}

async function mockAppShell(page: Page) {
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token" }),
    });
  });

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
        policyVersion: "2026-07-12.v4",
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

  // Bare workspace-detail endpoint: unmocked it 401s and triggers the logout
  // redirect (src/lib/api.ts), bouncing the thread view to the dashboard.
  await page.route("**/workspace/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace: { id: 1, slug: "zaky", name: "ZAKI", description: "E2E Workspace" },
      }),
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

  // The evolved Agent/Brain/commercial chrome now fetches these backend-auth
  // endpoints from the chat workspace. They must be mocked: an unmocked 401 on a
  // backend-auth route triggers logout + `window.location.href = "/"` (see
  // src/lib/api.ts), which hard-navigates away from the thread and unmounts the
  // memory toast before this spec can assert on it.
  await page.route("**/api/products/registry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        contractVersion: "e2e.v1",
        products: [
          {
            productId: "spaces",
            label: "ZAKI Chat",
            productKind: "product",
            state: "enabled",
            lifecycle: "current",
            route: "/spaces",
            memoryScope: "workspace",
          },
          {
            productId: "agent",
            label: "ZAKI Agent",
            productKind: "product",
            state: "enabled",
            lifecycle: "current",
            route: "/agent",
            memoryScope: "agent",
          },
        ],
      }),
    });
  });

  await page.route("**/api/meter/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, products: {} }),
    });
  });

  await page.route("**/api/agent/sessions*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: [] }),
    });
  });

  await page.route("**/api/agent/brain/graph*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ nodes: [], edges: [] }),
    });
  });
}

test.describe("memory capture UX", () => {
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
