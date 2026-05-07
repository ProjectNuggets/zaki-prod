# Backend-Needs Spec — Brain page (consolidated)

**Filed:** 2026-05-07 by FE/UI agent
**Audience:** Nova → backend agent (nullalis) for routing
**Supersedes & extends:** `docs/ui-needs-backend-brain-semantic-topics.md` (rolling that into this single spec for cleaner backend handoff)
**Severity:** P0 → P2 marked per item

This is everything the brain frontend needs from backend, ordered by leverage on the "mind map of your life" pitch. Each item has the question it answers, the proposed contract, why I want it, and what I can do without it.

---

## 1. Topics + entities at memory ingest [P1, structural moat]

**Question it answers:** *"Show me everything about gaming"* — currently impossible.

**Today's data model:**
- `kind`: `core` / `daily` / `conversation` (3 buckets)
- `community_id`: Louvain on link graph (graph-topological, not semantic)
- `link_type`: only on typed predicate edges

**Missing:** semantic topic / tag / entity classification.

**Why this matters:** the orphan I clicked on (*"Sounds good, boss! 🎮…"*) is clearly about gaming. It has zero edges → no community → no "gaming" cluster. Every layer of the system is internally consistent, and every layer fails the user's mental model. *Gaming* is a topic; ZAKI doesn't have topics.

**Proposed contract:**

```ts
type Memory = {
  // existing fields
  topics?: string[];      // life categories: ["gaming", "infrastructure"]
  entities?: string[];    // proper nouns: ["PS5", "Mia", "nullALIS"]
}
```

Generation candidates (cheapest first):
- (a) Curated keyword extraction with a list of life-category triggers
- (b) Small LLM post-process at ingest with a fixed taxonomy ("classify into: people, places, projects, work, family, hobbies, gaming, food, travel, …")
- (c) Embedding-cluster + LLM-name-the-clusters (best, user-specific)

Plus add to graph node payload:

```ts
type GraphNode = {
  // existing fields
  topics?: string[];
  entities?: string[];
}
```

**What I can do without it:**
- Frontend can mock topic chips with hardcoded `kind`-based mapping (`core` → "About you", `daily` → "Daily life", `conversation` → "Conversations") — already shipped as the legend.
- Real "show me all gaming memories" filter is impossible without `topics`.

**Effort:** medium (option a) → high (option c). Option (a) at ingest is probably 1–2 days.

---

## 2. User-identity anchor / "self node" [P1, focus-mode prerequisite]

**Question it answers:** when I open `/brain`, who am I looking at?

**Today's reality:** the brain is a graph of dots. There's no "you" anchor. Per the research doc, TheBrain's focus-mode-as-primary paradigm requires a centered node — and the obvious choice is *the user*. Today the highest-importance core node in the test corpus is `project_codename_nullalis_corrected` (importance 0.858) — useful, but not the user.

**Why this matters:** focus-mode-as-primary is the highest-leverage UX change for the "mind map of your life" pitch. It needs an anchor.

**Proposed contract:**

Option A — minimal: a new endpoint
```ts
GET /api/agent/brain/me
→ { key: string, summary: string, importance: number }
```
Returns the canonical "this is the user" memory. Probably the highest-importance memory tagged as `kind: "core"` AND containing the user's identity (boss_identity-style key in the test corpus). Backend picks the heuristic.

Option B — schema field: add `is_self: boolean` to memory records, set when the memory is the user's identity card. Frontend reads `nodes.find(n => n.is_self)`.

Option C — heuristic in frontend: pick the highest-importance core node with the highest degree. **I can do this today.** It picks "boss_identity"-style nodes naturally because they tend to have many edges (every memory references the user implicitly).

**My recommendation:** ship Option C now in frontend, file Option A or B as the canonical implementation later. Frontend can degrade to the heuristic when no `me` endpoint exists.

**What I can do without it:**
- Use the heuristic (highest importance + highest degree among `core` kind). Verified in the test corpus that `boss_identity` would be selected.
- Empty corpus → no center → fall back to today's overview-mode.

**Effort:** option A is a new endpoint, ~1 day. Option B is a schema migration + ingest hook, similar.

---

## 3. Local-graph at scale + edge weight/confidence [P1, focus-mode quality]

**Question it answers:** when I focus on a node, who are its real neighbors?

