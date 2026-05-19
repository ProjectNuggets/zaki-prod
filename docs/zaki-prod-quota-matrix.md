# ZAKI Prod Quota Matrix

Status: Accepted operating model, numeric values pending commercial pricing
Date: 2026-05-19

This document defines how ZAKI Prod should reason about plan limits, product limits, and usage metering.

## Policy Summary

The accepted model is:

- Plans: Free, Personal, Pro, Pro MAX.
- Every plan exposes every current product.
- Each plan has a shared weekly allowance.
- Each plan has access to a five-hour burst/session window.
- Each product has product-specific caps and weights.
- Product-specific usage rolls up to the weekly allowance.
- Usage is stored in a central ledger, not scattered counters per product.

## Core Terms

### Weekly Allowance

The plan-level budget renewed on a weekly cycle. It should be presented to users as the main usage allowance.

### Five-Hour Burst

A session or time-window allowance that lets users work deeply without thinking in tiny message increments. The exact reset and concurrency semantics are pending CEO/commercial confirmation and should be configuration-driven.

### Product Quota

A product-specific cap or weight. Product quotas prevent one workflow from consuming the platform in a way that breaks cost, quality, or fairness.

### Usage Unit

The internal metering unit. It should be abstract enough to support messages, tool calls, model cost, memory operations, learning sessions, and future CLI/local/extension events.

## Plan Matrix

Numeric values are intentionally placeholders. The implementation must load these from configuration or database policy records.

| Plan | Product access | Weekly allowance | Five-hour burst | Memory capability | Routing class |
| --- | --- | --- | --- | --- | --- |
| Free | All products, constrained | TBD_FREE_WEEKLY | Yes, constrained | Basic scopes, limited retention | Standard |
| Personal | All products | TBD_PERSONAL_WEEKLY | Yes | Personal Brain + workspace/learner memory within policy | Standard |
| Pro | All products | TBD_PRO_WEEKLY | Yes, higher tolerance | Deeper memory, stronger retention/export | Priority when available |
| Pro MAX | All products | TBD_PRO_MAX_WEEKLY | Yes, highest tolerance | Maximum commercial memory depth and controls | Highest commercial class |

## Product Matrix

| Product | Primary usage events | Product-specific controls | Rolls up to weekly allowance | Memory scope |
| --- | --- | --- | --- | --- |
| Spaces | chat turns, service routes, file/context operations, memory reads/writes | workspace caps, service routing caps, file/context limits | Yes | Workspace Memory |
| Agent | agent turns, tool calls, graph memory reads/writes, long-running tasks | agent caps, tool-call limits, graph traversal limits | Yes | Personal Brain |
| Learn | lesson turns, practice generation, assessment, learner memory reads/writes | session limits, assessment limits, curriculum generation caps | Yes | Learner Memory |
| Brain | memory operations, graph updates, retrieval, export/delete | memory depth, write volume, export/delete policy | Yes when user-triggered or expensive | Personal/Workspace/Learner by scope |
| CLI | agent turns, local tool actions, remote memory sync | device/session caps, command/tool caps | Yes | Personal Brain and Session Memory |
| Local App | local sessions, sync, agent/tool actions | device caps, sync caps | Yes for cloud-backed actions | Personal Brain and Session Memory |
| Extensions | browser/page context operations, agent turns, memory sync | origin/session caps, privacy policy controls | Yes | Personal Brain and Session Memory |

## Ledger Requirements

Every meterable event should write a ledger row with:

- Canonical user id.
- Product id.
- Plan id at time of event.
- Event type.
- Usage unit amount.
- Cost hints when available.
- Request id/correlation id.
- Source route or client.
- Memory scope if memory was involved.
- Entitlement decision.
- Quota decision.
- Timestamp.

## Quota Decision Flow

1. Resolve authenticated user.
2. Resolve active plan and subscription state.
3. Resolve product and requested capability.
4. Load plan policy and product policy.
5. Check weekly allowance.
6. Check five-hour burst/session policy.
7. Check product-specific caps.
8. Permit, degrade, or reject.
9. Execute product route.
10. Write usage ledger.
11. Update cached usage summaries.

## Migration From Current State

Current implementation uses scattered and partially incompatible quota concepts:

- Spaces daily quotas.
- Agent weekly quotas.
- Learning weekly quotas and learning-specific counters.
- Commercial plan ids that map to product bundles rather than platform tiers.

Migration requirements:

- Introduce a neutral plan id set: `free`, `personal`, `pro`, `pro_max`.
- Keep legacy plan aliases temporarily for migration and support.
- Add a central product catalog.
- Add a central usage ledger before removing old counters.
- Build dashboard/settings from central usage summaries.
- Delete or freeze obsolete counters only after parity tests pass.

## Open Numeric Decisions

The following must be decided before pricing launch:

- Weekly allowance per plan.
- Product weights.
- Burst reset semantics.
- Burst concurrency semantics.
- Whether unused weekly allowance rolls over.
- Service/model routing by plan.
- Overage behavior: hard stop, soft degrade, paid top-up, or waitlist.

Until then, code should use symbolic policy values and avoid hardcoded commercial numbers.
