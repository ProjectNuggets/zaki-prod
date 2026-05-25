# ZAKI Prod End-State Spec

Date: 2026-05-19
Purpose: define the target state before implementation.

Update note, 2026-05-25: this end-state spec is now interpreted through the Agent-first V1 decision in `docs/zaki-agent-first-v1-product-spec.md` and the app map in `docs/zaki-v1-app-map.md`. ZAKI Agent is the main consumer product; Chat/Spaces, Learn, Hire, Design, Brain, and future clients sit around the same platform spine.

## Product North Star

ZAKI should become a central AI operating system for a user's work, learning, memory, and autonomous agent activity. The flagship consumer surface is ZAKI Agent: a persistent personal agent with graph memory, task execution, and browser control.

The final product should feel:

- Clean, modern, minimal, and precise.
- Fast on first load.
- Trustworthy around memory, billing, usage, and privacy.
- Product-rich without feeling fragmented.
- Built around one ZAKI identity and one ZAKI control plane.

The user should never need to understand internal product names, upstream engines, or quota buckets. They should understand:

- My plan.
- My weekly allowance.
- What I used.
- What resets when.
- Which memories ZAKI has.
- Which products are available.
- Which tools/integrations are connected.

## Platform Model

ZAKI should be a modular platform with these domains:

1. Identity and Auth
2. Subscription and Billing
3. Entitlements
4. Usage Metering
5. Product Router
6. Memory Control Plane
7. Product BFFs
8. Admin and Operations
9. Observability

Initial implementation can remain a modular monolith. The important change is domain boundaries, not deploying microservices too early.

## Target Plans

Plans:

- Free
- Personal
- Pro
- Pro MAX

All products are visible across all plans. Higher plans increase allowance, quality, concurrency, retention, model access, and automation depth.

External pattern this follows:

- ChatGPT exposes features broadly by plan and uses plan-specific access/limits rather than hiding the whole product surface.
- OpenAI reasoning models use weekly/daily limits and visible reset logic.
- Claude applies usage across product surfaces and describes limits as affected by conversation length, model, and feature use.
- Claude Max uses 5-hour session resets plus additional capacity controls.

### Quota Philosophy

Use two layers:

1. Weekly allowance: the main visible budget.
2. 5-hour burst/session window: protects capacity and creates ChatGPT/Claude-like predictability.

All product usage counts toward the user's weekly allowance. Product-specific caps prevent one product from consuming the whole plan if that would damage cost or fairness.

Weekly allowance is an entitlement-week bucket. For paid users, monthly billing starts on subscription activation, while the weekly meter starts on first metered use after that entitlement becomes active. For anonymous/free usage, the weekly meter starts on first metered use for the durable anonymous session. It resets every seven days; unused allowance expires at reset and does not roll over or add to the next week's allowance.

### Usage Units

Do not meter only by message count. Meter in normalized ZAKI Compute Units.

Each usage event should record:

- User ID.
- Product ID.
- Feature ID.
- Surface ID.
- Plan ID.
- Model/engine.
- Input tokens.
- Output tokens.
- Tool calls.
- Files/bytes.
- Websocket active duration.
- Generated assets.
- Cost weight.
- Quota window.
- Request ID.
- Upstream run ID if available.

The UI can display simplified "hours" or "credits," but the backend should track weighted usage.

### Example Plan Shape

Exact prices and numbers are a business decision. The system should support:

- Free: all products visible, small weekly allowance, low burst, short retention, limited automation.
- Personal: meaningful weekly allowance, standard product access, workspace memory, personal learning state.
- Pro: larger weekly allowance, higher burst, richer Agent automation, larger uploads/storage, better priority.
- Pro MAX: highest allowance, higher concurrency, longer retention, CLI/local/extensions access, advanced automation, priority routing.

## Product Catalog

Every product should be registered in a product catalog:

- `agent`
- `spaces`
- `brain`
- `learn`
- `hire`
- `design`
- `cli` future
- `local_app` future
- `extensions` future

Each product declares:

- Routes.
- UI nav entry.
- Required entitlement.
- Usage events.
- Memory scope.
- Data retention defaults.
- Feature flags.
- Admin controls.

