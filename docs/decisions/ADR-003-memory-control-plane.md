# ADR-003: Separate Personal, Workspace, Learner, And Session Memory

Status: Accepted
Date: 2026-05-19

## Context

ZAKI Agent has personal memory and graph memory as the user's Brain. Spaces also has memory behavior, but the current implementation is weaker and less production-ready. ZAKI Learn has learner-specific state and memory.

Deleting Spaces memory immediately would remove useful functionality, but treating it as personal memory would create trust, privacy, and product clarity issues.

## Decision

Adopt a Memory Control Plane with explicit scopes:

- Personal Brain: owned by Agent/Brain.
- Workspace Memory: owned by Spaces.
- Learner Memory: owned by Learn.
- Session Memory: owned by runtime/session context.

Spaces memory may remain only if upgraded into Workspace Memory with canonical user identity, workspace/space scope, user controls, tests, and central policy enforcement. It must not be presented as the user's personal Brain.

## Consequences

Positive:

- Memory becomes explainable to users.
- Agent Brain remains the central personal memory authority.
- Spaces can keep useful workspace context without polluting personal memory.
- Learn can preserve pedagogy-specific learner state.

Tradeoffs:

- Requires migration of Spaces memory identity and scope.
- Requires UI controls for memory by scope.
- Requires deletion/export/disable flows.
- Requires memory retrieval evaluations.

## Follow-Up Work

- Add Memory Control Plane interfaces.
- Normalize user identity for Spaces memory.
- Add Workspace Memory tests.
- Add dashboard/settings memory controls.
- Define promotion rules between memory scopes.
