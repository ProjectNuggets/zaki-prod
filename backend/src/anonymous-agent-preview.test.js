import { describe, expect, it, jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANONYMOUS_AGENT_PLAN_SYSTEM_PROMPT,
  ANONYMOUS_AGENT_PREVIEW_MAX_STEPS,
  ANONYMOUS_AGENT_PREVIEW_MAX_TOKENS,
  buildAnonymousAgentPlanRequestBody,
  classifyAnonymousAgentPreviewFailure,
  createAnonymousAgentPreviewHandler,
  parseAgentPlanSteps,
  parseAnonymousAgentPreviewRequest,
  renderAgentPlanMarkdown,
} from "./anonymous-agent-preview.js";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Minimal express-ish res double: records status/json/headers. */
function createRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    setHeader(key, value) {
      res.headers[key] = value;
    },
  };
  return res;
}

const DAILY_BUCKET = "anonymous_spaces";
const DEVICE_BUCKET = "anonymous_spaces_device";
const DAILY_LIMIT = 10;
const DEVICE_LIMIT = 20;

/**
 * Wire the handler the way index.js does, but with the counters and the generator faked.
 * `deps` overrides let each test drive one condition.
 */
function buildHandler(overrides = {}) {
  const calls = {
    generate: [],
    daily: 0,
    device: 0,
    headers: [],
  };

  const deps = {
    generatePlanText: jest.fn(async (prompt) => {
      calls.generate.push(prompt);
      return "1. Read the brief\n2. Draft the outline\n3. Send it back";
    }),
    consumeDailyQuota: jest.fn(async () => {
      calls.daily += 1;
      return { allowed: true, remaining: 7, limit: DAILY_LIMIT, used: 3, resetAt: "2026-07-15T00:00:00.000Z" };
    }),
    consumeDeviceQuota: jest.fn(async () => {
      calls.device += 1;
      return { allowed: true, remaining: 17, limit: DEVICE_LIMIT, used: 3, resetAt: "2026-07-15T00:00:00.000Z" };
    }),
    setQuotaHeaders: jest.fn((res, quota) => {
      calls.headers.push(quota);
    }),
    buildLimitPayload: jest.fn(({ limit, resetAt }) => ({
      error: "You reached today's limit.",
      message: "You reached today's limit.",
      code: "daily_limit_reached",
      limit,
      remaining: 0,
      resetAt,
      period: "day",
    })),
    dailyLimit: DAILY_LIMIT,
    deviceLimit: DEVICE_LIMIT,
    dailyBucket: DAILY_BUCKET,
    deviceBucket: DEVICE_BUCKET,
    surface: "app_chat",
    logger: { error: jest.fn() },
    ...overrides,
  };

  return { handler: createAnonymousAgentPreviewHandler(deps), deps, calls };
}

