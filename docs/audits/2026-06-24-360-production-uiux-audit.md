# ZAKI Prod — 360 Production-Stability & S-Tier UI/UX Audit

**Date:** 2026-06-24
**Method:** 11 parallel dimension auditors → adversarial verification of every production blocker (10/10 confirmed, 0 refuted) → synthesis. Two highest-stakes claims independently re-verified by the orchestrator.
**Verdict:** **B / ~80% production-stable ready.** A confident **A−** is ~1 week of contained, no-rewrite work away.

---

## Executive Summary

ZAKI Prod is a commercially serious, well-architected control plane that is **close to but not yet production-stable for a paid launch**. The positive surprise is the *depth* where it counts: the money-path unit ledger is genuinely S-tier (reserve→settle under a single `FOR UPDATE` lock, DB-unique idempotency, C1 replay-refusal), the auth design is textbook (pinned HS256, hashed rotating refresh tokens, per-tenant authz on admin-key proxy routes), and the ops posture (fail-fast config, graceful drain, structured logging, dual-ended Sentry, a real prove-restore backup script) is above small-team norms. There is **no false-advertising** on GA surfaces — gated products route honestly to placeholders, and E2E asserts real product surfaces stay unmounted.

What keeps it out of "ship to paying customers today" is a short, specific list of **highest-stakes paths that are not yet locked down**: live secrets in working tree + pushed git history, a Stripe subscription-webhook ordering bug that can silently drop a cancel/downgrade, the reserve→settle money path being integration-tested only against a fake DB, and personal memory keyed on a mutable email instead of canonical user id. None are rewrites. The pattern is consistent: **strong design, weak final-mile durability and gating on the exact paths where money and identity live.**

---

## Scorecard

| Dimension | Track | Score | Read |
|---|---|---|---|
| Billing / quota / entitlements | PROD | **82** | S-tier ledger; 1 webhook ordering blocker |
| Observability / ops / deploy | PROD | **82** | Strong; schema-DDL race + unscheduled restore drill |
| Backend↔BFF↔UI contract parity | PROD | **74** | GA wired honestly; Learn state disagreement |
| Security & auth | PROD | **68** | Ship-grade code; live-secret exposure is the blocker |
| Data & memory model | PROD | **68** | Airtight isolation; email-as-key spec violation |
| Quality gates / CI / tests | PROD | **62** | Good unit layer; money path & e2e not really gated |
| Marketing website (immersive) | UIUX | **78** | Strong, prerendered; weight + scroll-a11y debt |
| UX states & core flows | UIUX | **78** | Core flow real; degraded states under-built |
| Motion / smoothness / soft actions | UIUX | **74** | Mature base; route fallback + optimistic-rollback gaps |
| Accessibility & responsive | UIUX | **74** | Above-average; real AA failures + zero axe |
| Design system consistency (V2) | UIUX | **68** | V2 core true; shadcn-on-V1-tokens crack |

---

## Gate Reality (what the green checkmarks do and don't prove)

Frontend typecheck and production build both **pass honestly**: `tsconfig.typecheck.json` inherits full `strict` + `noUncheckedIndexedAccess` and only excludes `*.test` files (file-set narrowing, not strictness loosening). Bundle is large but functional (index 148kB, ChatArea 126kB, three 125kB gzip).

The green checkmarks do **not** prove:
- **Money path is not integration-tested.** `meter-gate.pg.integration`, `unit-ledger.pg.integration`, `agent-usage-reconcile.pg.integration` are all `describe.skip` (CI provisions no Postgres). The unit tests that run mock the DB and cannot prove `FOR UPDATE`/concurrency — a real SQL/race bug ships green.
- **No true end-to-end coverage.** All 13 Playwright specs mock the backend at the network layer (webServer runs only `vite`; release harness registers catch-all route stubs).
- **Real smokes skip to green.** `smoke-billing`/`smoke-v01`/`hire-readiness` no-op to a passing job when `SMOKE_*` secrets are unset.
- **No linter** (both "lint" scripts are `node --check`/typecheck), and **deploy workflows trigger on push to `main` with no CI dependency.**

