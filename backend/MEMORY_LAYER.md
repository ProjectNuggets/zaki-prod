# ZAKI Backend Memory Layer

Last updated: February 23, 2026

## What this layer does

The backend memory layer provides:
- extraction of memory facts from user messages
- capture, review, and reversible-save workflows
- conflict detection + resolution
- context retrieval for chat injection
- realtime status updates (SSE)

Core files:
- `src/memory/operations.js`
- `src/memory/routes.js`
- `src/memory/auto-save.js`
- `src/memory/session-summary.js`
- `src/memory/session-end-route.js`
- `src/memory/telemetry.js`
- `src/memory-extraction.js`

## Data model (high level)

Main tables:
- `memories`
- `memory_confirmations`
- `memory_conflicts`
- `memory_notifications`
- `memory_undo_windows`
- `memory_triggers`

Important dedupe constraint:
- unique index on `memories(user_id, content_hash)`

## Operational behavior

### Normal chat capture
1. `POST /api/memory/capture`
2. extract candidate memories
3. classify each candidate into:
   - `saved_reversible`
   - `needs_review`
   - `duplicate`
   - `conflict`
   - `skipped`
4. saved memories write an undo window in `memory_undo_windows`
5. review/conflict items appear in the memory viewer queues

### Undo
- default undo window: 5 seconds
- undo may succeed, partially succeed, or fail
- the UI should remain visible until the outcome is known

### Legacy compatibility
- `POST /api/memory/autosave`
- `POST /api/memory/preview`
- retained for compatibility/testing only, not the primary app flow

### Context retrieval
- normal chat uses `buildChatMemoryContext()`
- introspection prompts also use `buildChatMemoryContext()` with introspection mode
- `buildContext()` remains available for broader retrieval workflows when needed
- `buildFastContext()` is retained as a lower-level selector, not a primary runtime contract
- session-end memories are excluded from the default chat retrieval contract
- stream-chat injects context in versioned envelope markers:
  - `[[ZAKI_MEMORY_CONTEXT_V2]]`
  - `[[/ZAKI_MEMORY_CONTEXT_V2]]`

### Session-end summary
When enabled, `/api/memory/end-session` summarization:
- scans recent user messages with caps
- stores extracted memories
- resolves contradictions into `memory_conflicts`
- stores metadata provenance `source: "session_end"`

## Reliability safeguards

- timeout-protected external calls for extraction/translation/relevance/embeddings
- memory chat calls try `v1/openai/chat/completions` first, then fallback to `v1/workspace/:slug/chat`
- graceful fallback when provider calls fail
- cached storage capability checks (`pgvector` support)
- throttled frontend status sync plus SSE updates

### Runtime verification
- `GET /api/memory/health` checks storage mode quickly.
- `GET /api/memory/health?probe=1` (authenticated) also checks extraction + embeddings provider paths and reports which transport is active.

## Security and scope

Memory access is always tied to authenticated user identity.
Cross-user access attempts are rejected.
Legacy routes with `:userId` remain for compatibility but are auth-scoped.
