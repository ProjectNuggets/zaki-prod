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