## Auth and Future Surfaces

Current ZAKI session auth should remain the browser session foundation.

Add normalized identities:

- `user_id`
- `provider`
- `provider_subject`
- `email`
- `email_verified`
- `linked_at`
- `last_login_at`
- `metadata`

Provider roadmap:

- Now: Google hardening and normalized migration.
- Next: Apple, Microsoft, GitHub.
- Later: SAML/OIDC for teams if Business/Enterprise emerges.

Browser extensions ship in V1 for Agent browser control. Future CLI/local clients should be designed now, implemented later:

- OAuth authorization code with PKCE for local app.
- Device authorization flow for CLI.
- Scoped API tokens for extensions.
- Token revocation and session inventory in Settings.
- Product/usage attribution per client.

## Memory End State

Memory should become a governed platform layer, not a hidden feature in Spaces.

### Memory Types

1. Personal Brain Memory
   - Owned by Agent Brain.
   - Graph-backed.
   - User-global.
   - Used for identity, preferences, long-running goals, relationships, recurring context.

2. Workspace Memory
   - Replaces current ambiguous Spaces memory.
   - Scoped to a workspace/space and optionally thread.
   - Used for project facts, decisions, writing preferences, working context.
   - Not treated as the user's full personal brain.

3. Learner Memory
   - Owned by Learning.
   - Includes study profile, weak topics, plans, notebooks, learning progress, tutor-agent state.
   - Used inside Learn and visible in memory governance.

4. Session Memory
   - Temporary/ephemeral.
   - Used for current conversation continuity.
   - Can be promoted into Personal Brain, Workspace Memory, Learner Memory, Hire Memory, or Design Memory by policy.

5. Hire Memory
   - Owned by Hire.
   - Scoped to role, candidate, pipeline, interview, and hiring-workflow context.
   - Visible through central memory governance.

6. Design Memory
   - Owned by Design when launched.
   - Scoped to brand, product, asset, and design-project context.
   - Visible through central memory governance.

### Memory Record Contract

Every memory-like record should have:

- Canonical `owner_user_id` as BIGINT.
- `scope_type`: personal, workspace, learning, session.
- `scope_id`.
- `source_product`.
- `source_surface`.
- `source_thread_id`.
- `source_message_id`.
- `content`.
- `type`: fact, preference, goal, relationship, event, emotion, constraint, decision, note.
- `confidence_score`.
- `importance_score`.
- `status`: active, pending, rejected, outdated, deleted.
- `visibility`: private, workspace, learning-only.
- `provenance`.
- `created_at`, `updated_at`, `last_used_at`.
- Optional graph node/link reference.

### Spaces Memory Decision

Keep Spaces memory only if it becomes Workspace Memory.

Required changes:

- Migrate email-string `user_id` to canonical `owner_user_id`.
- Add true scope fields.
- Move capture server-side.
- Add clear per-space memory controls.
- Add quality evals and user review.
- Connect provenance to the central memory screen.
- Decide if selected Workspace Memory can be promoted into Agent Brain.

If these are not done, Spaces memory should be frozen in production rather than marketed as a core differentiator.

## App Information Architecture

### Primary Shell

Left rail:

- ZAKI Home
- Agent
- Chat/Spaces
- Learn
- Hire
- Brain/Memory
- Settings

Top/status area:

- Current plan.
- Weekly usage remaining.
- Active product/session state.
- Account menu.

The shell should be quiet and operational, not decorative.

### Dashboard

Dashboard should show:

- Weekly allowance and reset.
- 5-hour burst status.
- Product usage breakdown.
- Recent activity across products.
- Active Agent sessions/approvals.
- Learning plan progress.
- Memory health/review items.
- Upgrade/manage plan actions.

### Settings

Settings should be a true control center:

- Profile
- Plan and billing
- Usage
- Connected accounts/OAuth
- Devices and sessions
- Memory
- Data/privacy/export/delete
- Notifications
- Developer/CLI/local app tokens when added

### Product Screens

Agent:

