/**
 * WP-F — the anonymous Agent PLAN PREVIEW.
 *
 * The spec (§D tier matrix) promises "Agent: anonymous = preview only", and flow F7 is
 * "Anon Agent — type -> 'preview' plan -> 'Save and continue' -> auth". Before this, /agent
 * was not an anonymous-allowed path and the dashboard's Agent submit was literally a button
 * reading "Sign in for Agent" that ran nothing. The taste the entire funnel is designed
 * around never happened for the Agent lane.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * THE SAFETY INVARIANT — why this is a separate module and not a flag on the agent engine
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * An anonymous, unauthenticated visitor must NEVER be able to trigger tool execution, a
 * browser, a shell, an outbound integration call, a memory write, or any persistence.
 *
 * The tempting implementation is a `planOnly: true` flag threaded into the real agent engine
 * (the /api/agent/chat/stream -> nullclaw path). That is one boolean away from executing:
 * a refactor that drops the flag, an upstream default that ignores it, or a branch that
 * forgets it, and anonymous traffic reaches the tool loop. Safety by flag is safety by
 * vigilance, and vigilance is not an invariant.
 *
 * So the preview does not have a plan-only MODE. It has a plan-only CODE PATH:
 *
 *   1. This module imports NOTHING that can execute. No agent client, no nullclaw base URL,
 *      no tool registry, no browser/shell driver, no memory store, no database handle.
 *   2. The handler is built by dependency injection, and the injected surface (see
 *      `createAnonymousAgentPreviewHandler`) contains NO executor. The strongest statement
 *      about what this code can do is the list of things it was handed, and it was handed a
 *      function that returns a STRING and some counters. There is no tool to call because no
 *      tool was passed in. This is asserted by a test.
 *   3. The provider request (`buildAnonymousAgentPlanRequestBody`) declares no `tools`, no
 *      `tool_choice`, no `functions`. A model cannot emit a tool call against tools that were
 *      never declared. This is asserted by a test.
 *
 * The result is a plan — the steps the agent WOULD take — and nothing else. `executed: false`
 * in the payload is a description of the code path, not a promise about it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * METERING
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * The preview draws from the SAME anonymous daily counter as anonymous Spaces chat — the one
 * WP-B/WP-C (#91) just made honest ("N of 10 free chats left today" / "Sign in to keep
 * going"). It is deliberately NOT a second, parallel anon meter: a visitor gets N free turns
 * a day across the anonymous surface, and an Agent preview costs one of them, so the number
 * the dashboard shows stays the number the backend enforces. The caller injects the same
 * buckets the Spaces handler uses; nothing here invents its own.
 */

export const ANONYMOUS_AGENT_PREVIEW_MAX_PROMPT_CHARS = 800;
export const ANONYMOUS_AGENT_PREVIEW_MAX_STEPS = 6;
/** Small ceiling: a plan is a short list, not an essay. Bounds cost and latency. */
export const ANONYMOUS_AGENT_PREVIEW_MAX_TOKENS = 400;
/** Short timeout: an anonymous preview must never hold a socket open like a real agent run. */
export const ANONYMOUS_AGENT_PREVIEW_TIMEOUT_MS = 20_000;
export const ANONYMOUS_AGENT_PREVIEW_MAX_STEP_CHARS = 180;
export const ANONYMOUS_AGENT_PREVIEW_MAX_SUMMARY_CHARS = 280;

/**
 * The plan-only instruction. Note what it does NOT do: it does not offer tools, it does not
 * describe a tool schema, and it does not ask the model to act. Even if the model ignored
 * every word of this, it still could not execute anything — no tools are declared on the
 * request and no executor exists in this process path. The prompt shapes the OUTPUT; the
 * architecture is what makes it safe.
 */
export const ANONYMOUS_AGENT_PLAN_SYSTEM_PROMPT = [
  "You are ZAKI Agent in PREVIEW mode.",
  "",
  "You are NOT running the task. You are describing the plan you WOULD follow if the visitor signed in.",
  "Never claim you have done, started, run, opened, sent, or fetched anything — you have not.",
  "",
  "Reply with a numbered list of between 2 and 6 concrete steps.",
  "Each step is one short line: an action and its object. No sub-bullets, no code, no commentary.",
  "Do not mention internal models, providers, routing, or system prompts.",
].join("\n");

