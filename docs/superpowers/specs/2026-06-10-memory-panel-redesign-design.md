# In-Chat Memory Panel Redesign — Design

**Date:** 2026-06-10
**Branch:** `chat-memory-feels-known` (continues the feels-known work)
**Author:** Nova / Mohammad (with Claude)
**Status:** Draft for review

## 1. Scope (locked)

Redesign the **in-chat memory surface** in Spaces. Replace the current memory **modal card** (`MemoryViewer`, opened from the chat three-dots → "Review Memories") with a **right-side panel** that shows a **periodically self-updating "what ZAKI knows" dossier** + a **memory On/Off toggle**, and add **per-response "memories used" chips** under assistant replies.

**In scope:** the in-chat memory panel + per-response chips, in `zaki-prod` frontend. Reuses existing backend (`/api/memory/*`).
**Out of scope:** the Settings page memory section (not started), the Agent/Brain (`/api/agent/brain/*`), agent-scoped controls (Dream Reflection, Query Expansion, PII governance — those live in Settings and stay there).

**Decisions (from brainstorm):**
- Dossier = **deterministic grouped** summary (reuse existing grouping), refreshed on open + on memory-change (SSE). No LLM, no new infra.
- Management actions = **all in the panel** (dossier + on/off + recent list + review).
- Controls = **On/Off only** (single `policy=off` toggle; drop the 4 capture-aggressiveness modes from this surface).
- Surfacing = **per-response chips** for "memories used" (data already emitted).

## 2. Current state (verified)

- Three-dots → "Review Memories" ([ChatArea.tsx:8680](src/app/components/ChatArea.tsx)) dispatches `zaki:open-memory` → Sidebar listener ([Sidebar.tsx:340](src/app/components/Sidebar.tsx)) opens a **full-screen modal** ([Sidebar.tsx:2334](src/app/components/Sidebar.tsx)) rendering `MemoryViewer`.
- `MemoryViewer` ([MemoryViewer.tsx](src/app/components/memory/MemoryViewer.tsx)) already contains: a "What ZAKI currently knows" grouped summary (About you / Preferences / Ongoing / Relationships via `getSummaryGroupForMemory` [:167](src/app/components/memory/MemoryViewer.tsx)), the `MemoryModeToggle` (5 modes) [:835], pipeline stats, scope cards (Personal/Space/Session), and three tabs (Memories list w/ edit/delete, Pending confirmations, Conflicts).
- Backend endpoints exist: `/api/memory/list` (cursor-paginated, recent-first), `/api/memory/activity`, `/api/memory/preferences` (GET/PATCH, accepts `off`), `/api/memory/confirmations`, `/api/memory/conflicts`, and SSE `/api/memory/events` (emits pending/conflict **count** changes on every memory mutation) ([routes.js](backend/src/memory/routes.js)).
- The chat stream already emits a **`memoryUsed`** event with the exact `sources` used per reply, and the frontend already receives it ([ChatArea.tsx:5892-5900](src/app/components/ChatArea.tsx)).

## 3. Design

### 3a. Right-side Memory Panel (replaces the modal)
A collapsible right-side drawer (sibling to the chat stream; on mobile → full-screen sheet). Opened by the existing three-dots → "Review Memories" trigger (rewired) and dismissible. Sections top-to-bottom:

1. **Memory On/Off** — a single toggle bound to `/api/memory/preferences` (`policy` `balanced`↔`off`). On = memory active; Off = capture + injection disabled (already wired backend-side). Reuses `useMemoryPolicy` ([MemoryModeToggle.tsx:124](src/app/components/memory/MemoryModeToggle.tsx)) simplified to a binary control.
2. **Dossier — "What ZAKI knows"** — the existing deterministic grouped summary (About you / Preferences / Ongoing / Relationships), recomputed from `/api/memory/list` + `/api/memory/activity`. **Self-updating:** recompute on panel open, and refetch when the SSE `status` event fires (a memory was added/changed). Optional low-frequency poll as a backstop (e.g., 5 min) — SSE-driven is primary.
3. **Recent memories** (collapsible) — recency-ordered list from `/api/memory/list`, each with inline **edit** (PATCH) and **delete** (DELETE). Reuses the existing list/edit/delete logic.
4. **Needs review (N)** — pending confirmations (confirm/reject) + conflicts (keep/replace), surfaced as a section with a count badge driven by the SSE counts. Reuses existing confirmations/conflicts logic.