- Agent workbench.
- Active run/chat.
- Task timeline.
- Browser control panel for server browser and user extension.
- Approvals.
- Artifacts/files.
- Tools/secrets/channels.
- Cron/heartbeat.
- Diagnostics.

Spaces:

- Workspace list.
- Space detail.
- Thread chat.
- Workspace memory controls.
- Files and pinned context.

Learn:

- Study loop.
- Sources/knowledge.
- Books.
- Notebooks.
- Review/question bank.
- Tutor agents.
- Learning memory.

Hire:

- Private beta entry.
- Role/job workspaces.
- Candidate pipeline.
- Interview and evaluation memory.
- Central meter status.

Design:

- Early access/waitlist.
- Future design workspace.
- Design memory placeholder.

Brain/Memory:

- Personal graph.
- Search.
- Timeline.
- Memory review.
- Workspace memory.
- Learning memory.
- Promotion/merge/conflict controls.

Admin:

- Users.
- Plans/subscriptions.
- Usage ledger.
- Quota overrides.
- Access codes.
- Product health.
- Audit logs.
- Incidents.

## Backend End State

Keep Express if fastest, but split `backend/src/index.js`.

Target module shape:

- `backend/src/server.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/oauth.js`
- `backend/src/routes/billing.js`
- `backend/src/routes/usage.js`
- `backend/src/routes/spaces.js`
- `backend/src/routes/agent.js`
- `backend/src/routes/brain.js`
- `backend/src/routes/learning.js`
- `backend/src/routes/memory.js`
- `backend/src/routes/admin.js`
- `backend/src/services/entitlements`
- `backend/src/services/usage`
- `backend/src/services/memory`
- `backend/src/services/billing`
- `backend/src/services/product-router`
- `backend/src/db/migrations`
- `backend/src/contracts/openapi`

Do not introduce microservices until the platform boundaries are correct.

## API Standards

Every route should have:

- Auth requirement.
- Entitlement requirement.
- Usage metering behavior.
- Request schema.
- Response schema.
- Error shape.
- Request ID.
- Audit logging rule.

Response errors should be normalized:

```json
{
  "code": "usage_limit_reached",
  "message": "You reached your weekly Pro allowance.",
  "requestId": "req_...",
  "retryable": false,
  "details": {}
}
```

## Database End State

Move from startup DDL to migrations.

Required domains:

- `users`
- `auth_identities`
- `oauth_clients`
- `sessions`
- `api_tokens`
- `plans`
- `subscriptions`
- `product_catalog`
- `plan_entitlements`
- `usage_events`
- `usage_windows`
- `quota_overrides`
- `billing_events`
- `memory_items`
- `memory_reviews`
- `memory_conflicts`
- `audit_events`

Existing tables can be migrated gradually. Do not rewrite the database all at once.

## UI Quality Bar

The app should follow these rules:

- First screen is the app, not marketing, for authenticated users.
- No nested decorative card stacks.
- Cards only for repeated items, modals, and real tool panels.
- Core shell uses restrained surfaces, thin borders, clean type, and stable spacing.
- Buttons use icons where appropriate.
- Text must not overflow on mobile or desktop.
- No route should import every product eagerly.
- Every screen has empty, loading, error, and quota-reached states.
- Usage and memory must always be explainable.

## Production Gates

Nothing is S-tier until these pass:

- Typecheck.
- Backend tests.
- Frontend tests.
- E2E for auth, billing, usage, Spaces, Agent, Learn, memory.
- Accessibility scan for primary screens.
- Visual regression screenshots for desktop/mobile.
- Bundle budget.
- OpenAPI contract tests.
- Migration dry run.
- Stripe webhook replay tests.
- OAuth callback tests.
- Memory quality evals.
- Observability smoke test.

## Open Questions

1. Exact quota numbers and weight calibration per product and capability.
2. Whether Workspace Memory can be promoted into Agent Brain automatically or only with user approval.
3. Whether Personal Brain Memory is allowed to influence Spaces by default.
4. Default retention by plan.
5. Which OAuth providers are launch-critical after Google.
6. Whether Pro MAX includes CLI/local app/extensions at launch or only reserves the entitlement.
7. Whether ZAKI should add Business/Team later or keep individual plans only for now.
