import { expect, test, type Page, type Route } from "@playwright/test";

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockAuthAndPricing(page: Page) {
  const state = {
    token: "paid-user-token-123",
    tier: "free",
    status: "inactive",
    loggedIn: false,
  };

  await page.route("**/api/telemetry/product-event", async (route) => {
    await json(route, { success: true });
  });

  await page.route("**/api/legal/consent-status", async (route) => {
    const hasAuth = route.request().headers()["authorization"] === `Bearer ${state.token}`;
    await json(route, {
      success: true,
      authenticated: hasAuth,
      policyVersion: "2026-02-17.v2",
      hasConsent: hasAuth,
      isCurrent: true,
      requiresReconsent: false,
    });
  });

  await page.route("**/api/auth/refresh", async (route) => {
    if (!state.loggedIn) {
      await json(route, { error: "invalid_refresh_token" }, 401);
      return;
    }
    await json(route, { token: state.token });
  });

  await page.route("**/login", async (route) => {
    const body = route.request().postDataJSON() as { username?: string; password?: string };
    if (body.username === "user@example.com" && body.password === "Password123") {
      state.loggedIn = true;
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
        fullName: "Paid User",
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
        tier: state.tier,
        status: state.status,
        interval: state.tier === "free" ? null : "monthly",
        cancelAtPeriodEnd: false,
      },
      access: {
        active: false,
        expiresAt: null,
        campaign: null,
      },
      features: {
        premium: state.tier !== "free",
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
        checkoutProviders: [
          { key: "stripe", label: "Stripe", enabled: true },
          { key: "paddle", label: "Paddle", enabled: true },
        ],
        pricingAvailability: {
          personal: { monthly: true, yearly: true },
          pro: { monthly: true, yearly: true },
          pro_max: { monthly: true, yearly: true },
        },
      },
    });
  });

  await page.route("**/api/billing/checkout", async (route) => {
    state.tier = "pro";
    state.status = "active";
    await json(route, {
      success: true,
      url: "/pricing/success?billing=success&plan=pro&interval=monthly",
    });
  });

  await page.route("**/api/billing/sync", async (route) => {
    await json(route, {
      success: true,
      updated: true,
      tier: state.tier,
      status: state.status,
    });
  });
}

test("user can sign in on pricing route and complete provider-selected checkout", async ({
  page,
}) => {
  await mockAuthAndPricing(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("zaki:onboarding:v1:user@example.com", "done");
  });

  // V1 commercial flow: a plan intent carried in the URL (plan + autostart)
  // survives the in-pricing sign-in, then PricingPage auto-starts checkout. The
  // legacy intermediate "Choose how you want to work with ZAKI" plan-picker and
  // multi-provider modal are gone — Stripe is the only valid checkout provider
  // for the canonical paid tiers, so a single provider auto-starts.
  await page.goto(
    "/pricing?auth=signup&plan=pro&interval=monthly&autostart=1&source=website_pricing"
  );

  await expect(page.getByRole("heading", { name: "Create a ZAKI account" })).toBeVisible();
  await page.getByRole("button", { name: "Have an account? Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to ZAKI" })).toBeVisible();

  await page.getByPlaceholder("Email address").fill("user@example.com");
  await page.getByPlaceholder("Password").fill("Password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Sign-in success keeps the pricing intent (no bounce to "/"), and the
  // autostart effect drives the Stripe checkout to the success surface.
  await expect(page).toHaveURL(/\/pricing\/success\?/);
  await expect(page.getByRole("heading", { name: /You’re set, Paid User/ })).toBeVisible();
  await expect(page.getByText("Plan: Pro")).toBeVisible();
});
