# Chat Memory — "Feels Known" Activation — Design

**Date:** 2026-06-09
**Branch:** `memory-layer-activation` (recommend a dedicated impl branch — see §9)
**Author:** Nova / Mohammad (with Claude)
**Status:** Approved (rev 4 — added user on/off default-on; dropped backfill)

## 1. Scope (locked)

**In scope:** the **CHAT memory** layer — the Postgres per-user memory above the AnythingLLM (NOVA TYP) chat (`backend/src/memory/`), plus its ZAKI PROD UI (`src/app/components/memory/`).

**Out of scope:** the Agent / Nullalis / Brain knowledge-graph system. Untouched.

**Goal:** Make the chat assistant *feel like it knows the user* instead of feeling like a raw API call — by connecting machinery that **already exists**, low-effort, not overengineered, without over-personalizing. Stay in `zaki-prod`.

**Future direction (NOT now):** per [ADR-003](../../decisions/ADR-003-memory-control-plane.md), chat memory may later be retired and fed from the Agent Brain. So every improvement here is **source-agnostic** — better retrieval, injection, and UI work regardless of where memories come from.

## 2. Why it doesn't feel known today (verified)

1. **Retrieval is keyword-only on the live path.** Every memory is embedded on write (`operations.js:1229/1245`) and a hybrid vector engine exists (`buildContext` cosine `operations.js:1858`), but the live chat injection uses token-overlap `buildFastContext` (`operations.js:2239`). We pay for embeddings and ignore them.
2. **The product's profile of the user never reaches the model.** The deterministic identity machinery (below) only runs when the user *explicitly asks* "what do you know about me" (`isMemoryIntrospectionQuery` `operations.js:516`), and it **short-circuits to a direct reply** (`index.js:10584`) — it is never carried into a normal turn. So on "make it shorter," ZAKI knows nothing about you.
3. **Whole-conversation capture is off** (`ZAKI_ENABLE_SESSION_SUMMARIZATION` default off, `index.js:754`) and summaries are filtered out of injection (`operations.js:2250`).

## 3. The two-tier model (decisions, locked)

| Tier | Source | Trigger | Gate (anti-over-weighting) | Where injected |
|---|---|---|---|---|
| **Identity core** | deterministic / lexical (existing machinery) | **always-on, every turn, default ON** | **high-confidence only** + tiny size + "background, don't recite" framing | existing memory envelope, top section |
| **Relevant recall** | **semantic** (vector top-k) | query-triggered by the user's message | **min cosine-similarity floor** + "use only if relevant" framing | existing memory envelope, second section |

