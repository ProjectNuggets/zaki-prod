// Release QA harness — Agent 5 (codex/v2-release-e2e).
//
// Shared signed-in scaffolding for the ZAKI V1 release confidence gate.
// The product specs each mock their own surface; this module factors the
// *shell* mocking + signed-in bootstrap so the four release-gate routes
// (`/`, `/agent`, `/brain`, `/settings`) render as a signed-in user with no
// live backend gateway.
//
// Design rules (per AGENTS.md + Agent 5 board section):
//   - Wave 1 = smoke scaffolding only. Mocks are permissive and benign so a
//     route mounts; this file deliberately avoids encoding brittle product
//     assertions.
//   - Product visibility truth (four spokes; Brain as the Agent view;
//     Learn/Hire hidden) lives in `RELEASE_VISIBILITY` so visibility specs
//     and the QA matrix share one source of truth.
//   - Failure-state overrides (gateway down, extension disconnected, empty
//     Brain, quota low) are exposed as small composable helpers.

import type { Page, Route } from "@playwright/test";

export const AUTH_TOKEN_KEY = "zaki.auth.token";
export const LOCALE_KEY = "zaki:locale";

export const RELEASE_USER = {
  id: 4273,
  username: "release-qa@zaki.test",
  fullName: "Release QA",
} as const;

export const RELEASE_TOKEN = "release-qa-token";

export type ReleaseVisibilityTier =
  | "public"
  | "waitlist"
  | "coming_soon"
  | "support"
  | "hidden";

/**
 * Release source of truth. The registry deliberately keeps operational Learn
 * and Hire records so E2E proves the UI visibility policy wins over backend
 * state and those retained engines cannot reappear.
 */
export const RELEASE_VISIBILITY: Record<string, ReleaseVisibilityTier> = {
  spaces: "public",
  agent: "public",
  brain: "support",
  learning: "hidden",
  hire: "hidden",
  design: "waitlist",
  minutes: "coming_soon",
};

type RegistryItem = {
  productId: string;
  legacyProductId?: string | null;
  label: string;
  productKind?: "product" | "control_plane" | "client";
  state: "enabled" | "disabled" | "maintenance" | "degraded" | "hidden" | "readOnly";
  lifecycle?: "current" | "future";
  visibleInSettings?: boolean;
  route?: string | null;
  entryPoint?: string | null;
  quotaPolicyId?: string | null;
  memoryScope?: string | null;
};

export const RELEASE_PRODUCT_REGISTRY: { success: true; contractVersion: string; products: RegistryItem[] } = {
  success: true,
  contractVersion: "release-qa.v1",
  products: [
    {
      productId: "agent",
      label: "ZAKI Agent",
      productKind: "product",
      state: "enabled",
      lifecycle: "current",
      visibleInSettings: true,
      route: "/agent",
      memoryScope: "agent",
    },
    {
      productId: "spaces",
      legacyProductId: "spaces",
      label: "ZAKI Chat",
      productKind: "product",
      state: "enabled",
      lifecycle: "current",
      visibleInSettings: true,
      route: "/spaces",
      memoryScope: "workspace",
    },
    {
      productId: "brain",
      label: "Brain",
      productKind: "control_plane",
      state: "enabled",
      lifecycle: "current",
      visibleInSettings: true,
      route: "/brain",
      memoryScope: "agent",
    },
    {
      productId: "learning",
      label: "ZAKI Learn",
      productKind: "product",
      state: "enabled",
      lifecycle: "current",
      visibleInSettings: true,
      route: "/learn",
      memoryScope: "learning",
    },
    {
      productId: "hire",
      label: "ZAKI Hire",
      productKind: "product",
      state: "disabled",
      lifecycle: "future",
      visibleInSettings: true,
      route: null,
      memoryScope: "hire",
    },
    {
      productId: "design",
      label: "ZAKI Design",
      productKind: "product",
      state: "disabled",
      lifecycle: "future",
      visibleInSettings: true,
      route: "/design",
      memoryScope: "design",
    },
    {
      productId: "cli",
      label: "ZAKI CLI",
      productKind: "client",
      state: "hidden",
      lifecycle: "future",
      visibleInSettings: false,
      route: null,
    },
    {
      productId: "local_app",
      label: "ZAKI Local App",
      productKind: "client",
      state: "hidden",
      lifecycle: "future",
      visibleInSettings: false,
      route: null,
    },
    {
      productId: "extensions",
      label: "Browser Extension",
      productKind: "client",
      state: "hidden",
      lifecycle: "current",
      visibleInSettings: false,
      route: null,
    },
  ],
};

