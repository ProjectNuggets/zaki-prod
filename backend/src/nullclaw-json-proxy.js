export const DEFAULT_NULLCLAW_JSON_PROXY_MAX_BYTES = 5 * 1024 * 1024;

export class NullclawJsonProxyError extends Error {
  constructor(message, code, options = {}) {
    super(message, { cause: options.cause });
    this.name = "NullclawJsonProxyError";
    this.code = code;
    this.status = options.status || 502;
  }
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

export function assertJsonProxyContentLength(headers, maxBytes = DEFAULT_NULLCLAW_JSON_PROXY_MAX_BYTES) {
  const raw = headerValue(headers, "content-length");
  if (raw == null || raw === "") return;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return;
  if (value > maxBytes) {
    throw new NullclawJsonProxyError(
      `Nullclaw JSON response is too large (${value} bytes).`,
      "upstream_response_too_large",
      { status: 502 }
    );
  }
}

export async function readResponseTextWithLimit(
  response,
  maxBytes = DEFAULT_NULLCLAW_JSON_PROXY_MAX_BYTES
) {
  assertJsonProxyContentLength(response?.headers, maxBytes);
  if (!response?.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const chunk = Buffer.from(value);
    total += chunk.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation cleanup failures; the size violation is the error.
      }
      throw new NullclawJsonProxyError(
        `Nullclaw JSON response exceeded ${maxBytes} bytes.`,
        "upstream_response_too_large",
        { status: 502 }
      );
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks, total).toString("utf8");
}

export function parseRequiredJson(text, label = "Nullclaw JSON response") {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new NullclawJsonProxyError(
      `${label} was not valid JSON.`,
      "upstream_invalid_json",
      { status: 502, cause: error }
    );
  }
}
