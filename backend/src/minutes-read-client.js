const MINUTES_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function hasControlCharacter(value) {
  return [...String(value)].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export function getMinutesReadBase(rawBaseUrl) {
  const raw = String(rawBaseUrl || "").trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_minutes_read_base_url");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error("invalid_minutes_read_base_url");
  }
  return parsed.origin;
}

function requiredConfig({ baseUrl, readToken, userId, requestId, fetchWithTimeout, timeoutMs }) {
  const resolvedBase = getMinutesReadBase(baseUrl);
  if (!resolvedBase) throw new Error("MINUTES_ENGINE_BASE_URL is not configured.");

  const token = String(readToken || "");
  if (
    token.length < 32 ||
    token.length > 512 ||
    token !== token.trim() ||
    [...token].some((character) => character.codePointAt(0) < 0x20 || character.codePointAt(0) > 0x7e)
  ) {
    throw new Error("MINUTES_ENGINE_READ_TOKEN is invalid.");
  }

  const normalizedUserId = String(userId || "");
  if (!/^[1-9][0-9]*$/.test(normalizedUserId) || !Number.isSafeInteger(Number(normalizedUserId))) {
    throw new Error("invalid_minutes_read_user_id");
  }

  const normalizedRequestId = String(requestId || "");
  if (!REQUEST_ID.test(normalizedRequestId)) throw new Error("invalid_minutes_read_request_id");
  if (typeof fetchWithTimeout !== "function") throw new Error("invalid_minutes_read_transport");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("invalid_minutes_read_timeout");

  return {
    baseUrl: resolvedBase,
    readToken: token,
    userId: normalizedUserId,
    requestId: normalizedRequestId,
    fetchWithTimeout,
    timeoutMs,
  };
}

function optionalCursor(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_minutes_read_cursor");
  const cursor = String(value);
  if (cursor.length > 2_048 || hasControlCharacter(cursor)) {
    throw new Error("invalid_minutes_read_cursor");
  }
  return cursor;
}

function optionalSince(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid_minutes_read_since");
  const since = String(value);
  if (since.length > 80 || hasControlCharacter(since) || !Number.isFinite(Date.parse(since))) {
    throw new Error("invalid_minutes_read_since");
  }
  return since;
}

function boundedLimit(value, maximum, fallback) {
  if (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !(typeof value === "number" || (typeof value === "string" && /^[1-9][0-9]*$/.test(value)))
  ) {
    throw new Error("invalid_minutes_read_limit");
  }
  const limit = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
    throw new Error("invalid_minutes_read_limit");
  }
  return limit;
}

function requestOptions(config) {
  return {
    method: "GET",
    redirect: "error",
    headers: {
      Accept: "application/json",
      "X-Zaki-Read-Token": config.readToken,
      "X-Zaki-User-Id": config.userId,
      "X-Request-Id": config.requestId,
    },
  };
}

function request(config, path, label) {
  return config.fetchWithTimeout(
    `${config.baseUrl}${path}`,
    requestOptions(config),
    config.timeoutMs,
    label
  );
}

export async function fetchMinutesIndex(options) {
  const config = requiredConfig(options);
  const params = new URLSearchParams();
  const since = optionalSince(options.since);
  const cursor = optionalCursor(options.cursor);
  const limit = boundedLimit(options.limit, 200, 50);
  if (since) params.set("since", since);
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return request(
    config,
    `/api/zaki/read/v1/${config.userId}/index?${params.toString()}`,
    options.label || "Minutes read index request"
  );
}

export async function fetchMinutesItem(options) {
  const config = requiredConfig(options);
  const itemId = typeof options.itemId === "string" ? options.itemId : "";
  const variant = options.variant === undefined ? "full" : String(options.variant);
  if (itemId.length > 160 || !MINUTES_IDENTIFIER.test(itemId)) {
    throw new Error("invalid_minutes_read_item_id");
  }
  if (!new Set(["full", "summary"]).has(variant)) throw new Error("invalid_minutes_read_variant");
  return request(
    config,
    `/api/zaki/read/v1/${config.userId}/item/${encodeURIComponent(itemId)}?variant=${variant}`,
    options.label || "Minutes read item request"
  );
}

export async function fetchMinutesSearch(options) {
  const config = requiredConfig(options);
  const query = String(options.query || "").trim();
  if (!query || query.length > 512 || hasControlCharacter(query)) {
    throw new Error("invalid_minutes_read_query");
  }
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(boundedLimit(options.limit, 50, 20)));
  const cursor = optionalCursor(options.cursor);
  if (cursor) params.set("cursor", cursor);
  return request(
    config,
    `/api/zaki/read/v1/${config.userId}/search?${params.toString()}`,
    options.label || "Minutes read search request"
  );
}