function meterWindow() {
  return {
    period: "week",
    resetPolicy: "non_rollover",
    rollover: false,
    windowHours: 168,
    used: 2,
    receipts: 2,
    limit: 20,
    remaining: 18,
    startedAt: "2026-05-26T00:00:00.000Z",
    resetAt: "2026-06-02T00:00:00.000Z",
  };
}

function rollingWindow() {
  return {
    period: "rolling_5h",
    windowHours: 5,
    used: 0,
    receipts: 0,
    limit: 5,
    remaining: 5,
    resetAt: "2026-05-30T05:00:00.000Z",
  };
}

function releaseBrainGraph(empty = false) {
  if (empty) {
    return {
      nodes: [],
      edges: [],
      trimmed: false,
      total_skipped: 0,
      total_nodes_in_corpus: 0,
      semantic_degraded: false,
    };
  }

  return {
    nodes: [
      {
        id: "core:user",
        key: "core:user",
        kind: "core",
        created_at: 1_779_833_600,
        session_id: null,
        summary: "Release QA prefers direct, production-grade execution.",
        valid_to: null,
        importance: 0.96,
        display_label: "Release QA",
        community_id: 1,
        community_name: "Launch command",
        link_type: "preference",
      },
      {
        id: "project:zaki-v1",
        key: "project:zaki-v1",
        kind: "conversation",
        created_at: 1_779_920_000,
        session_id: "session-release",
        summary: "ZAKI has four visible spokes: Agent, Chat/Spaces, Design, and Minutes; Brain is the Agent memory view.",
        valid_to: null,
        importance: 0.91,
        display_label: "ZAKI V1",
        community_id: 1,
        community_name: "Launch command",
        link_type: "attribute",
      },
      {
        id: "memory:scope",
        key: "memory:scope",
        kind: "daily",
        created_at: 1_780_006_400,
        session_id: "session-release",
        summary: "Agent, workspace, and retained specialized-engine memories are separate scopes.",
        valid_to: null,
        importance: 0.84,
        display_label: "Memory scopes",
        community_id: 2,
        community_name: "Memory governance",
        link_type: "relationship",
      },
    ],
    edges: [
      {
        type: "typed",
        source: "core:user",
        target: "project:zaki-v1",
        weight: 3,
        confidence: 0.94,
        predicate: "owns_launch",
        label: "owns launch",
      },
      {
        type: "semantic",
        source: "project:zaki-v1",
        target: "memory:scope",
        weight: 0.91,
        predicate: "requires_governance",
      },
    ],
    trimmed: false,
    total_skipped: 0,
    total_nodes_in_corpus: 3,
    semantic_degraded: false,
  };
}

function releaseBrainTimeline(empty = false) {
  return {
    entries: empty
      ? []
      : [
          {
            id: "timeline-1",
            key: "project:zaki-v1",
            kind: "conversation",
            created_at: 1_779_920_000,
            session_id: "session-release",
            summary: "Mapped the public V1 spine: Agent, Chat, Brain, Settings.",
            valid_to: null,
          },
          {
            id: "timeline-2",
            key: "memory:scope",
            kind: "daily",
            created_at: 1_780_006_400,
            session_id: "session-release",
            summary: "Separated memory ownership by product scope for release governance.",
            valid_to: null,
          },
        ],
    next_cursor: null,
    has_more: false,
  };
}