- **Query recall = semantic, not bounded by an identity cap** — similarity ranking *is* the relevance filter (your steer). Keep top-k (≤6) + a similarity floor so off-topic memories never enter context.
- **Identity core = deterministic lexical** — reuse the existing extraction/selection/render machinery (§4B). No LLM, no embeddings, predictable, debuggable, default-on, **reports only high-confidence facts**.
- **Injection channel = the existing envelope** `[[ZAKI_MEMORY_CONTEXT_V2]]…[[/]]` (`index.js:9838/10665`): rides inside the message payload to AnythingLLM but is **stripped client-side** so the user never sees it (`ChatArea.tsx:3890`) — neither a visible user turn nor the system prompt. (Its stripper already handles a legacy `[About this person…]` block — we're reviving that concept cleanly.)
- **User control:** memory is **ON by default**; a per-user setting (extending the existing policy preference) can turn it **off**, which disables capture and *both* injection tiers (§4D).

## 4. Design

### A. Semantic recall on the live path
**Where:** `buildFastContext` (`operations.js:1965`).
Add a vector candidate source mirroring `buildContext` (`operations.js:1848-1876`): embed the query (`getEmbeddings(query)` → `embeddings[0]`), run the existing cosine query (`(1-(embedding <=> $2::vector))`, `WHERE embedding IS NOT NULL`), **apply a minimum-similarity floor** (drop rows below ~0.5 cosine — tunable `ZAKI_CHAT_MEMORY_SEMANTIC_MIN`), merge with the existing keyword/importance candidates via the same `dedupeMemoryRows` + `rankContextCandidates`. Preserve introspection special-casing (`operations.js:2016-2056`).
- **Latency:** new `ZAKI_CHAT_MEMORY_EMBED_TIMEOUT_MS` (default **1200ms**); whole build already under `withTimeout(2500)`.
- **Fail-open:** any embedding error/timeout → today's keyword behavior, byte-identical. Zero regression on failure.
- **Rollback:** `ZAKI_CHAT_MEMORY_VECTOR_ENABLED` (default `"true"`).

### B. Always-on identity core (deterministic, the "feels known" lever)
**New:** `buildIdentityCore({ userId })` in `operations.js`, reusing existing pieces — **no new logic, just assembly**:
- **Select (deterministic, query-independent):** `selectDiverseIntrospectionMemories` (`operations.js:548`) already picks 1 identity-domain + 1 preference + 1 goal then fills, ranked & deduped. Add a **high-confidence floor**: keep only `getMemoryConfidenceScore ≥ 0.85` or `userVerified` (`operations.js:627`). If nothing qualifies → empty core → inject nothing.
- **Bound (anti-over-weighting):** ≤ **6 facts**, ≤ **~350 chars**, ordered **identity → preferences → current focus** (matches existing bucket order).
- **Render:** reuse `buildBucketedChatContext` (`operations.js:2164`, Profile/Preferences/Active buckets) — already labeled, char-budgeted, bilingual-friendly.
- **Cache:** per-user in-memory TTL (~5 min); recompute is one indexed query.
- **Gate flag:** `ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED` (default `"true"`).
- **Optional taxonomy add:** `identity:language` pattern in `extractConflictKey` (`operations.js:368`) — ZAKI is Arabic-first, so language is a key core attribute; today it's not an identity domain. Small, optional.

### Injection (A + B together, in the existing envelope)
`buildChatMemoryContext` returns two labeled sections; `index.js:10663-10669` wraps them in the envelope with **distinct framing per tier** (research-grounded — see §5):

```
[[ZAKI_MEMORY_CONTEXT_V2]]
About this person (background the user gave you; may be outdated and is user-editable).
Let it shape tone and assumptions. Do NOT restate or reference these unless directly relevant. Defer to the conversation.
<identity core: ≤6 labeled facts>

Possibly relevant memories — use ONLY if directly relevant to the request; ignore otherwise; do not quote verbatim.
<semantic top-k results>
[[/ZAKI_MEMORY_CONTEXT_V2]]
{user message}
```
No frontend change needed — the existing stripper removes the whole envelope from display.

### C. Whole-conversation capture
- Enable `ZAKI_ENABLE_SESSION_SUMMARIZATION=true` (frontend + handler already wired, `ChatArea.tsx:7938`).
- **Remove the `session_end` injection exclusion** (`operations.js:2250` and fallback `:2266`) so summarized memories are retrievable; dedup prevents redundancy.

### D. User-facing memory on/off (default ON)
Memory is **on by default**; the user can turn it off (also an ADR-003 "disable state" requirement). **Reuse the existing preference system — no new table, no new endpoint:**
- **Add an `"off"` policy** to `normalizeMemoryPolicy` (`policy.js:13`); `zaki_memory_preferences.policy` already stores free TEXT (default `'balanced'` = on).
- **Gate capture:** `processChatMemoryCapture` / `resolveMemoryCapturePolicy` (`operations.js:1178`) short-circuit when policy is `off`.
- **Gate injection:** the chat handler skips both tiers (core + recall) when the user's policy is `off`, checked alongside `shouldSkipChatMemoryContext` (`index.js:10663`).
- **UI:** add an "Off" option to `MemoryModeToggle` (`MemoryModeToggle.tsx:64` — already a clean mode list with `disabled` support) + copy; reuse `/api/memory/preferences` GET/POST.
- **Minor one-liners (kept, optional):** stamp `embedding_provider` on the `storeMemory` INSERT (`operations.js:1245`); fire-and-forget `last_accessed_at` bump on injection so the existing recency ordering actually works.

> **Backfill dropped** (per decision): semantic recall covers memories that have embeddings; new memories embed on write, and pre-existing un-embedded memories still surface via the lexical half of the hybrid retrieval — graceful, no one-time pass needed.

### E. UI — light: surface + finish
- **E1.** Make *"What ZAKI currently knows"* (`MemoryViewer.tsx:789`) discoverable beyond the buried modal (improve the home affordance, `en.json:355-358`). No new screen.
- **E2.** Fix the empty *"Raw records"* placeholder (`MemoryViewer.tsx:934-947`).
- **E3.** Show source context (space/thread) on pending confirmations (`threadId` stored `:53`, not shown).
- **Trust:** the viewer already lets users view/edit/delete — which is why the core framing tells the model the facts are "user-editable / may be outdated." Keep that loop visible.

### F. Proof — golden eval
**New:** `backend/scripts/memory-eval.mjs` + `npm run memory:eval`, fixture `backend/test-fixtures/memory-eval-cases.json` (~15–20 cases).
- **Recall:** seed a namespaced test user (real embeddings), measure **recall@k keyword baseline vs. semantic** on paraphrase queries.
- **Identity-core correctness:** given known high-confidence identity facts, the core surfaces the right ones within bounds; low-confidence facts are excluded.
- **Over-weighting check:** on off-topic turns, assert the core stays small and the semantic tier injects nothing below the similarity floor.
- **Thresholds:** semantic recall@5 ≥ 0.85 on paraphrases; exact-match recall@5 = 1.0 (no regression); added p95 < 1.2s.

## 5. Research-grounded guardrails (why these choices)

Over-personalization ("As someone who likes coffee, here's your answer…") is a documented failure mode, and **the strongest mitigation is gating before injection, not prompt wording** (OP-Bench arXiv 2601.13722; "When Personalization Misleads" arXiv 2601.11000). Applied here:
- **Gate, don't just instruct:** identity core = high-confidence only; semantic tier = cosine-similarity floor. Off-topic / low-confidence facts never enter context.
- **Two tiers, small always-on:** retrieval-only systems (Mem0, Zep) avoid always-on to dodge over-attention; production always-on blocks (ChatGPT "Helpful User Insights", Letta `human` block) stay small. We cap the core ≤6 facts / ~350 chars (Letta ceiling is ~2k chars).
- **Framing:** "background, don't restate unless relevant, defer to the conversation, may be outdated/user-editable" — mirrors ChatGPT's injected wording and Anthropic context-engineering guidance; use direct imperative phrasing.
- **Placement:** the demarcated envelope (near message) is lower-dominance than the system prompt; injecting every turn preserves consistency. Best of both for "feels known but doesn't dominate."
- **Structure:** stored structured, injected as a short labeled natural-language list, ordered identity → preferences → focus; facts effectively timestamped via recency ordering.
- **Confidence reporting:** only `confidence=high` facts in the core (ChatGPT tags injected facts `Confidence=high`). Stale handled by recency ordering + the floor; **read-time decay deliberately deferred** as overengineering for v1.

Sources: OP-Bench (2601.13722); When Personalization Misleads (2601.11000); Letta memory-blocks (letta.com/blog/memory-blocks); Mem0 (arXiv 2504.19413); Zep (arXiv 2501.13956); ChatGPT memory teardown (embracethered.com); Anthropic — Effective context engineering; Instruction Hierarchy (OpenAI).

## 6. Rollout & safety
Flag-gated for instant rollback (no code deploy):
- `ZAKI_CHAT_MEMORY_VECTOR_ENABLED` (default true) — A
- `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` (default ~0.5) — A
- `ZAKI_CHAT_MEMORY_EMBED_TIMEOUT_MS` (default 1200) — A
- `ZAKI_CHAT_MEMORY_IDENTITY_CORE_ENABLED` (default true) — B
- `ZAKI_ENABLE_SESSION_SUMMARIZATION` (default false; flip to enable) — C

Per-user on/off (D) is a **preference** (`policy = "off"`), not an env flag — default is `balanced` (on).

Order: A (semantic) → B (core) → C (summaries) → D (on/off control) → E (UI) → F throughout. F gates A and B.

## 7. Testing
- **Unit (Jest, ESM)** beside `memory/*.test.js`: vector merge/dedup + similarity floor; fail-open on embedding error; introspection preserved; `buildIdentityCore` selection (high-confidence floor, caps, ordering, empty-user); `policy="off"` skips capture AND both injection tiers; `normalizeMemoryPolicy` accepts `off`; access-tracking UPDATE fired.
- **Integration:** summaries recallable when enabled; envelope contains both labeled sections with correct framing (`routes.integration.test.js`, `chat-proxy.test.js`).
- **UI:** `MemoryViewer.test.tsx` for E2/E3.
- **Eval (F):** headline proof + over-weighting check.
- **Cleanup:** delete dead dup `backend/src/memory/ops_fixed.js`.

## 8. Files touched
- `backend/src/memory/operations.js` — A (vector + sim floor), B (`buildIdentityCore`), C (filters), D (capture gate on `off` + access bump + INSERT provider); two-section return from `buildChatMemoryContext`
- `backend/src/memory/policy.js` — D (`normalizeMemoryPolicy` accepts `"off"`)
- `backend/src/memory/capture.js` — D (skip capture when `off`)
- `backend/src/index.js` — A/B env wiring; build core + compose the two-section envelope (`:10663`); skip injection when user policy is `off`
- `backend/src/memory-extraction.js` — optional `identity:language` pattern
- `backend/scripts/memory-eval.mjs`, `backend/test-fixtures/memory-eval-cases.json` (new)
- `backend/package.json` — `memory:eval`
- `backend/.env.example` — document new flags
- `src/app/components/memory/MemoryViewer.tsx` (+ `.test.tsx`) — E1/E2/E3
- `src/app/components/memory/MemoryModeToggle.tsx` — D ("Off" option + copy)
- remove `backend/src/memory/ops_fixed.js`
- **No frontend change for injection** — existing envelope stripper already hides it.

## 9. Notes & assumptions
- **Branch:** `memory-layer-activation` is being committed to by another session (an unrelated telemetry feature landed on it). Recommend a dedicated `chat-memory-feels-known` branch for implementation.
- pgvector cosine index (`idx_memories_embedding`, `db.js:975`) assumed healthy; at low volume a sequential cosine scan is accurate/fast regardless.
- NOVA embeddings endpoint assumed reliable (probe `/api/memory/...?includeProviderProbe`).
- Core bounds (≤6 / ~350 chars / conf ≥0.85) and `ZAKI_CHAT_MEMORY_SEMANTIC_MIN` are starting values, tunable after eval.
