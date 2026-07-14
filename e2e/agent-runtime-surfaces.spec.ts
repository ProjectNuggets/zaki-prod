import { expect, test, type Page, type Route } from "@playwright/test";
import { RELEASE_VIEWPORTS, signInForRelease } from "./support/release-harness";

const SESSION_KEY = "agent:zaki-bot:user:4273:thread:main";
const ENCODED_SESSION_KEY = encodeURIComponent(SESSION_KEY);
const OUT_DIR = "e2e/__screenshots__/agent-runtime";
const BROWSER_FRAME_FIXTURE =
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0BAMAAAAXyugiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURRISEiQkJAUFBRoaGioqKuVAMjo6Ov///4+Hc04AAAABYktHRAcWYYjrAAAAB3RJTUUH6gYRCw43NoUwfgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0wNi0xN1QxMToxNDo1NSswMDowMAvKYt0AAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMDYtMTdUMTE6MTQ6NTUrMDA6MDB6l9phAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTA2LTE3VDExOjE0OjU1KzAwOjAwLYL7vgAAAPdJREFUeNrt1rENwjAQhtGMACswAowAEyCxAAX7j0CaFLEsOeFMzsX76tOv19nTJEmaO7c7NS/bF+tDQEBAQEBJUrvL4AECZgcImB0gYHaAgNktwFu0azHcaxAQEBAQEBAQEPBA4GNX9zYwPggICAgICNgTGKgOjA8CAgICAgICjgTc9/lY/UHqwPggICAgICBgT2D86SyA8UFAQEBAQEDAkYDb/xobgT/PAQICAgIC/gUYqA6MDwICAgIeBBw2QMDsAAGzAwTMDhAwO0DA7AABs1uAr6095+NPpXcx3GsQEBAQEHDwAAGzAwTMDhAwO0DA7AABs/sCV56zIP8PmA4AAAAASUVORK5CYII=";

type PersistedTurnEvent = {
  eventType: string;
  payload: Record<string, unknown>;
  ts?: number;
};

type PersistedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  events?: PersistedTurnEvent[];
  created_at?: string;
};

type RuntimeScenario = {
  name: string;
  messages: PersistedMessage[];
  pendingApproval?: boolean;
  browserFrame?: boolean;
  tasks?: Array<Record<string, unknown>>;
  artifacts?: Array<Record<string, unknown>>;
};

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function sse(route: Route, blocks: Array<{ event: string; data: Record<string, unknown> }>) {
  await route.fulfill({
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    },
    body: blocks
      .map((block) => `event: ${block.event}\ndata: ${JSON.stringify(block.data)}\n\n`)
      .join(""),
  });
}

function event(eventType: string, payload: Record<string, unknown>, ts: number): PersistedTurnEvent {
  return { eventType, payload, ts };
}

const baseArtifact = {
  id: "artifact-launch-brief",
  title: "Founder GTM brief",
  type: "markdown",
  version: 1,
  updatedAt: 1_779_904_000_000,
  url: "/api/agent/artifacts/artifact-launch-brief",
};

