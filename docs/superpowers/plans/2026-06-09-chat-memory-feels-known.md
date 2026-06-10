# Chat Memory "Feels Known" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AnythingLLM chat feel like it knows the user by (1) making live memory retrieval semantic, (2) injecting a bounded always-on deterministic identity core, (3) capturing whole conversations, (4) giving users an on/off control — connecting machinery that already exists.

**Architecture:** Two-tier memory injected via the existing `[[ZAKI_MEMORY_CONTEXT_V2]]` envelope (stripped client-side): a high-confidence deterministic *identity core* (always-on) + *semantic recall* (query-triggered, similarity-floored). Per-user on/off via the existing policy preference. No new tables, no backfill, no agent/Brain work.

**Tech Stack:** Node.js/Express backend, Postgres + pgvector, NOVA TYP (AnythingLLM, OpenAI-compatible) for embeddings, React/TS frontend, Jest (ESM).

**Spec:** `docs/superpowers/specs/2026-06-09-memory-layer-activation-design.md`

**Branch:** `chat-memory-feels-known` (already cut from main HEAD).

---

## File Structure

**Backend (`backend/src/`):**
- `memory/operations.js` — add vector branch to `buildFastContext`; add `buildIdentityCore`; make `buildChatMemoryContext` return `{ context, sources, core }`; gate on `off`; `last_accessed_at` bump; INSERT `embedding_provider`.
- `memory/policy.js` — accept `"off"` policy; `buildMemoryCapturePolicyConfig("off")` → `{ id:"off", disabled:true }`.
- `memory/capture.js` — early-return when capture policy is disabled.
- `index.js` — read new env flags; compose the two-section envelope (core + recall).
- `memory-extraction.js` — optional `identity:language` pattern.
- `config-validation.js` / `.env.example` — document new flags.
- `scripts/memory-eval.mjs`, `test-fixtures/memory-eval-cases.json` — golden eval.

**Frontend (`src/`):**
- `lib/api.ts` — add `"off"` to `MemoryPolicy`.
- `app/components/memory/MemoryModeToggle.tsx` — add "Off" option.
- `app/components/memory/MemoryViewer.tsx` — surface summary (E1), fix Raw-records placeholder (E2), pending source (E3).
- `i18n/locales/en.json` — copy for "Off".

**Cleanup:** delete `backend/src/memory/ops_fixed.js` (dead dup).

---

## Task 0: Setup — env flags + dead-file cleanup

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/src/index.js` (env constant block near `:693`)
- Delete: `backend/src/memory/ops_fixed.js`

- [ ] **Step 1: Confirm `ops_fixed.js` is unreferenced**

Run: `grep -rn "ops_fixed" backend/src/ | grep -v "ops_fixed.js:"`
Expected: no output (no importers).

- [ ] **Step 2: Delete the dead file**

```bash
git rm backend/src/memory/ops_fixed.js
```

- [ ] **Step 3: Add env flags to `.env.example`**

Append under the memory section of `backend/.env.example`:

```
# Chat memory retrieval (feels-known)
ZAKI_CHAT_MEMORY_VECTOR_ENABLED=true
ZAKI_CHAT_MEMORY_SEMANTIC_MIN=0.5
ZAKI_CHAT_MEMORY_EMBED_TIMEOUT_MS=1200
ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED=true
```

- [ ] **Step 4: Add env constants in `index.js`**

Near the other `ZAKI_CHAT_MEMORY_*` constants (around `index.js:689-694`), add:

```javascript
const ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED =
  String(process.env.ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED || "true").toLowerCase() !== "false";
```

(The vector/semantic-min/embed-timeout flags are read inside `operations.js`; see Task 1.)

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example backend/src/index.js
git rm backend/src/memory/ops_fixed.js 2>/dev/null; git add -A
git commit -m "chore(memory): add feels-known env flags; remove dead ops_fixed.js"
```

---

## Task 1: Semantic recall on the live path (`buildFastContext`)

**Files:**
- Modify: `backend/src/memory/operations.js` (`buildFastContext` `:1965`, add a vector candidate source)
- Test: `backend/src/memory/context-retrieval.test.js`

