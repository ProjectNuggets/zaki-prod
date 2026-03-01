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
          student: { monthly: true, yearly: true },
          personal: { monthly: true, yearly: true },
        },
      },
    });
  });

  await page.route("**/api/billing/checkout", async (route) => {
    state.tier = "student";
    state.status = "active";
    await json(route, {
      success: true,
      url: "/pricing/success?billing=success&plan=student&interval=monthly",
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

  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

  await page.getByPlaceholder("Email address").fill("user@example.com");
  await page.getByPlaceholder("Password").fill("Password123");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Choose the plan that fits you" })).toBeVisible();
  await page.getByRole("button", { name: "Choose Student" }).click();

  await expect(page.getByText("Choose payment provider")).toBeVisible();
  await page.getByRole("button", { name: /Stripe/ }).click();

  await expect(page).toHaveURL(/\/pricing\/success\?/);
  await expect(page.getByText("Plan: Student")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Congrats Paid User!/ })).toBeVisible();
});
