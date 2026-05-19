# ADR-001: Make ZAKI Prod The Control Plane

Status: Accepted
Date: 2026-05-19

## Context

ZAKI currently contains multiple product surfaces with fragmented ownership: Spaces, Agent, Learn, billing, auth, quota, and memory are not expressed through one platform contract.

The target product needs to manage subscriptions, usage, OAuth, and routing centrally while still letting each product keep its own experience and domain behavior.

## Decision

ZAKI Prod is the central commercial and operational control plane.

It owns:

- Identity and OAuth provider accounts.
- Subscription and entitlement state.
- Product catalog.
- Plan policy.
- Usage ledger and quota decisions.
- Product routing.
- Memory scope policy.
- Dashboard/settings surfaces for plan, usage, billing, and memory.

Product modules own their workflows, but access and commercial decisions flow through the control plane.

## Consequences

Positive:

- Plans and product access become coherent.
- Future products can be added without redesigning auth or billing.
- Support/admin can reason from one trail.
- Dashboard and settings can become reliable platform surfaces.

Tradeoffs:

- Requires migration away from scattered counters and product-specific plan ids.
- Requires careful route ownership to avoid a second monolith under a new name.
- Requires stronger tests around auth, entitlement, usage, and memory side effects.

## Follow-Up Work

- Implement product catalog and plan policy.
- Implement usage ledger.
- Add route ownership metadata.
- Move product access checks behind a shared control-plane service.