**Context:** `buildFastContext` today pulls top-50 by importance and scores by token overlap. We add a parallel pgvector cosine query (the exact pattern `buildContext` already uses at `:1848-1876`), merged into the candidate pool. Fail-open: any embedding error → unchanged keyword behavior.

- [ ] **Step 1: Write the failing test (vector candidate is merged)**

Add to `backend/src/memory/context-retrieval.test.js`:

```javascript
test("buildFastContext folds in vector candidates when embeddings available", async () => {
  const { buildFastContext, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  // A memory that does NOT lexically match the query but is semantically close:
  __setTestDeps({
    getEmbeddings: async () => ({ embeddings: [[0.1, 0.2, 0.3]], provider: "novatyp" }),
    dbAll: async (sql) =>
      /embedding <=> /.test(sql)
        ? [{ id: "v1", content: "Prefers vegetarian food", type: "preference",
             metadata: {}, importance_score: 0.7, confidence_score: 0.9,
             source_thread_id: null, created_at: "2026-06-01", retrieval_score: 0.92 }]
        : [], // lexical returns nothing
  });
  const res = await buildFastContext({ userId: "u@x.co", query: "what can I eat?", limit: 3 });
  expect(res.sources.map((s) => s.id)).toContain("v1");
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npm test -- context-retrieval`
Expected: FAIL — either `__setTestDeps` is undefined or `v1` is absent (no vector branch yet).

- [ ] **Step 3: Add an injectable deps seam (top of `operations.js`)**

Near the existing test seams (`setStorageSupportProbeForTests` `:56`), add an internal indirection so the vector branch is testable. Add module-level:

```javascript
let __deps = { getEmbeddings, dbAll };
export function __setTestDeps(partial) { __deps = { ...__deps, ...partial }; }
```

(If `getEmbeddings`/`dbAll` are already module functions, reference them via `__deps.getEmbeddings(...)` / `__deps.dbAll(...)` *inside `buildFastContext` only* to keep blast radius minimal.)

- [ ] **Step 4: Add the vector branch inside `buildFastContext`**

In `buildFastContext` (`operations.js:1965`), after computing `normalizedQuery` and before the existing top-50 lexical query, add a guarded vector lookup mirroring `buildContext`:

```javascript
const vectorEnabled =
  String(process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED || "true").toLowerCase() !== "false";
const semanticMin = Number(process.env.ZAKI_CHAT_MEMORY_SEMANTIC_MIN || "0.5");
const embedTimeoutMs = Number(process.env.ZAKI_CHAT_MEMORY_EMBED_TIMEOUT_MS || "1200");

let vectorRows = [];
if (vectorEnabled) {
  try {
    if (await checkStorage()) {
      const embeddingResult = await withTimeout(
        __deps.getEmbeddings(normalizedQuery),
        embedTimeoutMs,
        "Chat memory query embedding"
      );
      const queryEmbedding = embeddingResult?.embeddings?.[0];
      if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
        const vectorLiteral = `[${queryEmbedding.join(",")}]`;
        vectorRows = (await __deps.dbAll(
          `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at,
                  (1 - (embedding <=> $2::vector)) AS retrieval_score
           FROM memories
           WHERE user_id = $1
             AND COALESCE(status, 'active') = 'active'
             AND embedding IS NOT NULL
           ORDER BY embedding <=> $2::vector ASC, importance_score DESC
           LIMIT 20`,
          [normalizedUserId, vectorLiteral]
        )).filter((r) => Number(r.retrieval_score || 0) >= semanticMin);
      }
    }
  } catch (err) {
    console.warn("[Memory] Vector fast-context lookup unavailable:", err.message);
  }
}
```

Then merge `vectorRows` into the candidate set the function already builds (it dedupes via `dedupeMemoryRows` and scores). Map vector rows through `normalizeMemoryRowForUse`, concatenate with the lexical/importance `memories` before the existing `dedupeMemoryRows(...)` call, and keep the existing scoring/sort (vector rows carry a real `retrieval_score`, so they survive the `retrieval_score > 0` filter).