const scenarios: Record<string, RuntimeScenario> = {
  facet: {
    name: "facet",
    artifacts: [baseArtifact],
    messages: [
      {
        id: "user-facet",
        role: "user",
        content: "Review this fundraising GTM strategy.",
      },
      {
        id: "assistant-facet",
        role: "assistant",
        content:
          "My inner critic says the use cases blur together and the pricing assumes a team you do not have. My synthesis: pick the founder fundraising beachhead, prove retention with 20 users, and delay enterprise.",
        events: [
          event(
            "reasoning_summary",
            {
              type: "reasoning_summary",
              summary:
                "I compared the strategy against the current product wedge and found the weakest assumptions before answering.",
              phase: "thinking",
            },
            1_779_904_000_000
          ),
          event(
            "tool_start",
            {
              tool: "delegate",
              tool_use_id: "delegate-critic-1",
              input_preview: '{"agent":"the-critic","prompt":"Review the fundraising GTM strategy."}',
              activity_label: "Getting a second opinion from the critic",
            },
            1_779_904_001_000
          ),
          event(
            "tool_result",
            {
              tool: "delegate",
              tool_use_id: "delegate-critic-1",
              success: true,
              duration_ms: 842,
              output_preview:
                'delegate agent=the-critic status=completed\n[SURFACING: voice this back as self-dialogue.]\nresult:\nThe five use cases are indistinguishable.',
              result_summary: "Critic found use-case blur and GTM overreach.",
            },
            1_779_904_002_000
          ),
          event(
            "artifact_event",
            {
              op: "create",
              artifact_id: "artifact-launch-brief",
              title: "Founder GTM brief",
              kind: "markdown",
              version: 1,
              url: "/api/agent/artifacts/artifact-launch-brief",
              change_summary: "Created a focused GTM brief.",
            },
            1_779_904_003_000
          ),
          event(
            "tool_result",
            {
              tool: "read_file",
              tool_use_id: "read-ui-handoff",
              success: true,
              files: ["docs/ui-handoff.md"],
              result_summary: "Loaded the UI handoff.",
            },
            1_779_904_004_000
          ),
          event(
            "tool_result",
            {
              tool: "web_search",
              tool_use_id: "web-market",
              success: true,
              output_preview: "Relevant source: https://example.com/agent-market",
              result_summary: "Relevant source: https://example.com/agent-market",
            },
            1_779_904_005_000
          ),
        ],
      },
    ],
  },
  approval: {
    name: "approval",
    pendingApproval: true,
    messages: [
      { id: "user-approval", role: "user", content: "Click the submit button." },
      {
        id: "assistant-approval",
        role: "assistant",
        content: "I need approval before clicking the authenticated submit button.",
        events: [
          event(
            "reasoning_summary",
            {
              type: "reasoning_summary",
              summary:
                "The requested browser action can change authenticated state, so the run must pause for approval.",
              phase: "thinking",
            },
            1_779_905_000_000
          ),
          event(
            "approval_required",
            {
              approval_id: "approval-click-1",
              tool: "extension_click",
              reason: "Clicking #submit may submit authenticated data.",
              risk_level: "high",
              effect_preview: "Submit the form in the active browser tab.",
            },
            1_779_905_001_000
          ),
        ],
      },
    ],
  },
  browser: {
    name: "browser",
    browserFrame: true,
    messages: [
      { id: "user-browser", role: "user", content: "Open the pricing page and inspect it." },
      {
        id: "assistant-browser",
        role: "assistant",
        content: "I opened the pricing page and found the plan cards loading normally.",
        events: [
          event(
            "tool_start",
            {
              tool: "browser_navigate",
              tool_use_id: "browser-1",
              input_preview: '{"url":"https://example.com/pricing"}',
              activity_label: "Opening pricing page",
            },
            1_779_906_000_000
          ),
          event(
            "tool_result",
            {
              tool: "browser_navigate",
              tool_use_id: "browser-1",
              success: true,
              result_summary: "Opened https://example.com/pricing",
              output_preview: "https://example.com/pricing",
            },
            1_779_906_001_000
          ),
        ],
      },
    ],
  },
  planFailure: {
    name: "plan-failure",
    messages: [
      { id: "user-plan-failure", role: "user", content: "Prepare and verify the release." },
      {
        id: "assistant-plan-failure",
        role: "assistant",
        content: "The release checks stopped at the migration step.",
        events: [
          event("progress", {
            type: "progress",
            phase: "plan_step",
            label: "Inspect the release state",
            step_index: 0,
            step_total: 3,
            tool_name: "file_read",
          }, 1_779_906_100_000),
          event("progress", {
            type: "progress",
            phase: "tool_done",
            label: "Release state inspected",
            step_index: 0,
            step_total: 3,
            tool_name: "file_read",
          }, 1_779_906_101_000),
          event("progress", {
            type: "progress",
            phase: "plan_step",
            label: "Run the schema migration",
            step_index: 1,
            step_total: 3,
            tool_name: "shell",
          }, 1_779_906_102_000),
          event("progress", {
            type: "progress",
            phase: "error_recovery",
            label: "invalid_session_key",
            step_index: 1,
            step_total: 3,
            tool_name: "shell",
          }, 1_779_906_103_000),
        ],
      },
    ],
  },
  toolOnly: {
    name: "tool-only",
    tasks: [
      {
        taskId: "task-background-1",
        status: "running",
        description: "Waiting for delegated research result",
        progressPct: 55,
        updatedAt: 1_779_907_000_000,
      },
    ],
    messages: [
      { id: "user-tool-only", role: "user", content: "Research this in the background." },
      {
        id: "assistant-tool-only",
        role: "assistant",
        content: "I started the background research. I will continue when the delegated result arrives.",
        events: [
          event(
            "tool_only_summary",
            {
              type: "tool_only_summary",
              tool_calls_executed: 2,
              spawned_task_ids: ["task-background-1"],
              iterations_used: 1,
            },
            1_779_907_000_000
          ),
          event(
            "subagent_completion",
            {
              id: "task-background-1",
              task_id: "task-background-1",
              status: "running",
              result_summary: "Delegated research still running.",
            },
            1_779_907_001_000
          ),
        ],
      },
    ],
  },
};