---

## Production-Stable Gap Analysis

### P0 — true blockers to a paid launch

**1. Live secrets in working tree and pushed git history.**
`backend/.env` holds `STRIPE_SECRET_KEY` (`sk_live`), `STRIPE_WEBHOOK_SECRET`, `ZAKI_JWT_SIGNING_KEY` (mints every session), `NOVA_TYP_API_KEY` (cross-tenant admin), plus Creem/Resend/Together/Nullclaw/Learning tokens and SMTP password. *Independently confirmed:* the file is untracked + gitignored now (`21802ff`) but **history still contains it** (`9bd7fd1`, `fac3957`, …). Compromise of any one = direct money-path / session-forgery / cross-tenant-data event.
**Fix:** rotate every secret (Stripe roll + new `whsec`, Resend, Creem, SMTP, Together, NOVA admin, JWT signing — JWT rotation invalidates sessions, do in a maintenance window). Move real values into the k8s secret; keep placeholders locally. History purge (BFG) is secondary — rotation closes the exposure. **Effort: M.**

**2. Stripe subscription webhook marks event processed before the DB write.**
`billing-stripe-webhook-handler.js:161` marks the event processed (returns 200 on duplicate at `:164`) **before** the subscription `plan_tier` UPDATE at `:240`. A transient failure → 500 → Stripe retry short-circuits as duplicate → **cancel/downgrade permanently lost.** *Independently confirmed, and the code even self-documents the bug at `:277-278`.* Top-up path is immune (own per-session guard); subscriptions are not. `plan_tier`/`plan_status` are the entitlement source of truth.
**Fix:** wrap (resolveUser + UPDATE + mark-processed) in one `withDbTransaction`, or DELETE the marker row on exception before the 500. **Effort: M.**

**3. The ledger/meter money path is integration-tested only against a fake DB.**
Three `*.pg.integration.test.js` suites are `describe.skip` unless `LEDGER_TEST_DATABASE_URL` is set; `ci-backend.yml` has no `services: postgres`.
**Fix:** add a ~6-line `services: postgres` (postgres:16/pgvector) block + export the env var; tests self-enable, zero test-code changes. **Effort: M.**

### P1 — must-fix before scaling / enabling normal account features

**4. Personal-memory partition key is the mutable email, not canonical `zakiUser.id`.**
`memory/routes.js:150` uses `normalizeScopedUserId(authResult.email)`; `memories.user_id` is TEXT with no FK/cascade. Safe *today only because no email-change route exists*. The export-by-email vs delete-by-id asymmetry means the day email-change ships, pre-change memories become un-exportable (GDPR Art. 15/20) and survive deletion as orphaned PII (Art. 17).
**Fix:** key on `String(zakiUser.id)` everywhere + FK/cascade + one-time backfill; interim, assert email-immutability + regression test. **Effort: L.**

**5. Schema DDL races on multi-replica boot.**
`initDb()` runs ~150 unconditional DDL statements every boot with no advisory lock; top-level `await initDb()` (`index.js:4146`) has no try/catch. `minReplicas=3` is live → rolling deploy can hit a catalog race → CrashLoopBackOff.
**Fix:** wrap the DDL block in `pg_advisory_xact_lock(<constant>)` (~4 lines). **Effort: S.**

**6. No required real end-to-end gate.**
Stand up one staging backend, provision smoke secrets once, make the billing smoke hard-fail when unset (or add a "smokes-must-have-run" assertion). Flip `RELEASE_CHECK_RUN_BILLING_E2E` default to true. **Effort: M.**

**7. Backup restorability is never verified.**
`backup-restore-drill.mjs` is excellent but only syntax-checked + run by hand.
**Fix:** weekly scheduled GH Actions workflow runs it against a restore target, fails on non-zero exit (~30 lines, reuses the script). **Effort: S.**

### P2 — coherence / hygiene

