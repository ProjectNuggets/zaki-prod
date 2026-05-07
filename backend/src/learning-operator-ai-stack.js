const SECRET_KEY_RE = /(api[_-]?key|authorization|bearer|token|secret|password|credential)/i;
const SECRET_TEXT_PATTERNS = [
  {
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replacement: "[redacted]",
  },
  {
    pattern: /\b(?:sk|tog|tgp|tvly|brv)-[A-Za-z0-9._-]{8,}\b/g,
    replacement: "[redacted]",
  },
  {
    pattern: /([?&](?:api[_-]?key|token|secret|password)=)[^&\s]+/gi,
    replacement: "$1[redacted]",
  },
];

function redactSecretText(value) {
  return SECRET_TEXT_PATTERNS.reduce(
    (text, { pattern, replacement }) => text.replace(pattern, replacement),
    value
  );
}

export function redactLearningOperatorPayload(value) {
  if (typeof value === "string") return redactSecretText(value);
  if (Array.isArray(value)) return value.map((item) => redactLearningOperatorPayload(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY_RE.test(key) ? "[redacted]" : redactLearningOperatorPayload(item),
    ])
  );
}

export function normalizeLearningOperatorTestResult({ service, upstreamStatus, payload }) {
  const sanitized = redactLearningOperatorPayload(payload || {});
  return {
    service,
    ok: Boolean(sanitized?.success),
    upstreamStatus,
    success: Boolean(sanitized?.success),
    message: typeof sanitized?.message === "string" ? sanitized.message : "",
    model: typeof sanitized?.model === "string" ? sanitized.model : "",
    responseTimeMs:
      typeof sanitized?.response_time_ms === "number"
        ? sanitized.response_time_ms
        : typeof sanitized?.responseTimeMs === "number"
          ? sanitized.responseTimeMs
          : null,
    error: typeof sanitized?.error === "string" ? sanitized.error : null,
  };
}