async function mockAgentRuntimeScenario(page: Page, scenario: RuntimeScenario) {
  await page.route("**/api/agent/me", async (route) => {
    await json(route, { userId: "4273" });
  });

  await page.route("**/workspaces", async (route) => {
    await json(route, {
      workspaces: [{ id: 1, slug: "zaki-bot", name: "ZAKI Agent", description: "Runtime QA" }],
    });
  });

  await page.route("**/api/agent/sessions", async (route) => {
    await json(route, {
      sessions: [
        {
          session_key: SESSION_KEY,
          title: "Runtime QA",
          message_count: scenario.messages.length,
          last_active: 1_779_907_000,
          live: false,
          mode: "execute",
          pending_approval_count: scenario.pendingApproval ? 1 : 0,
          pending_approvals: scenario.pendingApproval
            ? [
                {
                  approval_id: "approval-click-1",
                  tool: "extension_click",
                  reason: "Clicking #submit may submit authenticated data.",
                  risk_level: "high",
                  effect_preview: "Submit the form in the active browser tab.",
                },
              ]
            : [],
        },
      ],
    });
  });

  await page.route(`**/api/agent/sessions/${ENCODED_SESSION_KEY}`, async (route) => {
    await json(route, {
      session_key: SESSION_KEY,
      title: "Runtime QA",
      message_count: scenario.messages.length,
      last_active: 1_779_907_000,
      live: false,
      mode: "execute",
      pending_approval_count: scenario.pendingApproval ? 1 : 0,
      pending_approvals: scenario.pendingApproval
        ? [
            {
              approval_id: "approval-click-1",
              tool: "extension_click",
              reason: "Clicking #submit may submit authenticated data.",
              risk_level: "high",
              effect_preview: "Submit the form in the active browser tab.",
            },
          ]
        : [],
    });
  });

  await page.route(`**/api/agent/sessions/${ENCODED_SESSION_KEY}/history`, async (route) => {
    await json(route, { messages: scenario.messages });
  });

  await page.route(`**/api/agent/sessions/${ENCODED_SESSION_KEY}/context`, async (route) => {
    await json(route, {
      status: "live",
      active: true,
      live: false,
      session_key: SESSION_KEY,
      model: "moonshot/kimi-k2.6",
      token_estimate: 31_457,
      context_window_tokens: 262_144,
      remaining_tokens: 230_687,
      pressure_percent: 12,
      context_pressure_percent: 12,
    });
  });

  await page.route(`**/api/agent/sessions/${ENCODED_SESSION_KEY}/todos`, async (route) => {
    await json(route, { lists: [], current_list_id: null });
  });

  await page.route(`**/api/agent/sessions/${ENCODED_SESSION_KEY}/plan`, async (route) => {
    await json(route, { active: false, plan: null });
  });

  await page.route("**/api/agent/tasks**", async (route) => {
    await json(route, { tasks: scenario.tasks ?? [] });
  });

  await page.route("**/api/agent/artifacts**", async (route) => {
    await json(route, { artifacts: scenario.artifacts ?? [] });
  });

  await page.route("**/api/agent/cron**", async (route) => {
    await json(route, { jobs: [] });
  });

  await page.route("**/api/agent/chat/stream", async (route) => {
    if (scenario.browserFrame) {
      await sse(route, [
        {
          event: "browser_frame",
          data: {
            session_id: "browser-session-1",
            frame: BROWSER_FRAME_FIXTURE,
            url: "https://example.com/pricing",
            title: "Example Pricing",
          },
        },
        { event: "token", data: { delta: "Browser frame captured." } },
      ]);
      return;
    }
    await sse(route, [
      { event: "token", data: { delta: "Done." } },
      { event: "done", data: { duration_ms: 300 } },
    ]);
  });
}

async function openScenario(page: Page, scenario: RuntimeScenario) {
  await signInForRelease(page);
  await mockAgentRuntimeScenario(page, scenario);
  await page.goto("/agent", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".zaki-app-v2")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(scenario.messages[scenario.messages.length - 1]?.content || "")).toBeVisible({
    timeout: 20_000,
  });
}

function deviceNameForProject(projectName: string): keyof typeof RELEASE_VIEWPORTS {
  return projectName.toLowerCase().includes("mobile") ? "mobile" : "desktop";
}

