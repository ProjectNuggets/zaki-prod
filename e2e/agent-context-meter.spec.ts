import { expect, test, type Page, type Route } from "@playwright/test";

const SESSION_KEY = "agent:zaki-bot:user:1:thread:main";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

type ContextPayload = Record<string, unknown>;

async function mockSignedInAgent(page: Page, getContext: () => ContextPayload) {
  await page.addInitScript(() => {
    window.localStorage.setItem("zaki:locale", "en");
  });

  await page.route("**/system/refresh-user", async (route) => {
    await json(route, {
      success: true,
      user: { id: 1, username: "e2e@example.com", role: "default" },
    });
  });

  await page.route("**/workspaces", async (route) => {
    await json(route, {
      workspaces: [{ id: 1, slug: "zaki-bot", name: "ZAKI Agent", description: "" }],
    });
  });

  await page.route("**/workspace/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/threads")) {
      await json(route, { threads: [{ id: "main", slug: "main", title: "Main" }] });
      return;
    }
    if (path.includes("/thread/") && path.endsWith("/chats")) {
      await json(route, { history: [] });
      return;
    }
    await json(route, { success: true });
  });

  await page.route("**/v1/**", async (route) => {
    await json(route, { ok: true });
  });

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/auth/refresh") {
      await json(route, { token: "e2e-token" });
      return;
    }
    if (path === "/api/profile") {
      await json(route, {
        success: true,
        user: { id: 1, username: "e2e@example.com", fullName: "E2E User" },
      });
      return;
    }
    if (path === "/api/legal/consent-status") {
      await json(route, {
        success: true,
        authenticated: true,
        policyVersion: "2026-02-17.v2",
        hasConsent: true,
        isCurrent: true,
        requiresReconsent: false,
      });
      return;
    }
    if (path === "/api/entitlements") {
      await json(route, {
        success: true,
        plan: { tier: "pro", status: "active" },
        access: { active: true, readOnly: false, expiresAt: null, campaign: "e2e" },
        features: {},
      });
      return;
    }
    if (path === "/api/usage/quota") {
      await json(route, {
        success: true,
        unlimited: false,
        limit: 100,
        used: 2,
        remaining: 98,
        resetAt: null,
        surface: url.searchParams.get("surface") || "zaki_bot",
        bucket: "zaki_bot",
      });
      return;
    }
    if (path === "/api/documents/accepted-file-types") {
      await json(route, { types: { "text/plain": [".txt"] } });
      return;
    }
    if (path === "/api/telemetry/product-event") {
      await json(route, { success: true });
      return;
    }
    if (path === "/api/agent/me") {
      await json(route, { userId: "1" });
      return;
    }
    if (path === "/api/agent/provision") {
      await json(route, { ok: true, session_key: SESSION_KEY });
      return;
    }
    if (path === "/api/agent/diagnostics") {
      await json(route, {
        agentBackendEnabled: true,
        upstreamReady: { ok: true, latencyMs: 12 },
        sandbox: { enabled: true, backend: "local" },
      });
      return;
    }
    if (path === "/api/agent/diagnostics/extension") {
      await json(route, { paired: false });
      return;
    }
    if (path === "/api/agent/history") {
      await json(route, { history: [], historyMode: "app", source: "agent" });
      return;
    }
    if (path === "/api/agent/tasks") {
      await json(route, { tasks: [] });
      return;
    }
    if (path === "/api/agent/cron") {
      await json(route, { jobs: [] });
      return;
    }
    if (path === "/api/agent/artifacts") {
      await json(route, { artifacts: [] });
      return;
    }
    if (path === "/api/agent/sessions") {
      await json(route, {
        sessions: [
          {
            session_key: SESSION_KEY,
            title: "Main",
            message_count: 4,
            last_active: 1770000000,
            live: true,
            mode: "execute",
            pending_approval_count: 0,
            context_pressure_percent: 88,
          },
        ],
      });
      return;
    }
    if (path.startsWith("/api/agent/sessions/") && path.endsWith("/context")) {
      await json(route, getContext());
      return;
    }
    if (path.startsWith("/api/agent/sessions/")) {
      await json(route, {
        session_key: SESSION_KEY,
        title: "Main",
        message_count: 4,
        last_active: 1770000000,
        live: true,
        mode: "execute",
        pending_approval_count: 0,
      });
      return;
    }

    await json(route, { success: true });
  });
}

async function expectContextSignal(page: Page, value: string) {
  const status = page.getByRole("status", { name: /agent status/i });
  await expect(status).toContainText("Context");
  await expect(status).toContainText(value);
  await expect(page.getByTestId("zaki-context-meter")).toContainText(value);
}

test.describe("Agent context meter", () => {
  test("shows the live backend context pressure from the session context endpoint", async ({ page }) => {
    await mockSignedInAgent(page, () => ({
      status: "live",
      active: true,
      live: true,
      session_key: SESSION_KEY,
      model: "moonshot/kimi-k2.6",
      model_provider: "moonshot",
      context_window_source: "model_capability",
      token_estimate: 31_457,
      context_window_tokens: 262_144,
      remaining_tokens: 230_687,
      pressure_percent: 12,
      context_pressure_percent: 12,
      token_compaction_recommended: false,
      compaction: {
        nudge_percent: 50,
        pass_a_percent: 70,
        pass_c_percent: 90,
        recommended: false,
      },
    }));

    await page.goto("/agent");

    const meter = page.getByTestId("zaki-context-meter");
    await expectContextSignal(page, "12%");
    await expect(meter).toHaveAttribute("data-armed", "false");
  });

  test("does not fall back to session list pressure when context is unavailable", async ({ page }) => {
    await mockSignedInAgent(page, () => ({
      active: false,
      live: false,
      code: "session_manager_unavailable",
      reason: "session_manager_unavailable",
    }));

    await page.goto("/agent");

    const meter = page.getByTestId("zaki-context-meter");
    await expectContextSignal(page, "--");
    await expect(meter).not.toContainText("88%");
  });
});
