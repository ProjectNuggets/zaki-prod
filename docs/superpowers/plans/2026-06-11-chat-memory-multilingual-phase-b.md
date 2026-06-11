# Chat Memory v2 — Phase B (Multilingual) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make chat memory recall work across languages (German + ~50 others) by switching the embedder to `multilingual-e5-small` — without per-language regex. The episodic tier already captures any-language sentences; this phase makes them *recall* correctly.

**Architecture:** The embedder is chosen by **AnythingLLM's global config** (the per-request model field is ignored — verified, cosine 1.0 for both model strings). So the model switch is an **admin/cluster action**, and our code must (a) apply e5's required `query:`/`passage:` prefixes *only when e5 is active* (controlled by a new `ZAKI_MEMORY_EMBED_MODEL` env flag, since code can't detect the model from the response), (b) re-embed existing memories (vector space changes), (c) retune the relevance floor. `multilingual-e5-small` is 384-dim → drop-in for the `vector(384)` column.

**Tech Stack:** Node.js (ESM), Postgres+pgvector, AnythingLLM `/v1/openai/embeddings`, Jest.

**⚠️ Hard dependency / blast radius:** Switching the AnythingLLM embedder is **cluster-wide** — it also re-bases the chat engine's own document RAG (its existing doc embeddings become a mixed vector space and need re-embedding too). Confirm that's acceptable (or stand up a dedicated embed endpoint for memory) before flipping the cluster config. All code here is **flag-gated and a no-op until `ZAKI_MEMORY_EMBED_MODEL` indicates e5**, so it can land safely before the switch.

**Out of scope (tracked from the holistic review, NOT this phase):** C1 committed `.env` secrets (rotate); I1 transactional supersede; I3 conflict-key index lookup; I4 fact retention.

---

## File Structure
- `backend/src/memory/operations.js` — `getEmbeddings(texts, {intent})` adds e5 prefixing behind the flag; tag query vs passage at the 5 call sites.
- `backend/src/memory-extraction.js` — German first-person + interrogative markers in `classifyWithHeuristics`.
- `backend/scripts/reembed-memories.mjs` — **new** one-time migration: re-embed every memory's content with the current embedder.
- `backend/scripts/memory-eval.mjs` — multilingual recall bucket (gated on the e5 flag so the eval stays green pre-switch).
- `docs/superpowers/ops/2026-06-11-multilingual-embedder-switch.md` — **new** runbook (the manual cluster steps + floor retune).

---

### Task 1: Intent-aware e5 prefixing in `getEmbeddings` (flag-gated)

**Files:** Modify `backend/src/memory/operations.js`; Test `backend/src/memory/operations.test.js`

- [ ] **Step 1: Failing test.** Add to `operations.test.js` (mock `../db.js` is not needed; mock `global.fetch` to capture the request body — follow how other tests stub fetch, or stub it inline):

```js
  it("getEmbeddings applies e5 query/passage prefixes only when the e5 flag is set", async () => {
    const prev = process.env.ZAKI_MEMORY_EMBED_MODEL;
    const calls = [];
    const realFetch = global.fetch;
    global.fetch = async (_url, opts) => {
      calls.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ data: [{ embedding: [0, 0, 0] }] }) };
    };
    try {
      const { getEmbeddings } = await import("./operations.js");
      process.env.NOVA_TYP_BASE_URL = "https://example.com";

      process.env.ZAKI_MEMORY_EMBED_MODEL = ""; // all-MiniLM: no prefix
      await getEmbeddings("hello", { intent: "query" });
      expect(calls.at(-1).input).toEqual(["hello"]);

      process.env.ZAKI_MEMORY_EMBED_MODEL = "multilingual-e5-small"; // e5: prefix
      await getEmbeddings("hello", { intent: "query" });
      expect(calls.at(-1).input).toEqual(["query: hello"]);
      await getEmbeddings("hello", { intent: "passage" });
      expect(calls.at(-1).input).toEqual(["passage: hello"]);
    } finally {
      global.fetch = realFetch;
      if (prev === undefined) delete process.env.ZAKI_MEMORY_EMBED_MODEL;
      else process.env.ZAKI_MEMORY_EMBED_MODEL = prev;
    }
  });
```
> Adapt the fetch-mock/return shape to whatever `getEmbeddings` actually parses (check the function — it reads `data[].embedding`). If `getEmbeddings` normalizes a single string vs array, keep the assertion on the prefixed value.

- [ ] **Step 2: Run, verify FAIL.** `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory/operations.test.js -t "e5 query/passage"`

- [ ] **Step 3: Implement.** In `operations.js`:
(a) Add a flag helper near the other `ZAKI_*` constants:
```js
function embedModelIsE5() {
  return /e5/i.test(String(process.env.ZAKI_MEMORY_EMBED_MODEL || ""));
}
```
(b) Change `getEmbeddings(texts)` → `getEmbeddings(texts, { intent = "passage" } = {})`. Normalize `texts` to an array as today, then if `embedModelIsE5()` map each input to `` `${intent === "query" ? "query" : "passage"}: ${input}` ``. Leave the rest (model field, fetch, dims) unchanged. (The `model` field in the body stays as-is — it's ignored by the cluster, but harmless.)
(c) Tag the call sites:
- `storeMemory` (~1273) → `getEmbeddings(normalizedContent, { intent: "passage" })`
- `updateMemory` (~1425) → `{ intent: "passage" }`
- health probe (~1157) → `{ intent: "passage" }`
- `buildContext` (~1688) → `{ intent: "query" }`
- `buildFastContext` (~1851) → `{ intent: "query" }`
- Also grep for any other `getEmbeddings(` callers (searchMemories, eval) and tag query sites as `query`, storage/backfill as `passage`.

- [ ] **Step 4: Run, verify PASS + no regression.** `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory`

- [ ] **Step 5: Commit.**
```bash
git add backend/src/memory/operations.js backend/src/memory/operations.test.js
git commit -m "feat(memory): e5 query/passage embedding prefixes behind ZAKI_MEMORY_EMBED_MODEL flag"
```

---

### Task 2: German classifier markers

**Files:** Modify `backend/src/memory-extraction.js`; Test `backend/src/memory-extraction.test.js`

- [ ] **Step 1: Failing tests.**
```js
  it("classifies German first-person declaratives as capturable", async () => {
    const { extractMemories } = await import("./memory-extraction.js");
    const r = await extractMemories("Ich wohne in Berlin und ich liebe Jazz");
    expect(r.facts.length + r.episodic.length).toBeGreaterThan(0);
  });
  it("does not extract from German questions", async () => {
    const { extractMemories } = await import("./memory-extraction.js");
    const r = await extractMemories("Wo wohne ich?");
    expect(r.facts).toEqual([]);
    expect(r.episodic).toEqual([]);
  });
```

- [ ] **Step 2: Run, verify FAIL.** `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory-extraction.test.js -t German`

- [ ] **Step 3: Implement** in `classifyWithHeuristics` (`memory-extraction.js`):
(a) Add German interrogatives to the existing `interrogativePatterns` block (which already handles `?` and EN/AR): add `/(?:^|\s)(?:wo|was|wie|wann|warum|wieso|welche|welcher|welches|wer)\b.*\?/i` (German question words followed by `?`). The trailing-`?` rule already catches most; this is belt-and-suspenders.
(b) Add German first-person markers to `firstPersonSignals`:
```js
    /\bich\b/i,            // I
    /\b(?:mein|meine|meinen|meinem|meiner|mir|mich)\b/i, // my/me
```
Order: these go in `firstPersonSignals`, which runs AFTER the interrogative + imperative guards (so "Wo wohne ich?" is already classified instruction before `\bich\b` is reached — verify ordering holds).

- [ ] **Step 4: Run, verify PASS + no regression.** `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest src/memory-extraction.test.js`

- [ ] **Step 5: Commit.**
```bash
git add backend/src/memory-extraction.js backend/src/memory-extraction.test.js
git commit -m "feat(memory): German first-person + interrogative classifier markers"
```

---

### Task 3: Re-embed migration script

**Files:** Create `backend/scripts/reembed-memories.mjs`

- [ ] **Step 1: Implement** (mirror `memory-eval.mjs`'s env-load + `initDb` pattern). The script re-embeds every memory's `content` with the **current** embedder (passage intent) and updates the `embedding` column. Batched, logs progress, safe to re-run.

```js
#!/usr/bin/env node
/**
 * One-time migration: re-embed every memory with the CURRENT embedder.
 * Run AFTER switching the AnythingLLM embedder (e.g. to multilingual-e5-small)
 * and setting ZAKI_MEMORY_EMBED_MODEL accordingly — the vector space changes,
 * so old vectors must be regenerated. Idempotent; safe to re-run.
 * Usage: node scripts/reembed-memories.mjs            (all users)
 *        node scripts/reembed-memories.mjs <userId>   (one user)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { initDb, dbAll, dbQuery, getDb } from "../src/db.js";
import { getEmbeddings } from "../src/memory/operations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.resolve(__dirname, "..", ".env"), path.resolve(__dirname, "..", ".env.local")]) {
  if (fs.existsSync(p)) dotenv.config({ path: p, override: p.endsWith(".env.local") });
}

async function main() {
  if (!String(process.env.DATABASE_URL || "").trim()) throw new Error("DATABASE_URL not set");
  await initDb();
  const userId = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;
  const rows = await dbAll(
    userId
      ? `SELECT id, content FROM memories WHERE user_id = $1 ORDER BY created_at ASC`
      : `SELECT id, content FROM memories ORDER BY created_at ASC`,
    userId ? [userId] : []
  );
  console.log(`Re-embedding ${rows.length} memories${userId ? ` for ${userId}` : ""}...`);
  let ok = 0, fail = 0;
  for (const [i, row] of rows.entries()) {
    try {
      const { embeddings } = await getEmbeddings(String(row.content || ""), { intent: "passage" });
      const vec = embeddings?.[0];
      if (!vec) { fail++; continue; }
      await dbQuery(`UPDATE memories SET embedding = $1::vector WHERE id = $2`, [`[${vec.join(",")}]`, row.id]);
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  [${row.id}] ${e?.message || e}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${rows.length} (ok=${ok} fail=${fail})`);
  }
  console.log(`Done. re-embedded=${ok} failed=${fail}`);
}

