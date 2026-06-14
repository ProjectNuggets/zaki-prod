# ChatArea Scaffold Sanitizer (PR1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee the master/system prompt and injected memory/context scaffolding never render in the agent chat surface, by adding one display-lane sanitizer at the assistant-reply chokepoint and the inspector source chips.

**Architecture:** A new pure function `sanitizeAssistantScaffold(text)` (in its own file, mirroring `toolMarkup.ts`) strips the `[[ZAKI_*]]` envelope families, `<memory_for_turn>`, the engine's `stable_prompt_markers` system-prompt sections, and (interim) raw `<reflection>` blocks. It is wired into the two exported chokepoint functions in `agentReplyPresentation.ts` (`segmentAgentReplyContent`, `normalizeAssistantDisplayText`) so every agent-reply render path inherits it, and into `AgentInspectorPanelModel.toPanelEvent` so context/source chips can't carry leaked text. No visual change for clean content; this is the active mitigation while the engine-lane fix is parked (`zaki-infra/docs/saas-v1/INVESTIGATION-context-leak.md`).

**Tech Stack:** TypeScript, React, Jest 30 (`@jest/globals`), `jest --config jest.config.cjs`.

**Scope:** PR1 only (agent space). PR2 (`<TurnActivity>` working-UI, promotes reflection to a shown part) and PR3 (`TurnViewModel` unification) are separate plans. Design: `zaki-infra/docs/saas-v1/SPEC-2026-06-14-chatarea-canonical-view.md`.

---

## File Structure

- **Create** `src/app/components/chat/rendering/scaffoldSanitizer.ts` — the pure sanitizer + `STABLE_PROMPT_MARKERS`. One responsibility: remove injected scaffold from a string.
- **Create** `src/app/components/chat/rendering/scaffoldSanitizer.test.ts` — unit tests (marker families, SHOW-preservation, regression contract).
- **Modify** `src/app/components/chat/rendering/agentReplyPresentation.ts` — wrap the two `stripToolCallMarkup(...)` calls (L502, L537) with the sanitizer.
- **Modify** `src/app/components/chat/AgentInspectorPanelModel.ts` — sanitize `label`/`summary` in `toPanelEvent` (L164–165); drop pure-scaffold source chips in `buildAgentInspectorPanelModel` (L278).
- **Modify** `src/app/components/chat/rendering/agentReplyPresentation.test.ts` — add an integration test proving a scaffolded assistant reply renders clean through `parseAssistantContent`.

Run all tests from the worktree root: `~/.config/superpowers/worktrees/zaki-prod/chatarea-scaffold-sanitizer`.

---

### Task 1: The pure sanitizer `scaffoldSanitizer.ts`

**Files:**
- Create: `src/app/components/chat/rendering/scaffoldSanitizer.ts`
- Test: `src/app/components/chat/rendering/scaffoldSanitizer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/components/chat/rendering/scaffoldSanitizer.test.ts`:

