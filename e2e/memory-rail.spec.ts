import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";
const LOCALE_KEY = "zaki:locale";

async function mockApi(page: Page) {
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
        policyVersion: "2026-02-17.v1",
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
      body: JSON.stringify({ threads: [] }),
    });
  });

  await page.route("**/workspace/*/thread/*/chats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [] }),
    });
  });

  await page.route("**/api/memory/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pending: 1, conflicts: 0 }),
    });
  });

  await page.route("**/api/memory/confirmations*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        confirmations: [{ id: "c-1", content: "Likes blue", type: "preference" }],
      }),
    });
  });

  await page.route("**/api/memory/events", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      },
      body: `event: status\ndata: {"pending":1,"conflicts":0}\n\n`,
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

  await page.route("**/api/telemetry/product-event", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

async function bootstrapSession(page: Page, locale: "en" | "ar") {
  await page.addInitScript(
    ({ tokenKey, localeKey, token, selectedLocale }) => {
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(localeKey, selectedLocale);
      window.localStorage.setItem("zaki:onboarding:v1:e2e@example.com", "done");
    },
    {
      tokenKey: AUTH_TOKEN_KEY,
      localeKey: LOCALE_KEY,
      token: "e2e-token",
      selectedLocale: locale,
    }
  );
}

async function assertMemoryRailPosition(page: Page) {
  const rail = page.getByTestId("memory-rail");
  const inputForm = page.locator(".zaki-input-form").first();

  await expect(inputForm).toBeVisible();
  await expect(rail).toBeVisible();

  const railBox = await rail.boundingBox();
  const inputBox = await inputForm.boundingBox();

  expect(railBox).not.toBeNull();
  expect(inputBox).not.toBeNull();

  if (!railBox || !inputBox) return;

  const railBottom = railBox.y + railBox.height;
  const inputTop = inputBox.y;
  const xDelta = Math.abs(railBox.x - inputBox.x);
  const widthDelta = Math.abs(railBox.width - inputBox.width);

  // Rail should sit above input and align with it.
  expect(railBottom).toBeLessThanOrEqual(inputTop + 12);
  expect(xDelta).toBeLessThanOrEqual(24);
  expect(widthDelta).toBeLessThanOrEqual(40);
}

for (const locale of ["en", "ar"] as const) {
  test(`memory rail is visible and anchored above input in ${locale.toUpperCase()}`, async ({
    page,
  }) => {
    await mockApi(page);
    await bootstrapSession(page, locale);

    await page.goto("/spaces/zaky/threads/t-1");

    await expect(page.getByTestId("memory-rail")).toBeVisible();
    await assertMemoryRailPosition(page);

    const documentDir = await page.evaluate(() => document.documentElement.dir);
    if (locale === "ar") {
      expect(documentDir).toBe("rtl");
    } else {
      expect(documentDir).toBe("ltr");
    }
  });
}