- [ ] **Step 5: Run the test, verify it passes**

Run: `cd backend && npm test -- context-retrieval`
Expected: PASS — `v1` is in sources.

- [ ] **Step 6: Write the fail-open test**

```javascript
test("buildFastContext falls back to keyword when embeddings throw", async () => {
  const { buildFastContext, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  __setTestDeps({
    getEmbeddings: async () => { throw new Error("nova down"); },
    dbAll: async () => [{ id: "k1", content: "likes coffee", type: "preference",
      metadata: {}, importance_score: 0.7, confidence_score: 0.9, source_thread_id: null,
      created_at: "2026-06-01", retrieval_score: 0 }],
  });
  const res = await buildFastContext({ userId: "u@x.co", query: "coffee", limit: 3 });
  expect(res).toBeTruthy(); // no throw; keyword path still returns
});
```

- [ ] **Step 7: Run all memory tests + commit**

Run: `cd backend && npm test -- memory`
Expected: PASS.

```bash
git add backend/src/memory/operations.js backend/src/memory/context-retrieval.test.js
git commit -m "feat(memory): semantic vector recall on the live chat path (fail-open, similarity-floored)"
```

---

## Task 2: Deterministic always-on identity core (`buildIdentityCore`)

**Files:**
- Modify: `backend/src/memory/operations.js` (add `buildIdentityCore`; have `buildChatMemoryContext` return `core`)
- Test: `backend/src/memory/context-retrieval.test.js`

**Context:** Reuse `selectDiverseIntrospectionMemories` (`:548`) + a high-confidence floor + `buildBucketedChatContext` (`:2164`) to render a ≤6-fact / ~350-char core. Query-independent.

- [ ] **Step 1: Write the failing test (high-confidence only, bounded)**

```javascript
test("buildIdentityCore returns only high-confidence facts, bounded", async () => {
  const { buildIdentityCore, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  __setTestDeps({
    dbAll: async () => [
      { id: "a", content: "Lives in Riyadh", type: "fact",
        metadata: { conflictKey: "identity:location" }, importance_score: 0.9,
        confidence_score: 0.95, created_at: "2026-06-01" },
      { id: "b", content: "Maybe likes jazz", type: "preference",
        metadata: { conflictKey: "preference:jazz" }, importance_score: 0.4,
        confidence_score: 0.4, created_at: "2026-06-01" }, // below floor → excluded
    ],
  });
  const core = await buildIdentityCore({ userId: "u@x.co" });
  expect(core).toContain("Riyadh");
  expect(core).not.toContain("jazz");
  expect(core.length).toBeLessThanOrEqual(400);
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npm test -- context-retrieval`
Expected: FAIL — `buildIdentityCore` is not exported.

- [ ] **Step 3: Implement `buildIdentityCore`**

Add to `operations.js` (near `buildChatMemoryContext`):

```javascript
const IDENTITY_CORE_MIN_CONFIDENCE = Number(
  process.env.ZAKI_CHAT_MEMORY_IDENTITY_CORE_MIN_CONFIDENCE || "0.85"
);
const IDENTITY_CORE_MAX_ITEMS = 6;
const IDENTITY_CORE_MAX_CHARS = 350;

export async function buildIdentityCore({ userId }) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return "";
  const rows = (await __deps.dbAll(
    `SELECT id, content, type, metadata, importance_score, confidence_score, source_thread_id, created_at
     FROM memories
     WHERE user_id = $1 AND COALESCE(status, 'active') = 'active'
     ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST, created_at DESC
     LIMIT 40`,
    [normalizedUserId]
  )).map((row) => normalizeMemoryRowForUse(row));

  // High-confidence (or user-verified) only — gate before injection.
  const trusted = rows.filter(
    (r) => getMemoryConfidenceScore(r) >= IDENTITY_CORE_MIN_CONFIDENCE ||
           getMemoryMetadata(r).userVerified === true
  );
  if (trusted.length === 0) return "";

  // Deterministic diverse selection (identity → preference → goal → fill), bounded.
  const picks = selectDiverseIntrospectionMemories(trusted, IDENTITY_CORE_MAX_ITEMS);
  const rendered = buildBucketedChatContext(picks, IDENTITY_CORE_MAX_CHARS);
  return rendered.context || "";
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd backend && npm test -- context-retrieval`
Expected: PASS.

