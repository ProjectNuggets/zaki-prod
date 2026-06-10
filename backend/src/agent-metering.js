import { extractAgentTokenChunk } from "./agent-proxy-contract.js";
import { normalizeMeterAction } from "./meter-contract.js";

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

export function classifyAgentMeterAction(payload = {}, message = "") {
  const text = normalizedText(message);
  if (hasAttachmentPayload(payload)) return "agent_file_upload";
  if (hasVoiceMode(payload)) return "agent_voice_turn";
  if (hasMemoryWriteIntent(text)) return "agent_memory_write";
  if (hasMemoryReadIntent(text)) return "agent_memory_read";
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

export const DEFAULT_UNIT_COST_USD = 0.00075;

export function computeAgentSettleUnits({
  costUsd = null,
  message = "",
  action = "agent_turn",
  payload = {},
  env = process.env,
} = {}) {
  const unitCost =
    Number(env?.ZAKI_UNIT_COST_USD) > 0 ? Number(env.ZAKI_UNIT_COST_USD) : DEFAULT_UNIT_COST_USD;
  const cost = costUsd === null || costUsd === undefined ? NaN : Number(costUsd);
  if (Number.isFinite(cost) && cost >= 0) {
    return { units: Math.round((cost / unitCost) * 10_000) / 10_000, costSource: "real" };
  }
  return { units: estimateAgentMeterUnits(message, action, payload), costSource: "estimate" };
}
