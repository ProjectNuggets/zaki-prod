# Chat Memory v2 — "Feels Known" (two-tier recall)

**Date:** 2026-06-11
**Branch:** `memory/chat-layer-v2`
**Status:** Design (approved in brainstorm; pending spec review)

## Context

The chat memory layer (Postgres + pgvector above the AnythingLLM chat engine) now
works end-to-end: binary on/off → **regex** extraction → embeddings → similarity
recall + an always-on **identity core** → key-based **supersede** (newest wins).
The AnythingLLM LLM-extractor was retired (slow/flaky/stateful); extraction is
stateless/local. Recent fixes persist extractor confidence (so the core populates)
and made preference translation non-blocking.

The remaining weakness is **recall**: regex only captures phrasings its patterns
know. Facts in novel phrasings ("I'm planning to travel to…", compound sentences),
or in languages without patterns (German), are silently never stored — so the
assistant doesn't "know" things the user clearly said. This design raises recall
**without** reintroducing an LLM extractor and **without** "embed everything"
(raw logs are 60–70 % noise; verbatim storage degrades retrieval precision).

## Goal & non-goals

**Goal:** Maximize recall — capture and reliably surface what the user reveals —
using only what we have (pgvector, the existing embedder, the classifier, regex).

**Non-goals:**
- No new LLM/chat extractor (the retired AnythingLLM path stays gone). A fast
  dedicated extractor remains a future north-star, out of scope here.
- No "embed everything" — questions/greetings/instructions are excluded.
- No per-language regex proliferation (the whack-a-mole ceiling).

## Architecture — two tiers in the `memories` table

Both tiers live in the existing `memories` table, distinguished by
`type = 'episodic'` (added to the allowed memory types).

| | **Tier 1 — Structured facts** (today) | **Tier 2 — Episodic** (new) |
|---|---|---|
| Source | regex extraction | first-person declarative sentences regex *missed* |
| Form | atomic canonical fact ("Lives in Berlin") | the raw sentence ("I just moved to Berlin for a new job") |
| Conflict key | yes → **supersede** (newest wins) | none |
| Confidence | persisted (clears 0.85 core floor) | n/a (recall-only) |
| Feeds | identity core + **Facts** dossier + recall | **recall only** (+ visible in **Timeline**) |
| Retention | unbounded (self-supersedes) | **bounded**: TTL + per-user cap, recency-weighted |

## Write path (per turn, memory on, async — unchanged trigger)

1. **Classify** (existing `classifyWithHeuristics`): proceed only for first-person
   **declarative** turns; skip questions/instructions/greetings (the entropy gate).
2. **Split** the message into sentences.
3. **Per declarative sentence:**
   - Run regex (`extractWithPatterns`). If it yields a structured fact → store
     **Tier 1** (conflict key, supersede, persisted confidence) — unchanged.
   - If it yields **nothing** → embed the cleaned sentence as **Tier 2 episodic**
     (`type='episodic'`, no conflict key).
