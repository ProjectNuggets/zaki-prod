// Display-lane guard: strip injected master-prompt / context scaffolding from assistant
// content BEFORE it renders. The engine lane owns the source fix (see
// zaki-infra/docs/saas-v1/INVESTIGATION-context-leak.md); this is the active mitigation while
// that fix is parked. Principle: SHOW the agent's work, HIDE the internal fuel.

// Mirror of the engine's stable system-prompt section headers (context_builder.zig
// `stable_prompt_markers`). Internal system-prompt sections must never reach user-facing output.
export const STABLE_PROMPT_MARKERS = [
  "Brain Architecture",
  "Memory Link Types",
  "Response Protocol",
  "Channel Attachments",
  "Task Decomposition",
  "Safety",
] as const;

// [[ZAKI_*]] … [[/ZAKI_*]] envelope families (memory / doc / response-format / identity + future).
const ZAKI_ENVELOPE_RE =
  /\[\[\s*ZAKI_[A-Z0-9_]+\s*\]\][\s\S]*?\[\[\s*\/\s*ZAKI_[A-Z0-9_]+\s*\]\]/gi;
// Any remaining lone / unterminated ZAKI marker (streaming tail, stray open or close).
const ZAKI_MARKER_RE = /\[\[\s*\/?\s*ZAKI_[A-Z0-9_]+\s*\]\]/gi;

// <memory_for_turn> … </memory_for_turn> (paired) + an unterminated streaming tail.
const MEMORY_FOR_TURN_RE =
  /<\s*memory_for_turn\b[^>]*>[\s\S]*?<\s*\/\s*memory_for_turn\s*>/gi;
const MEMORY_FOR_TURN_TAIL_RE = /<\s*memory_for_turn\b[\s\S]*$/i;

// Raw <reflection> blocks — INTERIM neutralization (PR1). PR2 promotes reflection to a shown
// collapsed reasoning part; until then, never render the raw tags/content verbatim.
const REFLECTION_RE =
  /<\s*reflection\b[^>]*>[\s\S]*?<\s*\/\s*reflection\s*>/gi;
const REFLECTION_TAIL_RE = /<\s*reflection\b[\s\S]*$/i;

// Strong signals that a chunk carries the leaked system prompt. Section-stripping only fires
// when one of these is present, so a legitimate lone "## Safety" answer heading is never removed.
const DISTINCTIVE_SCAFFOLD_RE =
  /(\bBrain Architecture\b|\bMemory Link Types\b|<\s*memory_for_turn\b|\[\[\s*ZAKI_)/i;

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const MARKER_SET = new Set(STABLE_PROMPT_MARKERS.map(norm));

// Remove each stable-prompt section: the marker heading line and its body, up to the next
// heading of the same-or-higher level (or end of string).
function stripStablePromptSections(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let skipUntilLevel: number | null = null;
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (skipUntilLevel !== null) {
      if (heading && heading[1].length <= skipUntilLevel) {
        skipUntilLevel = null; // section ended — re-evaluate this heading below
      } else {
        continue; // still inside the skipped section
      }
    }
    if (heading && MARKER_SET.has(norm(heading[2]))) {
      skipUntilLevel = heading[1].length;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function sanitizeAssistantScaffold(raw: string): string {
  if (!raw) return raw;
  let text = String(raw);
  const leaked = DISTINCTIVE_SCAFFOLD_RE.test(text);
  text = text.replace(ZAKI_ENVELOPE_RE, "").replace(ZAKI_MARKER_RE, "");
  text = text
    .replace(MEMORY_FOR_TURN_RE, "")
    .replace(MEMORY_FOR_TURN_TAIL_RE, "");
  text = text.replace(REFLECTION_RE, "").replace(REFLECTION_TAIL_RE, "");
  if (leaked) text = stripStablePromptSections(text);
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