- [ ] **Step 5: Have `buildChatMemoryContext` also return the core**

In `buildChatMemoryContext` (`operations.js:2216`), gated by the identity-core flag, compute the core and include it in the return object. At the end, change the return to:

```javascript
const coreEnabled =
  String(process.env.ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED || "true").toLowerCase() !== "false";
const core = coreEnabled ? await buildIdentityCore({ userId }) : "";
const bucketed = buildBucketedChatContext(sources, maxChars);
return { ...bucketed, core };
```

(Keep the early `{ context: "", sources: [] }` returns; add `core: ""` to them so the shape is stable.)

- [ ] **Step 6: Test the combined shape**

```javascript
test("buildChatMemoryContext returns a core field", async () => {
  const { buildChatMemoryContext, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  __setTestDeps({
    getEmbeddings: async () => ({ embeddings: [[0.1, 0.2]], provider: "novatyp" }),
    dbAll: async () => [{ id: "a", content: "Lives in Riyadh", type: "fact",
      metadata: { conflictKey: "identity:location" }, importance_score: 0.9,
      confidence_score: 0.95, created_at: "2026-06-01", retrieval_score: 0.9 }],
  });
  const res = await buildChatMemoryContext({ userId: "u@x.co", query: "hi", limit: 6 });
  expect(typeof res.core).toBe("string");
});
```

- [ ] **Step 7: Run + commit**

Run: `cd backend && npm test -- memory`
Expected: PASS.

```bash
git add backend/src/memory/operations.js backend/src/memory/context-retrieval.test.js
git commit -m "feat(memory): deterministic high-confidence identity core (always-on, bounded)"
```

---

## Task 3: Compose the two-section envelope in the chat handler

**Files:**
- Modify: `backend/src/index.js` (`:10663-10681` injection block)
- Test: `backend/src/chat-proxy.test.js` (envelope shape) — plus a focused unit on a small helper.

