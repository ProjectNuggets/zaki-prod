# ZAKI Design Contract

Status: V2 accepted product law
Date: 2026-05-25
Owner: CTO/Product + Design Engineering

This document defines the product and interaction design target for ZAKI Prod.

## Decision

V2 is the product design system.

Nothing from V1 intentionally remains in product surfaces. Existing V1 UI and token usage are migration debt until replaced. The old warm/soft visual language is not an acceptable product direction for new work.

The accepted V2 source artifact is:

- `/Users/nova/Desktop/ZAKI Design System.zip`

The repo-native implementation must translate that artifact into React components, app tokens, routes, i18n, APIs, and tests. Static HTML from the design artifact is reference material, not shippable app code.

## Design North Star

ZAKI should feel like a premium AI operating system that belongs to the user.

The app must be tactical, modern, minimal, operationally dense, and precise. It should not feel like a landing page, a generic chatbot wrapper, a fragmented product lab, or a soft SaaS dashboard.

## V2 Product Identity

The product UI is:

- terminal-grade.
- monospace-forward.
- dark/paper stage.
- hairline-structured.
- low-radius.
- low-shadow.
- meter-aware.
- memory-visible.
- controlled by one ember accent.

V2 should learn from Codex, Claude Code, and high-discipline operational tools, while keeping ZAKI's own differentiator: personal graph memory across products.

## Experience Principles

1. Central control before decoration.
   The first signed-in screen helps users understand plan, usage, products, active work, and memory state.

2. Products are visible, limits are explicit.
   Every plan shows every product state. The UI communicates quota, product state, and beta/waitlist status without hiding the system.

3. Memory is visible and governable.
   Users see memory by scope and can reach controls for export, deletion, retention, and review where policy allows.

4. Premium means precise and fast.
   The app avoids visual noise, marketing-card layouts, generic AI gradients, ornamental dashboards, and vague empty states.

5. Product surfaces share one system.
   Agent, Chat, Brain, Learn, Hire, Design, Settings, and Operator use one V2 spine, even when workflows differ.

6. Mobile is first-class.
   Mobile is hardened during implementation. It is not deferred to a final polish pass.

## Information Architecture

### Primary Areas

- Dashboard: mission control and usage overview.
- Agent: personal terminal and Personal Brain.
- Chat: workspace conversations and Workspace Memory.
- Brain: memory control plane.
- Learn: learner workspace and Learner Memory.
- Hire: private beta operations console and Hire Memory.
- Design: early-access placeholder, then design workspace.
- Settings: account, OAuth, billing, usage, privacy, memory/data, developer access.
- Operator: internal support, audit, entitlement, product state, billing, meter, memory, and health views.

### Dashboard Requirements

The dashboard must show:

- current plan.
- weekly allowance remaining.
- five-hour burst/session status.
- product quota breakdown.
- product launchers.
- active work.
- recent usage/activity.
- memory scope status.
- billing/upgrade affordances.
- product operational states.

The dashboard should answer three questions within five seconds:

- What can I use?
- How much do I have left?
- What does ZAKI remember?

### Settings Requirements

Settings owns:

- profile.
- sign-in methods and OAuth connections.
- plan and billing.
- usage and quota history.
- product access.
- memory and data governance.
- privacy and exports.
- developer access: browser extension, API keys, CLI auth, local app sessions, future clients.

Usage belongs in Settings as a durable history view. Dashboard shows the current operational summary.

### Product Settings Requirements

Product settings own only product-local behavior.

Examples:

- Agent: autonomy, browser control, stream style, approval defaults, proactive behavior.
- Chat: workspace defaults, sharing, files/context, Workspace Memory shortcuts.
- Learn: study preferences, cadence, source defaults, learner memory.
- Hire: role/candidate/pipeline preferences, retention shortcuts, hire memory.
- Design: early-access preferences and future project/brand defaults.

Global policy never hides inside a product settings panel.

## Visual System Requirements

Use this document as the repo-local product law. Local agent files such as `.claude/DESIGN.md` may mirror this contract, but they are not the committed source of truth.

Implementation guardrails:

- No intentional V1 product styling in new work.
- No hardcoded hex colors in components unless explicitly documented.
- No purple/pink AI gradients.
- No generic SaaS hero sections inside the app.
- No card-inside-card layouts.
- No pill-heavy product chrome.
- No blurred drop-shadow product surfaces.
- No visible instructional copy explaining obvious controls.
- No viewport-scaled type.
- Use icons for standard tool actions.
- Preserve keyboard navigation and focus states.
- All user-visible strings must go through i18n.

## Product Screen Standards

### Dashboard

Dashboard is mission control. It is not Agent, not Chat, not Settings, and not marketing.

### Agent

Agent is the primary consumer product: personal terminal, visible work, tool traces, approvals, browser control, and Personal Brain.

### Chat

Chat is the renamed customer-facing evolution of Spaces: workspace workshop, threads, files, scoped prompt, members, and Workspace Memory.

### Brain

Brain is the memory control plane: graph, provenance, conflicts, supersession, scopes, export/delete/governance.

### Learn

Learn surfaces progress, goals, weaknesses, next actions, source material, and Learner Memory. Pedagogy can use more prose than the operational surfaces.

### Hire

Hire is a private beta operations console: pipeline, leads, fit scoring, consent, retention, and Hire Memory. It must use central metering.

### Design

Design is early access first. It should be visible as a future product without pretending the workflow exists.

### Operator

Operator mirrors the commercial system: users, entitlements, product state, billing, meter, memory diagnostics, runtime health, and audit trails.

## Mobile Standards

Mobile hardening is part of every slice:

- no clipped text.
- no horizontal overflow.
- no desktop-only control dependencies.
- sheets before cramped modals.
- readable usage/meter state.
- clear product and memory scope.
- composer does not hide approval or memory state.
- dashboard EN/AR checked.
- keyboard and screen-reader paths preserved.

## Competition-Quality Bar

The app is not done until:

- the dashboard communicates product quality and platform coherence in five seconds.
- usage and plan state are understandable without support.
- memory controls are credible and visible.
- product navigation is obvious on desktop and mobile.
- typography, spacing, contrast, and motion feel deliberate.
- empty, loading, error, permission, disabled, maintenance, degraded, readOnly, and limit states are designed.
- every expensive product action uses central grant/receipt metering.
- every product has product surface, product settings, memory scope, usage/meter behavior, and operator mirror.
- main workflows pass browser review and automated checks.

## Review Ritual

Every major UI slice must pass:

- desktop visual review.
- mobile visual review.
- keyboard navigation review.
- EN/AR dashboard review where dashboard is touched.
- light/dark stage review.
- accessibility check.
- product truth check against app map and backend contracts.
- meter/memory/entitlement check.
- operator/support check where relevant.