**Today's reality:**
```
GET /brain/local-graph?center_key=X&depth=1
→ { center_key, depth, nodes, edges, stats }
```

Two issues:
- (a) Local-graph edges have NO weight/confidence — even though the global graph endpoint emits them. The `e.weight` field is undefined on local-graph edges. Frontend has to fall back to `1.0` for layout.
- (b) `depth=1` returns ONLY direct neighbors. For sparse-edge nodes (like the test corpus's high-importance core), depth=1 returns just the center alone. depth=2 fixes this but the response can balloon.

**Proposed contract:**

```ts
// Add weight/confidence to local-graph edges (already in global graph)
GraphEdge.weight: number;
GraphEdge.confidence?: number;

// Add depth=auto: pick smallest depth that yields ≥N nodes
GET /brain/local-graph?center_key=X&min_nodes=15
→ depth chosen automatically; nodes/edges payload as today
```

**What I can do without it:**
- Use depth=2 by default; if response > N, post-filter in frontend.
- Synthesize weight=1.0 for layout (current code path).
- This works but is wasteful and the layout can't show "tighter" links because all edges are equal weight.

**Effort:** low. Reusing the global graph's weight emission code into the local-graph response.

---

## 4. Insights aggregation endpoint [P1, marketing surface]

**Question it answers:** *"What ZAKI learned about you this week."* The insights strip from the deep-dive doc.

**Today's reality:** I can derive most of these by combining `/brain/timeline` + `/brain/diff` + `/brain/communities`, but each takes a separate request and the math is duplicated work.

**Proposed contract:**

```ts
GET /api/agent/brain/insights
→ {
  asOf: number;  // unix timestamp
  newThisWeek: { count: number; sample: GraphNode[] };  // top 3-5
  newThisMonth: { count: number };
  correctedThisMonth: { count: number; sample: SupersedeEvent[] };
  oldestMemory: { ageDays: number; key: string; summary: string };
  topCommunity: { id: number; name: string; memberCount: number };
  topMemoryByImportance: { key: string; summary: string; importance: number };
  topEntity?: { name: string; mentionCount: number };  // needs entity-extraction (#1)
}
```

The cards on the strip:
- *"I learned 12 new things this week"* → `newThisWeek.count`, click to filter timeline
- *"I corrected myself 2 times this month"* → `correctedThisMonth.count`, click to view supersede chains
- *"You and I talk about Family more than anything"* → `topCommunity.name`, click to filter to that community
- *"Your oldest memory is 47 days old"* → `oldestMemory.summary`, click to navigate
- *"Most-referenced person: Mia"* → `topEntity` (gated on #1 entities)

**What I can do without it:**
- Ship the strip with frontend-derived stats from existing endpoints (one extra HTTP request each, slow).
- `correctedThisMonth` is hard to derive client-side — would need to fetch every memory's `valid_history` (N requests). Better to compute server-side.
- `topEntity` impossible without #1.

**Effort:** medium. Mostly aggregation queries against existing data + one new view of supersede events.

---

## 5. Supersede event count + "patterns" [P2, depth indicator]

**Question it answers:** *"How often does ZAKI correct itself?"* — the V1.10 truth-maintenance differentiator made auditable.

**Today's reality:** supersede events are visible per-memory in the supersede chain stepper (just shipped). But there's no aggregate count, no list of recent corrections.

**Proposed contract:**

```ts
GET /api/agent/brain/corrections?days=30
→ {
  count: number;
  events: Array<{
    correctedAt: number;
    oldKey: string;        // archived memory
    newKey: string;        // replacement
    oldContent: string;    // summary
    newContent: string;
    triggerSession?: string;  // conversation that caused the correction
  }>;
}
```

**Why this matters:** the supersede chain is unique to ZAKI. Surfacing the AGGREGATE ("ZAKI changed its mind 17 times this month") is a marketing line. Per-event view supports "watch ZAKI learn" video material for Web Summit.

**Effort:** medium. New endpoint + the frontend "Corrections" view (timeline-style scroll of supersede events).

---

## 6. Endpoint inconsistency — orphan in rail but 404 on detail [P0 unblock]

**Question it answers:** clicking an orphan in the Orphans rail produces a broken DetailPanel (404).

**Repro:** key `2026-04-05:1139`
- `GET /brain/orphans` → returns this memory ✓
- `GET /brain/memory/2026-04-05:1139` → **404 `memory_not_found`** ✗
- `GET /brain/graph?exclude_orphans=false` → not in node list ✗

**Proposed fix:** unify "what counts as a memory" across the three endpoints. Same key resolves the same way everywhere.

**What I can do without it:** show a friendly "memory unavailable — backend says missing" error in DetailPanel instead of empty state.

**Effort:** low. Likely one-line diff in the detail handler's WHERE clause.

---

## 7. Summary truncation at 196 chars [P1 data quality]

**Question it answers:** why does the orphan summary read *"I'll be here when you ge"* — cut mid-word?

**Today's reality:** summary field is hard-truncated at write-time at 196 characters. The orphan endpoint returns the truncated value; the detail endpoint returns empty content (separate bug, see #6).

**Proposed fix:** raise the cap or remove it. Agent summaries are typically 1–3 sentences; 500–1000 chars covers everything without bloating storage.

**Effort:** low. Schema change (column TEXT or VARCHAR(N)) + audit any client truncation paths.

---

## 8. Back-references / "memories that reference this" [P2, trust surface]

**Question it answers:** the inverse of source attribution — *"what other memories reference this fact?"*

**Today's reality:** source attribution renders the conversation excerpt that surfaced a memory. The inverse — *"this fact appears in N other memories"* — would need backend back-reference traversal.

**Proposed contract:**

```ts
GET /api/agent/brain/memory/:key/references
→ {
  inboundEdges: Array<{ source_key: string; type: string; predicate?: string }>;
  mentionedIn: Array<{ session_id: string; timestamp: number; snippet: string }>;
}
```

**What I can do without it:**
- Compute inboundEdges in frontend by filtering global graph edges (works for visible nodes only, not the full corpus).
- `mentionedIn` requires conversation-search, impossible client-side.

**Effort:** medium. Inbound edges are cheap (existing graph data); mentioned-in needs a conversation snippet search.

---

## 9. Cose-bilkent silent fallback (frontend-side, not backend) [P0 visible regression]

**Note:** including for completeness but this is FE work, not backend.

`runLayout` in `BrainGraphView.tsx::867` wraps the per-edge `idealEdgeLength` function in try/catch. Live preview shows the catch fires every layout run. The Pillar-1 differentiator (per-edge relevance-weighted distance) is silently disabled. Investigation diff candidate: clamp the function range tighter (`[0.7×base, 1.3×base]` instead of `[0.5×base, 1.5×base]`).

**Effort:** FE-only, ~1–2 hours of investigation.

---

## Priority order for backend handoff

If backend has 1 sprint:
1. **#6 endpoint consistency** (P0 unblock — 1-day fix)
2. **#1 topics + entities** (structural moat — 1–2 days for option a, biggest pitch payoff)
3. **#2 self-node** (focus-mode prerequisite — 1 day)
4. **#7 truncation** (data quality — 1 day)

If backend has 2 sprints, add:
5. **#3 local-graph weight + auto-depth** (focus-mode quality)
6. **#4 insights aggregation** (marketing strip)

Post-launch:
7. **#5 corrections view** (depth indicator)
8. **#8 back-references** (trust surface)

## What I'll ship in parallel on the frontend

Without waiting:
- Heuristic self-node selection (highest-importance core node with degree > 0)
- Focus-mode-as-primary toggle using that heuristic
- Insights strip with frontend-derived stats from existing endpoints
- DetailPanel error state for the 404 path
- Cose-bilkent fallback diagnosis (#9, FE-only)

When backend lands #1 (topics): swap heuristic → real topics, add topic chips as primary nav.
When backend lands #2 (self-node): swap heuristic → canonical self lookup.
When backend lands #4 (insights endpoint): swap derived stats → server response.

## Open questions for backend

1. **Ingest hook** — where in the agent pipeline is the right place to extract topics? At memory write, before commit? Or post-write asynchronously? The latter avoids slowing user-facing latency.
2. **Topic taxonomy** — fixed list (people, places, projects, …) or open clustering? I'd start with fixed; let it grow over time based on emergent themes.
3. **`is_self` schema vs heuristic** — does it make sense to have a single canonical "user identity" memory in the data model, or is "the user" really an emergent concept across many memories?
4. **Corrections view** — should it be a separate endpoint or a flag on the existing timeline? `?include_corrections=true` adding supersede events to the timeline stream is one option.

These are productive questions for the backend conversation. Ready when you are.
