# ADR-004: Split The Backend As A Modular Monolith Before Microservices

Status: Accepted
Date: 2026-05-19

## Context

The backend gateway currently carries too many responsibilities in a very large entry file. It mixes auth, billing, quota, product routes, memory, admin, diagnostics, and business policy.

The codebase needs clear ownership and testability, but an immediate microservice split would increase operational risk before the product contracts are stable.

## Decision

Keep one backend deployable for the near term, but split the code into explicit modules:

- Identity.
- Commercial.
- Usage.
- Product Router.
- Spaces.
- Agent/Brain.
- Learn.
- Memory Control Plane.
- Admin/Ops.
- Website/Growth.

Each module owns routes, services, repositories, and policy files where appropriate.

## Consequences

Positive:

- Reduces risk compared with a microservice rewrite.
- Creates clearer ownership and test boundaries.
- Allows one route family to migrate at a time.
- Keeps deployment and environment management stable during commercialization.

Tradeoffs:

- Requires discipline to prevent shared-module sprawl.
- Does not immediately solve all scaling concerns.
- Requires route ownership metadata and tests to be useful.

## Follow-Up Work

- Introduce route registration boundaries.
- Move one low-risk vertical slice first.
- Add route ownership and policy metadata.
- Add contract tests before and after each moved family.