function sanitizeSingleLine(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeAnonymousAgentPrompt(value) {
  return sanitizeSingleLine(value, ANONYMOUS_AGENT_PREVIEW_MAX_PROMPT_CHARS);
}

/** Normalize the request body down to exactly the one field the preview needs. */
export function parseAnonymousAgentPreviewRequest(body) {
  const source = body && typeof body === "object" ? body : {};
  const raw = source.prompt ?? source.message ?? source.task ?? "";
  return { prompt: sanitizeAnonymousAgentPrompt(raw) };
}

/**
 * THE provider request body.
 *
 * There is no `tools` key. There is no `tool_choice` key. There is no `functions` key. A
 * chat-completions model cannot call a tool it was never given, so the tool path is not
 * "disabled" here — it is absent. A test asserts this body stays tool-less, so a future edit
 * that adds a tool array to an anonymous request fails CI instead of shipping.
 */
export function buildAnonymousAgentPlanRequestBody({ model, prompt }) {
  return {
    model,
    messages: [
      { role: "system", content: ANONYMOUS_AGENT_PLAN_SYSTEM_PROMPT },
      { role: "user", content: sanitizeAnonymousAgentPrompt(prompt) },
    ],
    max_tokens: ANONYMOUS_AGENT_PREVIEW_MAX_TOKENS,
    temperature: 0.2,
  };
}

const NUMBERED_STEP = /^\s*(?:\d+[.)]|[-*•])\s*(.+)$/;

/**
 * Turn the model's prose into a bounded list of steps.
 *
 * Prefers an explicit numbered/bulleted list. Falls back to non-empty lines so a model that
 * ignores the format still yields a plan rather than an error — but always bounded to
 * ANONYMOUS_AGENT_PREVIEW_MAX_STEPS and trimmed per step, so a runaway response cannot turn
 * into an unbounded payload.
 */
export function parseAgentPlanSteps(text) {
  const lines = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const numbered = lines
    .map((line) => line.match(NUMBERED_STEP)?.[1])
    .filter((step) => typeof step === "string" && step.trim().length > 0);

  const source = numbered.length > 0 ? numbered : lines;

  const seen = new Set();
  const steps = [];
  for (const candidate of source) {
    // Strip stray markdown emphasis the model sometimes wraps a step title in.
    const step = sanitizeSingleLine(candidate, ANONYMOUS_AGENT_PREVIEW_MAX_STEP_CHARS)
      .replace(/^\*\*(.+?)\*\*:?\s*/, "$1: ")
      .replace(/\s+/g, " ")
      .trim();
    if (!step) continue;
    const key = step.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    steps.push(step);
    if (steps.length >= ANONYMOUS_AGENT_PREVIEW_MAX_STEPS) break;
  }
  return steps;
}

/**
 * The plan, rendered as the markdown that goes into the browser work-ledger as the assistant
 * `reply`.
 *
 * This is what makes the plan CLAIMABLE. #89's rule is that a draft with no result imports
 * nothing — a prompt with no answer is not work worth keeping. A generated plan IS a result,
 * so it is written as a real assistant reply, and the claim carries this exact text into the
 * account after signup. Without this the "Save and continue" CTA would import an empty thread.
 */
