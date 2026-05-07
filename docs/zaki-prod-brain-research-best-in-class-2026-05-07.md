# Brain — best-in-class research for the "mind map of your life"

**Authored:** 2026-05-07 by FE/UI agent during brain deep dive
**Question Nova asked:** *"do a good research to know how can we make the graph view really a mind map of users life"*
**Format:** survey of the category, what to steal per product, synthesis at the end with concrete ZAKI moves.

The category has two distinct lineages worth understanding before listing products. They make different design choices and ZAKI's pitch sits between them.

## Two lineages

**(1) Graph-of-notes (Obsidian / Roam / Logseq).** Treat memory as a *file system* with explicit cross-references. Users *write* notes, *link* notes via `[[wiki-syntax]]` or block-references, and the graph view is a derived overview of those manual links. Strength: the user owns the structure. Weakness: the graph rewards heavy-curation power-users; first-time users see a sparse useless graph.

**(2) Visual mind map (TheBrain / MindMeister / Heptabase).** Treat memory as a *spatial canvas* with typed connections and one focused node at a time. Users *draw* the structure they want. Strength: feels like a map of life. Weakness: nothing is automatic — building it is its own job.

**ZAKI sits in a third lineage: agent-grown memory.** The agent builds the structure for the user. The user *audits, corrects, navigates* — they don't *create*. This is closer to (2) in spirit (typed mind map of life) but closer to (1) in implementation (graph derived from data). Nobody else is here yet. The pitch is: *"Every other tool needs YOU to make the connections. ZAKI makes them, lets you watch them form, and tells you when it changed its mind."*

---

## Tool-by-tool: what they got right, what ZAKI takes / leaves

### Obsidian (graph-of-notes)
The cited inspiration. Local markdown files + `[[bidirectional-links]]` + plugin ecosystem.

**What's strong:**
- The graph view is *clean* — small dots, force-directed layout, hover-to-label. ZAKI already mirrors this aesthetic.
- Color-by-folder + filter chips → users can group visually.
- "Local graph" panel — focused subgraph around the active note. ZAKI has the equivalent (`enterLocalMode`).
- Plugin ecosystem extends the graph (e.g. Excalidraw, Juggl) — not directly for ZAKI, but proves the graph is a *substrate* for further tools.

**What's missing for ZAKI's pitch:**
- The graph rewards manually-linked vaults. A first-time user with 0 links sees nothing meaningful. ZAKI generates the links automatically — should *show users that working* as the hero moment.
- No semantic categorization out-of-the-box. Folders are spatial, not topical. ZAKI can leapfrog by giving users topic-coloring without asking them to organize.
- Nothing temporal in the graph. ZAKI's TimeScrubber is already ahead.

**Take:** the visual restraint, the local-graph affordance, the plugin idea (later: surface-extension marketplace).

**Leave:** the assumption that user does the linking.

### Roam Research (graph-of-notes + temporal spine)
Daily notes as the default page + block-level bidirectional links + datalog-like queries.

**What's strong:**
- **The daily-notes spine.** Every entry has a date. Browsing by day is the primary navigation. The graph is a *secondary* view derived from explicit links. This is genuinely powerful: users always have a temporal anchor.
- Block references: every paragraph has a stable ID and can be linked / transcluded. Memory as composable atoms.
- "Linked References" panel: any note shows the *unlinked mentions* of its title across the rest of the corpus. ZAKI's source-attribution does this for explicit memory→source; the inverse (source→all-derived-memories) would be powerful.

**What's missing:**
- Roam's "graph of pages" is famously visually messy — too many automatic links from co-occurrence. Same noise problem as ZAKI before the threshold slider.
- No semantic clustering by topic — links are explicit-only.

**Take:** the daily-notes-as-spine. ZAKI has TimeScrubber + Born/Archived per day, but the *primary* navigation is still the graph. Could add a "Today" card at the top of /brain showing what ZAKI learned today.

**Take:** "linked references" inversion — for every memory, show *all the conversations it derived from* (already in source-attribution) AND *all the memories that reference back to it* (would need backend support for back-references).

**Leave:** the messy auto-graph (already addressed by the threshold slider).

### Logseq (graph-of-notes, open-source Roam)
Outliner-first PKM. Each block can become a graph node.

