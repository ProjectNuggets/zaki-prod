# ZAKI Prod Memory Scope Matrix

Status: Accepted memory strategy baseline
Date: 2026-05-19

This document defines the production memory model across ZAKI products.

## Decision

Do not delete Spaces memory blindly. Re-scope it.

Spaces memory is not the user's personal brain. If kept, it becomes Workspace Memory with production-grade identity, scope, governance, and controls.

ZAKI Agent Brain remains the personal memory and graph memory authority. ZAKI Learn keeps learner-specific memory and progress state.

## Scope Matrix

| Memory scope | Product owner | Canonical identity | Primary content | Write policy | Read policy | User controls |
| --- | --- | --- | --- | --- | --- | --- |
| Personal Brain | Agent/Brain | `user_id` | personal facts, preferences, goals, relationships, graph memory | explicit or policy-approved capture | available to Agent and approved cross-product personalization | inspect, edit, delete, export, disable |
| Workspace Memory | Spaces | `user_id` + `workspace_id`/`space_id` | project facts, workspace context, artifacts, collaborators, service context | explicit or workspace-scoped capture | available only inside matching workspace/space unless promoted | inspect, edit, delete, export, disable per space |
| Learner Memory | Learn | `user_id` + `learner_profile_id` | progress, level, mistakes, strengths, goals, curriculum state | learning-event capture | available to Learn and approved personalized learning flows | inspect, reset, export, delete |
| Session Memory | Runtime | `session_id` + `user_id` | immediate conversation context and ephemeral tool state | automatic runtime context | session only | clear session |

## Spaces Memory Audit Conclusion

The current Spaces memory is not useless. It has useful pieces:

- Memory preview and consent surfaces.
- Client-triggered capture after chat.
- Backend memory routes.
- Per-space conceptual storage.
- Embedding/retrieval concepts.

The problem is production scope and reliability:

- It relies too much on email-string identity.
- Capture behavior is split between client and backend.
- Backend capture is optional/disabled by environment default.
- Scope boundaries between personal and workspace memory are not strong enough.
- It is not governed by a central memory policy.
- Dashboard/settings do not expose strong enough controls.

## Required Fixes Before Keeping Workspace Memory

Spaces memory can remain only if these are implemented:

1. Use canonical numeric `user_id` everywhere.
2. Require explicit `space_id` or workspace scope for durable Workspace Memory.
3. Route all durable writes through the Memory Control Plane.
4. Store memory source, scope, user, product, and request id.
5. Add a user-visible Workspace Memory control surface.
6. Add export/delete/disable flows.
7. Add tests for identity isolation, scope isolation, and deletion.
8. Add retrieval evaluation cases for workspace recall.
9. Stop marketing Spaces memory as personal brain memory.

## Promotion Rules

Some workspace or learner memories may be promoted to Personal Brain, but only through policy:

- Explicit user action, or
- A clear product rule with user-visible control, or
- Admin-approved migration during account consolidation.

Implicit promotion from Workspace Memory to Personal Brain is not allowed.

## Product UX Requirements

Memory controls should show:

- Memory scope.
- Source product.
- Source conversation/session when available.
- Last updated time.
- Last used time when available.
- Edit/delete/export actions.
- Disable state.

The UI should never present all memory as one anonymous bucket.

## Backend Requirements

The Memory Control Plane should expose a small stable interface:

- `captureMemory(scope, source, payload, policyContext)`.
- `retrieveMemory(scope, query, policyContext)`.
- `listMemory(scope, filters, policyContext)`.
- `updateMemory(memoryId, patch, policyContext)`.
- `deleteMemory(memoryId, policyContext)`.
- `exportMemory(scope, policyContext)`.

All product callers must pass:

- user id.
- product id.
- scope.
- route/request id.
- consent/policy context.
- source object reference when available.

## Release Gates

Workspace Memory should not be considered production-ready until:

- Memory writes are canonical-user scoped.
- Cross-user and cross-space retrieval tests pass.
- Delete/export/disable controls work.
- The dashboard/settings display memory scopes clearly.
- The app can explain which product owns which memory without internal terminology.
