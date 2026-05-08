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
  const sessionMessages = new Map<string, Array<Record<string, unknown>>>();
  const createdBooks: Array<Record<string, unknown>> = [];
  const tutorAgentMessages: Array<Record<string, unknown>> = [];
  const tutorHistory: Array<Record<string, unknown>> = [
    {
      id: "agent-history-1",
      role: "assistant",
      content: "Past tutor message.",
    },
  ];
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
  const forcedRetryFailures = new Set<string>();
  let studyProfile = {
    course: "",
    examDate: "",
    topics: "",
    goal: "",
    weakTopics: "",
    weeklyHours: "",
    difficulty: "medium",
    preferredStyle: "balanced",
  };
  let studyPlan: Record<string, unknown> | null = null;
  const studyTasks: Array<Record<string, unknown>> = [];

  await page.routeWebSocket("**/api/learning/tutor-agents/*/ws", async (ws) => {
    ws.onMessage((message) => {
      const payload = JSON.parse(String(message)) as Record<string, unknown>;
      tutorAgentMessages.push(payload);
      const content = String(payload.content || "");
      if (content) {
        tutorHistory.push({ id: `agent-user-${tutorHistory.length}`, role: "user", content });
      }
      ws.send(JSON.stringify({ type: "thinking", content: "Checking the tutor workspace." }));
      ws.send(JSON.stringify({ type: "content", content: "Tutor reply through the hosted gateway." }));
      tutorHistory.push({
        id: `agent-assistant-${tutorHistory.length}`,
        role: "assistant",
        content: "Tutor reply through the hosted gateway.",
      });
      ws.send(JSON.stringify({ type: "done" }));
    });
  });

  await page.routeWebSocket("**/api/learning/ws", async (ws) => {
    ws.onMessage((message) => {
      const payload = JSON.parse(String(message)) as {
        type?: string;
        content?: string;
        session_id?: string;
      } & Record<string, unknown>;
      if (payload.type !== "start_turn") return;
      startedTurns.push(payload);
      const sessionId = payload.session_id || "session-e2e";
      const content = String(payload.content || "");
      if (content.includes("force retry once") && !forcedRetryFailures.has(content)) {
        forcedRetryFailures.add(content);
        ws.send(JSON.stringify({ type: "error", content: "Forced retry test failure." }));
        return;
      }
      const history = sessionMessages.get(sessionId) ?? [];
      sessionMessages.set(sessionId, history);
      history.push({
        id: `${sessionId}-user-${history.length}`,
        role: "user",
        content,
        capability: payload.capability || "chat",
      });
      const assistantRecord: Record<string, unknown> = {
        id: `${sessionId}-assistant-${history.length}`,
        role: "assistant",
        content: "Notebook-ready answer.",
        capability: payload.capability || "chat",
        events: [],
      };
      history.push(assistantRecord);
      const assistantEvents = assistantRecord.events as Array<Record<string, unknown>>;
      ws.send(JSON.stringify({ type: "session", session_id: sessionId }));
      ws.send(JSON.stringify({ type: "progress", content: "Checking learning context." }));
      ws.send(JSON.stringify({ type: "content", content: "Notebook-ready answer." }));
      if (payload.capability === "deep_research") {
        const event = {
          type: "result",
          metadata: {
            topic: payload.content,
            sub_topics: [
              {
                title: "Fourier basis",
                overview: "Explain sinusoidal basis functions.",
              },
            ],
            sources: [
              {
                title: "Fourier transform reference",
                url: "https://example.com/fourier",
                snippet: "Definition and examples.",
              },
              {
                title: "Unsafe source",
                url: "javascript:alert(1)",
                snippet: "Should render as text only.",
              },
            ],
            research_config: payload.config,
          },
        };
        assistantEvents.push(event);
        ws.send(JSON.stringify(event));
      }
      if (payload.capability === "visualize") {
        const event = {
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
        };
        assistantEvents.push(event);
        ws.send(JSON.stringify(event));
      }
      if (payload.capability === "math_animator") {
        const config = (payload.config ?? {}) as Record<string, unknown>;
        const outputMode = String(config.output_mode || "image");
        const isVideo = outputMode === "video";
        const event = {
          type: "result",
          metadata: {
            response: "Storyboard ready.",
            output_mode: outputMode,
            code: { language: "python", content: "class Square(Scene): pass" },
            artifacts: [
              {
                type: isVideo ? "video" : "image",
                url: isVideo ? "/api/outputs/math/animation.mp4" : "/api/outputs/math/frame.gif",
                filename: isVideo ? "animation.mp4" : "frame.gif",
                label: isVideo ? "Video preview" : "Frame preview",
              },
            ],
            timings: {},
            render: { quality: String(config.quality || "high") },
          },
        };
        assistantEvents.push(event);
        ws.send(JSON.stringify(event));
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

    if (path === "/api/learning/study") {
      await json(route, { success: true, profile: studyProfile, plan: studyPlan });
      return;
    }

    if (path === "/api/learning/study/profile" && method === "PUT") {
      studyProfile = { ...studyProfile, ...(route.request().postDataJSON() as typeof studyProfile) };
      await json(route, { success: true, profile: studyProfile, configured: Boolean(studyProfile.course) });
      return;
    }

    if (path === "/api/learning/study/plans" && method === "POST") {
      const body = route.request().postDataJSON() as { profile?: typeof studyProfile };
      studyProfile = { ...studyProfile, ...(body.profile || {}) };
      studyPlan = {
        id: "study-plan-1",
        title: `${studyProfile.course || "Personal"} study plan`,
        status: "active",
        profile: studyProfile,
        plan: {
          summary: "E2E durable study plan",
          tasks: [
            { id: "task-1", kind: "quiz", title: "Checkpoint quiz", status: "pending" },
          ],
        },
        tasks: studyTasks,
      };
      studyTasks.splice(0, studyTasks.length, {
        id: "task-1",
        kind: "quiz",
        title: "Checkpoint quiz",
        status: "pending",
      });
      await json(route, { success: true, profile: studyProfile, plan: studyPlan }, 201);
      return;
    }

    if (path === "/api/learning/study/tasks" && method === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const task = {
        id: `task-${studyTasks.length + 1}`,
        status: "pending",
        ...body,
      };
      studyTasks.push(task);
      if (studyPlan) studyPlan.tasks = studyTasks;
      await json(route, { success: true, task }, 201);
      return;
    }

    if (path.startsWith("/api/learning/outputs/")) {
      assetRequests.push(path);
      await route.fulfill({
        status: 200,
        contentType: path.endsWith(".mp4") ? "video/mp4" : "image/gif",
        body: path.endsWith(".mp4")
          ? Buffer.from("")
          : Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64"),
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
      if (method === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        const topic = String(body.user_intent || body.topic || "Generated book");
        const proposal = {
          title: topic,
          description: "Generated proposal for E2E verification.",
          language: body.language || "en",
          chapters: [
            { id: "chapter-1", title: "Foundations", pages: [] },
          ],
        };
        const book = {
          id: `book-${createdBooks.length + 1}`,
          book_id: `book-${createdBooks.length + 1}`,
          title: topic,
          description: "Generated proposal for E2E verification.",
          status: "draft",
          language: body.language || "en",
          chapter_count: 1,
          page_count: 0,
          proposal,
          chapters: proposal.chapters,
          updated_at: "2026-05-07T12:30:00.000Z",
        };
        createdBooks.push({ request: body, book });
        await json(route, { book, proposal });
        return;
      }
      await json(route, { books: createdBooks.map((entry) => entry.book) });
      return;
    }

    if (path.startsWith("/api/learning/books/")) {
      const parts = path.split("/");
      const bookId = decodeURIComponent(parts[4] || "");
      const record = createdBooks.find((entry) => (entry.book as Record<string, unknown>).id === bookId);
      if (path.endsWith("/spine")) {
        await json(route, { chapters: record ? ((record.book as Record<string, unknown>).chapters ?? []) : [] });
        return;
      }
      if (path.endsWith("/health")) {
        await json(route, { stale_pages: [], stale_blocks: [], status: "fresh" });
        return;
      }
      await json(route, record ? { book: record.book } : {}, record ? 200 : 404);
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

    if (path.startsWith("/api/learning/sessions/")) {
      const sessionId = decodeURIComponent(path.split("/").pop() || "");
      await json(route, {
        session_id: sessionId,
        messages: sessionMessages.get(sessionId) ?? [],
        active_turns: [],
      });
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

    if (path === "/api/learning/tutor-agents/agent-1") {
      await json(route, {
        bot_id: "agent-1",
        name: "Calculus Tutor",
        running: true,
        persona: "No persona returned.",
      });
      return;
    }

    if (path === "/api/learning/tutor-agents/agent-1/history") {
      await json(route, { messages: tutorHistory });
      return;
    }

    if (path === "/api/learning/tutor-agents/agent-1/turns/active") {
      await json(route, { active_turns: [] });
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
    createdBooks,
    tutorAgentMessages,
    knowledgeUploads,
    defaultKnowledgeUpdates,
    assetRequests,
    studyTasks,
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

  test("shows progress and retries a failed Learn turn", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=chat");
    await page.getByPlaceholder("How can I help you today?").fill("force retry once with context");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Learning stream error: Forced retry test failure.")).toBeVisible();
    await page.getByRole("button", { name: "Retry" }).click();

    await expect(page.getByText("Checking learning context.").first()).toBeVisible();
    await expect(page.getByText("Notebook-ready answer.").first()).toBeVisible();
    expect(learning.startedTurns.filter((turn) => turn.content === "force retry once with context")).toHaveLength(2);
  });

  test("exports notebook records through the ZAKI Learn notebook view", async ({ page }) => {
    await mockLearning(page);

    await page.goto("/learn?view=notebooks");

    await expect(page.getByRole("heading", { name: "Your notebooks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Newton Notes" })).toBeVisible();
    await expect(page.getByText("Momentum lesson")).toBeVisible();
    await expect(page.getByRole("button", { name: "Summarize" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Make quiz" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Flashcards" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Weekly review" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Weak topics" })).toBeVisible();

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

    await page.getByRole("button", { name: "Make quiz" }).click();
    await expect(page).toHaveURL(/view=chat/);
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      /Create an answer-keyed quiz from this notebook/,
    );
    await expect(page.getByRole("button", { name: "Learning capability menu" })).toContainText(
      "Quiz Generation",
    );
  });

  test("scopes notebook draft handoff to the signed-in user", async ({ page }) => {
    await mockLearning(page);
    await page.addInitScript(() => {
      const createdAt = new Date().toISOString();
      window.localStorage.setItem(
        "zaki.learn.pendingDraft",
        JSON.stringify({ content: "legacy unscoped draft", createdAt }),
      );
      window.localStorage.setItem(
        "zaki.learn.pendingDraft:999",
        JSON.stringify({ content: "other user notebook draft", createdAt }),
      );
      window.localStorage.setItem(
        "zaki.learn.pendingDraft:123",
        JSON.stringify({ content: "current user notebook draft", createdAt }),
      );
    });

    await page.goto("/learn?view=chat");

    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      "current user notebook draft",
    );
    await expect(
      page.evaluate(() => window.localStorage.getItem("zaki.learn.pendingDraft")),
    ).resolves.toBeNull();
    await expect(
      page.evaluate(() => window.localStorage.getItem("zaki.learn.pendingDraft:123")),
    ).resolves.toBeNull();
    await expect(
      page.evaluate(() => window.localStorage.getItem("zaki.learn.pendingDraft:999")),
    ).resolves.toContain("other user notebook draft");
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

    await page.getByRole("button", { name: "Save to Notebook", exact: true }).click();
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

  test("guides a student from study setup to next learning actions", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=chat");
    await expect(page.getByText("Set up your study loop")).toBeVisible();
    await expect(page.getByRole("button", { name: "Understand a topic" })).toBeVisible();
    await page.getByRole("button", { name: "Solve a problem" }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/Solve this step by step/);
    await expect(page.getByRole("button", { name: "Learning capability menu" })).toContainText(
      "Deep Solve",
    );
    await page.reload();
    await expect(page.getByText("Set up your study loop")).toBeVisible();
    await page.getByRole("button", { name: "Make study plan" }).click();
    await expect(page.getByText("Study setup")).toBeVisible();
    await page.getByLabel("Course").fill("Calculus II");
    await page.getByLabel("Exam date").fill("2026-06-15");
    await page.getByRole("textbox", { name: "Topics", exact: true }).fill("limits, derivatives, integrals, series");
    await page.getByLabel("Goal").fill("Score at least 90%");
    await page.getByLabel("Weak topics").fill("series and integration by parts");
    await page.getByLabel("Hours/week").fill("6");
    await page.getByLabel("Study difficulty").selectOption("hard");
    await page.getByLabel("Study style").selectOption("practice");
    await page.getByRole("button", { name: /Build study plan/i }).click();

    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/Calculus II/);
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/limits, derivatives/);
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/practice/);
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => learning.startedTurns.length).toBe(1);
    expect(learning.startedTurns[0]).toMatchObject({
      capability: null,
      content: expect.stringContaining("Calculus II"),
    });
    await expect(page.getByText("Notebook-ready answer.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Practice similar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Make quiz/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate flashcards/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Turn into lesson\/book/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add to study plan/i })).toBeVisible();

    await page.getByRole("button", { name: /Make quiz/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      /Create a focused quiz/,
    );
    await expect(page.getByRole("button", { name: "Learning capability menu" })).toContainText(
      "Quiz Generation",
    );
    await expect(page.getByLabel("Difficulty")).toHaveValue("hard");

    await page.getByRole("button", { name: /Explain simpler/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      /Explain this more simply/,
    );

    await page.getByRole("button", { name: /Generate flashcards/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      /Generate flashcards/,
    );

    await page.getByRole("button", { name: /Turn into lesson\/book/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(
      /structured lesson\/book outline/,
    );

    await page.getByRole("button", { name: /Add to study plan/i }).click();
    await expect.poll(() => learning.studyTasks.length).toBe(2);
    expect(learning.studyTasks[1]).toMatchObject({
      kind: "review",
      title: expect.stringContaining("Review:"),
      source: expect.objectContaining({
        messageId: expect.any(String),
        excerpt: expect.stringContaining("Notebook-ready answer"),
      }),
    });
  });

  test("creates a book proposal through the hosted book workflow", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=books");
    await page.getByRole("button", { name: /New book/i }).first().click();
    await page
      .getByPlaceholder("e.g. Build intuition for transformer attention with derivations and exercises.")
      .fill("Build a compact calculus foundations book.");
    await page.getByLabel("Book language").selectOption("en");
    await page.getByRole("button", { name: /Generate proposal/i }).click();

    await expect.poll(() => learning.createdBooks.length).toBe(1);
    expect(learning.createdBooks[0].request).toMatchObject({
      user_intent: "Build a compact calculus foundations book.",
      language: "en",
    });
    await expect(page.getByRole("button", { name: /Confirm proposal/i })).toBeVisible();
  });

  test("routes TutorBot chat, preserves returned history, and exposes hosted channels", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=agents");
    await page.getByRole("button", { name: /Calculus Tutor/i }).first().click();
    await expect(page.getByText("Tutor chat")).toBeVisible();
    await expect(page.getByText("Past tutor message.")).toBeVisible();

    await page.getByPlaceholder("Ask this tutor...").fill("Help me plan a derivative lesson.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect.poll(() => learning.tutorAgentMessages.length).toBe(1);
    expect(learning.tutorAgentMessages[0]).toMatchObject({
      content: "Help me plan a derivative lesson.",
      chat_id: "web",
    });
    await expect(page.getByText("Tutor reply through the hosted gateway.")).toBeVisible();

    await page.goto("/learn?view=space");
    await page.goto("/learn?view=agents");
    await expect(page.getByText("Tutor reply through the hosted gateway.")).toBeVisible();
    await page.getByRole("button", { name: "Back to bots" }).click();
    await page.getByRole("button", { name: /Calculus Tutor/i }).first().click();
    await expect(page.getByText("Help me plan a derivative lesson.")).toBeVisible();
    await expect(page.getByText("Tutor reply through the hosted gateway.")).toBeVisible();

    await page.getByRole("button", { name: "Back to bots" }).click();
    await page.getByRole("button", { name: /^Channels$/ }).click();
    for (const channel of ["WhatsApp", "Telegram", "Discord", "Email", "Slack"]) {
      await expect(page.getByRole("button", { name: channel })).toBeVisible();
    }
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
    await expect(page.getByText("Sources").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Fourier transform reference" })).toBeVisible();
    await expect(page.getByText("Unsafe source")).toBeVisible();
    await expect(page.getByRole("link", { name: "Unsafe source" })).toHaveCount(0);
    await page.getByRole("button", { name: /Check my answer/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/Check my answer/);
    await expect(page.getByRole("button", { name: "Learning capability menu" })).toContainText(
      "Deep Solve",
    );
    await page.getByRole("button", { name: /Regenerate clearer/i }).click();
    await expect(page.getByPlaceholder("How can I help you today?")).toHaveValue(/stricter quality controls/);
    await expect(page.getByRole("button", { name: "Learning capability menu" })).toContainText(
      "Deep Research",
    );
    let downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download Markdown/i }).click();
    let download = await downloadPromise;
    let path = await download.path();
    let markdown = await readFile(String(path), "utf8");
    expect(markdown).toContain("### Research Outline");
    expect(markdown).toContain("Sources:");
    expect(markdown).toContain("Fourier transform reference: https://example.com/fourier");
    expect(markdown).not.toContain("javascript:alert");
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
    await expect(page.getByRole("link", { name: /Open/i }).first()).toHaveAttribute(
      "href",
      /\/api\/learning\/outputs\/math\/frame\.gif/,
    );
    await expect(page.getByRole("link", { name: /Download/i }).first()).toHaveAttribute(
      "download",
      "frame.gif",
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

  test("renders video math artifacts with preview and download wiring", async ({ page }) => {
    const learning = await mockLearning(page);

    await page.goto("/learn?view=math-animation");
    await page.getByLabel("Output").selectOption("video");
    await page.getByLabel("Quality").selectOption("low");
    await page
      .getByPlaceholder("Describe the math animation or storyboard you want...")
      .fill("Animate the derivative of x squared.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect.poll(() => learning.startedTurns.length).toBe(1);
    expect(learning.startedTurns[0]).toMatchObject({
      type: "start_turn",
      capability: "math_animator",
      config: {
        output_mode: "video",
        quality: "low",
      },
    });
    await expect(page.getByText("Video preview")).toBeVisible();
    await expect(page.locator("video").first()).toHaveAttribute(
      "src",
      /\/api\/learning\/outputs\/math\/animation\.mp4/,
    );
    await expect(page.getByRole("link", { name: /Open/i }).first()).toHaveAttribute(
      "href",
      /\/api\/learning\/outputs\/math\/animation\.mp4/,
    );
    await expect(page.getByRole("link", { name: /Download/i }).first()).toHaveAttribute(
      "download",
      "animation.mp4",
    );
  });
});