**What's strong:**
- **Block-level graph nodes**, not just page-level. Granular memory units.
- Datalog query language → users can write structured queries against their own brain.
- Local-first, plain text storage.

**What's missing:**
- Graph view is a less-polished Obsidian. Same overview-everything pattern.
- Steep learning curve.

**Take:** block-level memory granularity is closer to how ZAKI's memories work (each `daily` memory is a block-sized fact, not a whole "page"). ZAKI is *already* block-granular implicitly. Could surface this more.

**Take (later):** structured query language. Power-user feature, not Phase 4.

**Leave:** the outliner UI paradigm — wrong fit for ZAKI's chat-driven model.

### TheBrain (visual mind map — pioneer since 1996)
Typed connections (Parent / Child / Jump), one **active thought** at the center, neighbors fanning out by type, animated camera that moves between nodes.

**What's strong:**
- **Focus-mode-as-primary.** TheBrain centers ONE node and fans neighbors out around it. The user navigates by clicking neighbors, the camera animates to re-center. There is no "overview of everything." This is the strongest claim to "mind map of your life" of any product.
- **Typed connections.** Parent (broader), Child (narrower), Jump (sibling-y / cross-reference). Three semantic relationship types render visually distinct on the canvas.
- **Tags.** Every thought has tags; tags become navigation aids.
- **Cleanest UX for "knowing what you know."** TheBrain's camera transitions feel like navigating a memory palace.

**What's missing:**
- No automation. User has to build every connection.
- Graphics feel dated.
- No agent — TheBrain is a tool, not a partner.

**Take (LOAD-BEARING):** the focus-mode-primary paradigm. **This is what ZAKI's brain page should feel like.** Open /brain → see "yourself" as the center node, your top-N most-important memories fanning out around you, click any to re-center. The current "force-directed mesh of all 40 visible nodes" is the *Obsidian* paradigm; ZAKI's pitch wants the *TheBrain* paradigm.

**Take:** typed connections render visually distinct. ZAKI has `link_type` in the data; today the canvas barely uses it because semantic edges drown everything. With the threshold slider + typed-edge emphasis, this becomes possible.

**Take:** smooth camera transitions when re-centering. We're already animating the local-graph entry; extend the same pattern to "click any node to re-center."

**Leave:** the parent/child/jump taxonomy. ZAKI's `link_type` predicates are richer (preference, attribute, relationship, etc.). Don't downgrade.

### Heptabase (spatial whiteboards)
Cards arranged on infinite whiteboards. Not a graph at all — spatial freeform.

**What's strong:**
- Cards exist on whiteboards. Users physically arrange related ideas in proximity.
- Multiple "views" of the same content (whiteboard, list, timeline, map).
- Visual hierarchy without forcing a specific topology.

**What's missing for ZAKI:**
- Manual organization. ZAKI memories are agent-grown — the user shouldn't have to arrange them.

**Take:** **multiple views of the same memory corpus**. ZAKI today has: graph view + timeline view. Could add: chronological feed view (Roam-style), topic-cluster view (Capacities-style), spatial board view (Heptabase-style). Same data, different lens.

**Take:** offer a *spatial* mode for users who want to manually arrange a subset (e.g. "memories about my kids" pinned to a corner). Not for v1.

**Leave:** as primary paradigm — too manual.

### Tana (supertags + structured fields)
Every block can be supertagged (`#person`, `#project`, etc.). Supertags trigger structured fields (a `#person` block has `birthday`, `email`, `relationship`).

**What's strong:**
- **Structured memory.** A "person" memory has different fields than a "project" memory. Filterable, queryable, displayable per-type.
- The *type* drives UI affordances — `#person` shows a profile card, `#project` shows a status board.

**What's missing:**
- Setup-heavy. User defines the supertag schemas.

**Take:** **typed memory cards.** ZAKI's memories all render the same in DetailPanel. They shouldn't. A `core` fact about a person should render with avatar / name / relationship, not as plain text. A `daily` event should render with timestamp / channel / participants. Different types deserve different cards.

**Take:** the ergonomic principle — *type drives display*. Land this as the DetailPanel evolution after backend adds topics/entities.

**Leave:** user-defined schemas. ZAKI's agent should derive types automatically.

### Capacities (typed objects PKM)
Person / Project / Place / Idea / Note / Image — built-in object types.

