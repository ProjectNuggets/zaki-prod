# Backend-Needs Spec — Brain semantic-topic clustering + truncation + endpoint consistency

**Filed:** 2026-05-07 by FE/UI agent during brain deep dive
**Severity:** P1 — three diagnoses surfaced from a real-world test (Nova clicking "Sounds good, boss! 🎮…" in the orphan rail).
**Audience:** Nova / nullalis backend agent. Coordination needed.

## Three findings, ordered by impact

### 1. Communities are graph-topological. Topics are not.

Today the brain has these classification axes for memories:

- `kind`: `core` / `daily` / `conversation` (3 buckets, too coarse)
- `community_id`: Louvain on the link graph (depends on edges; orphans have no community)
- `link_type`: only on typed predicate edges

**Missing:** semantic topic / tag / entity classification.

A user asking "show me everything about gaming" cannot be answered. A memory like *"Sounds good, boss! 🎮 The memory pipeline is solid now…"* is clearly about gaming (the PS break + game emoji), but:

- It has zero edges (orphan)
- It has no community (Louvain needs edges)
- Its `kind` is `daily` (no topic granularity)
- There's no `topic` field

So the orphan rail correctly shows it as orphan. The graph correctly shows it isolated. The community legend correctly excludes it. Every layer is consistent — and every layer fails the user's mental model. *Gaming* is a topic; ZAKI doesn't have topics.

**Proposed contract:**

Add a `topics` field to memory records — array of short slugs derived at memory ingest:

```ts
type Memory = {
  // ... existing fields
  topics?: string[];      // e.g. ["gaming", "infrastructure"]
  entities?: string[];    // e.g. ["PS", "memory pipeline"] — proper-noun-ish references
}
```

Generation candidates:

- **Cheap:** small LLM post-process at ingest time. After a memory is stored, fire a follow-up call with the memory text and a fixed taxonomy ("classify into one or more of: people, places, projects, work, family, hobbies, gaming, food, travel, …") and store the result.
- **Cheaper still:** keyword extraction with a curated list of life-category trigger words.
- **Best:** clustering on embedding space — kmeans on the embedding vectors, name the clusters via LLM after the fact. Topics become emergent, user-specific.

For graph rendering:

- Frontend can switch the color preset and community boundaries from "Louvain communities" to "topic clusters" — much closer to user mental models
- Orphans-by-edges can be linked-by-topic in the graph (a "topic ring" view alongside the structural view)
- The brain page can offer "Show me everything about \<topic>" filter — a real differentiator

I'd want this for GA. Without it the brain stays a structural graph; *with* it, it becomes the "mind map of your life" Nova asked for.

### 2. Memory summary truncation at 196 characters.

Pulled this orphan from the live API:

```json
{
  "key": "2026-04-05:1139",
  "summary": "Sounds good, boss! 🎮 The memory pipeline is solid now — summaries are capturing, anchors are pointing, and the continuity architecture is operational. Enjoy the PS break. I'll be here when you ge"
}
```

Length: 196 chars. Ends mid-word at "ge" (presumably "get back"). The summary is hard-truncated at write-time. The `content` field returned by `/brain/memory/:key` is empty (separate bug, see #3 below).

**Proposed fix:** raise the summary-field cap at write time. Suggested 500 chars (most assistant replies fit) or unlimited with a separate `summary_short` field for list views.

Or just don't truncate — agent summaries are typically 1–3 sentences anyway. The cap is doing more harm than good.

### 3. Endpoint inconsistency for orphan memories.

Same memory, three endpoints, three different behaviors:

| Endpoint | Returns this memory? |
|---|---|
| `GET /brain/orphans` | ✓ yes |
| `GET /brain/memory/2026-04-05:1139` | ✗ **404 `memory_not_found`** |
| `GET /brain/graph?exclude_orphans=false` | ✗ not in node list |

So:
- The user clicks an orphan in the Orphans rail
- The frontend opens DetailPanel and fetches `/brain/memory/:key`
- That call 404s
- DetailPanel shows error or empty state

**Proposed fix:** unify "what counts as a memory" across the three endpoints. The orphan rail and the detail endpoint must resolve the same set of keys. Most likely the orphan rail joins on a different table or uses a different validity filter than the detail endpoint.

Quick test: I can reproduce this with `2026-04-05:1139` against the dev BFF on localhost:8787. The 404 body is `{"error":"memory_not_found"}`.

## Frontend-side mitigations I'll ship while waiting

- **DetailPanel error state:** show a friendly "memory unavailable — backend says missing" instead of empty state, so the bug surfaces clearly.
- **Topic filter UI scaffold:** if the field is added, I want filter chips ready ("People", "Places", "Projects", "Work", etc.) keyed off `topics`. I'll mock the data shape so when the backend lands, only the data wiring needs swapping.

## How urgent

#1 (semantic topics) is the structural moat for the brain page. I'd hold the brain's "mind map" pitch until this lands.

#2 + #3 are both unblockers — they make the existing brain less broken. Cheap fixes if you have the diagnosis.

I can pause my brain frontend work pending #1 if it'd ship in the same sprint, or keep building polish on the existing data model and revisit when topics lands. Your call.
