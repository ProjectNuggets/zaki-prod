// Pure detectors for agent SSE events emitted by the AnythingLLM dev-API.
// These are stateless helpers used to observe tool-fire and generated-file signals
// without mutating the event stream.

const TOOL_EXEC_MARKERS = [
  /\bis executing\s+`[^`]+`\s+tool/i,
  /\bUsing\s+.+\s+to search for\b/i,
  /\bScraping the content of\b/i,
  /\bSearching your documents\b/i,
];

/**
 * Returns true if the SSE payload represents a tool being fired by the agent.
 * Covers: agentThought with known execution markers, and fileDownload events.
 * @param {object|null} payload
 * @returns {boolean}
 */
export function isToolFireEvent(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type === "fileDownload") return true;
  if (payload.type === "agentThought") {
    const thought = String(payload.thought || "");
    return TOOL_EXEC_MARKERS.some((re) => re.test(thought));
  }
  return false;
}

/**
 * Extracts a generated-file reference from a fileDownload event.
 * Returns { filename, storageFilename, fileSize } if the event has a truthy storageFilename.
 * filename falls back to storageFilename; fileSize falls back to null.
 * Returns null for all other event types or missing storageFilename.
 * @param {object|null} payload
 * @returns {{ filename: string, storageFilename: string, fileSize: number|null }|null}
 */
export function extractGeneratedFile(payload) {
  if (!payload || payload.type !== "fileDownload") return null;
  const fd = payload.fileDownload;
  if (!fd || !fd.storageFilename) return null;
  return {
    filename: fd.filename || fd.storageFilename,
    storageFilename: fd.storageFilename,
    fileSize: fd.fileSize != null ? fd.fileSize : null,
  };
}