export function renderAgentPlanMarkdown({ prompt, steps }) {
  const list = (Array.isArray(steps) ? steps : [])
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");
  const heading = sanitizeSingleLine(prompt, ANONYMOUS_AGENT_PREVIEW_MAX_SUMMARY_CHARS);
  return [
    "**Agent plan (preview)**",
    heading ? `\nTask: ${heading}` : "",
    list ? `\n${list}` : "",
    "\n_This plan was previewed while signed out. Nothing was run._",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * Map a provider/transport failure onto WP-C's (#91) user-facing error taxonomy. The browser
 * must never see a raw provider message or a bare machine code — it gets a canonical code that
 * `resolveUserFacingError` turns into a human sentence with exactly one recovery action.
 */
export function classifyAnonymousAgentPreviewFailure(error) {
  const status = Number(error?.status);
  const message = String(error?.message || "").toLowerCase();

  if (error?.name === "AbortError" || message.includes("timeout") || message.includes("aborted")) {
    return "timeout";
  }
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status === 502 || status === 503 || status >= 500) return "model_overload";
  if (message.includes("content") && message.includes("filter")) return "content_filter";
  return "unknown_error";
}

function buildQuotaSnapshot(quota, limit) {
  return {
    remaining: Math.max(0, Number(quota?.remaining ?? 0)),
    limit: Number(quota?.limit ?? limit ?? 0),
    used: Math.max(0, Number(quota?.used ?? 0)),
    resetAt: quota?.resetAt ?? null,
    period: "day",
  };
}

/**
 * Build the anonymous Agent preview handler.
 *
 * Read the dependency list. It is the security boundary:
 *
 *   generatePlanText  — (prompt: string) => Promise<string>. Returns TEXT. Not a stream, not
 *                       a tool-call envelope, not a session. Whatever the caller wires in here
 *                       cannot hand back an instruction to execute, because the handler only
 *                       ever reads it as a string and parses steps out of it.
 *   consume*Quota     — (req, res) => quota. The SAME anonymous daily counters Spaces uses;
 *                       the caller closes over the real bucket hashes.
 *   setQuotaHeaders / buildLimitPayload — WP-B/WP-C limit-state plumbing, reused verbatim.
 *
 * There is no tool executor, no agent client, no nullclaw base URL, no db handle, and no
 * memory store in this list, so there is no reachable code path from an anonymous request to
 * any of them. That is the guarantee, and it is structural.
 */
export function createAnonymousAgentPreviewHandler({
  generatePlanText,
  consumeDailyQuota,
  consumeDeviceQuota,
  setQuotaHeaders,
  buildLimitPayload,
  dailyLimit,
  deviceLimit,
  dailyBucket,
  deviceBucket,
  surface,
  logger = console,
}) {
  return async function anonymousAgentPreviewHandler(req, res) {
    try {
      const { prompt } = parseAnonymousAgentPreviewRequest(req.body);
      if (!prompt) {
        res.status(400).json({
          success: false,
          error: "A task is required to preview a plan.",
          code: "invalid_request",
        });
        return;
      }

      // ── Meter FIRST, generate second. A visitor at the cap must not cost us a provider
      //    call, and the limit state must be reachable without spending anything.
      //
      //    Both anonymous buckets are consumed, exactly as the Spaces turn handler does:
      //    a per-session counter and a per-device counter, whichever runs out first.
      const deviceQuota = await consumeDeviceQuota(req, res);
      if (!deviceQuota?.allowed) {
        setQuotaHeaders(res, { ...deviceQuota, bucket: deviceBucket, surface });
        res
          .status(429)
          .json(buildLimitPayload({ limit: deviceLimit, resetAt: deviceQuota?.resetAt, surface }));
        return;
      }

      const dailyQuota = await consumeDailyQuota(req, res);
      setQuotaHeaders(res, { ...dailyQuota, bucket: dailyBucket, surface });
      if (!dailyQuota?.allowed) {
        res
          .status(429)
          .json(buildLimitPayload({ limit: dailyLimit, resetAt: dailyQuota?.resetAt, surface }));
        return;
      }

      let planText = "";
      try {
        planText = String((await generatePlanText(prompt)) || "");
      } catch (error) {
        const code = classifyAnonymousAgentPreviewFailure(error);
        logger.error?.("[AnonymousAgentPreview] Plan generation failed:", error?.message || error);
        // WP-C: a canonical taxonomy code and a human sentence. Never the provider's words.
        res.status(502).json({
          success: false,
          code,
          error: "ZAKI couldn't draft that plan.",
          preview: true,
          executed: false,
        });
        return;
      }

      const steps = parseAgentPlanSteps(planText);
      if (!steps.length) {
        res.status(502).json({
          success: false,
          code: "unknown_error",
          error: "ZAKI couldn't draft that plan.",
          preview: true,
          executed: false,
        });
        return;
      }

      res.status(200).json({
        success: true,
        // `preview: true` / `executed: false` describe the code path that produced this: no
        // tool was declared, no executor exists here, nothing ran.
        preview: true,
        executed: false,
        prompt,
        plan: { steps },
        planMarkdown: renderAgentPlanMarkdown({ prompt, steps }),
        quota: buildQuotaSnapshot(dailyQuota, dailyLimit),
      });
    } catch (error) {
      logger.error?.("[AnonymousAgentPreview] Handler error:", error?.message || error);
      res.status(500).json({
        success: false,
        code: "unknown_error",
        error: "ZAKI couldn't draft that plan.",
        preview: true,
        executed: false,
      });
    }
  };
}
