/**
 * Maps a raw engine `agentThought` status string into a small, user-friendly
 * narration "step" for the normal Spaces chat.
 *
 * The engine streams free-text status lines on the per-turn SSE while the model
 * auto-decides tools (web search, scraping, file creation, document lookup).
 * Examples seen on the wire:
 *   - `@agent is executing \`web-scraping\` tool {…}`
 *   - `@agent: Scraping the content of https://…`
 *   - `Using DuckDuckGo to search for "…"`
 *   - `@agent: Successfully created text file "…"`
 *
 * This is a PURE function: it classifies the thought by matching known phrases
 * and returns a short label, or `null` for empty input. It never surfaces the
 * raw `@agent` text to the user.
 */

export type AgentStepKind = "search" | "scrape" | "file" | "docs" | "thought";

export interface AgentStep {
  kind: AgentStepKind;
  label: string;
}

const SEARCH_LABEL = "Searching the web…";
const SCRAPE_LABEL = "Reading a web page…";
const FILE_LABEL = "Creating a file…";
const DOCS_LABEL = "Searching your documents…";

/**
 * Extracts the backtick-quoted tool name from an
 * `@agent is executing \`<tool>\` tool {…}` thought, if present.
 */
function extractExecutingTool(thought: string): string | null {
  const match = thought.match(/is executing\s+`([^`]+)`\s+tool/i);
  return match?.[1] ? match[1].toLowerCase() : null;
}

/**
 * Strips a leading `@agent` / `@agent:` mention from a free-text thought so the
 * plain-thought fallback never leaks the raw agent prefix to the user.
 */
function stripAgentPrefix(thought: string): string {
  return thought.replace(/^@agent:?\s*/i, "").trim();
}

export function agentThoughtToStep(thought: string): AgentStep | null {
  const raw = String(thought ?? "");
  const value = raw.trim();
  if (!value) return null;

  const lower = value.toLowerCase();
  const tool = extractExecutingTool(value);

  // 1) Web search — explicit tool execution or a "Using … to search for …" line.
  if (
    tool === "web-browsing" ||
    tool === "web-search" ||
    /\bweb-browsing\b/.test(lower) ||
    /using\b.*\bto search for\b/.test(lower) ||
    /\bsearching the web\b/.test(lower)
  ) {
    return { kind: "search", label: SEARCH_LABEL };
  }

  // 2) Web scraping — reading the content of a specific page.
  if (
    tool === "web-scraping" ||
    /\bweb-scraping\b/.test(lower) ||
    /\bscraping the content of\b/.test(lower)
  ) {
    return { kind: "scrape", label: SCRAPE_LABEL };
  }

  // 3) File creation — a create-*-file tool, or a "created … file" status.
  if (
    (tool != null && (tool.startsWith("create-") || tool.includes("-file"))) ||
    /\bcreate[-\s][a-z-]*file\b/.test(lower) ||
    /\bcreating\b.*\bfile\b/.test(lower) ||
    /\bsuccessfully created\b/.test(lower)
  ) {
    return { kind: "file", label: FILE_LABEL };
  }

  // 4) Document search — RAG / "searching your documents".
  if (
    tool === "rag-memory" ||
    /\brag-memory\b/.test(lower) ||
    /\bsearching your documents\b/.test(lower)
  ) {
    return { kind: "docs", label: DOCS_LABEL };
  }

  // 5) Fallback — a plain thought; surface the cleaned text (no @agent prefix).
  const cleaned = stripAgentPrefix(value);
  if (!cleaned) return null;
  return { kind: "thought", label: cleaned };
}
