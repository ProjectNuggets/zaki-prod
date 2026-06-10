export const DEFAULT_THREAD_LABEL = "New chat";

const DEFAULT_THREAD_LABELS = new Set([
  "",
  DEFAULT_THREAD_LABEL.toLowerCase(),
  "new session",
  "session",
  "thread",
  "untitled",
]);

export function isDefaultThreadLabel(label: string | null | undefined) {
  return DEFAULT_THREAD_LABELS.has(String(label || "").trim().toLowerCase());
}

// The BFF now prepends a guardrail + memory envelope to every Auto-mode turn:
//   [[ZAKI_MEMORY_CONTEXT_V2]] …guardrail/memory… [[/ZAKI_MEMORY_CONTEXT_V2]]\n\n<raw message>
// The engine auto-titles a thread from that ENRICHED first message, so any
// auto-named thread leaks the marker into its label (sidebar, breadcrumb, tab
// title). This util sanitizes a thread/display NAME by removing the envelope.
//
// It is deliberately robust to a partial/leading-only marker: an auto-title is
// frequently truncated (e.g. "[[ZAKI_MEMORY_CONTEXT_V2]] Assistant identity ru…"),
// so the closing marker is usually absent. In that case the entire visible text
// is internal envelope content, not the user's title — so we drop it.
const MEMORY_CONTEXT_V2_OPEN = "[[ZAKI_MEMORY_CONTEXT_V2]]";
const MEMORY_CONTEXT_V2_CLOSE = "[[/ZAKI_MEMORY_CONTEXT_V2]]";

export function stripThreadDisplayName(label: string | null | undefined): string {
  const value = String(label ?? "");
  const openIndex = value.indexOf(MEMORY_CONTEXT_V2_OPEN);
  if (openIndex === -1) {
    return value.trim();
  }

  const closeIndex = value.indexOf(MEMORY_CONTEXT_V2_CLOSE);
  if (closeIndex !== -1 && closeIndex > openIndex) {
    // Full envelope present — the real title is whatever follows the close
    // marker. Anything before the open marker is kept too (defensive), so a
    // title like "Re: <envelope> follow-up" still reads sensibly.
    const before = value.slice(0, openIndex);
    const after = value.slice(closeIndex + MEMORY_CONTEXT_V2_CLOSE.length);
    return `${before}${after}`.replace(/\s+/g, " ").trim();
  }

  // Leading-only / truncated marker — no closing tag. Everything from the open
  // marker onward is internal envelope text (guardrail/memory), so drop it and
  // keep only any genuine title text that preceded the marker.
  return value.slice(0, openIndex).trim();
}