describe("WP-F anonymous Agent preview — safety by construction", () => {
  // (e) No tool/side-effect execution is reachable unauthenticated.
  //
  // The dependency surface IS the security boundary. If a future edit injects an executor,
  // a db handle, or an agent client into this handler, that is exactly the regression this
  // asserts against — the preview is only safe while the things it was handed cannot execute.
  it("the handler's dependency surface contains no executor, agent client, or persistence", () => {
    const { deps } = buildHandler();
    const injected = Object.keys(deps);

    const FORBIDDEN = [
      "tools",
      "tool",
      "executeTool",
      "toolRegistry",
      "agentClient",
      "nullclaw",
      "browser",
      "shell",
      "memory",
      "db",
      "dbQuery",
      "dbGet",
      "persist",
      "store",
    ];
    const smuggled = injected.filter((key) =>
      FORBIDDEN.some((banned) => key.toLowerCase().includes(banned.toLowerCase()))
    );
    expect(smuggled).toEqual([]);

    // What it IS handed: a text generator, counters, and limit-state plumbing. Nothing else.
    expect(injected.sort()).toEqual(
      [
        "buildLimitPayload",
        "consumeDailyQuota",
        "consumeDeviceQuota",
        "dailyBucket",
        "dailyLimit",
        "deviceBucket",
        "deviceLimit",
        "generatePlanText",
        "logger",
        "setQuotaHeaders",
        "surface",
      ].sort()
    );
  });

  // The model cannot call a tool it was never given. This locks the request body tool-less.
  it("the provider request declares NO tools, tool_choice, or functions", () => {
    const body = buildAnonymousAgentPlanRequestBody({ model: "some-model", prompt: "ship it" });

    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
    expect(body).not.toHaveProperty("functions");
    expect(body).not.toHaveProperty("function_call");

    // Whatever the body grows into, it must never gain a tool-shaped key.
    const keys = Object.keys(body);
    expect(keys.filter((k) => /tool|function/i.test(k))).toEqual([]);

    // And it stays bounded.
    expect(body.max_tokens).toBe(ANONYMOUS_AGENT_PREVIEW_MAX_TOKENS);
    expect(body.max_tokens).toBeLessThanOrEqual(400);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].content).toBe(ANONYMOUS_AGENT_PLAN_SYSTEM_PROMPT);
  });

  // The module must not be able to reach the executable world even by import.
  it("the preview module imports nothing that can execute", () => {
    const source = fs.readFileSync(path.join(MODULE_DIR, "anonymous-agent-preview.js"), "utf8");
    const imports = [...source.matchAll(/^\s*import\s.+from\s+["'](.+)["'];?\s*$/gm)].map((m) => m[1]);

    // Zero imports: the module is pure. Nothing to reach.
    expect(imports).toEqual([]);

    // Belt and braces: no reference to the agent/tool world anywhere in the file body.
    // (Comments explaining the invariant are allowed to name them, so strip comments first.)
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/nullclaw/i);
    expect(code).not.toMatch(/requireAgentContext/);
    expect(code).not.toMatch(/stream-chat/);
    expect(code).not.toMatch(/executeTool|toolRegistry|tool_call/i);
  });

  // (a) An anon submits an Agent prompt and receives a PLAN, not a run.
  it("returns a plan and never executes: preview=true, executed=false", async () => {
    const { handler, calls } = buildHandler();
    const res = createRes();
    await handler({ body: { prompt: "Summarise my inbox and reply to the urgent ones" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preview).toBe(true);
    expect(res.body.executed).toBe(false);
    expect(res.body.plan.steps).toEqual([
      "Read the brief",
      "Draft the outline",
      "Send it back",
    ]);

    // The only thing that ran was a text completion.
    expect(calls.generate).toHaveLength(1);

    // No run artefacts anywhere in the response: no tool calls, no session, no thread.
    expect(res.body).not.toHaveProperty("toolCalls");
    expect(res.body).not.toHaveProperty("sessionKey");
    expect(res.body).not.toHaveProperty("threadId");
  });
});

describe("WP-F anonymous Agent preview — metering (the ONE anon daily counter)", () => {
  // (b) The preview decrements the anon daily counter — the same one Spaces uses.
  it("consumes the SAME anonymous daily + device buckets Spaces consumes", async () => {
    const { handler, deps, calls } = buildHandler();
    const res = createRes();
    await handler({ body: { prompt: "plan a launch" } }, res);

    expect(deps.consumeDeviceQuota).toHaveBeenCalledTimes(1);
    expect(deps.consumeDailyQuota).toHaveBeenCalledTimes(1);

    // The headers name the anonymous Spaces buckets — NOT some new agent-only meter.
    const buckets = calls.headers.map((h) => h.bucket);
    expect(buckets).toContain(DAILY_BUCKET);
    expect(buckets).not.toContain("anonymous_agent");

    // The remaining count is reported back so the UI can say "N of 10 free chats left today".
    expect(res.body.quota).toEqual({
      remaining: 7,
      limit: 10,
      used: 3,
      resetAt: "2026-07-15T00:00:00.000Z",
      period: "day",
    });
  });

  // (b) At the cap: the #91 limit state, not a toast. The code IS the one PaywallCard maps.
  it("at the daily cap returns 429 daily_limit_reached (the limit state, not a toast)", async () => {
    const { handler, deps } = buildHandler({
      consumeDailyQuota: jest.fn(async () => ({
        allowed: false,
        remaining: 0,
        limit: DAILY_LIMIT,
        used: DAILY_LIMIT,
        resetAt: "2026-07-15T00:00:00.000Z",
      })),
    });
    const res = createRes();
    await handler({ body: { prompt: "plan a launch" } }, res);

    expect(res.statusCode).toBe(429);
    // classifyBillingDenial() maps daily_limit_reached -> "limit_reached" -> PaywallCard.
    expect(res.body.code).toBe("daily_limit_reached");
    expect(res.body.limit).toBe(DAILY_LIMIT);
    expect(res.body.resetAt).toBe("2026-07-15T00:00:00.000Z");

    // Capped visitors cost us NOTHING: the provider is never called.
    expect(deps.generatePlanText).not.toHaveBeenCalled();
  });

  it("at the device cap returns 429 without spending a provider call", async () => {
    const { handler, deps } = buildHandler({
      consumeDeviceQuota: jest.fn(async () => ({
        allowed: false,
        remaining: 0,
        limit: DEVICE_LIMIT,
        resetAt: "2026-07-15T00:00:00.000Z",
      })),
    });
    const res = createRes();
    await handler({ body: { prompt: "plan a launch" } }, res);

    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe("daily_limit_reached");
    expect(deps.generatePlanText).not.toHaveBeenCalled();
    // The daily counter is not touched when the device bucket already said no.
    expect(deps.consumeDailyQuota).not.toHaveBeenCalled();
  });

  it("meters BEFORE generating, so a capped visitor cannot burn tokens", async () => {
    const order = [];
    const { handler } = buildHandler({
      consumeDeviceQuota: jest.fn(async () => {
        order.push("device");
        return { allowed: true, remaining: 5, limit: DEVICE_LIMIT };
      }),
      consumeDailyQuota: jest.fn(async () => {
        order.push("daily");
        return { allowed: true, remaining: 5, limit: DAILY_LIMIT };
      }),
      generatePlanText: jest.fn(async () => {
        order.push("generate");
        return "1. Do the thing\n2. Do the other thing";
      }),
    });
    await handler({ body: { prompt: "plan a launch" } }, createRes());

    expect(order).toEqual(["device", "daily", "generate"]);
  });
});

describe("WP-F anonymous Agent preview — failure modes use the #91 taxonomy", () => {
  it("maps provider failures onto canonical taxonomy codes, never raw text", async () => {
    const providerError = new Error("Together says: upstream exploded, request id abc-123");
    providerError.status = 503;

    const { handler } = buildHandler({
      generatePlanText: jest.fn(async () => {
        throw providerError;
      }),
    });
    const res = createRes();
    await handler({ body: { prompt: "plan a launch" } }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe("model_overload");
    expect(res.body.executed).toBe(false);

    // The provider's words never reach the browser.
    expect(JSON.stringify(res.body)).not.toContain("Together");
    expect(JSON.stringify(res.body)).not.toContain("abc-123");
  });

  it.each([
    [{ status: 429 }, "rate_limited"],
    [{ status: 504 }, "timeout"],
    [{ status: 500 }, "model_overload"],
    [{ name: "AbortError" }, "timeout"],
    [{ message: "request timeout" }, "timeout"],
    [{ message: "boom" }, "unknown_error"],
  ])("classify(%p) -> %s", (error, expected) => {
    expect(classifyAnonymousAgentPreviewFailure(error)).toBe(expected);
  });

  it("rejects an empty prompt with a code, not a crash", async () => {
    const { handler, deps } = buildHandler();
    const res = createRes();
    await handler({ body: { prompt: "   " } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("invalid_request");
    // A bad request must not spend the visitor's daily allowance.
    expect(deps.consumeDailyQuota).not.toHaveBeenCalled();
    expect(deps.generatePlanText).not.toHaveBeenCalled();
  });

  it("an unparseable plan is an error, not an empty plan card", async () => {
    const { handler } = buildHandler({
      generatePlanText: jest.fn(async () => "   "),
    });
    const res = createRes();
    await handler({ body: { prompt: "plan a launch" } }, res);

    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe("unknown_error");
  });
});

describe("WP-F plan parsing + the claimable ledger reply", () => {
  it("parses numbered, bulleted, and bare-line plans", () => {
    expect(parseAgentPlanSteps("1. First\n2. Second\n3. Third")).toEqual([
      "First",
      "Second",
      "Third",
    ]);
    expect(parseAgentPlanSteps("- Alpha\n- Beta")).toEqual(["Alpha", "Beta"]);
    expect(parseAgentPlanSteps("Do this\nThen that")).toEqual(["Do this", "Then that"]);
  });

  it("bounds a runaway plan to MAX_STEPS and de-dupes", () => {
    const runaway = Array.from({ length: 40 }, (_, i) => `${i + 1}. Step ${i + 1}`).join("\n");
    expect(parseAgentPlanSteps(runaway)).toHaveLength(ANONYMOUS_AGENT_PREVIEW_MAX_STEPS);

    expect(parseAgentPlanSteps("1. Same\n2. Same\n3. Different")).toEqual(["Same", "Different"]);
  });

  it("truncates an over-long step rather than carrying unbounded text", () => {
    const [step] = parseAgentPlanSteps(`1. ${"x".repeat(5000)}`);
    expect(step.length).toBeLessThanOrEqual(180);
  });

  // (c) The plan must be a REAL result — #89 imports nothing for a draft with no reply.
  it("renders the plan as an assistant reply the claim can import", () => {
    const markdown = renderAgentPlanMarkdown({
      prompt: "Launch the newsletter",
      steps: ["Draft the copy", "Pick the send time"],
    });

    // Non-empty, carries the steps: this is what lands in the ledger's `reply`, which is
    // exactly what buildClaimTurns() requires to import (prompt AND reply).
    expect(markdown).toContain("Draft the copy");
    expect(markdown).toContain("Pick the send time");
    expect(markdown).toContain("Launch the newsletter");
    expect(markdown.trim()).not.toBe("");

    // It says plainly that nothing ran, so an imported plan can never read as a completed run.
    expect(markdown).toMatch(/nothing was run/i);
  });

  it("normalizes the request body's prompt field", () => {
    expect(parseAnonymousAgentPreviewRequest({ prompt: "  hello  world " })).toEqual({
      prompt: "hello world",
    });
    expect(parseAnonymousAgentPreviewRequest({ message: "from message" }).prompt).toBe("from message");
    expect(parseAnonymousAgentPreviewRequest(null).prompt).toBe("");
    // Bounded.
    expect(parseAnonymousAgentPreviewRequest({ prompt: "y".repeat(5000) }).prompt).toHaveLength(800);
  });
});