test.describe("Agent runtime surfaces", () => {
  for (const scenario of Object.values(scenarios)) {
    test(`${scenario.name} surfaces are visible`, async ({ page }, testInfo) => {
      const device = deviceNameForProject(testInfo.project.name);
      await page.setViewportSize(RELEASE_VIEWPORTS[device]);
      await openScenario(page, scenario);

      if (scenario.name === "facet") {
        // Quick replies are a short-lived affordance after a newly completed
        // turn; they intentionally do not reappear for restored history.
        await expect(page.getByTestId("quick-reply-chips")).toHaveCount(0);
        const openPanelButton = page.getByRole("button", { name: /Open agent panel/i });
        if (await openPanelButton.isVisible().catch(() => false)) {
          await openPanelButton.click();
        }
        const inspector = page.locator(".zaki-agent-inspector:visible").first();
        await expect(inspector).toBeVisible();
        await inspector.getByRole("tab", { name: "Artifacts" }).click();
        await expect(
          inspector.getByTestId("agent-artifact-row").getByText("Founder GTM brief")
        ).toBeVisible();
        // Artifact/source evidence moved out of the reply footer during the
        // Agent surface consolidation.
        await expect(page.getByTestId("agent-reply-artifact")).toHaveCount(0);
        await expect(page.getByTestId("agent-reply-touched")).toHaveCount(0);
        await expect(page.getByText(/SURFACING/i)).toHaveCount(0);
        await expect(page.getByText(/delegate agent=/i)).toHaveCount(0);
      }

      if (scenario.name === "approval") {
        // #39 reworked the approval card: the header is now a fixed "Approval
        // required" kicker plus a human-readable intent title (extension_click
        // classifies as a browser action → "Control the browser"), and the
        // specific tool is surfaced in the audit meta row ("Tool · …").
        await expect(page.getByText("Approval required", { exact: true })).toBeVisible();
        await expect(page.getByText("Control the browser")).toBeVisible();
        await expect(page.getByText("Tool · extension_click")).toBeVisible();
        // Approve/Modify/Deny controls remain (accessible names are scoped to
        // the tool, e.g. "Approve extension_click action").
        await expect(page.getByRole("button", { name: /Approve/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /Modify/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /Deny/i })).toBeVisible();
      }

      if (scenario.name === "browser") {
        await page.getByRole("combobox").fill("Capture the current browser frame.");
        await page.getByRole("button", { name: /Send message/i }).click();
        await expect(page.getByText("Browser frame captured.")).toBeVisible();
        // Browser frames now auto-open in a dedicated live panel instead of
        // occupying an inspector tab.
        const browserScope = page
          .locator('[data-testid="agent-live-browser-panel"]:visible')
          .first();
        await expect(browserScope).toBeVisible();
        await expect(
          browserScope.getByRole("heading", { name: "Example Pricing" }).first()
        ).toBeVisible();
        await expect(browserScope.getByText("https://example.com/pricing").first()).toBeVisible();
      }

      if (scenario.name === "plan-failure") {
        const openPanelButton = page.getByRole("button", { name: /Open agent panel/i });
        if (await openPanelButton.isVisible().catch(() => false)) {
          await openPanelButton.click();
        }
        const inspector = page.locator(".zaki-agent-inspector:visible").first();
        await expect(inspector).toBeVisible();
        await expect(inspector.getByRole("tab", { name: "Plan" })).toHaveAttribute(
          "aria-selected",
          "true"
        );
        const failedStep = inspector.getByTestId("agent-plan-step-2");
        await expect(failedStep).toHaveAttribute("data-state", "failed");
        await expect(failedStep.getByText("Run the schema migration")).toBeVisible();
        await expect(failedStep.getByText("shell")).toBeVisible();
        await expect(failedStep).not.toContainText("invalid_session_key");
        await page.screenshot({
          path: `${OUT_DIR}/${device}-plan-failure-state.png`,
          fullPage: false,
          scale: "css",
        });
        await failedStep.getByRole("button", { name: "Retry from here" }).click();
        await failedStep.getByRole("button", { name: "Start retry" }).click();
        await expect(page.getByText(/Retry the failed step "Run the schema migration"/)).toBeVisible();
        await expect(page.getByText("Done.", { exact: true })).toBeVisible();
      }

      if (scenario.name === "tool-only") {
        // Active work remains legible inline and is also available through the
        // Plan panel's explicit task fallback.
        const plan = page.locator("details.zaki-agent-plan-inline").first();
        await expect(plan).toBeVisible();
        await expect(plan.getByText("Waiting for delegated research result")).toBeVisible();
        await expect(plan.getByText("55%")).toBeVisible();
      }

      await page.screenshot({
        path: `${OUT_DIR}/${device}-${scenario.name}.png`,
        fullPage: false,
        scale: "css",
      });
    });
  }
});
