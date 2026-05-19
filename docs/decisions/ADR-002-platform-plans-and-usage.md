# ADR-002: Use Platform Plans With Shared Weekly Usage

Status: Accepted
Date: 2026-05-19

## Context

The current commercial structure is product-bundle oriented. It includes plan ids like Spaces Free, Agent, Learn, Complete, legacy personal access, and access codes. Usage rules are fragmented across daily Spaces quotas, weekly Agent quotas, and Learning-specific counters.

The CEO direction is to follow the platform logic used by leading AI products: all products are available, and users understand one main allowance with product-specific limits.

## Decision

The ZAKI plan ladder is:

- Free.
- Personal.
- Pro.
- Pro MAX.

All current products are available on all plans. Each plan has a shared weekly allowance and access to a five-hour burst/session window. Each product has product-specific quota controls, and those controls roll up to the shared weekly allowance.

Exact numeric limits remain configurable until pricing is finalized.

## Consequences

Positive:

- The product becomes easier to understand and sell.
- Dashboard/settings can show one coherent usage story.
- New products can join the catalog without creating a new billing model.
- Quota policy can adapt as model/service costs change.

Tradeoffs:

- Requires migration from legacy plan ids.
- Requires a central usage ledger.
- Requires UI changes in dashboard and settings.
- Requires support tooling to understand legacy-to-new plan mappings.

## Follow-Up Work

- Define symbolic plan policy records.
- Add product quota weights.
- Build central usage summaries.
- Add legacy plan alias mapping.
- Update Stripe metadata and webhook handling after policy is implemented.
