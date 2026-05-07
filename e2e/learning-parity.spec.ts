import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const notebooks = [
    {
      id: "nb-1",
      name: "Newton Notes",
      description: "Classical mechanics study notes.",
      record_count: 1,
      updated_at: "2026-05-07T10:00:00.000Z",
    },
  ];
  const notebookDetails = new Map<string, Record<string, unknown>>([
    [
      "nb-1",
      {
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
      },
    ],
  ]);
  const savedNotebookRecords: unknown[] = [];
  const startedTurns: Array<Record<string, unknown>> = [];
  const knowledgeBases: Array<Record<string, unknown>> = [
    {
      name: "main",
      is_default: true,
      status: "ready",
      metadata: { last_updated: "2026-05-07T10:00:00.000Z" },
      statistics: { files_count: 0 },
    },
  ];
  const knowledgeUploads: Array<{ path: string; body: string }> = [];
  const defaultKnowledgeUpdates: string[] = [];
  const assetRequests: string[] = [];

  await page.routeWebSocket("**/api/learning/ws", async (ws) => {
    ws.onMessage((message) => {
      const payload = JSON.parse(String(message)) as {
        type?: string;
        content?: string;
        session_id?: string;
      } & Record<string, unknown>;
      if (payload.type !== "start_turn") return;
      startedTurns.push(payload);
      ws.send(JSON.stringify({ type: "session", session_id: payload.session_id || "session-e2e" }));
      ws.send(JSON.stringify({ type: "content", content: "Notebook-ready answer." }));
      if (payload.capability === "deep_research") {
        ws.send(
          JSON.stringify({
            type: "result",
            metadata: {
              topic: payload.content,
              sub_topics: [
                {
                  title: "Fourier basis",
                  overview: "Explain sinusoidal basis functions.",
                },
              ],
              research_config: payload.config,
            },
          }),
        );
      }
      if (payload.capability === "visualize") {
        ws.send(
          JSON.stringify({
            type: "result",
            metadata: {
              response: "Visualization ready.",
              render_type: "mermaid",
              code: {
                language: "mermaid",
                content: "flowchart TD\\n  A[Start] --> B[Update weights]",
              },
              analysis: {
                description: "Gradient descent process flow.",
              },
            },
          }),
        );
      }
      if (payload.capability === "math_animator") {
        ws.send(
          JSON.stringify({
            type: "result",
            metadata: {
              response: "Storyboard ready.",
              output_mode: "image",
              code: { language: "python", content: "class Square(Scene): pass" },
              artifacts: [
                {
                  type: "image",
                  url: "/api/outputs/math/frame.gif",
                  filename: "frame.gif",
                  label: "Frame preview",
                },
              ],
              timings: {},
              render: { quality: "high" },
            },
          }),
        );
      }
      ws.send(JSON.stringify({ type: "done" }));
    });
  });

  await page.route("**/api/learning/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/learning/health") {
      await json(route, { ok: true, mode: "hosted" });
      return;
    }

    if (path.startsWith("/api/learning/outputs/")) {
      assetRequests.push(path);
      await route.fulfill({
        status: 200,
        contentType: "image/gif",
        body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
      });
      return;
    }

    if (path === "/api/learning/knowledge/list") {
      await json(route, { knowledge_bases: knowledgeBases });
      return;
    }

    if (path === "/api/learning/knowledge/supported-file-types") {
      await json(route, {
        extensions: [".md", ".pdf", ".png", ".jpg", ".txt"],
        accept: ".md,.pdf,.png,.jpg,.txt",
        max_file_size_bytes: 100 * 1024 * 1024,
        max_pdf_size_bytes: 50 * 1024 * 1024,
      });
      return;
    }

    if (path === "/api/learning/dashboard/recent") {
      await json(route, [
        {
          id: "session-1",
          type: "chat",
          capability: "chat",
          title: "Momentum lesson",
          summary: "Explains conservation of momentum.",
          timestamp: "2026-05-07T10:00:00.000Z",
          session_ref: "sessions/session-1",
          message_count: 2,
          status: "idle",
        },
      ]);
      return;
    }

    if (path === "/api/learning/plugins/list") {
      await json(route, {
        tools: [{ name: "rag", description: "Search a knowledge base", parameters: [] }],
        capabilities: [{ name: "chat", description: "General tutoring", tools_used: ["rag"] }],
        plugins: [],
      });
      return;
    }

    if (path.startsWith("/api/learning/knowledge/default/") && method === "PUT") {
      const name = decodeURIComponent(path.split("/").pop() || "");
      defaultKnowledgeUpdates.push(name);
      knowledgeBases.forEach((item) => {
        item.is_default = item.name === name;
      });
      await json(route, { status: "success", default_kb: name });
      return;
    }

    if (path === "/api/learning/knowledge/create" && method === "POST") {
      const body = route.request().postDataBuffer()?.toString("utf8") || "";
      knowledgeUploads.push({ path, body });
      knowledgeBases.push({
        name: "biology",
        status: "initializing",
        metadata: { last_updated: "2026-05-07T12:00:00.000Z" },
        statistics: { files_count: 1 },
      });
      await json(route, { message: "created", name: "biology", files: ["cell.md"], task_id: "task-create" });
      return;
    }

    if (path === "/api/learning/knowledge/main/files") {
      await json(route, { files: [] });
      return;
    }

    if (path === "/api/learning/knowledge/biology/files") {
      await json(route, { files: [{ name: "cell.md", size: 16, status: "ready" }] });
      return;
    }

    if (path.startsWith("/api/learning/knowledge/biology/") && method === "POST") {
      const body = route.request().postDataBuffer()?.toString("utf8") || "";
      knowledgeUploads.push({ path, body });
      await json(route, { message: "uploaded", files: ["ok"], task_id: `task-${knowledgeUploads.length}` });
      return;
    }

    if (path === "/api/learning/books") {
      await json(route, { books: [] });
      return;
    }

    if (path === "/api/learning/notebooks") {
      if (method === "POST") {
        const body = route.request().postDataJSON() as { name?: string; description?: string };
        const id = `nb-${notebooks.length + 1}`;
        const notebook = {
          id,
          name: String(body.name || "Untitled notebook"),
          description: String(body.description || ""),
          record_count: 0,
          updated_at: "2026-05-07T11:00:00.000Z",
        };
        notebooks.push(notebook);
        notebookDetails.set(id, { ...notebook, records: [] });
        await json(route, { success: true, notebook });
        return;
      }
      await json(route, { notebooks });
      return;
    }

    if (path === "/api/learning/notebooks/records/manual") {
      const body = route.request().postDataJSON() as {
        notebook_ids?: string[];
        record_type?: string;
        title?: string;
        summary?: string;
        user_query?: string;
        output?: string;
        metadata?: Record<string, unknown>;
      };
      savedNotebookRecords.push(body);
      for (const notebookId of body.notebook_ids ?? []) {
        const detail = notebookDetails.get(notebookId);
        if (!detail) continue;
        const records = Array.isArray(detail.records) ? detail.records : [];
        const record = {
          id: `rec-${records.length + 1}`,
          title: body.title || "Saved chat",
          type: body.record_type || "chat",
          summary: body.summary || "",
          user_query: body.user_query || "",
          output: body.output || "",
          metadata: body.metadata || {},
          created_at: "2026-05-07T11:05:00.000Z",
        };
        records.push(record);
        detail.records = records;
        const summary = notebooks.find((notebook) => notebook.id === notebookId);
        if (summary) summary.record_count = records.length;
      }
      await json(route, { success: true, added_to_notebooks: body.notebook_ids ?? [] });
      return;
    }

    if (path.startsWith("/api/learning/notebooks/")) {
      const notebookId = decodeURIComponent(path.split("/").pop() || "");
      await json(route, notebookDetails.get(notebookId) || {}, notebookDetails.has(notebookId) ? 200 : 404);
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

  return {
    savedNotebookRecords,
    startedTurns,
    knowledgeUploads,
    defaultKnowledgeUpdates,
    assetRequests,
  };
}

