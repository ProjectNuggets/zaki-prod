/**
 * Memory injection gate (always-on).
 *
 * Memory context is injected into chat turns BY DEFAULT. The relevance floor in
 * buildFastContext (ZAKI_CHAT_MEMORY_SEMANTIC_MIN) already returns nothing when
 * no memory is relevant, so broad injection is safe — there is no phrase
 * allowlist. We only skip for transport reasons:
 *   - the master kill-switch is off,
 *   - it's a web-search turn (runs on the agent route, not the internal chat), or
 *   - it's an @agent turn (the message must stay @agent-prefixed for the engine's
 *     agent to trigger, so we must not prepend a memory envelope).
 *
 * Extracted from index.js so it is unit-testable without booting the server.
 */
export function shouldSkipChatMemoryContext(requestPayload = {}, message = "") {
  const enabled =
    String(process.env.ZAKI_SYNC_MEMORY_INJECTION_ENABLED || "true")
      .toLowerCase()
      .trim() !== "false";
  if (!enabled) return true;

  const webSearchEnabled =
    requestPayload?.webSearchEnabled === true || requestPayload?.webSearch === true;
  if (webSearchEnabled) return true;

  if (/^@agent\b/i.test(String(message || "").trim())) return true;

  return false;
}
