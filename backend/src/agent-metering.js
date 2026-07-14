import { extractAgentTokenChunk } from "./agent-proxy-contract.js";
import {
  AGENT_RESERVE_UNITS_DEFAULT,
  resolveAgentReserveUnits,
} from "./agent-reserve-policy.js";
import { normalizeMeterAction } from "./meter-contract.js";

export { AGENT_RESERVE_UNITS_DEFAULT, resolveAgentReserveUnits };

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedText(value) {
  return String(value || "").trim();
}

function lowerText(value) {
  return normalizedText(value).toLowerCase();
}

function numericByteValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function encodedBase64ByteValue(value) {
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/\s/g, "");
  if (!normalized) return 0;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export function estimateAgentPayloadStorageBytes(payload = {}) {
  if (!isPlainObject(payload)) return 0;
  let total = 0;
  const attachments = []
    .concat(Array.isArray(payload.attachments) ? payload.attachments : [])
    .concat(Array.isArray(payload.files) ? payload.files : [])
    .concat(Array.isArray(payload.uploads) ? payload.uploads : []);

  for (const item of attachments) {
    if (!isPlainObject(item)) continue;
    const explicitBytes = Math.max(
      numericByteValue(item.bytes),
      numericByteValue(item.size),
      numericByteValue(item.storageBytes)
    );
    let encodedBytes = 0;
    if (typeof item.content_b64 === "string") {
      encodedBytes = Math.max(encodedBytes, encodedBase64ByteValue(item.content_b64));
    }
    if (typeof item.contentBase64 === "string") {
      encodedBytes = Math.max(encodedBytes, encodedBase64ByteValue(item.contentBase64));
    }
    total += Math.max(explicitBytes, encodedBytes);
  }

  total += Math.max(
    numericByteValue(payload.storageBytes),
    numericByteValue(payload.fileBytes)
  );
  return Math.max(0, Math.floor(total));
}

function hasAttachmentPayload(payload = {}) {
  if (!isPlainObject(payload)) return false;
  if (estimateAgentPayloadStorageBytes(payload) > 0) return true;
  return ["attachments", "files", "uploads"].some((key) => {
    const value = payload[key];
    return Array.isArray(value) && value.length > 0;
  });
}

function hasSuperpowersMode(payload = {}) {
  if (!isPlainObject(payload)) return false;
  const modeFields = [
    payload.mode,
    payload.reasoningEffort,
    payload.reasoning_effort,
    payload.assistant_mode,
    payload.assistantMode,
  ].map(lowerText);
  return modeFields.some((value) => value === "superpowers");
}

function hasDeepMode(payload = {}, message = "") {
  if (!isPlainObject(payload)) return false;
  const modeFields = [
    payload.mode,
    payload.depth,
    payload.reasoning,
    payload.reasoningEffort,
    payload.reasoning_effort,
    payload.assistant_mode,
    payload.assistantMode,
  ].map(lowerText);
  if (modeFields.some((value) => ["deep", "deeper", "research", "xhigh", "extra_high"].includes(value))) {
    return true;
  }
  return /\b(deep\s+research|research\s+deeply|go\s+deeper|think\s+deeply)\b/i.test(message);
}

function hasToolMode(payload = {}, message = "") {
  if (!isPlainObject(payload)) return false;
  if (Array.isArray(payload.tools) && payload.tools.length > 0) return true;
  if (payload.webSearch === true || payload.webSearchEnabled === true) return true;
  const mode = lowerText(payload.mode);
  if (["execute", "tool", "tools", "web", "search", "browse", "query"].includes(mode)) {
    return true;
  }
  return /\b(search the web|web search|browse|use a tool|run a tool|call a tool)\b/i.test(message);
}

function hasVoiceMode(payload = {}) {
  if (!isPlainObject(payload)) return false;
  const modality = lowerText(payload.modality || payload.inputMode || payload.input_mode);
  return modality === "voice" || payload.voice === true || payload.audio === true;
}

function hasMemoryWriteIntent(message = "") {
  return /\b(remember that|remember this|save this|store this|note that|forget that|delete .*memory)\b/i.test(message);
}

