# ZAKI Product Contract

Status: Accepted baseline for production finalization
Date: 2026-05-19
Owner: CTO/Product

> **Update — 2026-07-12:** this May baseline predates the Agent-first launch decision. Where product
> visibility, launch order, memory ownership, or availability differs, defer to
> [`docs/zaki-agent-first-v1-product-spec.md`](docs/zaki-agent-first-v1-product-spec.md), `AGENTS.md`,
> and the live cross-repository coordination board linked there.

This document is the product truth for ZAKI Prod. It translates the agreed CEO decisions into a stable operating contract that engineering, design, billing, support, and future product lines can build against.

## North Star

ZAKI is the user-owned AI operating system.

It is not a collection of disconnected tools. It is a central control plane that manages identity, subscriptions, usage, memory, and routing across every ZAKI product:

- ZAKI Spaces: collaborative workspaces and service-specific conversations.
- ZAKI Agent: the personal agent with long-term memory and graph memory as the brain.
- ZAKI Learn: learning product with learner-specific state and progress memory.
- ZAKI Brain: memory and graph infrastructure exposed through controlled user surfaces.
- Future products: ZAKI CLI agent, local desktop app, browser extensions, and partner/service-specific agents.

## Locked Decisions

These decisions are accepted and should not be re-litigated during implementation unless a hard technical or legal blocker appears.

1. ZAKI Prod is the commercial control plane.
2. The plan ladder is Free, Personal, Pro, and Pro MAX.
3. All plans expose all current products.
4. Usage is governed by a shared weekly allowance plus a five-hour burst/session window.
5. Each product has its own quota policy, and product quotas roll up to the shared weekly allowance.
6. Usage, billing, OAuth, subscriptions, and service routing are centralized in ZAKI Prod.
7. Spaces memory is not core personal memory. If retained, it becomes production-grade Workspace Memory.
8. ZAKI Agent Brain is the personal long-term memory and graph memory authority.
9. ZAKI Learn keeps learner-specific memory and progress state.
10. Future CLI, local app, and extensions must authenticate through the same identity and entitlement system, but they do not need full product implementation in the first production wave.

## Customer Promise

A user should be able to:

- Sign in with email or OAuth.
- See every ZAKI product they can use.
- Understand their plan, weekly allowance, burst window, and product usage.
- Upgrade without losing history or memory.
- Use Spaces, Agent, and Learn from one coherent dashboard.
- Control memory by scope: personal, workspace, learner, and session.
- Export, delete, or disable memory where allowed by policy.
- Trust that quota, billing, and routing behavior is consistent across products.

## Product Model

### Free

Purpose: prove value, acquire users, and make every product discoverable.

Free users get constrained access to all products. The app should communicate limits clearly without making the product feel broken.

### Personal

Purpose: individual daily use.

Personal users get meaningful weekly allowance, memory continuity, and enough product breadth to make ZAKI feel like a personal AI system.

### Pro

Purpose: heavy individual and professional workflows.

Pro users get larger weekly allowance, stronger product-specific caps, better memory depth, and more generous burst behavior.

### Pro MAX

Purpose: maximum individual power tier.

Pro MAX users get the highest commercial limits, priority routing, the deepest memory capability, and access to advanced/future product surfaces first when operationally safe.

## Product Surfaces

### Dashboard

The dashboard is the command center. It should show:

- Active plan and renewal state.
- Weekly allowance remaining.
- Five-hour burst/session state.
- Product usage by product.
- Product entry points.
- Memory health and control shortcuts.
- Upgrade or billing actions when relevant.

### Settings

Settings must include:

- Account and identity.
- OAuth providers.
- Billing and subscriptions.
- Usage and quota history.
- Memory controls.
- Privacy and data export.
- Developer/application access when CLI, local app, and extensions are introduced.

### Product Routing

Every product entry point must pass through:

- Auth check.
- Entitlement check.
- Quota check.
- Product router.
- Usage ledger write.
- Memory policy.
- Audit/observability trail.

## Memory Model

Memory is a product capability, not a hidden side effect.

### Personal Brain

Owned by ZAKI Agent. Stores durable personal facts, preferences, relationships, goals, and graph memory. This is the core "ZAKI remembers me" experience.

### Workspace Memory

Owned by Spaces when enabled. Stores project, space, and team context. It must be scoped by canonical user and workspace identifiers, not loose email strings.

### Learner Memory

Owned by ZAKI Learn. Stores learner level, progress, mistakes, strengths, goals, and study history.

### Session Memory

Short-lived runtime context. It may improve immediate conversation quality, but it is not durable memory and should be clearly separated from long-term stores.

## Commercial Architecture Requirements

ZAKI Prod must become the system of record for:

- Users and identities.
- OAuth provider accounts.
- Plan subscriptions.
- Entitlements.
- Product catalog.
- Usage ledger.
- Quota policy.
- Memory scope policy.
- Product routing.
- Support/admin visibility.

Stripe remains the payment processor. ZAKI owns plans, entitlements, usage semantics, and product access decisions.

## Success Definition

The first production-ready platform release is successful when:

- A new user can sign up, choose a plan, use every product, understand usage, and upgrade.
- A paid user can use Spaces, Agent, and Learn without inconsistent quota or memory behavior.
- Admin/support can answer "what happened to this user's access, usage, and memory" from one trail.
- Product limits can change from configuration without editing multiple product surfaces.
- Future CLI/local app/extensions can be added without redesigning auth or entitlements.
- The UI feels coherent, restrained, fast, and premium across desktop and mobile.
- Typecheck, tests, accessibility checks, and key E2E flows pass before release.

## Deferred CEO Decisions

These values intentionally remain configurable until commercial pricing is finalized:

- Exact prices for Personal, Pro, and Pro MAX.
- Exact weekly allowance per plan.
- Exact product weights against weekly allowance.
- Exact five-hour burst semantics.
- OAuth provider launch order beyond Google.
- Retention windows and export rules by plan.
- Priority routing/service class by plan.

The implementation should make these values data-driven, not hardcoded in UI or route handlers.
