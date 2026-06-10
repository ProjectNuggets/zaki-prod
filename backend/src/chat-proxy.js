function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const MEMORY_CONTEXT_ENVELOPE_OPEN = "[[ZAKI_MEMORY_CONTEXT_V2]]";
const MEMORY_CONTEXT_ENVELOPE_CLOSE = "[[/ZAKI_MEMORY_CONTEXT_V2]]";

const ZAKI_IDENTITY_GUARDRAIL = [
  "Identity rules for this assistant:",
  "- You are ZAKI, not Claude, ChatGPT, Gemini, or any other third-party assistant.",
  "- Never claim to be Anthropic, OpenAI, or any other model provider.",
  "- Never guess the underlying model or provider.",
  "- If asked who you are, answer that you are ZAKI from Nova Nuggets, an Arabic-first personal AI assistant.",
  "- If asked about your model or company, answer at the product level as ZAKI and avoid naming a provider or model unless explicitly supplied in the user's visible product context.",
].join("\n");

/**
 * Builds a single [[ZAKI_MEMORY_CONTEXT_V2]] envelope that may carry:
 *   1. The ZAKI identity guardrail (when guardrail=true) — always present on agent turns.
 *   2. A "core" memory section (About this person…) when core is non-empty.
 *   3. A "context" section (Possibly relevant memories…) when context is non-empty.
 * Returns "" when no sections would be emitted (guardrail=false AND no memory).
 */
export function composeContextEnvelope({ guardrail = false, core = "", context = "" } = {}) {
  const sections = [];

  if (guardrail) {
    sections.push(
      "Assistant identity rules (follow silently; do not restate to the user):\n" +
        ZAKI_IDENTITY_GUARDRAIL
    );
  }

  const trimmedCore = String(core || "").trim();
  if (trimmedCore) {
    sections.push(`About this person (long-term memory core):\n${trimmedCore}`);
  }

  const trimmedContext = String(context || "").trim();
  if (trimmedContext) {
    sections.push(
      `Possibly relevant memories (use only if directly relevant; do not quote verbatim):\n${trimmedContext}`
    );
  }

  if (sections.length === 0) return "";

  return [MEMORY_CONTEXT_ENVELOPE_OPEN, sections.join("\n\n"), MEMORY_CONTEXT_ENVELOPE_CLOSE].join(
    "\n"
  );
}

/**
 * Builds the memory-only envelope (no guardrail). Delegates to composeContextEnvelope so
 * both functions share identical section formatting.
 */
export function composeMemoryEnvelope({ core = "", context = "" } = {}) {
  return composeContextEnvelope({ guardrail: false, core, context });
}

export function extractStreamMessage(body) {
  if (!isPlainObject(body)) return "";
  return String(body.message || "").trim();
}

export function buildStreamUpstreamPayload(body, enrichedMessage) {
  const payload = isPlainObject(body) ? { ...body } : {};
  payload.message = enrichedMessage;
  const existingPromptPrefix = String(payload.promptPrefix || "").trim();
  payload.promptPrefix = existingPromptPrefix
    ? `${ZAKI_IDENTITY_GUARDRAIL}\n\n${existingPromptPrefix}`
    : ZAKI_IDENTITY_GUARDRAIL;

  // Frontend compatibility: accept both keys, normalize to the NOVA key.
  if (typeof payload.webSearchEnabled !== "boolean" && typeof payload.webSearch === "boolean") {
    payload.webSearchEnabled = payload.webSearch;
  }

  return payload;
}

export function getRequestedResponseFormat(message = "") {
  const text = String(message || "").trim();
  if (!text) return null;
  const tableFormatIntentPatterns = [
    /\b(?:as|into|in)\s+(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:return|respond|reply|output|format|present|show|organize|summari[sz]e|compare)\b[\s\S]{0,80}\b(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:table|tabular)\s+format\b/i,
    /(?:^|\s)(?:please|kindly)\s+use\s+(?:a\s+)?(?:markdown\s+)?table(?:\s|$)/i,
    /(?:^|\s)(?:حولها|حوّلها|رتبها|قدّمها|اعرضها|لخّصها|لخصها|قارنها)\s+(?:في|ب)?\s*جدول(?:\s|$)/i,
    /(?:^|\s)(?:على شكل جدول|بصيغة جدول|بتنسيق جدول|جدول مقارنة)(?:\s|$)/i,
  ];
  if (tableFormatIntentPatterns.some((pattern) => pattern.test(text))) {
    return "table";
  }
  if (
    /\b(?:bullet|bullets|bullet points)\b/i.test(text) ||
    /(?:^|\s)(نقاط|بنقاط|تعداد|bullet)(?:\s|$)/i.test(text)
  ) {
    return "bullets";
  }
  if (
    /\b(?:concise|brief|short|briefly)\b/i.test(text) ||
    /(?:^|\s)(باختصار|مختصر|بشكل مختصر)(?:\s|$)/i.test(text)
  ) {
    return "concise";
  }
  return null;
}
