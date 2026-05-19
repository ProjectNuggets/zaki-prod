# ZAKI Prod API Ownership Map

Status: Phase 0 target architecture
Date: 2026-05-19

This document maps current route families to future module ownership. It is the guide for splitting the overloaded backend gateway into a modular monolith without breaking production behavior.

## Architecture Direction

Keep one deployable backend for now, but split ownership internally.

The current backend gateway is too large and mixes identity, billing, product routing, quota, memory, admin, and product behavior. The target is a modular monolith with clear route registration and service ownership.

## Module Ownership

| Module | Owns | Current surface examples | Required cross-cutting checks |
| --- | --- | --- | --- |
| Identity | auth, JWT, refresh cookies, OAuth, provider accounts, sessions | login, register, refresh, logout, Google OAuth | auth audit, CSRF/state, provider linking |
| Commercial | subscriptions, billing, entitlements, product catalog, plan policy | Stripe checkout, customer portal, plan sync, access codes | entitlement audit, webhook idempotency |
| Usage | usage ledger, quota decisions, burst windows, summaries | Spaces quota, Agent quota, Learning quota | canonical user, plan policy, product policy |
| Product Router | product discovery, product launch/access checks, service routing | dashboard product links, service routes, capability routing | auth, entitlement, usage precheck |
| Spaces | spaces, conversations, files/context, workspace behavior | Spaces chat, memory preview, service agents | workspace auth, quota, Workspace Memory policy |
| Agent/Brain | agent runtime, personal graph memory, long-term memory | Agent chat, graph memory routes | Personal Brain policy, tool audit |
| Learn | learning sessions, learner profile, curriculum/progress | Learn chat, assessments, progress | Learner Memory policy, learning quotas |
| Memory Control Plane | memory writes, retrieval, listing, export/delete/disable | current memory routes and product-specific memory writes | scope isolation, consent, retention |
| Admin/Ops | support, internal inspection, health, audit views | health, diagnostics, admin endpoints | role-based auth, audit logging |
| Website/Growth | public pages, share routes, marketing support | share pages, static public surfaces | no private data leakage |

## Route Policy

Every non-public API route should declare:

- Required auth level.
- Product id when applicable.
- Entitlement requirement.
- Usage/metering event type.
- Memory side effects.
- Audit level.
- Error contract.
- Test owner.

Routes that cannot declare these should be treated as transitional and should not be used as examples for new code.

## Target Folder Shape

The target backend shape should be:

```text
backend/src/
  app/
    createApp.js
    registerRoutes.js
  modules/
    identity/
      routes.js
      service.js
      repository.js
      policy.js
    commercial/
      routes.js
      service.js
      repository.js
      policy.js
    usage/
      routes.js
      service.js
      repository.js
      policy.js
    products/
      router/
      spaces/
      agent/
      learn/
    memory/
      routes.js
      service.js
      repository.js
      policy.js
    admin/
      routes.js
      service.js
  shared/
    auth/
    db/
    errors/
    observability/
    validation/
```

This is a target shape, not a command to refactor everything in one pass.

## Migration Strategy

1. Introduce route registration boundaries while preserving existing handlers.
2. Move one low-risk route family first.
3. Add ownership metadata for routes.
4. Add contract tests around moved routes.
5. Move Commercial and Usage before changing plan/quota semantics.
6. Move Memory Control Plane before changing Spaces memory behavior.
7. Move frontend product dashboard after backend policy endpoints are stable.

## First Vertical Slice

The recommended first implementation slice is:

- Add product catalog and plan policy modules.
- Add usage policy definitions without changing enforcement.
- Add a dashboard/settings read endpoint for plan and usage summary.
- Wire the UI to display the new summary behind existing data.

This gives the dashboard a stable backend contract before deeper commercial changes.

## Non-Goals For The First Wave

- Do not split into microservices.
- Do not rewrite all routes at once.
- Do not remove old counters before the new ledger is verified.
- Do not merge all memory stores into one table without preserving scope.
- Do not build future CLI/local/extension products yet.

## Quality Gates

Each module extraction must include:

- Route tests.
- Error contract tests.
- Auth/entitlement test cases.
- Usage/memory side-effect tests when applicable.
- Observability for request id and user id.
- Documentation update in this map.