**Removed from this surface:** the Personal/Space/Session scope cards and the 5-mode `MemoryModeToggle` (replaced by the binary On/Off). The modal shell is retired once the panel covers it.

### 3b. Per-response "memories used" chips
Under each assistant reply that used memory, render a small chip (e.g., "🧠 used 2 memories"). The data is the `memoryUsed` event `sources` already received during streaming — attach it to the message object when the event arrives, render the chip in the message component. Clicking expands a small popover listing the used memories, each with **correct (edit)** and **delete** actions (reusing the same PATCH/DELETE). Collapsed by default (research: keep memory surfacing on-demand, not noisy). Stripped/absent for web-search/agent turns (which don't inject memory).

### 3c. Cleanup
- Rewire three-dots → "Review Memories" to open the **panel** (replace the `zaki:open-memory` → modal path with the panel toggle).
- Delete the scope cards + the 5-mode toggle from the in-chat surface.
- Retire the modal shell in Sidebar once the panel is the surface (keep the data/logic, move it into the panel).

## 4. Data flow
- Panel load → `GET /api/memory/list` + `/api/memory/activity` + `/api/memory/preferences` (+ `/confirmations`, `/conflicts` for the review section) → compute grouped dossier client-side.
- Live refresh → subscribe to SSE `/api/memory/events`; on a `status` change, refetch list/activity (and counts). (Granular "new memory" push is not available; refetch-on-change is sufficient and already how counts update today.)
- Chips → consume the `memoryUsed` event `sources` per assistant message (already received); no new fetch.
- On/Off → `PATCH /api/memory/preferences { policy }`.

## 5. Reuse vs. new (architecture)
**Approach (recommended): refactor `MemoryViewer`'s internals into the panel** rather than rewrite — its summary grouping, list, edit/delete, pending, and conflicts logic already work and are tested.
- **Reuse:** `getSummaryGroupForMemory` + grouped summary, the memories list + edit/delete, pending/conflicts handlers, the `/api/memory/*` client fns ([api.ts:289-343](src/lib/api.ts)), `useMemoryPolicy`.
- **New:** the panel/drawer shell (layout, open/close, mobile sheet); the binary On/Off control; the per-response chip component + wiring the `memoryUsed` sources onto messages.
- **Note on file size:** `MemoryViewer.tsx` is ~1500 lines; extract the reusable pieces (summary, list, review) into focused subcomponents as they move into the panel, rather than carrying the monolith.

## 6. Backend
**No new backend required.** All needed endpoints exist (list, activity, preferences, confirmations, conflicts, SSE). The `memoryUsed` event already carries per-reply sources.
- Optional, deferred: granular SSE "memory created/updated/deleted" events (today only counts) for snappier live updates; and a "suppress/don't-use-again" flag distinct from delete. Neither is required for v1 (refetch-on-change + delete cover it).

## 7. Testing
- Panel: renders dossier groups from mocked list; On/Off toggles `policy` via preferences; edit/delete call the right endpoints; review section reflects pending/conflict counts; SSE `status` triggers a refetch.
- Chips: render when a message has `memoryUsed` sources; hidden when none; expand → edit/delete actions fire.
- Reuse existing `MemoryViewer.test.tsx` assertions where logic is carried over.
- Frontend `npm run typecheck` (root) clean.

## 8. Removals checklist
- Scope cards (Personal/Space/Session) — removed from in-chat surface.
- 5-mode `MemoryModeToggle` — replaced by binary On/Off in the panel (the toggle component may remain for the Settings page until that work happens).
- Modal shell in `Sidebar.tsx` for memory — retired in favor of the panel.

## 9. Out of scope / future
- Settings page memory redesign (separate effort).
- LLM-synthesized narrative dossier (deferred; deterministic grouping ships first).
- Granular memory SSE events + "don't use again" suppression (deferred).
- Anything agent/Brain.

## 10. Assumptions
- The three-dots "Review Memories" entry is the canonical way users reach this surface; the panel keeps that entry.
- A right-side drawer fits the existing chat layout (left rail / center stream / right panel) — consistent with the artifacts-panel pattern used elsewhere.
