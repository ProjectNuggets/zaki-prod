# Dashboard Productization Roadmap

Date: 2026-06-17
Owner: Product and CTO
Branch/worktree observed: `/Users/nova/Desktop/zaki-prod` on `codex/first-run-warm-resume`

## Decision

The app dashboard is the front door. The website is a secondary brand and
context surface. The user lands in the product first, sees a three-step
first-run card, and can either start useful work, create an account, or visit
the website.

## Research Summary

- The integrated app already routes `/` to the dashboard through `ChatArea` and
  `ZakiDashboard`.
- Anonymous users already receive a three-slide first-run intro stored behind
  `zaki:dashboard-v2-intro-dismissed`.
- The dashboard already writes pending intents and browser-local anonymous work.
- The website exists in two forms: integrated app marketing routes and the
  standalone `website/` package. The product should treat both as narrative
  support, not as the primary entry.
- Finalization docs require product truth: Agent, Chat, Brain, Dashboard, and
  Settings are public core; Learn and Hire stay beta; Design stays waitlist.

## Five Phases

### Phase 1: Dashboard Entry

Goal: the first screen explains and activates the product without becoming a
marketing page.

Wiring:

- `/` opens the command dashboard.
- First-run card has three slides: product explanation, activation, website.
- Activation slide focuses the composer with `Start free chat`.
- Activation slide sends users to signup with `Create account`.
- Website slide routes to `/story`.

Done when:

- Focused dashboard tests prove all intro actions.
- Desktop and mobile show no clipped text.
- EN and AR copy avoids V1 residue in dashboard chrome.

### Phase 2: Activation Loop

Goal: one prompt becomes retained product intent.

Wiring:

- Chat prompts start immediately for anonymous users.
- Non-chat product prompts write a pending intent and route through signup.
- Exhausted-credit prompts are preserved before signup.
- Returning anonymous work appears on the dashboard.

Done when:

- Tests cover Chat start, Agent preview signup, Brain route, coming-soon gates,
  exhausted credit save, and return-to behavior.

### Phase 3: Control Plane Truth

Goal: dashboard, pricing, products, and settings agree.

Wiring:

- Dashboard status strip shows plan, weekly reset, identity, and live Agent state.
- `/pricing` handles checkout, access codes, portal, and cancellation states.
- `/products/:productId` redirects signed-in users to canonical app surfaces.
- `/settings` owns account, billing, products, channels, secrets, providers,
  devices, memory, developer access, and privacy.

Done when:

- Product visibility tests prove public, beta, waitlist, and hidden states.
- Settings never exposes unsupported backend actions as available.

### Phase 4: Core Product Proof

Goal: Agent, Chat, and Brain prove the platform promise.

Wiring:

- Agent controls map to BFF/runtime behavior and visible failure states.
- Chat keeps lightweight anonymous value while preserving signup handoff.
- Brain becomes the canonical personal memory surface with provenance and
  governance where BFF routes exist.

Done when:

- Signed-in E2E covers `/`, `/agent`, `/brain`, and `/settings`.
- Screenshots exist at `1440x1000` and `390x844`.

### Phase 5: Website And Release Lock

Goal: marketing supports the product without drifting from it.

Wiring:

- Website pages describe the same product states as the app.
- Website CTAs return to app routes with source and intent.
- Standalone `website/` content is either reconciled or marked legacy.
- Operator page remains hidden and guarded.

Done when:

- `npm run typecheck`, `npm run build`, `git diff --check`, focused unit tests,
  and release E2E all pass.
- Public claims match backend, BFF, UI, and test coverage.

## Boiled Down

Ship the dashboard as mission control first. Wire every first-run choice to a
real action. Keep the website as a story path. Then close the loop across
signup, pricing, settings, Agent, Brain, and release E2E.
