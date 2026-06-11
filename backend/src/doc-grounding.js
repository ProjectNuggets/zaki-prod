// Deterministic doc-grounding for the single-Auto agent turn. The agent path does NOT run automatic
// vector-RAG (only the model-chosen rag-memory tool, whose description discourages itself), so embedded
// space docs were invisible -> "I can't see the file". The BFF pre-fetches relevance-filtered chunks and
// injects them into the message, mirroring the engine's own <attached_documents> format. See
// SPEC-doc-grounding-parity.md.

export const DOC_CONTEXT_MARKER_OPEN = "[[ZAKI_DOC_CONTEXT_V1]]";
export const DOC_CONTEXT_MARKER_CLOSE = "[[/ZAKI_DOC_CONTEXT_V1]]";

const MAX_DOC_CHUNKS = 6;
const MAX_CHUNK_CHARS = 1200; // bound each chunk so the injected prompt stays reasonable
const SNIPPET_CHARS = 240;

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

// Skip the vector-search round-trip for greetings / trivially short turns where grounding is irrelevant.
export function shouldFetchDocContext(message = "") {
  const text = String(message || "").trim();
  if (text.length < 8) return false;
  const greetingOnly =
    /^(hi|hey|hello|yo|hiya|sup|thanks|thank you|ok|okay|سلام|مرحبا|اهلا|أهلا|شكرا|شكراً|تمام)[\s!.…؟?]*$/i;
  if (greetingOnly.test(text)) return false;
  return true;
}

// Normalize the engine vector-search response { results: [{ id, text, metadata:{title,...}, score }] }.
export function normalizeVectorResults(json) {
  const results = isPlainObject(json) && Array.isArray(json.results) ? json.results : [];
  return results
    .filter((r) => isPlainObject(r) && typeof r.text === "string" && r.text.trim())
    .map((r) => {
      const meta = isPlainObject(r.metadata) ? r.metadata : {};
      const title =
        String(meta.title || meta.chunkSource || "Document").trim() || "Document";
      return {
        id: String(r.id || ""),
        text: String(r.text).trim(),
        title,
        score: typeof r.score === "number" ? r.score : null,
      };
    });
}

// Build the message-injection block: engine-native <attached_documents>, wrapped in the strippable marker.
export function buildDocContextBlock(results = []) {
  const chunks = (Array.isArray(results) ? results : []).slice(0, MAX_DOC_CHUNKS);
  if (chunks.length === 0) return "";
  const docs = chunks
    .map((r) => {
      const name = String(r.title || "Document").replace(/"/g, "'");
      const body = String(r.text || "").slice(0, MAX_CHUNK_CHARS);
      return `<document name="${name}">\n${body}\n</document>`;
    })
    .join("\n");
  return [
    DOC_CONTEXT_MARKER_OPEN,
    "The user's space contains documents. Use the following excerpts to answer questions about their files, and cite the document name. If the excerpts do not contain the answer, say so plainly.",
    "<attached_documents>",
    docs,
    "</attached_documents>",
    DOC_CONTEXT_MARKER_CLOSE,
  ].join("\n");
}

// One citation per distinct source document, for the FE chips.
export function extractDocSources(results = []) {
  const seen = new Map();
  for (const r of Array.isArray(results) ? results : []) {
    const title = String(r?.title || "Document");
    if (seen.has(title)) continue;
    seen.set(title, {
      id: String(r?.id || `doc-${seen.size}`),
      title,
      snippet: String(r?.text || "").slice(0, SNIPPET_CHARS),
      score: typeof r?.score === "number" ? r.score : null,
    });
  }
  return Array.from(seen.values());
}

// Orchestrator: call the engine vector-search via an injected adminRequest fn (DI for testability).
// Always safe — returns { block: "", sources: [] } on skip / no-docs / any failure; never throws.
export async function fetchWorkspaceDocContext({
  adminRequest,
  slug,
  message,
  topN = MAX_DOC_CHUNKS,
  scoreThreshold,
} = {}) {
  const empty = { block: "", sources: [] };
  try {
    if (typeof adminRequest !== "function" || !slug || !shouldFetchDocContext(message)) return empty;
    const body = { query: String(message), topN };
    if (typeof scoreThreshold === "number") body.scoreThreshold = scoreThreshold;
    const resp = await adminRequest(`/v1/workspace/${encodeURIComponent(slug)}/vector-search`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!resp || !resp.ok) return empty;
    const json = await resp.json().catch(() => null);
    const results = normalizeVectorResults(json);
    if (results.length === 0) return empty;
    return { block: buildDocContextBlock(results), sources: extractDocSources(results) };
  } catch {
    return empty;
  }
}