function hasMemoryReadIntent(message = "") {
  return /\b(what do you remember|my memory|about me|know about me|given what you know|based on what you know)\b/i.test(message);
}

export const AGENT_ONBOARDING_FIRST_TURN_PROMPT =
  "Begin our first conversation now. Introduce yourself warmly in your own voice, then ask what we should call each other.";

export const AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT = Object.freeze({
  turn_kind: "onboarding_first_turn",
  authored_by: "backend",
  user_visible: false,
});

export function buildAgentUpstreamTurnContext(context = {}, onboardingFirstTurn = false) {
  const sanitized = isPlainObject(context) ? { ...context } : {};
  delete sanitized.turn_kind;
  delete sanitized.authored_by;
  delete sanitized.user_visible;
  if (onboardingFirstTurn) {
    Object.assign(sanitized, AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT);
  }
  return sanitized;
}

export function isUnmeteredAgentOnboardingTurn(payload = {}, message = "") {
  if (!isPlainObject(payload)) return false;
  const turnKind = normalizedText(payload.turnKind || payload.turn_kind);
  if (turnKind !== "onboarding_first_turn") return false;
  if (normalizedText(message) !== AGENT_ONBOARDING_FIRST_TURN_PROMPT) return false;
  if (lowerText(payload.spaceId || payload.space_id) !== "zaki-bot") return false;
  if (lowerText(payload.threadId || payload.thread_id) !== "main") return false;
  if (hasAttachmentPayload(payload) || hasVoiceMode(payload)) return false;
  if (hasSuperpowersMode(payload) || hasDeepMode(payload, message) || hasToolMode(payload, message)) {
    return false;
  }
  return true;
}

export function isVerifiedAgentOnboardingFirstTurn({
  onboardingOk = false,
  onboardingPayload = null,
  historyOk = false,
  historyStatus = null,
  historyPayload = null,
} = {}) {
  if (!onboardingOk || !isPlainObject(onboardingPayload)) return false;
  if (onboardingPayload.completed !== false) return false;

  if (!historyOk) {
    const errorCode = lowerText(historyPayload?.code || historyPayload?.error);
    return Number(historyStatus) === 404 && errorCode === "session_not_found";
  }
  if (!isPlainObject(historyPayload)) return false;
  for (const key of ["messages", "history", "items"]) {
    if (Array.isArray(historyPayload[key])) {
      return historyPayload[key].length === 0;
    }
  }
  return false;
}

export function classifyAgentMeterAction(payload = {}, message = "") {
  const text = normalizedText(message);
  if (hasAttachmentPayload(payload)) return "agent_file_upload";
  if (hasVoiceMode(payload)) return "agent_voice_turn";
  if (hasMemoryWriteIntent(text)) return "agent_memory_write";
  if (hasMemoryReadIntent(text)) return "agent_memory_read";
  // Superpowers check MUST precede deep-mode: a superpowers turn is a distinct
  // telemetry event; cost comes from billed subagent turns, not a flat surcharge.
  if (hasSuperpowersMode(payload)) return "agent_superpowers";
  if (hasDeepMode(payload, text)) return "agent_deep_research";
  if (hasToolMode(payload, text)) return "agent_tool_call";
  return "agent_turn";
}

export function estimateAgentMeterUnits(message = "", action = "agent_turn", payload = {}) {
  const normalizedAction = normalizeMeterAction(action);
  const tokenUnits = Math.max(0, normalizedText(message).length / 4000);
  const storageUnits = estimateAgentPayloadStorageBytes(payload) / (1024 * 1024) * 0.1;
  const baseUnits = normalizedAction.includes("memory_read")
    ? 0.25
    : normalizedAction.includes("memory_write")
      ? 0.5
      : normalizedAction.includes("file") || normalizedAction.includes("upload")
        ? 1
        : normalizedAction.includes("voice")
          ? 1.25
          // agent_superpowers: baseUnits = 3 (same as deep-research).
          // Real cost comes from billed subagent turns; this is telemetry/estimate only.
          : normalizedAction.includes("superpowers")
            ? 3
            : normalizedAction.includes("deep") || normalizedAction.includes("research")
              ? 3
              : normalizedAction.includes("tool") || normalizedAction.includes("search")
                ? 2
                : 1;
  return Math.round(Math.max(baseUnits, tokenUnits + storageUnits) * 10_000) / 10_000;
}

