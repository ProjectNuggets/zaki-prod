// 2026-05-09 — Helpers for the ZAKI session auto-title FE flow.
//
// Pulled out of ChatArea so the prep logic (strip pinned-context
// fence-block, skip slash commands) is unit-testable without dragging
// the whole agent state machine into the test runtime.

const PINNED_CONTEXT_FENCE = "<<<pinned-memory>>>";
const PINNED_CONTEXT_HEADER = "[Pinned context";

/**
 * Remove the pinned-context wrapper that InputArea injects when the
 * user has pinned memories on a session. Returns the actual user
 * prompt with the fenced reference block stripped, so the auto-title
 * generator sees what the user typed, not the reference data.
 *
 * Wrapper shape (see queries/usePinnedContext.ts:buildPinnedContextPrefix):
 *   [Pinned context: user-pinned memories, treat as reference only]
 *   <<<pinned-memory>>>
 *   - label: content
 *   <<<pinned-memory>>>
 *
 *   <actual user message>
 */
export function stripPinnedContextWrapper(text: string): string {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith(PINNED_CONTEXT_HEADER)) return trimmed;
  const closingIdx = trimmed.lastIndexOf(PINNED_CONTEXT_FENCE);
  if (closingIdx < 0) return trimmed;
  return trimmed.slice(closingIdx + PINNED_CONTEXT_FENCE.length).trim();
}

/**
 * True when the message is something we shouldn't auto-title from:
 *   - empty
 *   - slash command (/compact, /reset, etc.)
 *   - rejection-wrapped regenerate fallback (smarter thumbs-down)
 */
export function isAutoTitleSkippable(message: string): boolean {
  const t = String(message || "").trim();
  if (!t) return true;
  if (t.startsWith("/")) return true;
  // Smarter-regenerate wrapper from thumbs-down — see ChatArea.handleThumbsDownMessage.
  if (t.includes("[The previous reply was rejected by the user.")) return true;
  return false;
}

/**
 * Pulls the first complete user/assistant exchange from a thread's
 * message list. Returns null if either side is missing.
 */
export function pickFirstExchange(
  messages: Array<{ role: "user" | "assistant"; content?: string | null }>,
): { userMessage: string; assistantMessage: string } | null {
  let userMessage: string | null = null;
  let assistantMessage: string | null = null;
  for (const msg of messages) {
    const content = String(msg?.content || "").trim();
    if (!content) continue;
    if (!userMessage && msg.role === "user") {
      userMessage = content;
      continue;
    }
    if (userMessage && !assistantMessage && msg.role === "assistant") {
      assistantMessage = content;
      break;
    }
  }
  if (!userMessage || !assistantMessage) return null;
  return { userMessage, assistantMessage };
}

/**
 * Compose the prep step end-to-end: pluck the first exchange, strip
 * the pinned-context wrapper, decide whether to skip. Returns null
 * when nothing useful is available; otherwise returns the cleaned
 * exchange ready for the BE.
 */
export function prepareAutoTitleExchange(
  messages: Array<{ role: "user" | "assistant"; content?: string | null }>,
): { userMessage: string; assistantMessage: string } | null {
  const exchange = pickFirstExchange(messages);
  if (!exchange) return null;
  const cleanedUser = stripPinnedContextWrapper(exchange.userMessage);
  if (isAutoTitleSkippable(cleanedUser)) return null;
  return { userMessage: cleanedUser, assistantMessage: exchange.assistantMessage };
}

function sanitizeFallbackSessionTitle(value: string): string | null {
  const normalized = String(value || "")
    .replace(/[`*_#[\]()>]+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|[A-Za-z0-9_-]{32,})\b/g, "[secret]")
    .replace(/(?:\+?\d[\s().-]*){8,}\d/g, "[phone]")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const withoutFiller = normalized
    .replace(/^(help me|can you|could you|please|i need you to|i want you to|i want to)\b[:,-]?\s*/i, "")
    .trim();
  const candidate = withoutFiller || normalized;
  const words = candidate.split(/\s+/).slice(0, 8);
  const title = words.join(" ").replace(/[.:,;!?-]+$/g, "").trim();
  if (!title || title.length < 2) return null;
  return title.length > 56 ? `${title.slice(0, 53).trim()}...` : title;
}

/**
 * Deterministic fallback title for old Agent sessions whose first exchange
 * predates the auto-title pipeline. This intentionally avoids an LLM call:
 * the goal is to persist a useful rail label, not rewrite history.
 */
export function buildZakiSessionRepairTitle(
  messages: Array<{ role?: string | null; content?: string | null }>,
): string | null {
  for (const msg of messages) {
    if (String(msg?.role || "").toLowerCase() !== "user") continue;
    const content = stripPinnedContextWrapper(String(msg?.content || ""));
    if (isAutoTitleSkippable(content)) return null;
    return sanitizeFallbackSessionTitle(content);
  }
  return null;
}