export type ReleaseMeterOverrides = {
  /** Drop weekly remaining to a low value to exercise the quota-low state. */
  quotaLow?: boolean;
};

export function releaseMeterStatus(overrides: ReleaseMeterOverrides = {}) {
  const weekly = meterWindow();
  if (overrides.quotaLow) {
    weekly.used = 19;
    weekly.remaining = 1;
  }
  const productEntry = {
    state: "enabled" as const,
    lifecycle: "current" as const,
    weekly,
    rolling: rollingWindow(),
    grantPolicy: { allowed: !overrides.quotaLow, reason: overrides.quotaLow ? "quota_low" : null },
  };
  return {
    success: true,
    contractVersion: "release-qa.v1",
    identity: { type: "user", userId: RELEASE_USER.id },
    plan: { tier: "free", label: "Free", source: "free" },
    weekly,
    rolling: rollingWindow(),
    products: {
      agent: { id: "agent", ...productEntry },
      spaces: { id: "spaces", ...productEntry },
      brain: { id: "brain", ...productEntry },
      learning: { id: "learning", ...productEntry },
    },
  };
}

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function sse(route: Route, body: string) {
  await route.fulfill({
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
    body,
  });
}

export type ReleaseShellOptions = {
  /** Force /api/auth/refresh to 401 — exercises the backend-unavailable state. */
  gatewayDown?: boolean;
  /** Report the browser extension as disconnected in diagnostics. */
  extensionDisconnected?: boolean;
  /** Return an empty Brain graph / no memories. */
  emptyBrain?: boolean;
  /** Drive the central meter into a near-exhausted weekly allowance. */
  quotaLow?: boolean;
  /** Override or extend the product registry returned to the app. */
  productRegistry?: typeof RELEASE_PRODUCT_REGISTRY;
};

/**
 * Bootstraps localStorage so the SPA boots straight into a signed-in English
 * session before any script runs.
 */
export async function bootstrapSignedInSession(page: Page) {
  await page.addInitScript(
    ({ tokenKey, localeKey, token }) => {
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(localeKey, "en");
    },
    {
      tokenKey: AUTH_TOKEN_KEY,
      localeKey: LOCALE_KEY,
      token: RELEASE_TOKEN,
    },
  );
}

/**
 * Mocks every shell-level endpoint the four release routes touch on first
 * load. Specific handlers run first; benign catch-alls for `/api/**` and
 * `/v1/**` keep unmodelled calls from hanging the smoke run.
 */