```ts
import { describe, expect, it } from "@jest/globals";
import {
  sanitizeAssistantScaffold,
  STABLE_PROMPT_MARKERS,
} from "./scaffoldSanitizer";

describe("sanitizeAssistantScaffold", () => {
  it("removes a [[ZAKI_MEMORY_CONTEXT_V2]] envelope anywhere in the string", () => {
    const input =
      "Here is your answer. [[ZAKI_MEMORY_CONTEXT_V2]]secret memory[[/ZAKI_MEMORY_CONTEXT_V2]] Done.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toContain("Here is your answer.");
    expect(out).toContain("Done.");
    expect(out).not.toMatch(/ZAKI_MEMORY_CONTEXT/);
    expect(out).not.toContain("secret memory");
  });

  it("removes every [[ZAKI_*]] family (doc, response-format, identity) and lone markers", () => {
    const input =
      "[[ZAKI_DOC_CONTEXT_V1]]doc[[/ZAKI_DOC_CONTEXT_V1]]" +
      "[[ZAKI_RESPONSE_FORMAT_V1]]fmt[[/ZAKI_RESPONSE_FORMAT_V1]]" +
      "[[ZAKI_IDENTITY_RULES_V1]]id[[/ZAKI_IDENTITY_RULES_V1]]Real answer.[[/ZAKI_STRAY]]";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toBe("Real answer.");
  });

  it("removes <memory_for_turn> blocks and an unterminated streaming tail", () => {
    expect(
      sanitizeAssistantScaffold("A<memory_for_turn>x</memory_for_turn>B")
    ).toBe("AB");
    expect(
      sanitizeAssistantScaffold("Visible.<memory_for_turn>partial streaming")
    ).toBe("Visible.");
  });

  it("removes stable system-prompt sections (header + body) when scaffold is present", () => {
    const input =
      "Real answer line.\n\n" +
      "## Brain Architecture\nLayer 0 — Working memory: auto-promoted from extractions.\n\n" +
      "## Memory Link Types\nSCHEDULED_FOR -> temporal.\n\n" +
      "## Next steps\nDo the thing.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toContain("Real answer line.");
    expect(out).toContain("## Next steps");
    expect(out).toContain("Do the thing.");
    expect(out).not.toMatch(/Brain Architecture/);
    expect(out).not.toMatch(/Memory Link Types/);
    expect(out).not.toMatch(/Layer 0/);
    expect(out).not.toMatch(/SCHEDULED_FOR/);
  });

  it("neutralizes raw <reflection> blocks (interim — PR2 promotes to a shown part)", () => {
    expect(
      sanitizeAssistantScaffold(
        "I created the report.<reflection>I should double-check.</reflection> Ready."
      )
    ).toBe("I created the report. Ready.");
  });

  it("PRESERVES genuine content: a lone ## Safety heading with no scaffold signal stays", () => {
    const input = "## Safety considerations\nAlways wear a helmet.\n\n## Safety\nLock the door.";
    const out = sanitizeAssistantScaffold(input);
    expect(out).toBe(input.trim());
  });

  it("PRESERVES email/table-ish and code content untouched", () => {
    const input =
      "To: a@b.com\nSubject: Hi\n\n| col |\n| --- |\n| v |\n\n```js\nconst x = 1;\n```";
    expect(sanitizeAssistantScaffold(input)).toBe(input.trim());
  });

  it("is a no-op on empty/clean input and round-trips clean prose", () => {
    expect(sanitizeAssistantScaffold("")).toBe("");
    expect(sanitizeAssistantScaffold("Just a normal answer.")).toBe(
      "Just a normal answer."
    );
  });

  it("exports the engine stable_prompt_markers keystone set", () => {
    expect(STABLE_PROMPT_MARKERS).toEqual(
      expect.arrayContaining(["Brain Architecture", "Memory Link Types"])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.config.cjs src/app/components/chat/rendering/scaffoldSanitizer.test.ts`
Expected: FAIL — `Cannot find module './scaffoldSanitizer'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/components/chat/rendering/scaffoldSanitizer.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --config jest.config.cjs src/app/components/chat/rendering/scaffoldSanitizer.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/components/chat/rendering/scaffoldSanitizer.ts src/app/components/chat/rendering/scaffoldSanitizer.test.ts
git commit -m "feat(chat): add sanitizeAssistantScaffold display-lane guard (PR1 1/4)"
```

---

### Task 2: Wire the sanitizer into the agent-reply chokepoint

