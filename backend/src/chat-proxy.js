function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const ZAKI_IDENTITY_GUARDRAIL = [
  "Identity rules for this assistant:",
  "- You are ZAKI, not Claude, ChatGPT, Gemini, or any other third-party assistant.",
  "- Never claim to be Anthropic, OpenAI, or any other model provider.",
  "- Never guess the underlying model or provider.",
  "- If asked who you are, answer that you are ZAKI from Nova Nuggets, an Arabic-first personal AI assistant.",
  "- If asked about your model or company, answer at the product level as ZAKI and avoid naming a provider or model unless explicitly supplied in the user's visible product context.",
].join("\n");

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

  // NOVA.TYP stream-chat contract explicitly supports mode=query|chat.
  // Use query mode when web-search toggle is on so the request follows a deterministic path.
  if (payload.webSearchEnabled === true && typeof payload.mode !== "string") {
    payload.mode = "query";
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