export function buildAgentMeterUsageFacts({
  action = "agent_turn",
  message = "",
  outputText = "",
  streamMetrics = null,
  status = "success",
  durationMs = 0,
  model = "nullalis-agent",
  payload = {},
} = {}) {
  const facts = { model };
  if (status !== "success") return facts;

  const normalizedAction = normalizeMeterAction(action);
  const inputChars = normalizedText(message).length;
  const outputChars = streamMetrics
    ? Number(streamMetrics.assistantOutputChars || 0)
    : normalizedText(outputText).length;
  const toolCallsFromStream = Number(streamMetrics?.toolCalls || 0);
  const storageBytes = estimateAgentPayloadStorageBytes(payload);

  facts.durationMs = Math.max(0, Math.floor(Number(durationMs || 0)));
  if (inputChars > 0) facts.inputTokens = Math.ceil(inputChars / 4);
  if (outputChars > 0) facts.outputTokens = Math.ceil(outputChars / 4);
  if (storageBytes > 0) facts.storageBytes = storageBytes;

  if (
    normalizedAction.includes("tool") ||
    normalizedAction.includes("deep") ||
    normalizedAction.includes("research") ||
    normalizedAction.includes("file") ||
    normalizedAction.includes("upload")
  ) {
    facts.toolCalls = Math.max(1, toolCallsFromStream);
  } else if (toolCallsFromStream > 0) {
    facts.toolCalls = toolCallsFromStream;
  }

  if (
    normalizedAction.includes("search") ||
    normalizedAction.includes("web") ||
    normalizedAction.includes("deep") ||
    normalizedAction.includes("research")
  ) {
    facts.externalApiCalls = 1;
  }

  if (normalizedAction.includes("deep") || normalizedAction.includes("research")) {
    facts.jobRuntimeMs = facts.durationMs;
  }

  return facts;
}

export function createAgentStreamMeterMetrics() {
  return {
    assistantOutputChars: 0,
    events: 0,
    sawError: false,
    toolCalls: 0,
    usageTokens: null,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
  };
}

export function readAgentSseMeterBlock(block = "") {
  const normalized = String(block || "").replace(/\r/g, "");
  const lines = normalized.split("\n");
  const dataLines = [];
  let eventType = "";

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return { eventType, chunk: "", sawError: false, toolCall: false, payload: null };
  }
  const payloadText = dataLines.join("\n").trim();
  if (!payloadText || payloadText === "[DONE]") {
    return { eventType, chunk: "", sawError: false, toolCall: false, payload: null };
  }

  try {
    const payload = JSON.parse(payloadText);
    const chunk = extractAgentTokenChunk(eventType, payload);
    const normalizedEvent = lowerText(eventType);
    const payloadType = lowerText(payload?.type || payload?.event);
    const sawError =
      normalizedEvent === "error" ||
      payloadType === "error" ||
      payload?.error === true ||
      typeof payload?.error === "string";
    const toolCall =
      normalizedEvent.startsWith("tool_") ||
      payloadType.startsWith("tool_") ||
      Boolean(payload?.tool || payload?.tool_name || payload?.toolName);
    return { eventType, chunk, sawError, toolCall, payload };
  } catch {
    return { eventType, chunk: "", sawError: false, toolCall: false, payload: null };
  }
}

function finiteMeterNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function updateAgentStreamMeterMetrics(metrics, block = "") {
  const target = metrics || createAgentStreamMeterMetrics();
  const parsed = readAgentSseMeterBlock(block);
  target.events += parsed.eventType || parsed.payload ? 1 : 0;
  if (parsed.chunk) {
    target.assistantOutputChars += parsed.chunk.length;
  }
  if (parsed.sawError) target.sawError = true;
  if (parsed.toolCall) target.toolCalls += 1;

  const isDoneFrame =
    lowerText(parsed.eventType) === "done" ||
    lowerText(parsed.payload?.type || parsed.payload?.event) === "done";
  if (isDoneFrame && isPlainObject(parsed.payload)) {
    const usageTokens = finiteMeterNumber(parsed.payload.usage_tokens);
    const inputTokens = finiteMeterNumber(parsed.payload.input_tokens);
    const outputTokens = finiteMeterNumber(parsed.payload.output_tokens);
    const costUsd = finiteMeterNumber(parsed.payload.cost_usd);
    if (usageTokens !== null) target.usageTokens = usageTokens;
    if (inputTokens !== null) target.inputTokens = inputTokens;
    if (outputTokens !== null) target.outputTokens = outputTokens;
    if (costUsd !== null) target.costUsd = costUsd;
  }
  return target;
}

export const DEFAULT_UNIT_COST_USD = 0.0015;

export function computeAgentSettleUnits({
  costUsd = null,
  message = "",
  action = "agent_turn",
  payload = {},
  env = process.env,
} = {}) {
  const rawUnitCost = Number(env?.ZAKI_UNIT_COST_USD);
  const unitCost = rawUnitCost > 0 ? rawUnitCost : DEFAULT_UNIT_COST_USD;
  // Real path requires a POSITIVE cost — symmetric with the engine's own done-frame gate
  // (it only emits cost_usd when totals_after.cost > 0). A null/absent/zero/non-finite cost
  // therefore falls back to the flat estimate: a turn is never billed as free on missing cost.
  const cost = Number(costUsd);
  if (Number.isFinite(cost) && cost > 0) {
    return { units: Math.round((cost / unitCost) * 10_000) / 10_000, costSource: "real" };
  }
  return { units: estimateAgentMeterUnits(message, action, payload), costSource: "estimate" };
}

// Agent turns run long (tool loops, deep research) → reserve high and hold long. The reserve is a
// ceiling, not a charge: settle reconciles to real cost (computeAgentSettleUnits) at the terminal
// path and refunds the rest. Mirrors the spaces wallet reserve, productId="agent".
export const AGENT_HOLD_EXPIRY_MS = 10 * 60 * 1000;
export const AGENT_PROVIDER = "nullalis";
export const AGENT_PROVIDER_MODEL = "kimi-k2.6";

/**
 * Reserve agent-chat units against the unit wallet (wallet = source of truth). Pure orchestration:
 * dependency-injected so index.js wires the real ledger + req/res, and tests can mock. Mirrors the
 * spaces reserve — fail-OPEN on any thrown error (a metering blip must never break the agent).
 *
 * @returns {Promise<{outcome:"allowed"|"denied"|"duplicate"|"unmetered", hold?:object|null, idempotencyKey?:string,
 *   action?:string, denial?:{status:number,error:string,message:string,remaining?:number}, error?:Error}>}
 *   - "allowed": reserve succeeded; `hold` is the NEW hold. The caller runs the billable engine turn.
 *   - "duplicate": the idempotency key matched an existing hold — either a true in-flight RETRY of the
 *      SAME turn (ledger `idempotent`, hold still reserved) or a REPLAY of an already-completed turn
 *      (ledger `idempotency_replayed`, terminal hold). In BOTH cases the caller MUST NOT run a fresh
 *      billable engine turn (that would be free/unmetered inference — the C1 exploit) and MUST NOT
 *      settle (the original reserve owns the hold). Caller responds 409 via `denial`.
 *   - "denied": out of units (or no identity); caller responds with `denial` via the denial-payload builder.
 *   - "unmetered": fail-open (DB error); caller allows the turn unmetered.
 */
// A duplicate reserve (in-flight retry OR replay of a completed turn). 409 Conflict, no engine run,
// no settle. The original reserve owns the hold and settles it once.
function buildDuplicateOutcome(action, idempotencyKey) {
  return {
    outcome: "duplicate",
    action,
    idempotencyKey,
    hold: null,
    denial: {
      status: 409,
      error: "duplicate_request",
      message: "This request was already processed. Retry with a new request id.",
    },
  };
}