**Files:**
- Modify: `src/app/components/chat/rendering/agentReplyPresentation.ts:1` (import), `:502`, `:537`
- Test: `src/app/components/chat/rendering/agentReplyPresentation.test.ts` (add one integration test)

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe("Agent reply presentation", ...)` block in `agentReplyPresentation.test.ts`:

```ts
  it("strips master-prompt scaffold from a rendered agent reply", () => {
    const leaked =
      "Here is your plan.\n\n## Brain Architecture\nLayer 0 — Working memory.\n\n" +
      "[[ZAKI_MEMORY_CONTEXT_V2]]private[[/ZAKI_MEMORY_CONTEXT_V2]]";
    const blocks = parseAssistantContent(leaked, { agentReply: true });
    const text = JSON.stringify(blocks);
    expect(text).toContain("Here is your plan.");
    expect(text).not.toMatch(/Brain Architecture/);
    expect(text).not.toMatch(/Layer 0/);
    expect(text).not.toMatch(/ZAKI_MEMORY_CONTEXT/);
    expect(text).not.toContain("private");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.config.cjs src/app/components/chat/rendering/agentReplyPresentation.test.ts -t "strips master-prompt scaffold"`
Expected: FAIL — the rendered blocks still contain "Brain Architecture" / "ZAKI_MEMORY_CONTEXT".

- [ ] **Step 3: Write the implementation**

In `agentReplyPresentation.ts`, add the import at the top (after line 1):

```ts
import { stripToolCallMarkup } from "./toolMarkup";
import { sanitizeAssistantScaffold } from "./scaffoldSanitizer";
```

Change line 502 (inside `segmentAgentReplyContent`) from:

```ts
  const stripped = stripToolCallMarkup(String(content || ""));
```
to:
```ts
  const stripped = stripToolCallMarkup(sanitizeAssistantScaffold(String(content || "")));
```

Change line 537 (inside `normalizeAssistantDisplayText`) from:

```ts
  const stripped = stripToolCallMarkup(String(content || ""));
```
to:
```ts
  const stripped = stripToolCallMarkup(sanitizeAssistantScaffold(String(content || "")));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --config jest.config.cjs src/app/components/chat/rendering/agentReplyPresentation.test.ts`
Expected: PASS (existing 12 + new 1 = 13). Confirms no regression in runtime-JSON suppression / email / table behavior.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/chat/rendering/agentReplyPresentation.ts src/app/components/chat/rendering/agentReplyPresentation.test.ts
git commit -m "feat(chat): sanitize scaffold at the agent-reply chokepoint (PR1 2/4)"
```

---

### Task 3: Sanitize inspector source chips (the suspected daemon-brief carrier)

**Files:**
- Modify: `src/app/components/chat/AgentInspectorPanelModel.ts:1` (import), `:164-165`, `:278`
- Test: `src/app/components/chat/AgentInspectorPanelModel.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/app/components/chat/AgentInspectorPanelModel.test.ts`, add a test using the file's existing `entry()` helper (the file already imports `buildAgentInspectorPanelModel` and `NullalisTranscriptEntry` from `./BotStatusRail`):

```ts
  it("never surfaces master-prompt scaffold in source chips", () => {
    const model = buildAgentInspectorPanelModel([
      entry({
        id: "leak-1",
        kind: "tool",
        intent: "context",
        text: "## Brain Architecture\nLayer 0 — Working memory.",
        activityLabel: "## Brain Architecture",
      }),
    ]);
    const blob = JSON.stringify(model.sources);
    expect(blob).not.toMatch(/Brain Architecture/);
    expect(blob).not.toMatch(/Layer 0/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --config jest.config.cjs src/app/components/chat/AgentInspectorPanelModel.test.ts -t "never surfaces master-prompt scaffold"`
Expected: FAIL — the source chip's `label`/`summary` still contain "Brain Architecture".

- [ ] **Step 3: Write the implementation**

Add the import at the top of `AgentInspectorPanelModel.ts`:

```ts
import { sanitizeAssistantScaffold } from "./rendering/scaffoldSanitizer";
```

In `toPanelEvent` (L164–165), change:

```ts
    label: primaryLabel(entry),
    summary: primarySummary(entry),
```
to:
```ts
    label: sanitizeAssistantScaffold(primaryLabel(entry)),
    summary: sanitizeAssistantScaffold(primarySummary(entry)),
```

In `buildAgentInspectorPanelModel` (L278), drop chips that are pure scaffold (empty after sanitizing). Change:

```ts
    sources: recentEvents(normalized.filter(isAgentSourceEntry)),
```
to:
```ts
    sources: recentEvents(normalized.filter(isAgentSourceEntry)).filter(
      (event) => Boolean((event.label || "").trim() || (event.summary || "").trim())
    ),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest --config jest.config.cjs src/app/components/chat/AgentInspectorPanelModel.test.ts`
Expected: PASS (existing + new). No regression in source/artifact/browser/cron/trace classification.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/chat/AgentInspectorPanelModel.ts src/app/components/chat/AgentInspectorPanelModel.test.ts
git commit -m "fix(chat): sanitize inspector source chips against scaffold leak (PR1 3/4)"
```

---

### Task 4: Regression contract + no-regression sweep

**Files:**
- Test: `src/app/components/chat/rendering/scaffoldSanitizer.test.ts` (add the keystone contract)

- [ ] **Step 1: Write the failing test**

Append to `scaffoldSanitizer.test.ts`:

```ts
describe("regression contract: internal system-prompt sections never appear", () => {
  const LEAK =
    "Answer.\n\n## Brain Architecture\nbody\n## Memory Link Types\nbody\n" +
    "## Response Protocol\nbody\n## Channel Attachments\nbody\n" +
    "## Task Decomposition\nbody\n## Safety\nbody\n" +
    "<memory_for_turn>x</memory_for_turn>[[ZAKI_IDENTITY_RULES_V1]]y[[/ZAKI_IDENTITY_RULES_V1]]";

  it("removes every stable_prompt_marker section from a full leaked block", () => {
    const out = sanitizeAssistantScaffold(LEAK);
    for (const marker of STABLE_PROMPT_MARKERS) {
      expect(out).not.toContain(marker);
    }
    expect(out).not.toMatch(/ZAKI_/);
    expect(out).not.toMatch(/memory_for_turn/);
    expect(out.trim()).toBe("Answer.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or passes) and lock it**

Run: `npx jest --config jest.config.cjs src/app/components/chat/rendering/scaffoldSanitizer.test.ts`
Expected: PASS (the sanitizer already handles this; this test pins the contract so future regressions break the build).

- [ ] **Step 3: Run the chat render + bubble suites to confirm no regression**

Run:
```bash
npx jest --config jest.config.cjs src/app/components/chat/rendering src/app/components/chat/MessageBubble.test.tsx src/app/components/chat/AgentInspectorPanelModel.test.ts
```
Expected: all PASS. If `ChatArea.test.tsx` is quick enough, also run it; otherwise note it for CI.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/chat/rendering/scaffoldSanitizer.test.ts
git commit -m "test(chat): lock 'system-prompt sections never render' regression contract (PR1 4/4)"
```

- [ ] **Step 5: Open the PR**

```bash
git push -u origin chatarea/scaffold-sanitizer
gh pr create --base main --title "fix(chat): never render master-prompt/context scaffold (display-lane guard)" \
  --body "PR1 of the canonical-view work. Adds sanitizeAssistantScaffold (display-lane guard) at the agent-reply chokepoint + inspector source chips. Active mitigation while the engine leak fix is parked (INVESTIGATION-context-leak.md). No visual change for clean content. Design: SPEC-2026-06-14-chatarea-canonical-view.md."
```

---

## Notes for PR2 / PR3 (not this plan)
- PR2 stops the sanitizer from stripping `<reflection>` and instead routes it to a shown collapsed `reasoning` part inside `<TurnActivity>` (reflection moves HIDE → SHOW).
- PR3 builds `TurnViewModel` (`TurnPart[]` + `ToolState`) and renders parts in stream order (the `MessageBubble.test.tsx:126` text→tool→text fixture is the interleaving regression test).
