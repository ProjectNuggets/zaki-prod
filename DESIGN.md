# ZAKI Design Contract

Status: Accepted baseline for production finalization
Date: 2026-05-19
Owner: CTO/Product + Design Engineering

This document defines the product and interaction design target for ZAKI Prod. The existing `.claude/DESIGN.md` remains the visual brand law for tokens, typography, color discipline, accessibility, and component behavior. This root design contract defines the product experience that those visuals must serve.

## Design North Star

ZAKI should feel like a premium AI operating system that belongs to the user.

The app must be clean, modern, minimal, and operationally useful. It should not feel like a landing page, a generic chatbot wrapper, or a fragmented set of experimental products.

## Experience Principles

1. Central control before decoration.
   The first screen should help users understand their plan, usage, products, and memory state.

2. Products are available, limits are explicit.
   Every plan shows every product. The UI communicates quota state without making lower tiers feel like disabled demos.

3. Memory is visible and governable.
   Users should see which memories exist by scope and should have controls for enabling, exporting, deleting, or disabling them where policy allows.

4. Premium means calm, precise, and fast.
   The app should avoid visual noise, marketing-card layouts, generic AI gradients, and ornamental dashboards.

5. Product surfaces should share one language.
   Spaces, Agent, Learn, and future tools should feel like parts of one system, even when their workflows differ.

6. Mobile is first-class.
   Navigation, usage, memory controls, and chat/learning flows must remain usable on small screens.

## Information Architecture

### Primary Areas

- Dashboard: product command center and usage overview.
- Spaces: workspace/product conversations.
- Agent: personal agent and Brain experience.
- Learn: learner workspace and progress.
- Memory: personal, workspace, learner, and session memory controls.
- Settings: account, OAuth, billing, usage, privacy, developer access.
- Admin/Ops: internal support, audit, entitlement, and health views.

### Dashboard Requirements

The dashboard must show:

- Current plan.
- Weekly allowance remaining.
- Five-hour burst/session status.
- Product quota breakdown.
- Product launchers.
- Recent activity.
- Memory scope status.
- Billing/upgrade affordances.

It should be dense enough to be useful, but not crowded. Repeated cards are acceptable for product summaries. Page sections should not be styled as nested cards.

### Settings Requirements

Settings must become the place for:

- Profile.
- Sign-in methods and OAuth connections.
- Plan and billing.
- Usage and quota history.
- Memory controls.
- Privacy and exports.
- Future developer access: API keys, CLI auth, local app sessions, extension sessions.

Usage belongs in Settings as a durable history view, while the Dashboard shows the current operational summary.

## Visual System Requirements

Use `.claude/DESIGN.md` as source of truth for:

- Color tokens.
- Typefaces.
- Dark/light behavior.
- Arabic/RTL support.
- Accessibility thresholds.
- Component primitives.
- Icon policy.
- Forbidden visual patterns.

Implementation guardrails:

- No hardcoded hex colors in components unless explicitly documented.
- No purple/pink AI gradients.
- No generic SaaS hero sections inside the app.
- No card-inside-card layouts.
- No visible instructional copy explaining obvious controls.
- No negative letter spacing.
- No viewport-scaled type.
- Use icons for standard tool actions.
- Preserve keyboard navigation and focus states.
- All user-visible strings must go through i18n.

## Product Screen Standards

### Dashboard

The dashboard should answer three questions within five seconds:

- What can I use?
- How much do I have left?
- What does ZAKI remember?

### Spaces

Spaces should feel like a work surface, not only chat. Workspace memory, artifacts, files, service routes, and conversation context need clear scope.

### Agent

Agent should make the Brain visible without exposing implementation details. Personal memory should feel trustworthy, inspectable, and editable.

### Learn

Learn should surface progress, learning goals, weaknesses, next actions, and learner memory. It should not inherit generic chat affordances where pedagogy needs structure.

### Memory

Memory UI must separate:

- Personal Brain.
- Workspace Memory.
- Learner Memory.
- Session Memory.

Each memory item should communicate scope, source, last used time, and available actions.

## Competition-Quality Bar

The app is not done until:

- The first five seconds of the dashboard communicate product quality and platform coherence.
- Usage and plan state are understandable without support.
- Memory controls are credible and not hidden.
- Product navigation is obvious on desktop and mobile.
- Typography, spacing, contrast, and motion feel deliberate.
- Empty, loading, error, and limit states are designed.
- Main workflows pass manual browser review and automated checks.

## Review Ritual

Every major UI slice must pass:

- Desktop visual review.
- Mobile visual review.
- Keyboard navigation review.
- EN/AR copy review.
- Light/dark review when applicable.
- Accessibility check.
- Product truth check against `PRODUCT.md`.