function resolveIdentityPlanId(identity = {}) {
  return (
    identity.effectivePlanId ||
    identity.zakiUser?.effectivePlanId ||
    identity.zakiUser?.plan_tier ||
    "free"
  );
}

function buildInsufficientUnitsDenial(reserved = {}, requiredUnits) {
  const effectiveRemaining =
    typeof reserved.effectiveRemaining === "number"
      ? reserved.effectiveRemaining
      : typeof reserved.remaining === "number"
        ? reserved.remaining
        : 0;
  const constraint =
    reserved.constraint === "rolling" || reserved.constraint === "weekly"
      ? reserved.constraint
      : "unknown";
  const required = Number(reserved.requiredUnits || requiredUnits) || requiredUnits;
  return {
    status: 429,
    error: "insufficient_units",
    code: "insufficient_units",
    constraint,
    requiredUnits: required,
    effectiveRemaining,
    remaining: effectiveRemaining,
    weeklyRemaining:
      typeof reserved.weeklyRemaining === "number" ? reserved.weeklyRemaining : null,
    rollingRemaining:
      typeof reserved.rollingRemaining === "number" ? reserved.rollingRemaining : null,
    topupUnits: typeof reserved.topupUnits === "number" ? reserved.topupUnits : null,
    shortfall:
      typeof reserved.shortfall === "number"
        ? reserved.shortfall
        : Math.max(0, required - effectiveRemaining),
    message:
      constraint === "rolling"
        ? "Current Agent capacity is low. It refreshes as your 5-hour window clears."
        : "You're out of usage for now — it refreshes on your weekly cycle.",
  };
}

export async function reserveAgentChatUnits({
  identity,
  action = "agent_turn",
  idempotencyKey,
  env = process.env,
  reserveUnits,
  ensureWallet,
  deterministicGrantId,
} = {}) {
  // The reserve is a flat reserve-high ceiling (resolveAgentReserveUnits), not message-derived — the
  // settle reconciles to real cost. (Contrast the spaces reserve, which estimates from the message.)
  if (!identity || identity.type !== "user" || !identity.userId) {
    return {
      outcome: "denied",
      action,
      denial: {
        status: 401,
        error: "agent_meter_identity_required",
        message: "Agent usage requires an authenticated ZAKI user.",
      },
    };
  }
  const normalizedAction = normalizeMeterAction(action);
  const reservedUnits = resolveAgentReserveUnits(env);
  const grantId = deterministicGrantId(idempotencyKey);
  const expiresAt = new Date(Date.now() + AGENT_HOLD_EXPIRY_MS).toISOString();
  const reserveArgs = {
    userId: identity.userId,
    grantId,
    productId: "agent",
    action: normalizedAction,
    reservedUnits,
    reserveIdempotencyKey: idempotencyKey,
    expiresAt,
  };
  try {
    await ensureWallet({
      userId: identity.userId,
      planId: resolveIdentityPlanId(identity),
    });
    let reserved = await reserveUnits(reserveArgs);
    if (!reserved.ok && reserved.reason === "no_wallet") {
      await ensureWallet({
        userId: identity.userId,
        planId: resolveIdentityPlanId(identity),
      });
      reserved = await reserveUnits(reserveArgs);
    }
    // C1: a key matching an ALREADY-TERMINAL hold is a replay of a completed turn — the ledger refuses
    // it (idempotency_replayed). Treat it as a duplicate (do NOT run a fresh free turn), NOT as 429.
    if (!reserved.ok && reserved.reason === "idempotency_replayed") {
      return buildDuplicateOutcome(normalizedAction, idempotencyKey);
    }
    if (!reserved.ok) {
      return {
        outcome: "denied",
        action: normalizedAction,
        denial:
          reserved.reason === "insufficient_units"
            ? buildInsufficientUnitsDenial(reserved, reservedUnits)
            : {
                status: 429,
                error: reserved.reason || "agent_meter_denied",
                message: "Agent usage is not currently available.",
              },
      };
    }
    // C1: a true in-flight RETRY of the SAME turn (ledger `idempotent`, hold still reserved) must NOT
    // run a second billable engine turn either. Only a genuinely NEW reserve runs the engine.
    if (reserved.idempotent) {
      return buildDuplicateOutcome(normalizedAction, idempotencyKey);
    }
    return {
      outcome: "allowed",
      hold: reserved.hold,
      idempotencyKey,
      action: normalizedAction,
    };
  } catch (error) {
    // Fail-OPEN: the agent is core product; a metering DB blip must not break chat. Not charged; logged by caller.
    return { outcome: "unmetered", action: normalizedAction, error };
  }
}

