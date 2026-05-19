# ZAKI Prod World-Class Roadmap

Date: 2026-05-19
Goal: move from current feature-rich app to production-grade ZAKI control plane.

## Strategy

Do not start by redesigning screens in isolation. The UI will only become world-class when the platform model underneath is clear.

The correct sequence is:

1. Lock the product model.
2. Build the control plane foundations.
3. Refactor boundaries without changing behavior.
4. Replace plan/usage/memory models.
5. Redesign the shell and settings around the new model.
6. Polish product screens.
7. Add launch-grade verification.

## Phase 0: Decision Lock

Outcome: no ambiguity before implementation.

Decisions:

- Plan names: Free, Personal, Pro, Pro MAX.
- Quota philosophy: shared weekly allowance plus 5-hour burst window.
- Products in catalog: Spaces, Agent, Brain, Learn.
- Future products reserved: CLI Agent, local app, extensions.
- Memory policy: keep Spaces memory only as Workspace Memory.
- Agent Brain remains Personal Brain Memory.
- Learning memory remains Learner Memory.
- OAuth order after Google.

Deliverables:

- `PRODUCT.md`
- `DESIGN.md`
- plan/quota matrix
- memory scope matrix
- API ownership map

Acceptance:

- Every future implementation task can point to an agreed product rule.

## Phase 1: Control Plane Refactor Without Behavior Change

Outcome: code becomes ownable before business-model changes.

Backend:

- Split `backend/src/index.js` into route modules.
- Extract services for auth, billing, usage, entitlements, memory, product routing.
- Add route registry.
- Add consistent error envelope.
- Add OpenAPI draft from current routes.
- Move startup DDL toward migrations, beginning with new tables only.

Frontend:

- Introduce product shell boundaries.
- Route-lazy load Learn, Brain, admin, marketing, heavy Agent panels.
- Split `ChatArea` into hooks/services by state domain.
- Split `LearningPage` by capability areas.
- Split `Sidebar` into navigation, sessions, profile, and modal orchestration.

Acceptance:

- Same behavior, smaller bundles, cleaner module ownership.
- Build and all tests pass.
- Visual screenshots match before/after for primary routes.

## Phase 2: Plans, Entitlements, and Usage Ledger

Outcome: commercial platform matches the desired business model.

Backend:

- Add product catalog.
- Add plan catalog.
- Add plan entitlements.
- Add usage event ledger.
- Add usage window aggregation.
- Add quota enforcement for weekly and 5-hour windows.
- Add quota weights per product/feature.
- Migrate old plan IDs to new plan IDs.
- Keep legacy plan compatibility during transition.

Frontend:

- Replace pricing cards with Free/Personal/Pro/Pro MAX.
- Add Settings > Usage.
- Add dashboard usage strip.
- Add quota-reached states for Spaces, Agent, Learn.
- Add product-level usage details.

Acceptance:

- Every product consumes usage through the same service.
- Settings shows weekly total, per-product usage, 5-hour burst status, reset time.
- Stripe checkout maps to new plans.
- Webhook replay updates entitlements correctly.

## Phase 3: Memory Control Plane

Outcome: memory becomes trustworthy and product-aligned.

Backend:

- Add canonical `memory_items` or migrate current `memories` table.
- Migrate current email-string Spaces memory to canonical `owner_user_id`.
- Add `scope_type`, `scope_id`, `source_product`, provenance, and visibility.
- Move Spaces memory capture server-side.
- Add memory quality evals.
- Add promotion flow from Workspace Memory to Personal Brain.
- Add memory review/conflict APIs under one memory service.

Frontend:

- Add Settings > Memory.
- Add Brain/Memory product view with tabs:
  - Personal Brain
  - Workspace Memory
  - Learner Memory
  - Review
  - Conflicts
- Add per-space memory controls.
- Add transparent “used memory” explanations in chat.

Acceptance:

- No memory writes use email as primary identity.
- A user can see, edit, delete, reject, and export memory by scope.
- Spaces memory is clearly Workspace Memory.
- Agent Brain remains central for personal graph memory.

## Phase 4: Auth and Future-Surface Foundation

Outcome: authentication is ready for web, CLI, local app, and extensions.

Backend:

- Add normalized provider identities.
- Migrate Google identity fields.
- Add Apple/Microsoft/GitHub OAuth if selected.
- Add OAuth client registry.
- Add device authorization flow for CLI.
- Add scoped API tokens.
- Add token/session revocation UI data.

Frontend:

- Settings > Connected accounts.
- Settings > Devices and sessions.
- Settings > Developer access.

Acceptance:

- Browser auth still works.
- Google OAuth still works after migration.
- Device flow can issue scoped token in test.
- Tokens are revocable and usage-attributed.

## Phase 5: S-Tier UI System and Shell

Outcome: ZAKI feels like one clean product.

Design system:

- Tighten radius scale.
- Reduce decorative gradients/radials in app surfaces.
- Replace raw hex usage in product screens.
- Normalize typography and spacing.
- Define product badges, usage meters, quota banners, memory provenance chips, empty states, and toolbars.

Screens:

- New authenticated dashboard.
- Clean product switcher.
- Settings as control center.
- Usage dashboard.
- Memory governance.
- Product-specific screen polish for Spaces, Agent, Learn, Brain.

Acceptance:

- Desktop and mobile screenshots reviewed.
- No overlapping text.
- No app routes with card-in-card page sections.
- Product navigation feels consistent.
- Settings is complete enough for production users.

## Phase 6: Product Surface Finalisation

Outcome: each product is production-ready in its own right.

Spaces:

- Workspace Memory controls.
- Better space/thread IA.
- Files and pinned context polish.
- Anonymous/paid quota states.

Agent:

- Session list polish.
- Approvals workflow.
- Brain integration.
- Tools/secrets/channels clarity.
- Diagnostics readable for power users without frightening normal users.

Learn:

- Split capabilities into clear workspaces.
- Study plan and memory integration.
- Book/notebook/source UX polish.
- Tutor agent setup simplification.

Brain:

- Graph/search/timeline are visually clean.
- Memory provenance is legible.
- Promotion/conflict flows are obvious.

Acceptance:

- Each product has a first-run state, active state, error state, limit state, and empty state.
- E2E covers the primary journey for each product.

## Phase 7: Production Hardening

Outcome: launch confidence.

Backend:

- Enforce Cloudflare-aware rate limiting or user-based rate limiting.
- Add audit events for billing/auth/admin/memory.
- Add structured logger with redaction.
- Add SLOs and health dashboards.
- Add webhook replay runbook.
- Add migration rollback runbook.

Frontend:

- Bundle budgets.
- Accessibility checks.
- Visual regression.
- Browser smoke tests.
- Error boundary telemetry.

Acceptance:

- Typecheck passes.
- Frontend tests pass.
- Backend tests pass.
- E2E passes.
- Bundle budget passes.
- Accessibility baseline passes.
- Migrations dry-run cleanly.
- Billing and OAuth smoke tests pass.

## Phase 8: Launch Package

Outcome: production finalisation is ready to ship.

Deliverables:

- Final launch checklist.
- Operator runbook.
- Billing runbook.
- Auth/OAuth runbook.
- Memory runbook.
- Incident response path.
- Known limitations.
- Roadmap for CLI/local/extensions.

Acceptance:

- A production user can sign up, authenticate, choose a plan, use every product, see usage, manage memory, export/delete data, and understand limits without operator help.

## Recommended Immediate Next Step

Start with Phase 0 and Phase 1 together:

- Phase 0 locks product and memory decisions.
- Phase 1 creates the code boundaries needed to implement the new platform safely.

Do not start with visual redesign alone. The visual redesign should follow the control-plane decisions so the UI reflects the final commercial and memory architecture.