4. **Dedup:** skip an episodic sentence that exact/near-duplicates an existing
   memory (reuse `findDuplicateMemory` / content-hash; plus a cosine guard so a
   sentence ~equivalent to an existing Tier-1 fact isn't double-stored).

Net: every first-person declarative sentence is captured **exactly once** — as a
clean fact or as an episodic sentence. Nothing meaningful is dropped.

## Read path (per turn)

`buildChatMemoryContext` / `buildFastContext` (unchanged shape):
1. **Identity core** (always-on, Tier-1 high-confidence) — unchanged.
2. **Similarity recall** over Tier 1 **and** Tier 2:
   - Episodic carries a **score penalty** (facts rank above episodic) **and an
     age decay** (recent episodic above stale).
   - The relevance floor (`ZAKI_CHAT_MEMORY_SEMANTIC_MIN`) and top-k cap apply to
     both, so irrelevant/old episodic falls away.
3. Inject on top via the `[[ZAKI_MEMORY_CONTEXT_V2]]` envelope (guardrail +
   recency on agent turns, per the merged design).

Superseded (`status='outdated'`) rows remain excluded by both retrieval queries
(already verified).

## Retention (Tier 2 only)

- **TTL:** default 90 days (`ZAKI_MEMORY_EPISODIC_TTL_DAYS`).
- **Cap:** default top-200 per user (`ZAKI_MEMORY_EPISODIC_MAX_PER_USER`); evict oldest.
- **Recency:** age-decay term in the episodic retrieval score
  (`ZAKI_MEMORY_EPISODIC_DECAY`). All env-configurable.
- Eviction runs opportunistically on write (cheap) and/or a periodic sweep.

## Multilingual (phased) — embedder, not regex

The two-tier design makes the system multilingual **for free at the capture
layer**: a German declarative regex misses → stored as episodic, no patterns.
The real lever is the **embedder** — `multilingual-e5-small` is available in
AnythingLLM and is **384-dim** (drop-in for `vector(384)`).

**VERIFIED (2026-06-11):** AnythingLLM **ignores the per-request `model` field**
for embeddings — identical text returned identical vectors for both
`all-MiniLM-L6-v2` and `multilingual-e5-small` (cosine 1.000000). The embedder is
chosen by **AnythingLLM's global config**, not per call. Implications:
- **It is an admin config change** (set the system embedder to `multilingual-e5-small`)
  — our `getEmbeddings` model string is cosmetic and should be removed/ignored.
- **Blast radius is cluster-wide.** The configured embedder is shared with the chat
  engine's own document RAG. Switching it means AnythingLLM's existing document
  embeddings become a mixed vector space and would need re-embedding too — this is
  bigger than the memory layer. Decide this is acceptable (or stand up a dedicated
  embed endpoint for memory) before switching.
- **e5 needs `query:`/`passage:` prefixes.** Mandatory for e5 quality, and must be
  **conditional on the configured model** — probe confirmed that adding e5 prefixes
  while a non-e5 model is configured *hurts* recall (cross-lingual cosine 0.187 →
  0.115). So `getEmbeddings` must prefix only when the configured model is e5.
- **Re-embed our memories** (Postgres) after the switch — vector space changes.
- **Retune the relevance floor.** e5's cosine distribution differs from all-MiniLM
  (higher, more normalized); the current `ZAKI_CHAT_MEMORY_SEMANTIC_MIN=0.1` would
  be wrong → ineffective floor → noise. Re-measure via the eval and reset it.
- **Classifier markers:** add per-language first-person + interrogative markers
  (German `ich/mein/mir`, `wo wohne ich?`) to the gate so non-English declaratives
  are captured at all. Small list per language, not extraction patterns.
- German Tier-1 regex (clean German *structured facts*) is **optional polish**.

**Value is measurable but unproven until the switch.** The per-request probe could
not test real e5 (config-controlled). After the admin switch + prefixes + re-embed,
run the eval (recall@5 + cross-lingual cases) to confirm the lift before trusting it.

## UI

- **Timeline** tab shows episodic memories (chronological), **deletable** — the
  user controls the fuzzier, un-superseded tier (wrong/stale/sensitive removal).
- **Facts** tab stays clean/structured (Tier-1 only).
- Per-response "memories used" chips already show what was injected.

## Data model

- Reuse `memories`. Episodic rows: `type='episodic'` (add to `ALLOWED_MEMORY_TYPES`
  / `normalizeStoredType`), `confidence_score` left at default, no `conflict_key`,
  embedding present.
- `getMemories` (Facts/dossier) excludes episodic; the Timeline query includes it.
- Retrieval includes both tiers with the episodic penalty/decay.

## Eval gate (extends the 3-bucket gate)

Add a **bucket 4 — extraction recall**: feed canonical first-person statements
*including phrasings regex misses* (e.g. "I'm planning to travel to Lisbon",
German once multilingual lands); assert each is recallable (via Tier 1 **or**
Tier 2) above the floor. Keep recall / supersede / precision buckets. Phase B
adds multilingual recall cases. This bucket is the proof the episodic layer
raised recall.

## Risks / honest notes

- **Embedder load:** episodic adds embedding calls (one per uncaptured sentence)
  on the async write path. The embedder is the cluster's lightweight all-MiniLM
  endpoint (not the retired chat extractor) — acceptable, but more embed volume.
- **Episodic noise:** recall-only, penalized + decayed + capped; long-tail
  contradictions possible but down-ranked. Tier-1 still owns the common cases.
- **Multilingual is gated** on the cluster serving a multilingual embed model +
  a re-embed migration.

## Phasing

- **Phase A (recall core, English):** Tier-2 episodic — per-sentence gap-fill,
  recency+cap retention, Timeline UI, eval bucket 4. No embedder change.
- **Phase B (multilingual):** admin-switch the AnythingLLM embedder to
  `multilingual-e5-small` (accept the cluster-wide blast radius, or use a dedicated
  embed endpoint) → conditional e5 `query:`/`passage:` prefixes in `getEmbeddings`
  → re-embed our memories → retune the relevance floor → classifier markers
  (German first) → multilingual eval cases. Gate on the eval lift.

Each phase: spec → plan → implement → eval-gated.