**8. Learn registry `defaultState=ENABLED` disagrees with every UI gate** (cosmetic; no open data path). Flip `platform-policy.js:126` to DISABLED. **Effort: S.**
**9. No linter + tests excluded from typecheck.** Add ESLint + a non-blocking full `tsc` job. **Effort: M.**

---

## UI/UX S-Tier Audit (per pillar)

**Design system (68).** V2 core (Agent, Brain) is terminal-grade — zero soft cards, mono-forward, hairline-led, disciplined `v2.css` tokens (2–4px radii, ember `#d24430`, DM Mono). The crack is *structural*: the shadcn `ui/` primitive layer (consumed by 22+ files) resolves `rounded-md`/`bg-destructive` through `theme.css`'s `@theme inline`, which is entirely **V1** (12px radius, `#f10202` red). On top: a legacy `.zaki-btn` pill layer (red gradient + glow) and live V1 shell chrome (28px panel, 24px input, glassmorphic modal) on the primary Chat surface. **Three button languages coexist.** Note: MUI tree-shakes out entirely (no chunk emitted) — it's dead `node_modules` weight, not a runtime conflict. The real duplication is **V1-tokens vs V2-tokens.**

**UX states & flows (78).** The promised flow (sign in → see products → understand plan/usage → use → upgrade without losing memory) is implemented end-to-end and strong. Gaps are all in *degraded states*: meter-fetch failure renders as a confident "0% used / full room" (worst money-adjacent direction), no inline chat retry, no dedicated 429 affordance, raw `window.confirm` across Learn.

**Motion (74).** Mature, hand-crafted base — centralized transition tokens, spring directional message entrances, press-bounce, real skeleton library, thorough `prefers-reduced-motion`. Seams: route Suspense fallback is a **blank screen** (discards the skeletons that exist inside the views), no optimistic-with-rollback on rename/delete, teleporting product-rail indicator, generic `ease` on shared tokens.

**Accessibility & responsive (74).** Above-average bones (focus-trap hook, `aria-hidden` canvas + keyboard DOM list, dynamic-viewport shell, zoom allowed). Real failures: the destructive type-to-confirm dialog has **no focus trap, no Escape, unassociated label**; ember accent (4.04:1) and ink-4 (2.6:1) used as small text fail 4.5:1 across ~90/~30 rules; **zero automated a11y tests.**

**Marketing website (78).** Strong server-prerendered 7-scene scroll narrative (SEO intact, motion is progressive enhancement), real reduced-motion + SPA teardown. Debt: ~72kB GSAP+ScrollTrigger+Lenis; per-scroll-frame `getBoundingClientRect` reflow on a `display:none` rail; thin scroll-jack keyboard a11y; `/ar` renders the old tree, not V4.

---

## Sequenced Strategy

- **Gate 1 — Stop the bleeding (before any paid traffic):** rotate secrets (P0-1) + fix webhook ordering (P0-2). Non-negotiable.
- **Gate 2 — Prove the money path (same sprint):** Postgres in CI un-skips the ledger/meter suites (P0-3) + one required real e2e smoke (P1-6). Now green CI means something.
- **Gate 3 — Durability before scale:** schema advisory lock (P1-5) + scheduled restore drill (P1-7). Land memory canonical-id fix (P1-4) *before* shipping change-email — cheap now, migration nightmare later.
- **Gate 4 — Coherence & polish (parallelizable, the "S-tier" ask):** highest-ROI move is re-pointing `theme.css` at V2 tokens (one file, fixes 22+ components). Pair with route-skeleton fallback, optimistic-rollback, inline chat retry, destructive-dialog a11y, accent/ink contrast tokens. Add `@axe-core/playwright` so a11y stops regressing.

**Bottom line: a B that becomes a confident A− with ~1 week of focused, contained work. No blocker requires re-architecture; the foundation underneath is genuinely good.**

---

## Appendix A — Production Gap Punch-List

