import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "zaki.auth.token";

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockAuthAndPricing(page: Page) {
  const state = {
    token: "pricing-user-token-123",
  };

  await page.route("**/api/telemetry/product-event", async (route) => {
    await json(route, { success: true });
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await json(route, { token: state.token });
  });

  await page.route("**/api/legal/consent-status", async (route) => {
    const hasAuth = route.request().headers()["authorization"] === `Bearer ${state.token}`;
    await json(route, {
      success: true,
      authenticated: hasAuth,
      policyVersion: "2026-07-12.v4",
      hasConsent: hasAuth,
      isCurrent: true,
      requiresReconsent: false,
    });
  });

  await page.route("**/login", async (route) => {
    const body = route.request().postDataJSON() as { username?: string; password?: string };
    if (body.username === "user@example.com" && body.password === "Password123") {
      await json(route, { valid: true, token: state.token });
      return;
    }
    await json(route, { valid: false, message: "Login failed." }, 401);
  });

  await page.route("**/system/refresh-user", async (route) => {
    const hasAuth = route.request().headers()["authorization"] === `Bearer ${state.token}`;
    if (!hasAuth) {
      await json(route, { success: false, message: "Unauthorized" }, 401);
      return;
    }
    await json(route, {
      success: true,
      user: {
        id: 42,
        username: "user@example.com",
        role: "default",
      },
    });
  });

  await page.route("**/api/profile", async (route) => {
    await json(route, {
      success: true,
      user: {
        username: "user@example.com",
        fullName: "Pricing User",
      },
    });
  });

  await page.route("**/workspaces", async (route) => {
    await json(route, { workspaces: [] });
  });

  await page.route("**/api/documents/accepted-file-types", async (route) => {
    await json(route, { types: { "text/plain": [".txt"] } });
  });

  await page.route("**/api/entitlements", async (route) => {
    await json(route, {
      success: true,
      plan: {
        tier: "free",
        status: "inactive",
        interval: null,
        cancelAtPeriodEnd: false,
      },
      access: {
        active: false,
        expiresAt: null,
        campaign: null,
      },
      features: {
        premium: false,
      },
    });
  });

  await page.route("**/api/billing/config", async (route) => {
    await json(route, {
      success: true,
      configured: {
        provider: "stripe",
        checkoutEnabled: true,
        portalEnabled: true,
        cancelEnabled: true,
        webhookEnabled: true,
        accessCodePurchaseEnabled: true,
        checkoutProviders: [{ key: "stripe", label: "Stripe", enabled: true }],
        pricingAvailability: {
          personal: { monthly: true, yearly: true },
          pro: { monthly: true, yearly: true },
          pro_max: { monthly: true, yearly: true },
        },
      },
    });
  });
}

test("pricing page displays the commercial plan prices and gift-code purchase", async ({
  page,
}) => {
  await mockAuthAndPricing(page);
  await page.addInitScript(({ tokenKey, token }) => {
    window.localStorage.setItem(tokenKey, token);
    window.localStorage.setItem("zaki:onboarding:v1:user@example.com", "done");
  }, {
    tokenKey: AUTH_TOKEN_KEY,
    token: "pricing-user-token-123",
  });

  await page.goto("/pricing");

  // V2 public pricing sells the canonical paid platform tiers only.
  await expect(
    page.getByRole("heading", { name: "Choose how ZAKI should keep working with you" })
  ).toBeVisible();
  await expect(page.getByText("Chat Free", { exact: true })).toBeVisible();
  await expect(page.getByText("Personal", { exact: true })).toBeVisible();
  await expect(page.getByText("$15 / month", { exact: true })).toBeVisible();
  await expect(page.getByText("Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("$45 / month", { exact: true })).toBeVisible();
  await expect(page.getByText("Pro Max", { exact: true })).toBeVisible();
  await expect(page.getByText("$99 / month", { exact: true })).toBeVisible();
  await expect(page.getByText("ZAKI Agent", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Buy an access code", { exact: true })).toBeVisible();
  await expect(page.getByText("$15 one-time", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy access code" })).toBeVisible();
});
