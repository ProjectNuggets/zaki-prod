const MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const EXTENSION_PATTERN = /^\.[a-z0-9][a-z0-9+-]{0,31}$/i;

export const DEFAULT_ACCEPTED_DOCUMENT_TYPES = Object.freeze({
  "application/pdf": Object.freeze([".pdf"]),
  "application/msword": Object.freeze([".doc"]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": Object.freeze([".docx"]),
  "application/vnd.ms-excel": Object.freeze([".xls"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": Object.freeze([".xlsx"]),
  "application/vnd.ms-powerpoint": Object.freeze([".ppt"]),
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": Object.freeze([".pptx"]),
  "text/csv": Object.freeze([".csv"]),
  "text/markdown": Object.freeze([".md", ".markdown"]),
  "text/plain": Object.freeze([".txt"]),
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMimeType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!MIME_TYPE_PATTERN.test(text)) return null;
  return text;
}

function normalizeExtension(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!EXTENSION_PATTERN.test(text)) return null;
  return text;
}

export function buildAcceptedDocumentTypesFallback(reason = "upstream_unavailable") {
  return {
    success: true,
    degraded: true,
    source: "fallback",
    reason: String(reason || "upstream_unavailable").slice(0, 80),
    types: DEFAULT_ACCEPTED_DOCUMENT_TYPES,
  };
}

export function normalizeAcceptedDocumentTypesPayload(payload) {
  const source = isPlainObject(payload) ? payload : {};
  const rawTypes = isPlainObject(source.types) ? source.types : {};
  const types = {};

  for (const [rawMimeType, rawExtensions] of Object.entries(rawTypes)) {
    const mimeType = normalizeMimeType(rawMimeType);
    if (!mimeType || !Array.isArray(rawExtensions)) continue;

    const extensions = Array.from(
      new Set(rawExtensions.map(normalizeExtension).filter(Boolean))
    );
    if (extensions.length > 0) {
      types[mimeType] = extensions;
    }
  }

  if (Object.keys(types).length === 0) {
    return buildAcceptedDocumentTypesFallback("upstream_empty");
  }

  return {
    ...source,
    success: source.success !== false,
    types,
  };
}
