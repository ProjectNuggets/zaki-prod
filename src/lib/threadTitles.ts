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
// The BFF also injects a doc-context envelope ([[ZAKI_DOC_CONTEXT_V1]] … [[/…]]) with
// relevance-filtered workspace chunks, between the memory envelope and the message. Both
// markers can leak into an auto-title, so we strip each (full or truncated, in any order).
const INTERNAL_ENVELOPES: ReadonlyArray<readonly [string, string]> = [
  ["[[ZAKI_MEMORY_CONTEXT_V2]]", "[[/ZAKI_MEMORY_CONTEXT_V2]]"],
  ["[[ZAKI_DOC_CONTEXT_V1]]", "[[/ZAKI_DOC_CONTEXT_V1]]"],
];

function stripOneEnvelope(value: string, open: string, close: string): string {
  const openIndex = value.indexOf(open);
  if (openIndex === -1) return value;
  const closeIndex = value.indexOf(close);
  if (closeIndex !== -1 && closeIndex > openIndex) {
    // Full envelope present — keep any genuine title before the open marker and after the close marker.
    return value.slice(0, openIndex) + value.slice(closeIndex + close.length);
  }
  // Leading-only / truncated marker (auto-titles are frequently cut off before the closing tag) —
  // everything from the open marker onward is internal envelope text, so drop it.
  return value.slice(0, openIndex);
}

export function stripThreadDisplayName(label: string | null | undefined): string {
  let value = String(label ?? "");
  for (const [open, close] of INTERNAL_ENVELOPES) {
    value = stripOneEnvelope(value, open, close);
  }
  return value.replace(/\s+/g, " ").trim();
}
