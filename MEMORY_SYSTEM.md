# Legacy Spaces-side memory layer (hub BFF) — not the Brain

Last reviewed: July 12, 2026

> **Scope warning:** this document describes the legacy memory routes implemented inside the
> `zaki-api` hub BFF for Chat/Spaces compatibility. It is **not** the ZAKI Brain and must not be used
> as the current platform memory architecture.
>
> The Brain is owned by `nullalis`: its Postgres `zaki_bot` schema contains the
> 1024-dimensional pgvector memory store, nullalis is the only writer, and `zaki-web` reads it
> through authenticated `/api/agent/brain/*` BFF proxies. See the
> [cross-repo platform map](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/PLATFORM.md#the-brain--readwrite-boundary)
> and [Agent-first product spec](docs/zaki-agent-first-v1-product-spec.md).

## Overview

The legacy hub layer is a per-user persistent memory implementation with:
- autosave mode (default)
- manual confirmation mode
- conflict detection and resolution
- realtime status updates over SSE
- context retrieval for chat personalization

All memory routes are authenticated and user-scoped to the current token owner.

## Runtime Modes

- `autosave`: extracted memories are stored immediately, with undo support.
- `manual`: extracted memories are staged in confirmations and require user action.

Undo window is currently **8 seconds** (`UNDO_WINDOW_MS = 8000`).

## API Endpoints

### Health + realtime
- `GET /api/memory/health`
- `GET /api/memory/health?probe=1` (authenticated deep probe for extraction + embeddings provider paths)
- `GET /api/memory/events` (SSE)

### Core CRUD
- `POST /api/memory` (direct store)
- `GET /api/memory/list`
- `GET /api/memory/list/:userId` (legacy alias, still auth-scoped)
- `POST /api/memory/search`
- `DELETE /api/memory/:id`

### Capture flows
- `POST /api/memory/autosave`
- `POST /api/memory/preview`
- `POST /api/memory/undo/:id`

### Confirmation flow
- `GET /api/memory/confirmations`
- `GET /api/memory/confirmations/:userId` (legacy alias)
- `POST /api/memory/confirmations/:id/confirm`
- `POST /api/memory/confirmations/:id/reject`

### Conflict flow
- `GET /api/memory/conflicts`
- `GET /api/memory/conflicts/:userId` (legacy alias)
- `POST /api/memory/conflicts/:id/resolve`

### Status + context
- `GET /api/memory/status`
- `GET /api/memory/status/:userId` (legacy alias)
- `POST /api/memory/context`
- `GET /api/memory/context`
- `GET /api/memory/context/:userId` (legacy alias)

## Auth and Tenancy

Memory user identity is resolved from authenticated email/username.
Requests that attempt cross-user access are rejected (`403`).
Conflicting user identifiers in one request are rejected (`400`).

## Context Injection Contract

Backend stream-chat injects memory using a versioned envelope:
- `[[ZAKI_MEMORY_CONTEXT_V2]]`
- `[[/ZAKI_MEMORY_CONTEXT_V2]]`

Frontend strips this envelope from persisted user-visible history.

## Storage and Deduplication

Primary table: `memories` (PostgreSQL, optional pgvector).

Deduplication is enforced in two layers:
- app-level semantic + exact checks
- DB-level unique index on `(user_id, content_hash)`

Startup migration also removes old exact duplicates before enforcing uniqueness.

## Session-End Summarization

When enabled (`ZAKI_ENABLE_SESSION_SUMMARIZATION=true`), session end processing:
- extracts facts from recent user messages
- stores non-duplicate facts
- creates conflicts when contradictions are detected
- tags stored metadata with `source: "session_end"`

## Key Environment Variables

- `ZAKI_ENABLE_SESSION_SUMMARIZATION`
- `ZAKI_SESSION_MEMORY_MAX_USER_MESSAGES`
- `ZAKI_SESSION_MEMORY_MAX_FACTS_PER_MESSAGE`
- `ZAKI_SESSION_MEMORY_MAX_TOTAL_FACTS`
- `ZAKI_MEMORY_EXTRACTION_TIMEOUT_MS`
- `ZAKI_MEMORY_TRANSLATION_TIMEOUT_MS`
- `ZAKI_MEMORY_RELEVANCE_TIMEOUT_MS`
- `ZAKI_MEMORY_EMBEDDING_TIMEOUT_MS`
- `ZAKI_MEMORY_STORAGE_CACHE_TTL_MS`
- `NOVA_TYP_BASE_URL`
- `NOVA_TYP_API_KEY`
- `ZAKI_MEMORY_WORKSPACE_SLUG` (optional fallback workspace for memory LLM calls)
- `ZAKI_MEMORY_LLM_MODEL` (optional model id for memory extraction/relevance/translation)

## Notes

- Legacy `:userId` route forms remain for compatibility, but auth scope still controls access.
- Memory telemetry and alerts are available via `backend/src/memory/telemetry.js`.