let code = 0;
try { await main(); } catch (e) { console.error("[reembed] fatal:", e?.message || e); code = 1; }
finally { try { await getDb().end(); } catch {} }
process.exit(code);
```

- [ ] **Step 2: Syntax check.** `cd backend && node --check scripts/reembed-memories.mjs`
- [ ] **Step 3: Commit.**
```bash
git add backend/scripts/reembed-memories.mjs
git commit -m "feat(memory): re-embed migration script for embedder switch"
```
> Do NOT run it yet — it runs only after the cluster embedder is switched (Task 5 runbook).

---

### Task 4: Multilingual eval bucket (flag-gated)

**Files:** Modify `backend/scripts/memory-eval.mjs`

- [ ] **Step 1: Implement.** Add a bucket that seeds a German memory and queries in English, asserting cross-lingual recall — but only when e5 is active (skip otherwise, so the eval stays green on all-MiniLM pre-switch). Mirror the existing bucket pattern (`{failures, rows}` + report section + aggregate into `failures`).

```js
// Bucket 5: multilingual recall (only meaningful with a multilingual embedder).
const MULTILINGUAL_CASES = [
  { fact: "Wohnt in Berlin", query: "where does the user live", expect: "berlin" },
  { fact: "Liebt Jazzmusik", query: "what music does the user like", expect: "jazz" },
];
async function runMultilingualChecks() {
  if (!/e5/i.test(String(process.env.ZAKI_MEMORY_EMBED_MODEL || ""))) {
    return { skipped: true, failures: [], rows: [] };
  }
  process.env.ZAKI_CHAT_MEMORY_VECTOR_ENABLED = "true";
  const failures = [];
  const rows = [];
  for (const c of MULTILINGUAL_CASES) {
    await clearEvalUserMemories();
    await storeMemory({ userId: EVAL_USER_ID, content: c.fact, type: "fact", metadata: { userVerified: true } });
    const res = await buildFastContext({ userId: EVAL_USER_ID, query: c.query, limit: RECALL_LIMIT });
    const hay = (res?.sources || []).map((s) => String(s?.content || "").toLowerCase()).join("\n");
    const ok = hay.includes(c.expect);
    if (!ok) failures.push(`multilingual: "${c.query}" did not recall "${c.expect}"`);
    rows.push({ query: c.query, ok });
  }
  return { skipped: false, failures, rows };
}
```
Wire into `main()` + report (print "(skipped — not e5)" when skipped) + aggregate failures.

- [ ] **Step 2: Run** (pre-switch, all-MiniLM): `cd backend && npm run memory:eval` → expect `RESULT: PASS` with the multilingual section showing "(skipped — not e5)". (Requires the tunnel up.)
- [ ] **Step 3: Commit.**
```bash
git add backend/scripts/memory-eval.mjs
git commit -m "test(memory): multilingual recall eval bucket (gated on e5 flag)"
```

---

### Task 5: Switch runbook + floor retune (ops doc)

**Files:** Create `docs/superpowers/ops/2026-06-11-multilingual-embedder-switch.md`

- [ ] **Step 1: Write the runbook** documenting the manual steps that gate go-live:
  1. **Decide blast radius:** switching the AnythingLLM system embedder re-bases the chat engine's document RAG too — confirm acceptable or use a dedicated embed endpoint for memory.
  2. **Switch** the AnythingLLM embedder to `multilingual-e5-small` (admin UI / config).
  3. **Set** `ZAKI_MEMORY_EMBED_MODEL=multilingual-e5-small` in `backend/.env` (activates e5 prefixes).
  4. **Re-embed:** `cd backend && node scripts/reembed-memories.mjs` (memory rows) — and re-embed the chat engine's docs per AnythingLLM.
  5. **Retune the floor:** run `npm run memory:eval`; read the cosine distribution it prints; set `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` to sit just below the correct-match cluster (e5 normalized cosines run higher than all-MiniLM's ~0.25–0.36; expect ~0.7–0.85). Re-run until recall@5 ≥ 0.85 and the multilingual bucket passes.
  6. **Rollback:** revert the cluster embedder, unset `ZAKI_MEMORY_EMBED_MODEL`, re-run the re-embed script (it always uses the current embedder).
- [ ] **Step 2: Commit.**
```bash
git add docs/superpowers/ops/2026-06-11-multilingual-embedder-switch.md
git commit -m "docs(memory): multilingual embedder switch runbook + floor retune"
```

---

## Final verification (code, pre-switch — all-MiniLM still active)
- [ ] `cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest` → all green (prefixes are a no-op without the flag; German markers additive).
- [ ] `cd backend && npm run memory:eval` → `RESULT: PASS`, multilingual bucket "(skipped — not e5)".
- [ ] `node --check scripts/reembed-memories.mjs`.

## Go-live (after the user/admin runs Task 5 runbook)
- [ ] Cluster embedder = multilingual-e5-small; `ZAKI_MEMORY_EMBED_MODEL` set; re-embed run; floor retuned.
- [ ] `npm run memory:eval` → recall@5 ≥ 0.85 **and** multilingual bucket PASS.
- [ ] Live: a German statement ("Ich wohne in Hamburg") is recalled by an English question ("where do I live?").