**Context:** Today the handler wraps `memoryResult.context` in the envelope with one instruction line. We split into two framed sections: identity core (background, don't recite) + relevant recall (use-if-relevant).

- [ ] **Step 1: Add a pure envelope-builder helper (testable)**

In `index.js` near the envelope constants (`:9838`), add:

```javascript
function composeMemoryEnvelope({ core, context }) {
  if (!core && !context) return "";
  const parts = [MEMORY_CONTEXT_ENVELOPE_OPEN];
  if (core) {
    parts.push(
      "About this person (background they provided; may be outdated and is user-editable).",
      "Let it shape tone and assumptions. Do NOT restate or reference these unless directly relevant. Defer to the conversation.",
      core
    );
  }
  if (context) {
    parts.push(
      "Possibly relevant memories — use ONLY if directly relevant to the request; ignore otherwise; do not quote verbatim.",
      context
    );
  }
  parts.push(MEMORY_CONTEXT_ENVELOPE_CLOSE);
  return parts.join("\n");
}
```

Export it for tests (e.g. add to the module's test exports, or move to `chat-proxy.js` if that's where pure helpers live).

- [ ] **Step 2: Write the failing test**

In `backend/src/chat-proxy.test.js` (or a new `memory-envelope.test.js`):

```javascript
test("composeMemoryEnvelope emits two framed sections when both present", () => {
  const out = composeMemoryEnvelope({ core: "Profile:\n- Lives in Riyadh", context: "Active:\n- ships Tuesday" });
  expect(out).toContain("[[ZAKI_MEMORY_CONTEXT_V2]]");
  expect(out).toContain("About this person");
  expect(out).toContain("Do NOT restate");
  expect(out).toContain("Possibly relevant memories");
  expect(out).toContain("Riyadh");
});
test("composeMemoryEnvelope returns empty when nothing to inject", () => {
  expect(composeMemoryEnvelope({ core: "", context: "" })).toBe("");
});
```

- [ ] **Step 3: Run, verify fail → implement (Step 1 already has code) → verify pass**

Run: `cd backend && npm test -- chat-proxy`
Expected: FAIL then PASS after exporting the helper.

- [ ] **Step 4: Wire the helper into the handler**

Replace the injection block at `index.js:10663-10669`:

```javascript
        const envelope = composeMemoryEnvelope({
          core: memoryResult.core,
          context: memoryResult.context,
        });
        if (envelope) {
          enrichedMessage = `${envelope}\n${originalMessage}`;
          memoryInjected = true;
          memorySources = (memoryResult.sources || []).map((s) => ({ id: s.id, content: s.content, type: s.type }));
          recordMemoryTelemetry("context.injected", memorySources.length || 1);
        } else {
          recordMemoryTelemetry("context.miss");
        }
```

(The client stripper at `ChatArea.tsx:3890` already removes the whole `[[ZAKI_MEMORY_CONTEXT_V2]]…[[/]]` block — no frontend change.)

- [ ] **Step 5: Run + commit**

Run: `cd backend && npm test -- chat-proxy memory`
Expected: PASS.

```bash
git add backend/src/index.js backend/src/chat-proxy.test.js
git commit -m "feat(memory): two-section memory envelope (identity core + relevant recall)"
```

---

## Task 4: Whole-conversation capture — make summaries recallable

**Files:**
- Modify: `backend/src/memory/operations.js` (`buildChatMemoryContext` `:2250` and fallback `:2266`)
- Test: `backend/src/memory/context-retrieval.test.js`
- Doc: `.env.example` note that `ZAKI_ENABLE_SESSION_SUMMARIZATION=true` enables capture (server flag; no code change).

**Context:** Today both filters drop `metadata.source === "session_end"`. Remove those two filters so summarized memories are retrievable; dedup already prevents redundancy.

- [ ] **Step 1: Write the failing test**

```javascript
test("buildChatMemoryContext includes session_end memories", async () => {
  const { buildChatMemoryContext, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  __setTestDeps({
    getEmbeddings: async () => ({ embeddings: [[0.1]], provider: "novatyp" }),
    dbAll: async () => [{ id: "s1", content: "Planning a trip to Japan", type: "goal",
      metadata: { source: "session_end" }, importance_score: 0.8, confidence_score: 0.9,
      created_at: "2026-06-01", retrieval_score: 0.9 }],
  });
  const res = await buildChatMemoryContext({ userId: "u@x.co", query: "Japan", limit: 6 });
  expect(JSON.stringify(res.sources)).toContain("s1");
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `cd backend && npm test -- context-retrieval`
Expected: FAIL — `s1` filtered out.

- [ ] **Step 3: Remove the two `session_end` exclusion filters**

At `operations.js:2250` and `:2266`, delete the `.filter(... source !== "session_end")` clauses (keep the surrounding `.map(normalizeMemoryRowForUse)` and dedup).

- [ ] **Step 4: Run, verify it passes**

Run: `cd backend && npm test -- context-retrieval`
Expected: PASS.

- [ ] **Step 5: Document the enable flag + commit**

Add to `backend/.env.example` near memory section: `ZAKI_ENABLE_SESSION_SUMMARIZATION=false  # set true to capture memories from whole conversations`

```bash
git add backend/src/memory/operations.js backend/src/memory/context-retrieval.test.js backend/.env.example
git commit -m "feat(memory): make session-summary memories recallable in chat"
```

---

## Task 5: User on/off control — backend gate

**Files:**
- Modify: `backend/src/memory/policy.js` (accept `"off"`)
- Modify: `backend/src/memory/capture.js` (early-return when disabled)
- Modify: `backend/src/memory/operations.js` (`buildChatMemoryContext` returns empty when policy off)
- Test: `backend/src/memory/policy.test.js` (create if absent), `capture.test.js`, `context-retrieval.test.js`

- [ ] **Step 1: Write failing policy test**

In `backend/src/memory/policy.test.js`:

```javascript
import { normalizeMemoryPolicy, buildMemoryCapturePolicyConfig } from "./policy.js";
test("normalizeMemoryPolicy accepts off", () => {
  expect(normalizeMemoryPolicy("off")).toBe("off");
});
test("buildMemoryCapturePolicyConfig marks off as disabled", () => {
  expect(buildMemoryCapturePolicyConfig("off")).toEqual({ id: "off", disabled: true });
});
```

- [ ] **Step 2: Run, verify fail → implement**

Run: `cd backend && npm test -- policy`
Expected: FAIL.

In `policy.js`: add `"off"` to `MEMORY_POLICY_IDS` (`:1`) and add a case to `buildMemoryCapturePolicyConfig` (`:24`):

```javascript
    case "off":
      return { id: "off", disabled: true };
```

- [ ] **Step 3: Run, verify pass**

Run: `cd backend && npm test -- policy`
Expected: PASS.

- [ ] **Step 4: Gate capture — failing test**

In `backend/src/memory/capture.test.js`:

```javascript
test("processChatMemoryCapture skips when policy disabled", async () => {
  const { processChatMemoryCapture } = await import("./capture.js");
  const res = await processChatMemoryCapture({
    userId: "u@x.co", message: "I love sushi", policy: { id: "off", disabled: true },
  });
  expect(res).toEqual({ saved: [], review: [], duplicates: [], conflicts: [], skipped: [] });
});
```

- [ ] **Step 5: Implement the capture gate**

At the top of `processChatMemoryCapture` (`capture.js:114`, before `extractFacts`):

```javascript
  if (policy?.disabled) {
    return { saved: [], review: [], duplicates: [], conflicts: [], skipped: [] };
  }
```

- [ ] **Step 6: Gate injection — failing test + implement**

Test (in `context-retrieval.test.js`):

```javascript
test("buildChatMemoryContext returns empty when user policy is off", async () => {
  const { buildChatMemoryContext, setStorageSupportProbeForTests, __setTestDeps } =
    await import("./operations.js");
  setStorageSupportProbeForTests(async () => true);
  __setTestDeps({
    dbAll: async (sql) => /zaki_memory_preferences/.test(sql) ? [{ policy: "off" }] : [],
    getEmbeddings: async () => ({ embeddings: [[0.1]], provider: "novatyp" }),
  });
  const res = await buildChatMemoryContext({ userId: "u@x.co", query: "hi", limit: 6 });
  expect(res).toEqual({ context: "", sources: [], core: "" });
});
```

Implement at the very top of `buildChatMemoryContext` (`operations.js:2216`):

```javascript
  const prefs = await getMemoryPreferences(userId);
  if (normalizeMemoryPolicy(prefs?.policy) === "off") {
    return { context: "", sources: [], core: "" };
  }
```

(`getMemoryPreferences` and `normalizeMemoryPolicy` are already in this module.)

- [ ] **Step 7: Run all + commit**

Run: `cd backend && npm test -- memory policy`
Expected: PASS.

```bash
git add backend/src/memory/policy.js backend/src/memory/capture.js backend/src/memory/operations.js backend/src/memory/*.test.js
git commit -m "feat(memory): per-user on/off via policy=off (gates capture + injection)"
```

---

## Task 6: User on/off control — frontend

**Files:**
- Modify: `src/lib/api.ts` (`MemoryPolicy` type)
- Modify: `src/app/components/memory/MemoryModeToggle.tsx` (add "off" option)
- Modify: `src/i18n/locales/en.json` (copy)
- Test: existing component tests / typecheck

- [ ] **Step 1: Add `"off"` to the `MemoryPolicy` type**

In `src/lib/api.ts`, change the `MemoryPolicy` union to include `"off"`:

```typescript
export type MemoryPolicy = "balanced" | "ask_before_saving" | "save_less" | "save_more" | "off";
```

- [ ] **Step 2: Add the "Off" option to `MemoryModeToggle`**

In `MemoryModeToggle.tsx`: add to `policyMeta` (`:18`) and `options` (`:63`):

```typescript
// import Power from lucide-react at top
  off: {
    icon: Power,
    activeClass: "border-zaki-strong bg-zaki-subtle text-zaki-secondary",
  },
```
```typescript
  const options: MemoryPolicy[] = [
    "balanced", "ask_before_saving", "save_less", "save_more", "off",
  ];
```

- [ ] **Step 3: Add i18n copy**

In `src/i18n/locales/en.json` under `memoryPanel.mode`:

```json
"off": "Off",
"offHint": "Pause memory — ZAKI won't save new memories or use them in chat."
```

- [ ] **Step 4: Typecheck + test**

Run: `npm run -s typecheck && npm test -- MemoryModeToggle`
Expected: PASS (no type errors; toggle renders 5 options).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/app/components/memory/MemoryModeToggle.tsx src/i18n/locales/en.json
git commit -m "feat(memory-ui): add Off option to memory mode toggle"
```

---

## Task 7: Light UI — surface summary, fix placeholder, pending source

**Files:**
- Modify: `src/app/components/memory/MemoryViewer.tsx` (E2 Raw-records `:934-947`; E3 pending source)
- Modify: `src/app/components/chat/views/ZakiHomeView.tsx` or home affordance (E1) — link to the memory viewer's "What ZAKI knows"
- Test: `src/app/components/memory/MemoryViewer.test.tsx`

- [ ] **Step 1: E2 — fix the empty "Raw records" placeholder**

In `MemoryViewer.tsx:934-947`, the "Raw records" header has explanatory text but no body. Either (a) remove the standalone header so the existing list below stands alone, or (b) wrap the existing search/filter/list under it. Pick (a) for minimal change: delete the orphan header block, keep the list.

- [ ] **Step 2: E3 — show source thread on pending confirmations**

In the pending-confirmations card (`MemoryViewer.tsx:1019-1080`), where type/confidence/timestamp render, add the thread source if present using the existing `SourceChip` component (already imported and used for saved memories at `:1384-1396`):

```tsx
{pending.source_thread_id ? (
  <SourceChip channel={undefined} lane={pending.source_thread_id} role={undefined} />
) : null}
```

- [ ] **Step 3: E1 — make "What ZAKI knows" reachable from home**

The home surface already shows "Memory is on" / "See how memory works" (`en.json:355-358`). Wire its CTA to open the memory viewer (dispatch the existing `zaki:open-memory` event used by `openMemoryViewer`, `ChatArea.tsx:6473`). Add the click handler to the existing copy element.

- [ ] **Step 4: Update component test**

In `MemoryViewer.test.tsx`, add an assertion that pending items with a `source_thread_id` render a source chip, and that the orphan "Raw records" header is gone.

- [ ] **Step 5: Typecheck, test, commit**

Run: `npm run -s typecheck && npm test -- MemoryViewer`
Expected: PASS.

```bash
git add src/app/components/memory/MemoryViewer.tsx src/app/components/memory/MemoryViewer.test.tsx src/app/components/chat/views/ZakiHomeView.tsx
git commit -m "feat(memory-ui): surface 'what ZAKI knows', fix raw-records placeholder, show pending source"
```

---

## Task 8: Golden eval (proof + over-weighting check)

**Files:**
- Create: `backend/test-fixtures/memory-eval-cases.json`
- Create: `backend/scripts/memory-eval.mjs`
- Modify: `backend/package.json` (add `"memory:eval"`)

**Context:** Seeds a namespaced test user (real NOVA embeddings + Postgres), measures recall@k keyword vs. semantic, and asserts the identity core is high-confidence & bounded. Requires `NOVA_TYP_*` + a pgvector Postgres (uses the app's `dbAll`/`storeMemory`).

- [ ] **Step 1: Create the fixture**

`backend/test-fixtures/memory-eval-cases.json` — ~15–20 cases:

```json
[
  { "facts": [{ "content": "Lives in Riyadh", "type": "fact", "conflict_key": "identity:location" }],
    "query": "where should I get lunch near me?", "expectContains": ["Riyadh"] },
  { "facts": [{ "content": "Prefers vegetarian food", "type": "preference", "conflict_key": "preference:vegetarian" }],
    "query": "suggest a restaurant", "expectContains": ["vegetarian"] },
  { "facts": [{ "content": "Working on launching a chat product", "type": "goal", "conflict_key": "goal:launch-chat" }],
    "query": "what should I prioritize this week?", "expectContains": ["chat product"] }
]
```
(Expand to ~15–20 with paraphrase queries that keyword search would miss.)

- [ ] **Step 2: Create the eval script**

`backend/scripts/memory-eval.mjs`: for a fixed `userId = "memeval@local.test"`: clear that user's memories, `storeMemory` each fact, then for each case call `buildFastContext` with vector ON vs OFF (toggle `process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED`), compute recall@5 (did `expectContains` appear in returned sources), and print a table + aggregate. Also call `buildIdentityCore` and assert ≤6 items / ≤350 chars and only high-confidence facts. Exit non-zero if semantic recall@5 < 0.85 or exact-match regressed.

- [ ] **Step 3: Add npm script**

In `backend/package.json` scripts: `"memory:eval": "node scripts/memory-eval.mjs"`.

- [ ] **Step 4: Run the eval (manual gate)**

Run: `cd backend && npm run memory:eval`
Expected: prints keyword-baseline vs semantic recall table; semantic recall@5 ≥ 0.85; identity core within bounds; exit 0.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/memory-eval.mjs backend/test-fixtures/memory-eval-cases.json backend/package.json
git commit -m "test(memory): golden eval — semantic vs keyword recall + identity-core bounds"
```

---

## Task 9: Optional — `identity:language` taxonomy

**Files:**
- Modify: `backend/src/memory/operations.js` (`extractConflictKey` `:368`) and/or `backend/src/memory-extraction.js` prompt (`:88`)
- Test: `backend/src/memory/operations.test.js`

- [ ] **Step 1: Failing test**

```javascript
test("extractConflictKey tags language", () => {
  // via the exported path used by buildConflictFingerprint
  expect(buildConflictFingerprintForTest("I speak Arabic")).toMatchObject({ domain: "identity" });
});
```

- [ ] **Step 2: Add patterns**

In `extractConflictKey` patterns array (`:368`), add:

```javascript
    { regex: /i speak\s+([^.,]+)/i, key: "identity:language", type: "identity" },
    { regex: /(أتحدث|بتكلم|لغتي)\s+([^.,]+)/i, key: "identity:language", type: "identity" },
```

And add to the extraction prompt (`memory-extraction.js:88`): `"identity:language"`.

- [ ] **Step 3: Run + commit**

Run: `cd backend && npm test -- operations`
Expected: PASS.

```bash
git add backend/src/memory/operations.js backend/src/memory-extraction.js backend/src/memory/operations.test.js
git commit -m "feat(memory): capture identity:language (Arabic-first core attribute)"
```

---

## Self-Review (completed by author)

- **Spec coverage:** A→§Task1; B→Task2; envelope→Task3; C→Task4; D backend→Task5, D frontend→Task6; E→Task7; F→Task8; optional language→Task9. All spec items mapped.
- **Placeholders:** none — every code/test step has concrete content. (Task 8 fixture says "expand to ~15-20" — that is intentional scaling of identical-shape rows, with 3 concrete examples given.)
- **Type consistency:** `buildChatMemoryContext` returns `{ context, sources, core }` consistently (Tasks 2, 4, 5); `composeMemoryEnvelope({core, context})` matches (Task 3); policy `off` → `{ id:"off", disabled:true }` used identically in policy/capture (Task 5); `MemoryPolicy` union extended once (Task 6) and consumed by the toggle.
- **Gotcha flagged:** `__setTestDeps`/`__deps` seam (Task 1 Step 3) must wrap `getEmbeddings`/`dbAll` only inside the functions under test; if the existing tests already inject `dbAll` differently, follow that existing pattern instead.