**What's strong:**
- **Out-of-the-box types** that map to user mental models.
- Typed graph view: filter to "show all my Projects" → graph reduces to projects + their relationships.
- Backlinks per type.

**What's missing:**
- Still requires user to assign types. But fewer types than Tana → less burden.

**Take:** **the type taxonomy.** People / Places / Projects / Events / Habits / Preferences / Beliefs. Map ZAKI's memories into these at ingest time (the agent already extracts much of this; a clean type field makes it visible). This is the structural change my backend-needs spec covered.

**Take:** **typed filter as primary navigation.** "Show me all my projects" should be a one-click filter on the brain page, not a graph-traversal exercise.

### Mem.ai (AI-first PKM, no graph)
Auto-tagging at ingest. Chronological feed. Search.

**What's strong:**
- **Auto-tagging happens at write-time** by an embedded model. The user never has to organize.
- Tags become filters / navigation.
- Chat-with-your-notes — RAG over the personal corpus.

**What's missing for ZAKI's pitch:**
- No graph view at all. Their bet was that a clean feed + AI search is enough. ZAKI's bet is that the graph is *valuable* for trust ("I can SEE what ZAKI knows").
- Tags don't visualize; they only filter.

**Take:** **the auto-tagging principle.** Already covered in my backend-needs spec (`topics` field). Mem.ai validated the user value of auto-tagging.

**Take:** **chat-with-your-brain.** A `/brain` chat surface where the user can ask "tell me about X" and ZAKI answers grounded in the memory graph. This is a natural Phase 4 feature — pairs the brain page with the chat experience.

**Leave:** the absence of a graph. ZAKI's graph is the differentiator; don't drop it.

### Reflect / Saga / Anytype (newer note-taking)
Variants of the Obsidian/Roam pattern with AI integration.

**What's strong (Reflect specifically):** beautiful design, fast, GPT-integrated for "ask about your notes" RAG.

**Take:** the design polish bar. Reflect feels expensive in a way Obsidian doesn't. ZAKI's brand can support that bar.

**Leave:** still graph-of-notes paradigm.

### Notion (database view)
Pages with relations.

**What's strong:**
- Relations between pages are first-class. A "Projects" database can link to a "People" database.
- Graph view (added 2024) shows the relations visually.

**What's missing for ZAKI:**
- Highly manual. Setup-heavy.
- Graph view is a recent add and not central to the product.

**Take:** the **relations-as-first-class** idea. ZAKI's typed `link_type` predicates are this. Just need to surface them better visually.

### Neo4j Bloom / Aura (enterprise graph DB visualization)
Power tooling for inspecting graph databases.

**What's strong:**
- **Cypher-like queries from a UI.** "Find all paths from X to Y of length ≤3, weighted by edge confidence."
- Pattern matching: highlight all "person knows person who works on project" triplets.
- Graph algorithms baked in: shortest path, betweenness centrality, community detection.

**What's missing:**
- Enterprise UX, not consumer.

**Take (later):** for power users only. A "Patterns" tab that shows learned patterns: "ZAKI noticed you mention X every Monday" / "These three memories form a triangle." Phase 4+, not booth.

**Leave:** the engineer-y query UI for now.

### Mem0 / Letta / MemGPT (AI agent memory infrastructure)
Architecture, not viewer. Mem0 sells "memory layer for LLM apps."

**What's strong:**
- The architecture pattern: extract facts, store with metadata, retrieve at inference time.
- Both have public memory schemas you can reference.

**What's missing:**
- No user-facing visualization at all. They're SDKs / APIs.

**Take:** ZAKI's brain page IS the missing user-facing layer for this category. No competitor in the agent-memory space has shipped a serious visualization. Pillar 1 territory.

---

## Adjacent paradigms worth a sentence each