export async function mockReleaseShell(page: Page, options: ReleaseShellOptions = {}) {
  const registry = options.productRegistry ?? RELEASE_PRODUCT_REGISTRY;

  // --- Benign catch-alls (registered FIRST) --------------------------------
  // Playwright matches routes in reverse registration order — the LAST handler
  // registered wins. Register the broad catch-alls first so the specific
  // handlers below override them; this keeps unmodelled calls from hanging the
  // smoke run without shadowing the modelled endpoints.
  await page.route("**/v1/**", async (route) => {
    await json(route, { success: true });
  });
  await page.route("**/api/**", async (route) => {
    await json(route, { success: true });
  });

  // --- Auth + identity -----------------------------------------------------
  await page.route("**/api/auth/refresh", async (route) => {
    if (options.gatewayDown) {
      await json(route, { error: "backend_unavailable" }, 502);
      return;
    }
    await json(route, { token: RELEASE_TOKEN });
  });

  await page.route("**/api/profile", async (route) => {
    await json(route, {
      success: true,
      user: { id: RELEASE_USER.id, username: RELEASE_USER.username, fullName: RELEASE_USER.fullName },
    });
  });

  await page.route("**/system/refresh-user", async (route) => {
    await json(route, {
      success: true,
      user: { id: RELEASE_USER.id, username: RELEASE_USER.username, role: "default" },
    });
  });

  await page.route("**/api/legal/consent-status", async (route) => {
    await json(route, {
      success: true,
      authenticated: true,
      policyVersion: "2026-07-12.v4",
      hasConsent: true,
      isCurrent: true,
      requiresReconsent: false,
    });
  });

  // --- Commercial spine ----------------------------------------------------
  await page.route("**/api/entitlements", async (route) => {
    await json(route, {
      success: true,
      plan: { tier: "free", status: "active", interval: null, cancelAtPeriodEnd: false },
      access: { active: true, readOnly: false, expiresAt: null, campaign: "release-qa" },
      features: {},
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

  await page.route("**/api/products/registry**", async (route) => {
    await json(route, registry);
  });

  await page.route("**/api/meter/status**", async (route) => {
    await json(route, releaseMeterStatus({ quotaLow: options.quotaLow }));
  });

  await page.route("**/api/usage/summary**", async (route) => {
    const weekly = meterWindow();
    if (options.quotaLow) {
      weekly.used = 19;
      weekly.remaining = 1;
    }
    await json(route, {
      success: true,
      plan: { id: "free", label: "Free", source: "free", premium: false },
      allowance: {
        model: "shared_weekly_allowance",
        ledgerMode: "central_meter_receipts",
        weekly: { configured: true, ...weekly },
      },
    });
  });

  await page.route("**/api/usage/quota**", async (route) => {
    await json(route, {
      success: true,
      unlimited: false,
      limit: 20,
      used: options.quotaLow ? 19 : 2,
      remaining: options.quotaLow ? 1 : 18,
      resetAt: "2026-06-02T00:00:00.000Z",
      surface: "agent",
      bucket: "agent",
    });
  });

  // --- Memory / Brain ------------------------------------------------------
  await page.route("**/api/memory/status**", async (route) => {
    await json(route, { pending: 0, conflicts: 0 });
  });

  await page.route("**/api/memory/events", async (route) => {
    await sse(route, `event: status\ndata: {"pending":0,"conflicts":0}\n\n`);
  });

  const brainGraph = releaseBrainGraph(options.emptyBrain);
  const brainTimeline = releaseBrainTimeline(options.emptyBrain);
  await page.route("**/api/agent/brain/graph**", async (route) => {
    await json(route, brainGraph);
  });
  await page.route("**/api/agent/brain/timeline**", async (route) => {
    await json(route, brainTimeline);
  });
  await page.route("**/api/agent/brain/communities**", async (route) => {
    await json(route, {
      communities: options.emptyBrain
        ? []
        : [
            { community_id: 1, member_count: 2, generated_at: 1_780_006_400, name: "Launch command", name_source: "fallback" },
            { community_id: 2, member_count: 1, generated_at: 1_780_006_400, name: "Memory governance", name_source: "fallback" },
          ],
      stats: { communities: options.emptyBrain ? 0 : 2 },
    });
  });
  await page.route("**/api/agent/brain/orphans**", async (route) => {
    await json(route, { orphans: [], stats: { orphans: 0, limit: 50 } });
  });
  await page.route("**/api/agent/brain/search**", async (route) => {
    await json(route, { results: options.emptyBrain ? [] : brainGraph.nodes });
  });
  await page.route("**/api/agent/brain/diff**", async (route) => {
    await json(route, { births: [], deaths: [] });
  });
  await page.route("**/api/agent/brain/documents**", async (route) => {
    await json(route, { documents: [] });
  });
  await page.route("**/api/agent/brain/me", async (route) => {
    await json(route, {
      memory: options.emptyBrain
        ? null
        : { key: "core:user", kind: "core", summary: "Release QA", valid_to: null },
    });
  });

  const emptyGraph = { nodes: [], edges: [], communities: [], orphans: [] };
  await page.route("**/api/memory/graph**", async (route) => {
    await json(route, emptyGraph);
  });
  await page.route("**/api/memory/timeline**", async (route) => {
    await json(route, { events: [], items: [] });
  });
  await page.route("**/api/memory/search**", async (route) => {
    await json(route, { results: [], memories: [] });
  });
  await page.route("**/api/memory/documents**", async (route) => {
    await json(route, { documents: [] });
  });

  // --- Agent runtime -------------------------------------------------------
  await page.route("**/api/bot/runtime/status**", async (route) => {
    await json(route, { success: true, running: true, status: "idle" });
  });
  await page.route("**/v1/me", async (route) => {
    await json(route, {
      id: RELEASE_USER.id,
      username: RELEASE_USER.username,
      extension: { connected: !options.extensionDisconnected, lastSeen: options.extensionDisconnected ? null : "2026-05-30T00:00:00.000Z" },
    });
  });
  await page.route("**/api/extension/diagnostics**", async (route) => {
    await json(route, {
      success: true,
      connected: !options.extensionDisconnected,
      devices: options.extensionDisconnected ? [] : [{ id: "dev-1", name: "Chrome", lastSeen: "2026-05-30T00:00:00.000Z" }],
    });
  });
  await page.route("**/v1/me/bot/settings", async (route) => {
    await json(route, {
      assistant_mode: "balanced",
      group_activation: "mention",
      proactive_updates: true,
      voice_replies: false,
      session_timeout_minutes: 30,
      dream_enabled: true,
      query_expansion_enabled: false,
      selected_model: null,
    });
  });
  await page.route("**/api/auth/google/status", async (route) => {
    await json(route, { success: true, enabled: true });
  });
  await page.route("**/api/agent/channels", async (route) => {
    await json(route, {
      channels: [
        {
          id: "telegram",
          label: "Telegram",
          configured: true,
          connected: true,
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["telegram_bot_token"],
          configured_secrets: ["telegram_bot_token"],
          missing_secrets: [],
          bindings: { count: 0, items: [] },
        },
        {
          id: "slack",
          label: "Slack",
          configured: true,
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["slack_bot_token", "slack_signing_secret"],
          configured_secrets: [],
          missing_secrets: ["slack_bot_token", "slack_signing_secret"],
          bindings: {
            count: 1,
            items: [
              { id: "bnd-slack", account_id: "main", principal_key: "U123", scope_key: "C123", thread_key: null },
            ],
          },
        },
        {
          id: "discord",
          label: "Discord",
          configured: true,
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["discord_bot_token"],
          configured_secrets: [],
          missing_secrets: ["discord_bot_token"],
          bindings: { count: 0, items: [] },
        },
        {
          id: "email",
          label: "Email",
          configured: true,
          live: true,
          available: true,
          bindings_supported: true,
          operator_managed_runtime: true,
          required_secrets: ["email_imap_password", "email_smtp_password"],
          configured_secrets: [],
          missing_secrets: ["email_imap_password", "email_smtp_password"],
          bindings: { count: 0, items: [] },
        },
      ],
    });
  });
  let telegramLastTest: { ok: boolean; checked_at_s: number; detail: string } | null = null;
  await page.route("**/api/agent/channel-control/telegram/test", async (route) => {
    telegramLastTest = {
      ok: true,
      checked_at_s: 1_780_000_000,
      detail: "provider_reachable",
    };
    await json(route, { channel: "telegram", last_test: telegramLastTest });
  });
  await page.route("**/api/agent/channel-control", async (route) => {
    await json(route, {
      channels: [
        {
          channel: "telegram",
          label: "Telegram",
          build_enabled: true,
          operator_configured: true,
          user_managed: false,
          user_connected: true,
          status: "connected",
          secret_refs: [
            { key: "telegram_bot_token", label: "Bot token", required: true, present: true },
          ],
          config: {},
          last_test: telegramLastTest,
          endpoints: {
            self: "/api/v1/users/release-user/channels/telegram",
            connect: "/api/v1/users/release-user/channels/telegram/connect",
            test: "/api/v1/users/release-user/channels/telegram/test",
            disconnect: "/api/v1/users/release-user/channels/telegram/disconnect",
          },
        },
        {
          channel: "slack",
          label: "Slack",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "slack_bot_token", label: "Bot token", required: true, present: false },
            { key: "slack_signing_secret", label: "Signing secret", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
        {
          channel: "discord",
          label: "Discord",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [{ key: "discord_bot_token", label: "Bot token", required: true, present: false }],
          config: {},
          last_test: null,
        },
        {
          channel: "email",
          label: "Email",
          build_enabled: true,
          operator_configured: true,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "email_imap_password", label: "IMAP password", required: true, present: false },
            { key: "email_smtp_password", label: "SMTP password", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
        {
          channel: "whatsapp",
          label: "WhatsApp",
          build_enabled: true,
          operator_configured: false,
          user_managed: true,
          user_connected: false,
          status: "not_connected",
          secret_refs: [
            { key: "whatsapp_access_token", label: "Access token", required: true, present: false },
            { key: "whatsapp_verify_token", label: "Verify token", required: true, present: false },
          ],
          config: {},
          last_test: null,
        },
      ],
    });
  });
  await page.route("**/api/agent/secrets", async (route) => {
    await json(route, { keys: ["telegram_bot_token"] });
  });
  await page.route("**/api/agent/providers", async (route) => {
    await json(route, { providers: [] });
  });
  await page.route("**/api/agent/extension/devices", async (route) => {
    await json(route, {
      devices: [
        {
          device_id: "dev-1",
          label: "Release Chrome",
          status: "active",
          connection_state: options.extensionDisconnected ? "disconnected" : "connected",
          last_seen_at_s: options.extensionDisconnected ? null : 1_780_000_000,
        },
      ],
    });
  });
  await page.route("**/api/agent/integrations", async (route) => {
    await json(route, {
      integrations: [
        {
          kind: "composio",
          label: "Composio",
          configured: true,
          user_manageable: false,
          managed_by: "operator",
        },
      ],
    });
  });
  await page.route("**/api/agent/memory/governance", async (route) => {
    await json(route, { total: 12, pii: { phone: 1, email: 1, all: 2 } });
  });

  // --- Chat / Spaces shell -------------------------------------------------
  await page.route("**/workspaces", async (route) => {
    await json(route, { workspaces: [{ id: 1, slug: "zaky", name: "ZAKI", description: "Release QA workspace" }] });
  });
  await page.route("**/workspace/*/threads", async (route) => {
    await json(route, { threads: [] });
  });
  await page.route("**/workspace/*/thread/*/chats", async (route) => {
    await json(route, { history: [] });
  });
  await page.route("**/workspace/*", async (route) => {
    await json(route, { workspace: { id: 1, slug: "zaky", name: "ZAKI", description: "Release QA workspace" } });
  });
  await page.route("**/api/documents/accepted-file-types", async (route) => {
    await json(route, { types: { "text/plain": [".txt"], "application/pdf": [".pdf"] } });
  });

  // --- Design (waitlist) ---------------------------------------------------
  await page.route("**/api/design/health", async (route) => {
    await json(route, { ok: false, configured: false });
  });
  await page.route("**/api/design/projects", async (route) => {
    await json(route, { projects: [] });
  });

  // --- Telemetry -----------------------------------------------------------
  await page.route("**/api/telemetry/product-event", async (route) => {
    await json(route, { success: true });
  });
}

/**
 * Convenience: full signed-in setup (bootstrap + shell mocks) in one call.
 */
export async function signInForRelease(page: Page, options: ReleaseShellOptions = {}) {
  await mockReleaseShell(page, options);
  await bootstrapSignedInSession(page);
}

/** Routes that form the V1 release confidence gate (AGENTS.md §8). */
export const RELEASE_ROUTES = [
  { path: "/", name: "home" },
  { path: "/agent", name: "agent" },
  { path: "/spaces", name: "spaces" },
  { path: "/brain", name: "brain" },
  { path: "/settings", name: "settings" },
] as const;

/** Visible future-spoke routes must render the correct release gates. */
export const RELEASE_GATED_ROUTES = [
  { path: "/design", name: "design-gate", gate: "product-gate-design" },
  { path: "/minutes", name: "minutes-gate", gate: "product-gate-minutes" },
] as const;

/** Required signed-in capture viewports (AGENTS.md §8). */
export const RELEASE_VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
} as const;
