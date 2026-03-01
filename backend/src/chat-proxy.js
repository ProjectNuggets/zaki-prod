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

const ZAKI_RESPONSE_FORMAT_GUARDRAIL = [
  "Response formatting rules:",
  "- Answer directly first.",
  "- If the user asks for a concise, brief, or short answer, keep it short by default.",
  "- If the user asks for one short sentence or one line, return exactly one short sentence.",
  "- If the user asks for bullets, return real markdown bullet points.",
  "- If the user asks for numbered steps, return a real markdown numbered list.",
  "- If the user asks for a table, return a markdown table only.",
  "- Avoid bloated introductions and avoid unnecessary filler.",
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
    ? `${ZAKI_IDENTITY_GUARDRAIL}\n\n${ZAKI_RESPONSE_FORMAT_GUARDRAIL}\n\n${existingPromptPrefix}`
    : `${ZAKI_IDENTITY_GUARDRAIL}\n\n${ZAKI_RESPONSE_FORMAT_GUARDRAIL}`;

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
  if (/\btable\b/i.test(text) || /(?:^|\s)(جدول|table)(?:\s|$)/i.test(text)) {
    return "table";
  }
  if (
    /\b(?:numbered|numbered list|steps)\b/i.test(text) ||
    /(?:^|\s)(خطوات|مرقمة|مرقّم|numbered)(?:\s|$)/i.test(text)
  ) {
    return "numbered";
  }
  if (
    /\b(?:bullet|bullets|bullet points)\b/i.test(text) ||
    /(?:^|\s)(نقاط|بنقاط|تعداد|bullet)(?:\s|$)/i.test(text)
  ) {
    return "bullets";
  }
  if (
    /\b(?:summary|summarize|summarise)\b/i.test(text) ||
    /(?:^|\s)(ملخص|لخص|اختصر)(?:\s|$)/i.test(text)
  ) {
    return "summary";
  }
  if (
    /\b(?:one short sentence|one sentence|one line)\b/i.test(text) ||
    /(?:^|\s)(جملة واحدة|سطر واحد)(?:\s|$)/i.test(text)
  ) {
    return "sentence";
  }
  if (
    /\b(?:concise|brief|short|briefly)\b/i.test(text) ||
    /(?:^|\s)(باختصار|مختصر|بشكل مختصر)(?:\s|$)/i.test(text)
  ) {
    return "concise";
  }
  return null;
}
