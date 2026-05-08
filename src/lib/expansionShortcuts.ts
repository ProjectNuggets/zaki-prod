// Phase 4-B (2026-05-08) — Composer expansion shortcuts.
//
// Espanso-style snippet expansion. The user types a `:trigger` followed
// by a space (or end of input), and the trigger is replaced inline with
// the corresponding text. Curated for ZAKI-native intents:
//
//   :weather  → "What's the weather today?"
//   :standup  → "Summarize my last 24 hours from the brain."
//   :brief    → "Brief me on what I missed."
//   :tomorrow → "What's on my plate for tomorrow?"
//   :tldr     → "Give me a 2-bullet TL;DR of the conversation above."
//
// Triggers are case-insensitive, can only fire at the start of input or
// after whitespace, and only the most recent `:word ` at the cursor is
// considered — pasting `:weather` mid-paragraph does NOT expand. This
// keeps the gesture explicit (user typed the trigger AND the space) and
// avoids surprise rewrites.
//
// The dictionary is intentionally small. Future user-defined snippets
// would live in identity preferences and merge over the built-ins.

export const EXPANSIONS: Record<string, string> = {
  weather: "What's the weather today?",
  standup: "Summarize my last 24 hours from the brain.",
  brief: "Brief me on what I missed.",
  tomorrow: "What's on my plate for tomorrow?",
  tldr: "Give me a 2-bullet TL;DR of the conversation above.",
};

const TRIGGER_RE = /(^|\s):([a-z][a-z0-9_-]*) $/i;

export type ExpansionResult = {
  /** Resulting input value with the trigger replaced. */
  value: string;
  /** Cursor position to set after the replacement (caret after the
   *  expansion + the trailing space the user typed). */
  caret: number;
};

/**
 * Detects a just-typed `:trigger ` pattern at the cursor and returns
 * the rewritten value + new caret position. Returns null when there
 * is no expansion to perform — the caller should leave the input
 * untouched in that case.
 *
 * Implementation note: only fires when (caret position) is exactly at
 * the end of the typed `:trigger ` substring. Editing earlier in the
 * input never triggers an expansion, even if a `:trigger ` substring
 * exists upstream of the caret.
 */
export function applyExpansion(value: string, caret: number): ExpansionResult | null {
  if (caret <= 0 || caret > value.length) return null;
  const segment = value.slice(0, caret);
  const match = TRIGGER_RE.exec(segment);
  if (!match) return null;
  const trigger = (match[2] || "").toLowerCase();
  const replacement = EXPANSIONS[trigger];
  if (!replacement) return null;
  // Replace `[leading]:trigger ` (the matched segment from the start of
  // the trigger group) with `[leading]<replacement> `.
  const leading = match[1] ?? "";
  const matchStart = caret - match[0].length;
  const before = value.slice(0, matchStart);
  const after = value.slice(caret);
  const inserted = `${leading}${replacement} `;
  const nextValue = `${before}${inserted}${after}`;
  const nextCaret = matchStart + inserted.length;
  return { value: nextValue, caret: nextCaret };
}
