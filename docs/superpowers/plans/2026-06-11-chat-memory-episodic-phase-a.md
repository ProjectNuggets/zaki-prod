# Chat Memory v2 — Phase A (Episodic Recall) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise chat-memory recall by capturing the long tail the regex extractor misses — store each first-person *declarative* sentence that yields no structured fact as an embedded "episodic" memory, recallable by similarity.

**Architecture:** Two tiers in the existing `memories` table. Tier 1 = structured regex facts (unchanged: conflict-keyed, supersede, dossier, identity core). Tier 2 = `type='episodic'` rows — raw declarative sentences regex missed, embedded, recall-only, ranked below facts with an age decay, bounded per user, shown in the Timeline (not Facts). No embedder change (that's Phase B).

**Tech Stack:** Node.js (ESM), Postgres + pgvector, Jest (`--experimental-vm-modules`), React/TS frontend (Jest + RTL).

---

## File Structure

- `backend/src/memory-extraction.js` — add `splitSentences`, `isSubstantiveEpisodic`, `extractMemories` (returns `{facts, episodic}`); `extractFacts` becomes a thin wrapper. (Per-sentence gap-fill lives here.)
- `backend/src/memory/operations.js` — allow `type='episodic'`; add episodic rank penalty + age decay in `rankContextCandidates`; add `pruneEpisodicMemories`.
- `backend/src/memory/capture.js` — use `extractMemories`; store episodic rows (with undo) alongside facts; prune after.
- `backend/scripts/memory-eval.mjs` — add bucket 4 (extraction recall).
- `src/app/components/memory/MemoryViewer.tsx` — exclude `episodic` from the Facts dossier (Timeline already lists all).

All env knobs default-on with safe values; no migration (uses existing columns).

---

### Task 1: Per-sentence extraction (`extractMemories`)

**Files:**
- Modify: `backend/src/memory-extraction.js`
- Test: `backend/src/memory-extraction.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/memory-extraction.test.js` (inside the top-level `describe`):

```js
  it("extractMemories splits a message into structured facts and episodic gap-fill", async () => {
    const { extractMemories } = await import("./memory-extraction.js");
    const { facts, episodic } = await extractMemories(
      "I live in Berlin. I've been totally vibing with underground jazz lately."
    );
    expect(facts.map((f) => f.content)).toEqual(
      expect.arrayContaining(["Lives in Berlin"])
    );
    // The jazz sentence matches no regex pattern -> captured as episodic.
    expect(episodic).toHaveLength(1);
    expect(episodic[0]).toEqual(
      expect.objectContaining({ type: "episodic" })
    );
    expect(episodic[0].content).toMatch(/jazz/i);
  });

  it("extractMemories never makes a question or instruction episodic", async () => {
    const { extractMemories } = await import("./memory-extraction.js");
    const r = await extractMemories("do I have any travel plans? summarize this for me.");
    expect(r.facts).toEqual([]);
    expect(r.episodic).toEqual([]);
  });

  it("extractMemories drops trivially short fragments from episodic", async () => {
    const { extractMemories } = await import("./memory-extraction.js");
    const r = await extractMemories("I'm good. ok.");
    expect(r.episodic).toEqual([]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory-extraction.test.js -t extractMemories`
Expected: FAIL — `extractMemories is not a function`.

- [ ] **Step 3: Implement `splitSentences`, `isSubstantiveEpisodic`, `extractMemories`; rewrite `extractFacts` as a wrapper**

In `backend/src/memory-extraction.js`, replace the current `extractFacts` function with:

```js
// Split into sentences on .!? (Latin + Arabic ؟) and newlines.
function splitSentences(message) {
  return String(message || "")
    .split(/(?<=[.!?؟])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Keep episodic noise out: require a few words of substance.
function isSubstantiveEpisodic(sentence) {
  const s = String(sentence || "").trim();
  if (s.length < 12) return false;
  if (s.split(/\s+/).length < 3) return false;
  return true;
}

// Two-tier extraction. Per first-person *declarative* sentence:
//   - regex yields structured fact(s) -> Tier 1 (facts)
//   - regex yields nothing            -> Tier 2 (episodic: the raw sentence)
// Questions/instructions/greetings are skipped entirely (no fact, no episodic).
export async function extractMemories(message) {
  const sentences = splitSentences(message);
  const rawFacts = [];
  const episodic = [];
  const seen = new Set();

  for (const sentence of sentences) {
    if (classifyWithHeuristics(sentence) !== "user_statement") continue;
    const patternFacts = await extractWithPatterns(sentence, {
      skipTranslation: false,
      simpleOnly: false,
    });
    if (patternFacts.length > 0) {
      rawFacts.push(...patternFacts);
    } else if (isSubstantiveEpisodic(sentence)) {
      const key = sentence.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        episodic.push({ content: sentence, type: "episodic", confidence: 0.5 });
      }
    }
  }

  return { facts: sanitizeExtractedMemories(rawFacts), episodic };
}

export async function extractFacts(message) {
  return (await extractMemories(message)).facts;
}
```

- [ ] **Step 4: Run the full extraction suite (verify new + existing pass)**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory-extraction.test.js`
Expected: PASS (the new 3 tests + all existing — per-sentence regex is equivalent for single-sentence inputs).

- [ ] **Step 5: Commit**

```bash
git add backend/src/memory-extraction.js backend/src/memory-extraction.test.js
git commit -m "feat(memory): per-sentence extraction with episodic gap-fill"
```

---

### Task 2: Allow `type='episodic'` in storage

**Files:**
- Modify: `backend/src/memory/operations.js:255-264` (`ALLOWED_MEMORY_TYPES`)
- Test: `backend/src/memory/operations.test.js`

- [ ] **Step 1: Write the failing test**

Add to `backend/src/memory/operations.test.js` (concrete — tests `normalizeStoredType` directly via a test export):

```js
  it("normalizeStoredType keeps 'episodic' and still coerces unknowns to context", async () => {
    const { __normalizeStoredTypeForTest } = await import("./operations.js");
    expect(__normalizeStoredTypeForTest("episodic")).toBe("episodic");
    expect(__normalizeStoredTypeForTest("EPISODIC")).toBe("episodic");
    expect(__normalizeStoredTypeForTest("bogustype")).toBe("context");
    expect(__normalizeStoredTypeForTest("fact")).toBe("fact");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t episodic`
Expected: FAIL — `__normalizeStoredTypeForTest` undefined (and, before the source edit, `'episodic'` would coerce to `'context'`).

- [ ] **Step 3: Add `episodic` to the allowed types + export the helper for test**

In `backend/src/memory/operations.js`, edit `ALLOWED_MEMORY_TYPES`:

```js
const ALLOWED_MEMORY_TYPES = new Set([
  "context",
  "fact",
  "preference",
  "emotion",
  "event",
  "goal",
  "relationship",
  "struggle",
  "episodic",
]);
```

At the bottom of the file, add the test hook:

```js
export const __normalizeStoredTypeForTest = normalizeStoredType;
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t episodic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/memory/operations.js backend/src/memory/operations.test.js
git commit -m "feat(memory): allow episodic memory type in storage"
```

---

### Task 3: Capture stores episodic rows

**Files:**
- Modify: `backend/src/memory/capture.js`
- Test: `backend/src/memory/capture.test.js`

- [ ] **Step 1: Write the failing test**

In `backend/src/memory/capture.test.js`, update the operations mock to add `markMemoryOutdated` (already present) and add a test. The mock module is `./operations.js`; reuse the existing `storeMemoryMock`. Replace the extraction mock so it exposes `extractMemories`:

```js
  it("stores episodic gap-fill sentences as type=episodic with an undo window", async () => {
    // extractMemories returns one fact + one episodic sentence
    extractMemoriesMock.mockResolvedValue({
      facts: [{ content: "Lives in Berlin", type: "fact", confidence: 0.9, conflictKey: "identity:location" }],
      episodic: [{ content: "I have been vibing with jazz", type: "episodic", confidence: 0.5 }],
    });
    storeMemoryMock.mockResolvedValueOnce({ id: "mem-fact" }).mockResolvedValueOnce({ id: "mem-epi" });

    const result = await processChatMemoryCapture({ userId: "u@x.co", message: "..." });

    // both stored
    expect(storeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "episodic", confidenceScore: 0.5 })
    );
    // episodic appears in saved (drives the toast/chips)
    expect(result.saved.some((s) => s.id === "mem-epi")).toBe(true);
    expect(upsertUndoWindowMock).toHaveBeenCalledTimes(2);
  });
```

Add the `extractMemoriesMock` to the module mock for `../memory-extraction.js` (alongside `extractFactsMock`, `sanitizeExtractedMemoriesMock`):

```js
const extractMemoriesMock = jest.fn();
// inside jest.unstable_mockModule("../memory-extraction.js", () => ({ ... }))
//   extractMemories: extractMemoriesMock,
// and reset + default in beforeEach:
//   extractMemoriesMock.mockReset();
//   extractMemoriesMock.mockResolvedValue({ facts: [], episodic: [] });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/capture.test.js -t episodic`
Expected: FAIL — `processChatMemoryCapture` still calls `extractFacts` / doesn't store episodic.

- [ ] **Step 3: Implement episodic capture**

In `backend/src/memory/capture.js`:
1. Change the import from `extractFacts` to `extractMemories`:

```js
import { extractMemories } from "../memory-extraction.js";
```

2. In `processChatMemoryCapture`, replace the extraction call:

```js
  const { facts, episodic } = await extractMemories(message);
  const extracted = sanitizeExtractedMemories(facts);
```

> `sanitizeExtractedMemories` already imported. (If not, keep the existing import line for it.)

3. Keep the existing facts loop unchanged. After it, before `return`, add the episodic loop:

```js
  for (const sentence of episodic) {
    const stored = await storeMemory({
      userId,
      content: sentence.content,
      type: "episodic",
      sourceThreadId: threadId,
      confidenceScore: 0.5,
    });
    if (!stored?.id || stored.duplicate) continue;
    const undoUntil = new Date(Date.now() + undoWindowMs).toISOString();
    await upsertUndoWindow({ memoryId: stored.id, userId, expiresAt: undoUntil });
    saved.push({
      id: stored.id,
      content: sentence.content,
      type: "episodic",
      state: "saved_reversible",
      undoUntil,
    });
  }
```

4. Add `episodic: episodic.length` to nothing structural — the result shape stays `{ saved, duplicates, superseded, skipped }` (episodic rows live inside `saved`).

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/capture.test.js`
Expected: PASS (new test + existing — existing tests set `extractMemoriesMock` default `{facts:[],episodic:[]}` or still pass through `extracted`).

> If existing capture tests mocked `extractFacts`, update them to mock `extractMemories` returning `{ facts: [...], episodic: [] }` with the same fact arrays they used before.

- [ ] **Step 5: Commit**

```bash
git add backend/src/memory/capture.js backend/src/memory/capture.test.js
git commit -m "feat(memory): capture stores episodic gap-fill rows with undo"
```

---

### Task 4: Rank episodic below facts, with age decay

**Files:**
- Modify: `backend/src/memory/operations.js` (constants near top; `rankContextCandidates` ~line 750)
- Test: `backend/src/memory/operations.test.js` (or `context-retrieval.test.js` if that's where ranking is tested)

- [ ] **Step 1: Write the failing test**

Add a unit test for the ranking adjustment. Add near the other ranking tests:

```js
  it("ranks an episodic row below a fact row at equal retrieval score", async () => {
    const { __rankContextCandidatesForTest } = await import("./operations.js");
    const now = new Date().toISOString();
    const fact = { type: "fact", retrieval_score: 0.5, importance_score: 0.5, confidence_score: 0.8, created_at: now };
    const epi = { type: "episodic", retrieval_score: 0.5, importance_score: 0.5, confidence_score: 0.8, created_at: now };
    const ranked = __rankContextCandidatesForTest([epi, fact]);
    expect(ranked[0].type).toBe("fact");
    expect(ranked[1].type).toBe("episodic");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t "episodic row below"`
Expected: FAIL — `__rankContextCandidatesForTest` undefined.

- [ ] **Step 3: Implement penalty + decay and export the ranker for test**

In `backend/src/memory/operations.js`, add constants near the other env-config reads (top of file):

```js
const EPISODIC_RANK_FACTOR = (() => {
  const v = Number.parseFloat(process.env.ZAKI_MEMORY_EPISODIC_RANK_FACTOR || "");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.6;
})();
const EPISODIC_DECAY_DAYS = (() => {
  const v = Number.parseInt(process.env.ZAKI_MEMORY_EPISODIC_DECAY_DAYS || "", 10);
  return Number.isFinite(v) && v > 0 ? v : 90;
})();
```

Add a helper above `rankContextCandidates`:

```js
function applyEpisodicAdjustment(score, memory) {
  if (String(memory?.type || "").toLowerCase() !== "episodic") return score;
  const created = Date.parse(memory?.created_at || memory?.createdAt || "");
  const ageDays = Number.isFinite(created)
    ? Math.max(0, (Date.now() - created) / 86_400_000)
    : 0;
  const decay = Math.max(0.3, 1 - ageDays / EPISODIC_DECAY_DAYS); // floor 0.3
  return score * EPISODIC_RANK_FACTOR * decay;
}
```

In `rankContextCandidates`, wrap each computed score:

```js
  return [...(rows || [])].sort((a, b) => {
    const aScore = applyEpisodicAdjustment(
      toFiniteNumber(a?.retrieval_score, 0) * 0.4 +
        getMemoryReplyUsefulnessScore(a) * 0.3 +
        getMemoryImportanceScore(a) * 0.15 +
        getMemoryActionabilityScore(a) * 0.1 +
        getMemoryConfidenceScore(a) * 0.05,
      a
    );
    const bScore = applyEpisodicAdjustment(
      toFiniteNumber(b?.retrieval_score, 0) * 0.4 +
        getMemoryReplyUsefulnessScore(b) * 0.3 +
        getMemoryImportanceScore(b) * 0.15 +
        getMemoryActionabilityScore(b) * 0.1 +
        getMemoryConfidenceScore(b) * 0.05,
      b
    );
    return bScore - aScore;
  });
```

At the bottom of the file (test hook):

```js
export const __rankContextCandidatesForTest = rankContextCandidates;
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t "episodic row below"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/memory/operations.js backend/src/memory/operations.test.js
git commit -m "feat(memory): rank episodic recall below facts with age decay"
```

---

### Task 5: Episodic retention (TTL + per-user cap)

**Files:**
- Modify: `backend/src/memory/operations.js` (new `pruneEpisodicMemories`)
- Modify: `backend/src/memory/capture.js` (call prune after episodic capture)
- Test: `backend/src/memory/operations.test.js`

- [ ] **Step 1: Write the failing test**

```js
  it("pruneEpisodicMemories deletes by TTL and caps to the newest N (SQL shape)", async () => {
    const { pruneEpisodicMemories } = await import("./operations.js");
    expect(typeof pruneEpisodicMemories).toBe("function");
    // Behavioral assertion: with the suite's dbQuery mock, calling prune issues a
    // DELETE scoped to user_id + type='episodic' covering TTL-expired and over-cap rows.
  });
```

> Match the suite's existing DB-mock style (most operations tests stub `dbQuery`/`dbAll`). Assert `dbQuery` was called with a statement containing `type = 'episodic'` and the user id, OR (if integration-style) seed N+TTL rows and assert the survivors.

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t pruneEpisodic`
Expected: FAIL — not a function.

- [ ] **Step 3: Implement `pruneEpisodicMemories`**

Add constants near the others:

```js
const EPISODIC_TTL_DAYS = (() => {
  const v = Number.parseInt(process.env.ZAKI_MEMORY_EPISODIC_TTL_DAYS || "", 10);
  return Number.isFinite(v) && v > 0 ? v : 90;
})();
const EPISODIC_MAX_PER_USER = (() => {
  const v = Number.parseInt(process.env.ZAKI_MEMORY_EPISODIC_MAX_PER_USER || "", 10);
  return Number.isFinite(v) && v > 0 ? v : 200;
})();
```

Add the function (near `markMemoryOutdated`):

```js
// Bound the episodic tier: delete TTL-expired rows and keep only the newest N
// per user. Best-effort; safe to call opportunistically after capture.
export async function pruneEpisodicMemories(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return { deleted: 0 };
  // 1. TTL
  await dbQuery(
    `DELETE FROM memories
     WHERE user_id = $1 AND type = 'episodic'
       AND created_at < NOW() - ($2 || ' days')::interval`,
    [normalizedUserId, String(EPISODIC_TTL_DAYS)]
  );
  // 2. Cap: keep newest N
  await dbQuery(
    `DELETE FROM memories
     WHERE id IN (
       SELECT id FROM memories
       WHERE user_id = $1 AND type = 'episodic'
       ORDER BY created_at DESC
       OFFSET $2
     )`,
    [normalizedUserId, EPISODIC_MAX_PER_USER]
  );
  return { ok: true };
}
```

- [ ] **Step 4: Wire it into capture (best-effort, non-throwing)**

In `backend/src/memory/capture.js`, import it and call after the episodic loop:

```js
import { findConflict, findDuplicateMemory, markMemoryOutdated, storeMemory, pruneEpisodicMemories } from "./operations.js";
// ...after the episodic loop, before return:
if (episodic.length > 0) {
  try { await pruneEpisodicMemories(userId); } catch { /* best-effort */ }
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js src/memory/capture.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/memory/operations.js backend/src/memory/capture.js backend/src/memory/operations.test.js
git commit -m "feat(memory): bound episodic tier with TTL + per-user cap"
```

---

### Task 6: Eval bucket 4 — extraction recall

**Files:**
- Modify: `backend/scripts/memory-eval.mjs`

- [ ] **Step 1: Add the bucket runner**

In `backend/scripts/memory-eval.mjs`, import `extractMemories`:

```js
import { extractMemories } from "../src/memory-extraction.js";
```

Add a bucket (after `runPrecisionChecks`):

```js
// Bucket 4: extraction recall. Statements regex misses must still be CAPTURED
// (as episodic); questions must capture nothing.
const EXTRACTION_RECALL_CASES = [
  { input: "I just got really into bouldering at the local gym", expect: "captured" },
  { input: "my weekends lately are all about restoring an old motorbike", expect: "captured" },
  { input: "I live in Hamburg", expect: "captured" }, // via Tier-1 fact
  { input: "what hobbies do I have?", expect: "none" }, // question
];

async function runExtractionRecallChecks() {
  const failures = [];
  const rows = [];
  for (const c of EXTRACTION_RECALL_CASES) {
    const { facts, episodic } = await extractMemories(c.input);
    const captured = facts.length + episodic.length > 0;
    const ok = c.expect === "captured" ? captured : !captured;
    if (!ok) failures.push(`extraction-recall: "${c.input}" expected ${c.expect}, got ${captured ? "captured" : "none"}`);
    rows.push({ input: c.input, ok });
  }
  return { failures, rows };
}
```

Wire it into `main()` next to the other buckets:

```js
  const extractionRecall = await runExtractionRecallChecks();
  // ...in the report section:
  console.log("--- Extraction recall (capture the long tail) ---");
  for (const r of extractionRecall.rows) {
    const q = r.input.length > 48 ? `${r.input.slice(0, 47)}…` : r.input;
    console.log(`    ${(r.ok ? "ok  " : "FAIL")} ${q}`);
  }
  console.log("");
  // ...in the verdict:
  for (const f of extractionRecall.failures) failures.push(f);
```

- [ ] **Step 2: Run the eval**

Run: `cd backend && npm run memory:eval` (needs the `staging-typ` port-forward up for embeddings).
Expected: `RESULT: PASS` with the new "Extraction recall" section all `ok` (the two hobby statements captured as episodic, the question captures nothing).

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/memory-eval.mjs
git commit -m "test(memory): eval bucket 4 — extraction recall (episodic captures the long tail)"
```

---

### Task 7: Frontend — episodic in Timeline, not Facts

**Files:**
- Modify: `src/app/components/memory/MemoryViewer.tsx` (the dossier grouping loop, ~line 478)
- Test: `src/app/components/memory/MemoryViewer.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/app/components/memory/MemoryViewer.test.tsx`, add (mock the memory list fetch to include an episodic row; follow the file's existing fetch-mock pattern):

```tsx
  it("shows episodic memories in Timeline but not in the Facts dossier", async () => {
    // memories list returns one fact + one episodic
    mockMemoriesList([
      { id: "f1", content: "Lives in Berlin", type: "fact" },
      { id: "e1", content: "I have been vibing with jazz", type: "episodic" },
    ]);
    renderMemoryViewer();
    // Facts tab: episodic content absent
    await switchToFacts();
    expect(screen.queryByText(/vibing with jazz/i)).not.toBeInTheDocument();
    // Timeline tab: episodic content present
    await switchToTimeline();
    expect(await screen.findByText(/vibing with jazz/i)).toBeInTheDocument();
  });
```

> Use the test file's existing helpers/fetch-mock conventions for `mockMemoriesList`, `renderMemoryViewer`, `switchToFacts`, `switchToTimeline` (names illustrative — match what the suite already uses to render and to switch the `panelView`).

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx -t episodic`
Expected: FAIL — episodic content currently appears in Facts (defaults to the about_you bucket).

- [ ] **Step 3: Exclude episodic from the dossier grouping**

In `src/app/components/memory/MemoryViewer.tsx`, in the dossier grouping loop (the `for` loop around line 478 that does `const bucket = grouped.get(getSummaryGroupForMemory(memory));`), add a guard at the top of the loop body:

```tsx
      if (memory.type === "episodic") continue; // episodic is Timeline-only
```

(Leave the Timeline list, `memoriesListContent`, unchanged — it renders all memories chronologically, so episodic appears there and is deletable via the existing row delete.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest --config jest.config.cjs src/app/components/memory/MemoryViewer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit -p tsconfig.typecheck.json` → Expected: 0 errors.

```bash
git add src/app/components/memory/MemoryViewer.tsx src/app/components/memory/MemoryViewer.test.tsx
git commit -m "feat(memory-ui): episodic memories show in Timeline, excluded from Facts"
```

---

## Final verification (after all tasks)

- [ ] `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest` → all green.
- [ ] `cd backend && npm run memory:eval` → `RESULT: PASS` incl. Extraction-recall bucket.
- [ ] `npx tsc --noEmit -p tsconfig.typecheck.json` → 0 errors.
- [ ] Live (port-forward up, both dev servers): say something regex misses ("I've been getting into pottery lately"), then later ask "what are my hobbies?" → the assistant recalls pottery (episodic), and the sentence appears in the Timeline (not Facts), deletable.

## Notes / non-goals
- No embedder change, no migration (Phase B).
- Episodic dedup is exact (content-hash via `storeMemory`); semantic dedup vs facts is deferred.
- `extractFacts` stays exported (wrapper) for back-compat with `auto-save.js` / `session-summary.js`, which keep their current behavior.