/**
 * Settle (or release) an agent-chat hold against the unit wallet. Pure orchestration with injected
 * deps. Mirrors the spaces settle: settle on success/cancel (work consumed), release on upstream
 * failure (settledUnits 0 = full refund). Emits a zaki_usage_events row ONLY on a successful settle.
 * Caller owns the idempotent double-settle guard (`req.agentChatHold = null`).
 *
 * @returns {Promise<{ok:boolean}|null>} the settle result, or null on a swallowed error (sweeper reconciles).
 */
export async function settleAgentChatUnits({
  hold,
  idempotencyKey,
  action = "agent_turn",
  status = "success",
  message = "",
  payload = {},
  streamMetrics = null,
  env = process.env,
  sourceRoute = null,
  requestId = null,
  settleHold,
  recordUsageEvent,
  dbQuery,
  logStructured,
} = {}) {
  if (!hold?.id) return null;
  try {
    const sawError = status !== "success" || Boolean(streamMetrics?.sawError);
    const costUsd = streamMetrics?.costUsd ?? null;
    const { units, costSource } = computeAgentSettleUnits({ costUsd, message, action, payload, env });
    const costOverflow = units > Number(hold.reserved_units || 0);
    const costMicros = Number.isFinite(Number(costUsd)) ? Math.round(Number(costUsd) * 1e6) : null;

    const settleResult = await settleHold({
      holdId: hold.id,
      settleIdempotencyKey: `${idempotencyKey}:settle`,
      // Passed uncapped: the ledger's computeSettleRefund clamps settledUnits to reserved_units
      // (Math.min). costOverflow above flags the calibration signal; do NOT clamp here.
      settledUnits: sawError ? 0 : units,
      finalState: sawError ? "released" : "settled",
      provider: AGENT_PROVIDER,
      providerModel: AGENT_PROVIDER_MODEL,
      providerCostUsdMicros: costMicros,
      providerInputTokens: streamMetrics?.inputTokens ?? null,
      providerOutputTokens: streamMetrics?.outputTokens ?? null,
    });

    // First-class per-feature usage (mirrors spaces/HIRE). Emit ONLY on a successful settle. Failsafe:
    // a usage-event failure must NEVER break or delay the agent response or the settle.
    if (!sawError && settleResult?.ok) {
      try {
        await recordUsageEvent({
          dbQuery,
          logStructured,
          event: {
            userId: hold.user_id,
            productId: "agent",
            surface: "agent",
            eventType: action || "agent_turn",
            usageUnitType: "request",
            usageUnits: units,
            requestId: requestId || null,
            sourceRoute,
            metadata: {
              action: action || "agent_turn",
              usageTokens: streamMetrics?.usageTokens ?? null,
              inputTokens: streamMetrics?.inputTokens ?? null,
              outputTokens: streamMetrics?.outputTokens ?? null,
              costUsd,
              costSource,
              costOverflow,
              toolCalls: Number(streamMetrics?.toolCalls || 0),
            },
          },
        });
      } catch (usageError) {
        logStructured?.("error", "agent.usage.record_failed", {
          requestId: requestId || null,
          holdId: hold.id,
          message: usageError?.message || String(usageError),
        });
      }
    }
    return settleResult;
  } catch (error) {
    logStructured?.("error", "agent.wallet.settle_failed", {
      requestId: requestId || null,
      holdId: hold.id,
      message: error?.message || String(error),
    });
    return null;
  }
}
