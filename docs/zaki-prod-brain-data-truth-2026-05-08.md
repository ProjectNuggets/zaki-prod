# Why the brain isn't sellable — the data, not the rendering

**Authored:** 2026-05-08 by FE/UI agent in response to Nova's read:
> *"i don't like the graph, it is not mirroring the truth or linking facts together, it is not sellable no one will pay for that"*

He's right. I went into the gateway's database directly. The frontend isn't lying or under-rendering — it's faithfully showing a corpus where almost nothing is connected. The pitch fails because **the structure doesn't exist in the data**.

## Ground truth — `zaki_bot.*` schema, all users

| Metric | Count | Read |
|---|---:|---|
| Memories | **16,531** | ZAKI has stored a lot |
| Active memories | 16,451 | …almost none archived |
| Edges (typed predicate links) | **148** | …with almost nothing connecting them |
| Entities | 89 | trivial entity coverage |
| Communities | 35 | mostly stub clusters |
| **Edges per memory** | **0.009** | **less than one edge per 100 memories** |

## For Nova's user specifically (`user_id=1`)

| Metric | Count |
|---|---:|
| Memories | **7,377** active, across 45 ingestion days |
| Average memories ingested per day | **163.9** |
| Edges | **17** |
| Memories with ≥ 1 edge | **31 of 7,371** (= **0.42%**) |
| Memories that are graph-orphans | **7,346 of 7,377** (= **99.58%**) |

ZAKI extracts ~164 facts about Nova every day and produces about 0.4 edges per day. **The ratio is upside down.** A brain that knows you should produce more *connections* than *disconnected atoms*. ZAKI produces 400× more atoms than connections.

## The 17 edges that DO exist for user 1

```
MENTAL_STATE   (2)   HAS              (2)
WORKING_ON     (2)   RECOMMENDS       (2)
codename       (2)   status           (2)
IS             (1)   IS_BUILDING      (1)
WANTS_TO_FINISH (1)  HAS_OPEN_LOOPS   (1)
+ a few others
```

These are good typed predicates. The extractor CAN produce them. It just rarely does. ZAKI catches a structured subject-verb-object pattern roughly once every 433 memories.

## What this means at the product level

The frontend work of the past two days — kind-coloring, threshold slider, fcose, percentile-remap radius, search overlay, insights strip, supersede stepper, self-marker — all of these are correctly *exposing* the corpus as it is. They're not the reason the graph feels empty. **The graph IS empty.** Each polish pass just makes the emptiness more honest.

If we had ~5,000 edges across 16,000 memories (a roughly 1:3 connection rate, modest for a knowledge graph), the rendering work would suddenly *land*: clusters would form, the user would see *"these 12 memories are all about Mia,"* the supersede chains would have surrounding context, `boss_identity` would be a hub, not an orphan. None of that requires further frontend work.

## Why this happens — diagnosis on the agent side

The pipeline today is roughly:

1. User chats with ZAKI.
2. After each turn, the agent runs an extraction pass.
3. Extraction emits *atomic facts* into `zaki_bot.memories`.
4. Extraction *also* emits typed edges into `zaki_bot.memory_edges` — but only when it can clearly extract a `(subject, predicate, object)` triple.
5. Most user messages don't look like `(Alfred, WORKS_AT, KPMG)`. They look like *"sounds good, boss! the memory pipeline is solid now."* The extractor stores a fact, doesn't find a triple, emits no edge. Memory is born orphan.

**The economics are wrong:**

- Memory extraction has a low bar (anything substantive becomes a fact). 163/day.
- Edge extraction has a high bar (must look like a triple). 0.4/day.
- The agent never goes back to enrich.

## What it would take to make the product sellable

This is backend work. None of these are FE-fixable. Ordered by leverage:

### 1. Backfill pass over existing 16,531 memories

Most of these were written in the last 45 days. They have content. They have entities mentioned in their text. **Run an entity-extraction + relationship-extraction pass over the corpus — once.** Even a modest extractor (`mistral-7b` or `llama-3-8b` cheap) running at "find people, places, projects, decisions, and 1-2 relationships per memory" would produce 30–50K edges out of 16K memories overnight. Cost: a few hours of compute, a few dollars of inference.

The brain page transforms with this single pass. FE work I've shipped lights up immediately.

### 2. Lower the edge-extraction bar at write time

The extraction prompt should treat edge production as a first-class output, not a side effect. Every memory should attempt to emit at least one of:

- An entity link (this memory mentions `Mia` → edge to `entity_mia`)
- A topic link (this memory is about `gaming` → edge to `topic_gaming`)
- A reference link (this memory cites a previous memory → edge)

Default behavior: if no edge is found, **don't store the memory** OR store it with low importance. Today the bar is reversed — edges are rare bonuses, atoms are easy.

### 3. Auto-link to identity (`boss_identity`)

Every memory whose subject is the user (`I` / `me` / `my` / first-person predicates) should emit an edge to the canonical self-node. **This single rule alone would turn 5,000+ memories from orphans into self-connected.** The self node becomes the densest hub. Focus-mode-as-primary becomes meaningful.

### 4. Raise the bar on memory ingestion

163 memories/day for 45 days = 7,377 memories. That's a lot of low-signal noise. Many are autosaved chat fragments. The "Sounds good, boss! 🎮" orphan is the canonical example — that's not a memory worth keeping; it's a turn-end pleasantry.

A better extraction prompt: *"Only emit a fact if it expresses a stable preference, an attribute, a relationship, an event, or a decision. Skip pleasantries, acknowledgments, transient mental states, and low-content responses."* This alone probably halves the corpus and the survivors are higher-density.

### 5. Topic / entity field on every memory at ingest

Already filed in `docs/ui-needs-backend-brain-comprehensive-2026-05-07.md` as item #1. Compounds with #1 here — the backfill pass should populate `topics: string[]` AND `entities: string[]` per memory. Then the FE has TWO axes of clustering, not just edges.

## What I propose

**Stop FE work on the brain until backend ships #1 and #3 above.**

The frontend has already done its job. The remaining brain polish on my todo list (focus-mode-as-primary auto-anchor, DetailPanel error state) won't move the needle while the data is this thin. Polishing the rendering of an empty graph just makes it look like polished emptiness.

Three things would make this sellable:

1. **Backfill 30–50K edges over the existing 16,531 memories** — a one-time agent pass. Biggest single lift.
2. **Auto-link every first-person memory to `boss_identity`** — one-line rule, ~50% reduction in orphan count.
3. **Add `topics` + `entities` to memories at ingest going forward** — already filed, prevents future regressions.

When those three land, the FE I've built lights up. Until they land, nothing the FE does matters.

## What I'd do in the meantime on FE

- **Pivot off the brain page entirely.** Resume the surface audit (ZakiSettingsSheet, pricing, onboarding, etc.). These are all paying-user-funnel surfaces that need work.
- **Phase 2 design direction doc** — anchor the rest of the work in a design contract that's grounded in the audit findings.

Both of those are ready to go without backend dependency.

Backend conversation needed before I touch brain again. This doc is the spec.