test.describe("ZAKI Learn parity wiring", () => {
  test.beforeEach(async ({ page }) => {
    await mockAppShell(page);
    await bootstrapSession(page);
  });

  test("renders DeepTutor-shaped primary Learn surfaces", async ({ page }) => {
    await mockLearning(page);

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

    await page.goto("/learn?view=space");
    await expect(page.getByText("Recent Activity").first()).toBeVisible();
    await expect(page.getByText("Momentum lesson")).toBeVisible();

    await page.goto("/learn?view=agents");
    await expect(page.getByText("TutorBot Agents")).toBeVisible();
    await page.getByRole("button", { name: /^Channels$/ }).click();
    await expect(page.getByRole("button", { name: "WhatsApp" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Telegram" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discord" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Slack" })).toBeVisible();
  });

  test("smokes every ZAKI Learn route and primary function entry", async ({ page }) => {
    await mockLearning(page);

    const routeChecks: Array<{
      view: string;
      visibleText: string | RegExp;
      functionEntries: Array<string | RegExp | { role: "button"; name: string | RegExp }>;
    }> = [
      {
        view: "books",
        visibleText: "Generate, browse and study your AI-authored books.",
        functionEntries: [/New book/i],
      },
      {
        view: "sources",
        visibleText: "Knowledge Bases",
        functionEntries: [/New knowledge base/i, /Add documents/i, /Details/i],
      },
      {
        view: "chat",
        visibleText: "What would you like to learn?",
        functionEntries: [/Save to Notebook/i, /Download Markdown/i, /New chat/i],
      },
      {
        view: "agents",
        visibleText: "TutorBot Agents",
        functionEntries: [/Create bot/i, /^Profiles$/, /^Channels$/, /^Soul Templates$/],
      },
      {
        view: "notebooks",
        visibleText: "Your notebooks",
        functionEntries: [/Create$/, /Download Markdown/i],
      },
      {
        view: "writer",
        visibleText: "Manage your markdown drafts and projects.",
        functionEntries: [/New draft/i, /From template/i],
      },
      {
        view: "space",
        visibleText: "Your personal learning library.",
        functionEntries: [/Recent Activity/i, /Chat History/i, /^Notebooks$/, /Question Bank/i, /^Skills$/, /^Memory$/],
      },
      {
        view: "review",
        visibleText: "Manage Categories",
        functionEntries: [/All/i, /Bookmarked/i, /Wrong Only/i],
      },
      {
        view: "workspaces",
        visibleText: "Advanced workspaces",
        functionEntries: [/Deep Solve/i, /Deep Research/i, /Quiz Generation/i, /Visualize/i, /Math Animator/i, /Analyze/i],
      },
      {
        view: "solve",
        visibleText: "Deep Solve",
        functionEntries: [/Tools/i, { role: "button", name: "Learning space context menu" }],
      },
      {
        view: "research",
        visibleText: "Deep Research",
        functionEntries: [/Sources/i, /Mode/i, /Depth/i],
      },
      {
        view: "quiz",
        visibleText: "Quiz Generation",
        functionEntries: [/Custom/i, /Mimic Paper/i, /Count/i, /Difficulty/i],
      },
      {
        view: "visualize",
        visibleText: "Visualize",
        functionEntries: [/Render Mode/i],
      },
      {
        view: "math-animation",
        visibleText: "Math Animator",
        functionEntries: [/Output/i, /Quality/i, /Style Hint/i],
      },
    ];

    for (const check of routeChecks) {
      await page.goto(`/learn?view=${check.view}`);
      await expect(page.getByText(check.visibleText).first()).toBeVisible();
      for (const entry of check.functionEntries) {
        if (typeof entry === "object" && "role" in entry) {
          await expect(page.getByRole(entry.role, { name: entry.name })).toBeVisible();
        } else {
          await expect(page.getByText(entry).first()).toBeVisible();
        }
      }
    }
  });

  test("closes Learn composer popups on outside click and Escape", async ({ page }) => {
    await mockLearning(page);

    await page.goto("/learn?view=chat");
    await page.getByRole("button", { name: "Learning capability menu" }).click();
    await expect(page.getByText("Flexible conversation with any tool")).toBeVisible();
    await page.mouse.click(12, 12);
    await expect(page.getByText("Flexible conversation with any tool")).toBeHidden();

    await page.getByRole("button", { name: "Learning tools menu" }).click();
    await expect(page.getByRole("button", { name: /Brainstorm/i })).toBeVisible();
    await page.mouse.click(12, 12);
    await expect(page.getByRole("button", { name: /Brainstorm/i })).toBeHidden();

    await page.getByRole("button", { name: "Learning space context menu" }).click();
    await expect(page.getByRole("button", { name: /Question Bank/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Question Bank/i })).toBeHidden();

    await page.goto("/learn?view=research");
    await page.getByRole("button", { name: "Learning sources menu" }).click();
    await expect(page.getByRole("button", { name: /Papers/i })).toBeVisible();
    await page.mouse.click(12, 12);
    await expect(page.getByRole("button", { name: /Papers/i })).toBeHidden();
  });

  test("exports notebook records through the ZAKI Learn notebook view", async ({ page }) => {
    await mockLearning(page);

    await page.goto("/learn?view=notebooks");

    await expect(page.getByRole("heading", { name: "Your notebooks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Newton Notes" })).toBeVisible();
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

  test("creates a notebook and saves a chat turn into it", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=notebooks");
    await page.getByPlaceholder("Notebook name").fill("Energy Notes");
    await page.getByPlaceholder("Description").fill("Work and energy examples");
    await page.getByRole("button", { name: /^Create$/ }).click();
    await expect(page.getByText("Energy Notes")).toBeVisible();

    await page.goto("/learn?view=chat");
    await page.getByPlaceholder("How can I help you today?").fill("Explain work-energy theorem.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Notebook-ready answer.")).toBeVisible();

    await page.getByRole("button", { name: /Save to Notebook/i }).click();
    await page.getByRole("button", { name: /Energy Notes/i }).click();
    await page.getByRole("button", { name: /^Save$/ }).click();

    await expect.poll(() => learning.savedNotebookRecords.length).toBe(1);
    expect(learning.savedNotebookRecords[0]).toMatchObject({
      notebook_ids: expect.arrayContaining(["nb-2"]),
      record_type: "chat",
      user_query: "Explain work-energy theorem.",
    });
    expect(JSON.stringify(learning.savedNotebookRecords[0])).toContain("Notebook-ready answer.");

    await page.goto("/learn?view=notebooks");
    await page.getByText("Energy Notes").click();
    await expect(page.getByText("Explain work-energy theorem.")).toBeVisible();
  });

  test("routes quiz generation with hosted config", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=quiz");
    await expect(page.getByText("Quiz Generation").first()).toBeVisible();
    await page.getByLabel("Count").fill("5");
    await page.getByLabel("Difficulty").selectOption("medium");
    await page.getByLabel("Type").selectOption("choice");
    await page.getByLabel("Preference").fill("include answers with explanations");
    await page.getByPlaceholder("How can I help you today?").fill("Create a quiz about Newton's laws.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect.poll(() => learning.startedTurns.length).toBe(1);
    expect(learning.startedTurns[0]).toMatchObject({
      type: "start_turn",
      capability: "deep_question",
      content: "Create a quiz about Newton's laws.",
      config: {
        mode: "custom",
        num_questions: 5,
        difficulty: "medium",
        question_type: "choice",
        preference: "include answers with explanations",
      },
    });
  });

  test("creates and uploads source files, browser folders, and archives", async ({ page }) => {
    const learning = await mockLearning(page);
    const dir = await mkdtemp(join(tmpdir(), "zaki-learn-upload-"));
    const docPath = join(dir, "cell.md");
    const imagePath = join(dir, "diagram.png");
    const archivePath = join(dir, "bundle.zip");
    await writeFile(docPath, "# Cell biology");
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await writeFile(archivePath, "fake zip for request routing");

    await page.goto("/learn?view=sources");
    await page.getByRole("button", { name: /New knowledge base/i }).click();
    await page.getByPlaceholder("Knowledge base name").fill("biology");

    await page.locator('input[type="file"]').nth(0).setInputFiles(docPath);
    await expect(page.getByText("1 files ready")).toBeVisible();
    await page.getByRole("button", { name: /Create library from selection/i }).click();
    await expect.poll(() => learning.knowledgeUploads.length).toBe(1);
    expect(learning.knowledgeUploads[0].path).toBe("/api/learning/knowledge/create");
    expect(learning.knowledgeUploads[0].body).toContain("cell.md");

    await page.locator('input[type="file"]').nth(1).setInputFiles(imagePath);
    await expect(page.getByText("1 folder files ready")).toBeVisible();
    await page.getByRole("button", { name: /Upload folder to existing library/i }).click();
    await expect.poll(() => learning.knowledgeUploads.length).toBe(2);
    expect(learning.knowledgeUploads[1].path).toBe("/api/learning/knowledge/biology/upload-folder");
    expect(learning.knowledgeUploads[1].body).toContain("diagram.png");

    await page.locator('input[type="file"]').nth(2).setInputFiles(archivePath);
    await page.getByRole("button", { name: /Upload archive to existing library/i }).click();
    await expect.poll(() => learning.knowledgeUploads.length).toBe(3);
    expect(learning.knowledgeUploads[2].path).toBe("/api/learning/knowledge/biology/upload-archive");
    expect(learning.knowledgeUploads[2].body).toContain("bundle.zip");

    await page.getByRole("button", { name: /biology/i }).click();
    await page.getByRole("button", { name: /Settings/i }).click();
    await page.getByRole("button", { name: /Set default/i }).click();
    await expect.poll(() => learning.defaultKnowledgeUpdates.includes("biology")).toBe(true);
  });

  test("routes advanced capability presets with their hosted configs", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=solve");
    await expect(page.getByText("Deep Solve").first()).toBeVisible();
    await page.getByPlaceholder("How can I help you today?").fill("Solve x^2 - 4 = 0.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => learning.startedTurns.length).toBe(1);
    expect(learning.startedTurns[0]).toMatchObject({
      type: "start_turn",
      capability: "deep_solve",
      content: "Solve x^2 - 4 = 0.",
    });

    await page.goto("/learn?view=research");
    await expect(page.getByText("Deep Research").first()).toBeVisible();
    await page.getByLabel("Mode").selectOption("report");
    await page.getByLabel("Depth").selectOption("quick");
    await page.getByPlaceholder("How can I help you today?").fill("Research Fourier transforms.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => learning.startedTurns.length).toBe(2);
    await expect(page.getByText("Research Outline")).toBeVisible();
    await expect(page.getByText("Fourier basis")).toBeVisible();
    let downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Markdown/i }).click();
    let download = await downloadPromise;
    let path = await download.path();
    let markdown = await readFile(String(path), "utf8");
    expect(markdown).toContain("### Research Outline");
    expect(learning.startedTurns[1]).toMatchObject({
      type: "start_turn",
      capability: "deep_research",
      config: {
        mode: "report",
        depth: "quick",
        sources: ["kb", "web", "papers"],
      },
    });

    await page.goto("/learn?view=visualize");
    await expect(page.getByText("Visualize").first()).toBeVisible();
    await page.getByLabel("Render Mode").selectOption("mermaid");
    await page
      .getByPlaceholder("Describe the chart or diagram you want to visualize...")
      .fill("Make a flowchart for gradient descent.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => learning.startedTurns.length).toBe(3);
    await expect(page.getByText("Visualization ready.")).toBeVisible();
    await expect(page.getByText("flowchart TD")).toBeVisible();
    downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Markdown/i }).click();
    download = await downloadPromise;
    path = await download.path();
    markdown = await readFile(String(path), "utf8");
    expect(markdown).toContain("### Visualization");
    expect(markdown).toContain("flowchart TD");
    expect(learning.startedTurns[2]).toMatchObject({
      type: "start_turn",
      capability: "visualize",
      config: { render_mode: "mermaid" },
    });

    await page.goto("/learn?view=math-animation");
    await expect(page.getByText("Math Animator").first()).toBeVisible();
    await page.getByLabel("Output").selectOption("image");
    await page.getByLabel("Quality").selectOption("high");
    await page.getByLabel("Style Hint").fill("clean blackboard style");
    await page
      .getByPlaceholder("Describe the math animation or storyboard you want...")
      .fill("Animate completing the square.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => learning.startedTurns.length).toBe(4);
    await expect(page.getByText("Storyboard ready.")).toBeVisible();
    await expect(page.getByText("Frame preview")).toBeVisible();
    await expect(page.getByAltText("Frame preview")).toHaveAttribute(
      "src",
      /\/api\/learning\/outputs\/math\/frame\.gif/,
    );
    await expect.poll(() => learning.assetRequests.includes("/api/learning/outputs/math/frame.gif")).toBe(true);
    await expect(page.getByText("View Manim Code")).toBeVisible();
    expect(learning.startedTurns[3]).toMatchObject({
      type: "start_turn",
      capability: "math_animator",
      config: {
        output_mode: "image",
        quality: "high",
        style_hint: "clean blackboard style",
      },
    });

    downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Markdown/i }).click();
    download = await downloadPromise;
    path = await download.path();
    markdown = await readFile(String(path), "utf8");
    expect(markdown).toContain("### Math Animator");
    expect(markdown).toContain("class Square(Scene): pass");
  });
});