| # | Pri | Title | Effort |
|---|---|---|---|
| 1 | P0 | Rotate all live secrets (working tree + git history) | M |
| 2 | P0 | Fix Stripe subscription webhook mark-before-write | M |
| 3 | P0 | Provision Postgres in CI → un-skip ledger/meter suites | M |
| 4 | P1 | Key Personal Brain memory on canonical `zakiUser.id` | L |
| 5 | P1 | Advisory lock around `initDb()` schema DDL | S |
| 6 | P1 | One required, non-skipping real e2e smoke per release | M |
| 7 | P1 | Schedule the backup-restore drill | S |
| 8 | P2 | Resolve Learn registry ENABLED vs UI private-beta | S |
| 9 | P2 | Add a real linter + full (tests-included) typecheck | M |

## Appendix B — UI/UX S-Tier Punch-List (smoothness · soft actions · coherence)

| # | Title | Surface | Technique | Impact | Effort |
|---|---|---|---|---|---|
| 1 | Re-point shadcn tokens at V2 | `src/styles/theme.css` (@theme inline) | `--radius`→4px, `--destructive`/`--ring`→`var(--v2-accent)`; aligns 22+ components, zero component edits | high | S |
| 2 | Skeletons in route Suspense fallback + cross-fade | `src/routes.tsx` (RouteFallback) | Replace blank div with per-route skeleton + opacity transition; optional `document.startViewTransition` | high | S |
| 3 | Surface meter-fetch failure (not 0%/full room) | `chat/views/ZakiDashboard.tsx`, `queries/useBilling.ts` | Use `isError` → render "—"/"Usage unavailable" instead of confident 0% bar | high | S |
| 4 | Optimistic rename/delete via `onMutate`+rollback | `queries/*`, `Sidebar.tsx:1514`, `ChatArea.tsx` | Standard TanStack onMutate(snapshot)/onError(restore); kills snap-back flicker + data risk | high | M |
| 5 | Inline "Try again" on failed assistant messages | `chat/MessageBubble.tsx` error branch | Re-invoke existing `handleSend` with prior prompt | high | M |
| 6 | Destructive dialog → ModalShell + label input | `ui/zaki/TypeToConfirmDialog.tsx` | Wrap in ModalShell (focus-trap/Escape/scroll-lock) + `htmlFor`; fixes real AA failure | high | S |
| 7 | Darken accent-as-text; reclassify ink-4 | `src/styles/v2.css` | `--v2-accent-text` ~#c23a25 (4.6:1); promote info text ink-4→ink-3 | med | M |
| 8 | Converge 3 button systems on V2Button (CSS) | `src/styles/index.css` `.zaki-btn` | Redefine `.zaki-btn` to match `.v2-btn` (2px radius, ember, no glow) | med | M |
| 9 | De-V1 the live shell chrome | `src/styles/index.css` panels/inputs/modal | Lower radius 4–8px, drop backdrop blur + red/teal radial → flat overlay | med | M |
| 10 | Coarse-pointer touch-target bump | `src/styles/v2.css` control heights | `@media (pointer: coarse)` raise control-h to 44px | med | S |
| 11 | Signature easing tokens | `src/styles/tokens.css:224-227` | Add `--zaki-ease-standard` + `-emphasized`; every consumer inherits | med | S |
| 12 | Replace `window.confirm` in Learn | `learning/LearningPage.tsx` (~11 sites) | InlineConfirm / TypeToConfirmDialog for irreversible deletes | med | M |
| 13 | Slide (not teleport) active product-rail indicator | `src/styles/v2.css:1834-1846` | Single positioned indicator, `transition: transform 200ms` | low | S |
| 14 | Fix marketing per-frame reflow on hidden rail | `website/public/zaki/scripts/zaki-home.js` | Guard `buildThread`/`buildChapRail` with `display==='none'` early-return | low | S |
| 15 | Skip-link for scroll-jacked scenes + fix framer import | `website HomeV4.tsx`, `brain/BrainComposeModal.tsx:3` | `.sr-only` skip-link; change import `framer-motion`→`motion/react` | low | S |
