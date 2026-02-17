function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function extractStreamMessage(body) {
  if (!isPlainObject(body)) return "";
  return String(body.message || "").trim();
}

export function buildStreamUpstreamPayload(body, enrichedMessage) {
  const payload = isPlainObject(body) ? { ...body } : {};
  payload.message = enrichedMessage;

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