- **Mind-mapping classics** (MindNode, MindMeister, XMind): radial hierarchy. Strong structure, but ZAKI's data is a network, not a tree. Don't use.
- **Whiteboards** (Miro, FigJam, Freeform): freeform spatial. Wrong primary paradigm; could borrow as alternate view.
- **TextThing** (academic — Christopher Alexander's pattern language UIs): rich annotation networks. Inspiration for typed connections rendering.
- **Personal CRMs** (Monica, Dex, UpHabit): people-only graphs. Some good "person card" UI patterns.

---

## Synthesis — the ZAKI moves matrix

What ZAKI takes from where, ordered by leverage on the "mind map of your life" pitch:

| Move | From | What it changes | Effort | Phase |
|---|---|---|---|---|
| **Focus-mode-as-primary** — open /brain to a centered "you" node, neighbors fanning out, click to re-center | TheBrain | Graph stops being "overview of dots," starts being "tour of you." THE biggest paradigm shift. | medium | post-topics |
| **Auto-tagged topics** + **typed memory cards** | Mem.ai + Tana + Capacities | Communities become life categories ("Gaming," "Family"), DetailPanel renders per-type, "Show me all my X" becomes a 1-click filter | high (needs backend) | filed in spec |
| **Daily-notes spine** — top of /brain shows "What ZAKI learned today" as a chronological card stack | Roam | Temporal anchor + accretion-visible. Pairs with the existing TimeScrubber. | low (FE only) | next |
| **Multiple views of same corpus** — graph / timeline / topic clusters / chronological feed | Heptabase | Different mental models served by same data | medium | post-topics |
| **Chat with your brain** — a `/brain` chat surface that answers grounded in the graph | Mem.ai + Reflect | Pairs the brain page with the agent | medium | Phase 4+ |
| **Linked references inversion** — for every memory, show all back-references | Roam | Trust / discoverability. Pairs with source attribution. | medium (needs backend) | post-topics |
| **Patterns tab** — "ZAKI noticed you mention X every Monday" | Neo4j Bloom | Power-user delight | low (computed FE) | Phase 4+ |
| **Visual restraint** + **local-graph drilldown** | Obsidian | Already done | shipped | n/a |
| **Truth-maintenance + supersede chain** | none | Unique to ZAKI | already shipped | n/a |
| **Cross-channel memory** | none | Unique to ZAKI | already shipped | n/a |

---

## What's structurally unique to ZAKI (the moat)

After surveying the field, five things ZAKI has that no other product does:

1. **Cross-channel referenced memory** — same memory referenced by Slack, Telegram, web. Single brain, multiple surfaces. None of the listed tools offer this.
2. **Self-correcting truth-maintenance** — V1.10. Supersede chain visible (V1.11 + recent stepper). Nobody has this UX.
3. **Source attribution** — every memory traces to a conversation timestamp + snippet. Mem.ai has tags-from-source; ZAKI shows the actual conversation excerpt.
4. **TimeScrubber Born/Archived diff** — the temporal accretion visible per day. Genuinely novel.
5. **Agent-grown structure** — user *audits*, doesn't *create*. The pitch.

The competitive line: *"Every other graph memory tool needs YOU to make the connections. ZAKI makes them for you, lets you watch the brain build itself, and tells you when it changed its mind."*

---

## Recommended sequence (post this research)

This is what I'd ship next, ordered by how much each move advances the "mind map of life" pitch:

1. **Insights strip with daily-notes flavor** — already on the deep-dive list. "What ZAKI learned today / this week / about you most often." Top of /brain. Roam-spine + Mem.ai-style narrative cards.

2. **Focus-mode-as-primary toggle** — when entering /brain, default to "centered on yourself" (or your highest-importance node) with first-degree neighbors fanning out. Add a "Show full graph" button to access the current overview-mode. TheBrain leapfrog.

3. **Topic chips as primary navigation** — once backend ships `topics`, the legend/filter strip becomes the primary nav. "Gaming · Family · Work · Travel" replaces the current Filters/Clusters/Loose-facts cluster.

4. **Search → canvas response** — already on the deep-dive list. Highlight + dim, not re-render.

5. **Typed memory cards in DetailPanel** — Person card, Project card, Event card. Drives off the topics/entities backend additions.

6. **Linked references panel** — inverse of source attribution. "Memories that reference this memory" / "Conversations that surface this fact."

Items 1, 2, 4 are pure-frontend, can ship before backend lands. Items 3, 5, 6 need backend's topics/entities work first.

The single highest-impact next move: **focus-mode-as-primary** (#2). Today /brain is "Obsidian for your AI's memory." After this, /brain is "TheBrain for your AI's memory" — and TheBrain's paradigm is what users mean when they say "mind map of my life."
