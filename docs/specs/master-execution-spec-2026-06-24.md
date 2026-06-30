# ZAKI Prod — Master Execution Spec ("one spec to boil through")

**Date:** 2026-06-24
**This is the single ordered worklist.** It consolidates three investigations into one boil-through checklist:
- [360 Production & UI/UX Audit](../audits/2026-06-24-360-production-uiux-audit.md) — production gaps (reference for "why")
- [S-Tier UI Spec](./s-tier-ui-spec-2026-06-24.md) — the polish detail (reference for UI items)
- **Tenant & User Isolation Hardening** (§ below, full detail inline — newest, highest-stakes)

Every item has an ID, evidence (file:line), the lazy-correct fix, effort (S/M/L), and **owner**. Owner = **YOU** means operational (provider dashboards) and can't be code; everything else is **ME**.

**Grade today:** Production **B (~80%)** · Isolation **C+** (one confirmed P0 drags it below passing). Close Gate 0 + Gate 1 → confident **A−**.

---

## The reframe (why the order is what it is)

`sk_live` is live — **you are already a multi-tenant system taking money with two open P0s**: a cross-tenant data-leak on the busiest path, and exposed secrets. So this isn't "path to launch" — it's **contain the live exposure → prove it → harden → polish.** Gate 0 is incident response, not roadmap.

---

## GATE 0 — Stop active exposure (before any more paid traffic)

| ID | Item | Owner | Effort | Evidence → Fix |
|---|---|---|---|---|
| ☐ **G0-SEC-1** | Rotate every live secret | **YOU** | M | `backend/.env` holds `sk_live`, `ZAKI_JWT_SIGNING_KEY`, `NOVA_TYP_API_KEY`, Creem/Resend/Together/SMTP — still in git history (`9bd7fd1`…). Rotate each in its provider dashboard; move real values into the k8s secret; keep placeholders local. JWT rotation logs everyone out → maintenance window. History purge (BFG) is secondary; rotation closes the exposure. |
| ☐ **G0-ISO-1** | Gate `streamChatHandler` with ownership check (**the P0 cross-tenant leak**) | ME | S | `index.js:10843` calls `requireAuthUser` but **not** `requireWorkspaceAccess`; reads `slug`/`threadSlug` from `req.params`; agent-turns fall back to the admin god-key (`typ-client.js:190 bearer = authToken \|\| key`) on the dev-API → A reads B's private docs (`vector-search` on B's slug) + writes into B's thread. **Fix:** add `requireWorkspaceAccess` at top; pass verified `access.slug`/`access.threadSlug` into `requestTypChatStream` AND `fetchWorkspaceDocContext`; assert thread ownership; 403 otherwise. |
| ☐ **G0-ISO-2** | Strip `Set-Cookie` on the public share proxy | ME | S | `copyResponseHeaders` `UPSTREAM_HEADER_BLOCKLIST` (`index.js:3241`) omits `set-cookie`; unauth `/api/agent/share/{trace,artifact}/:shareCode` plants upstream NOVA cookies on the BFF domain. Hire path already strips it (`index.js:3281`). **Fix:** add `"set-cookie"` to the blocklist (closes the class for every caller). |
| ☐ **G0-BILL-1** | Make the Stripe subscription webhook atomic | ME | M | `billing-stripe-webhook-handler.js:161` marks the event processed (200-on-duplicate at `:164`) **before** the `plan_tier` UPDATE at `:240`; a transient failure → Stripe retry short-circuits as duplicate → cancel/downgrade silently lost. Self-documented at `:277-278`. **Fix:** wrap (resolveUser + UPDATE + markProcessed) in one `withDbTransaction`, or DELETE the marker row on exception before the 500. |

**Gate 0 done when:** no live key in any reachable history; A-vs-B stream-chat returns 403 + triggers no admin vector-search on B's slug; share proxy emits no `Set-Cookie`; a forced webhook-handler exception does not lose the plan change.

---

## GATE 1 — Prove it (same sprint; green CI must mean something)

| ID | Item | Owner | Effort | Evidence → Fix |
|---|---|---|---|---|
| ☐ **G1-TEST-1** | Postgres in CI → un-skip the ledger/meter suites | ME | M | `meter-gate.pg.integration`, `unit-ledger.pg.integration`, `agent-usage-reconcile.pg.integration` are `describe.skip` (no `LEDGER_TEST_DATABASE_URL`); `ci-backend.yml` has no `services: postgres`. **Fix:** ~6-line `services: postgres` (postgres:16/pgvector) + export the env var; tests self-enable, zero test-code change. |
| ☐ **G1-TEST-2** | One required, non-skipping real e2e/smoke per release | ME | M | All 13 Playwright specs mock the backend; `smoke-billing`/`smoke-v01` skip-to-green when `SMOKE_*` unset. **Fix:** one staging backend + secrets once; make the billing smoke hard-fail when unset (or add a "smokes-must-have-run" assertion); default `RELEASE_CHECK_RUN_BILLING_E2E=true`. |
| ☐ **G1-ISO-TESTS** | Regression test per confirmed leak, wired into `multiuser-*-isolation.mjs` | ME | M | The smokes cover agent/hire/learning chat leakage but **none** cover Spaces stream-chat ownership, share header hygiene, idempotency collision, or memory orphan reuse. **Fix:** add the 5 negative tests listed in the isolation §. Each fix needs a test that fails on regression or it reopens silently. |

**Gate 1 done when:** the money path runs against real Postgres in CI; at least one real end-to-end flow gates the release and cannot silently skip; every Gate-0/2 isolation fix has a red-on-regression test.

---

## GATE 2 — Close remaining isolation + durability (before scaling replicas/volume)

| ID | Item | Owner | Effort | Evidence → Fix |
|---|---|---|---|---|
| ☐ **G2-ISO-3** | Thread-granularity ownership (kills the IDOR) | ME | M | `requireWorkspaceAccess` proves only that the user owns *some* thread in the workspace (`typ-client.js:130-134`); `getThreadChatsHandler` (`index.js:9627`), `updateThreadHandler` (`9538`), `deleteThreadHandler` (`9604`) act on raw `req.params.threadSlug`. **Fix:** one `assertWorkspaceAndThreadOwnership(novaUserId, slug, threadSlug)` helper in `typ-client.js`; route streamChat + all thread handlers through it (collapses ISO-1/2/3 into one choke point). |
| ☐ **G2-ISO-4** | Namespace meter idempotency keys by user id | ME | S | `readSpacesIdempotencyKey` (`index.js:10370`) returns the raw client key; `reserveUnits` idempotency SELECT (`unit-ledger.js:172-175`) has no `user_id` predicate → A's key collides B's hold → 409 DoS. Agent path is safe (`agent:${userId}:${reqId}`, `index.js:11438`). **Fix:** build `spaces:${identity.userId}:${clientKey}`; add `AND user_id=$N` to the ledger SELECT (defense-in-depth, fixes the class). |
| ☐ **G2-ISO-5** | Referential integrity on `memories` | ME | M | `memories.user_id` is `TEXT` keyed on email, no FK/cascade (`db.js:1001-1012`) — the only tenant table not `BIGINT REFERENCES zaki_users(id) ON DELETE CASCADE`. Any user-delete outside `/api/account/delete` orphans memories; a future signup on the same email inherits prior-owner PII. **Fix (lazy):** orphan sweep at startup + login guard + normalize export/delete key to `.trim().toLowerCase()`. **Fix (correct):** migrate key to `zaki_users.id` + cascade. |
| ☐ **G2-OPS-1** | Advisory lock around `initDb()` DDL | ME | S | `initDb()` runs ~150 unconditional DDL statements every boot, no lock; top-level `await initDb()` (`index.js:4146`) has no try/catch; `minReplicas=3` → rolling-deploy catalog race → CrashLoop. **Fix:** wrap DDL in `pg_advisory_xact_lock(<const>)` (~4 lines). |
| ☐ **G2-OPS-2** | Schedule the backup-restore drill | ME | S | `scripts/backup-restore-drill.mjs` is only syntax-checked + run by hand; runbook says "don't deploy without a successful drill" but nothing enforces it. **Fix:** weekly cron GH Actions runs `npm run ops:backup-drill` against a restore target, fails on non-zero (~30 lines, reuses the script). |
| ☐ **G2-ISO-PREV** | Preventative: one header copier, query-scope CI lint | ME | M | Converge `copyHireResponseHeaders` onto the single blocklist. Grep-based CI check: flag `novaAdminRequest(`/`adminRequest(` calls whose enclosing handler doesn't reference `requireWorkspaceAccess`/`assertOwnership`, and tenant SQL missing a session-user bound param. Catches the next opt-out before it ships. |

**Gate 2 done when:** all admin-key thread routes go through the ownership helper; idempotency keys are user-namespaced and the ledger filters by user_id; memory cleanup is structural (or swept+guarded); no DDL race on rolling deploy; a restore is proven weekly.

---

## GATE 3 — UI S-tier (parallelizable with Gate 2; hero-surface-first)

Full detail in the [S-Tier UI Spec](./s-tier-ui-spec-2026-06-24.md). Sequence: **Chat → Dashboard → Settings → Pricing → secondary.**

| ID | Item | Effort | One-liner |
|---|---|---|---|
| ☐ **G3-UI-1** | Re-point shadcn tokens at V2 (`theme.css`) | S | **Highest ROI.** `--radius:0.25rem`, `--destructive/--ring/--chart-1: #d24430`. One file fixes 22+ components. Verify with screenshots of the 5 money surfaces. |
| ☐ **G3-UI-2** | Consolidate motion to 2 named curves + duration scale | S | `--zaki-ease-standard`/`-emphasized` in `tokens.css:224`; route the 4 transition tokens through them. |
| ☐ **G3-UI-3** | Route Suspense fallback → skeletons + cross-fade | S | `routes.tsx:10` blank div → per-route skeleton (Brain already does it); compose `SkeletonChatShell` from shipped pieces. |
| ☐ **G3-UI-4** | Optimistic rename/delete with rollback | M | `queries/*` `onMutate`(snapshot)/`onError`(restore); kills snap-back at `Sidebar.tsx:1514`, `ChatArea.tsx:4193/4254/5018`. |
| ☐ **G3-UI-5** | Inline "Try again" on failed messages | M | `chat/MessageBubble.tsx` error branch re-invokes `handleSend` with prior prompt. |
| ☐ **G3-UI-6** | Honest meter-failure state | S | `ZakiDashboard.tsx` + `useBilling.ts`: on `isError` render "—"/"Usage unavailable", not a confident 0% bar. |
| ☐ **G3-UI-7** | Destructive dialog a11y | S | `TypeToConfirmDialog.tsx` → wrap in existing `ModalShell` (focus-trap/Escape) + `htmlFor` on input. |
| ☐ **G3-UI-8** | Contrast tokens (AA) | M | `--v2-accent-text:#c23a25` for small accent text; promote info text ink-4→ink-3. |
| ☐ **G3-UI-9** | Button convergence + de-V1 shell chrome | M | Redefine `.zaki-btn`→`.v2-btn`; lower `.zaki-main-panel`/`.zaki-input-form` radius, drop glassmorphic modal backdrop. |
| ☐ **G3-UI-10** | `@axe-core/playwright` in CI | S | Zero critical violations on `/`, `/agent`, `/brain`, `/settings`, `/pricing`. Locks the a11y work. |

**Gate 3 done when:** the per-surface "S-tier done" checklist (UI spec §8) passes on Chat + Dashboard at minimum.

---

## GATE 4 — Hygiene (cleanup, not gates)

| ID | Item | Owner | Effort |
|---|---|---|---|
| ☐ **G4-1** | Flip Learn registry `defaultState` to DISABLED (`platform-policy.js:126`) to match UI | ME | S |
| ☐ **G4-2** | Add ESLint + a non-blocking full (`*.test`-included) `tsc` CI job | ME | M |
| ☐ **G4-3** | Rate-limit + min-entropy on the two public `/api/agent/share/*` routes | ME | S |
| ☐ **G4-4** | Marketing cheap wins: scroll-jack skip-link, `display:none` reflow guard in `zaki-home.js`, fix `BrainComposeModal.tsx:3` import | ME | S |
| ☐ **G4-5** | (Track only) MUI removal — tree-shakes to zero, hygiene not a fix | ME | — |

---

# Tenant & User Isolation Hardening (full detail)

## Posture summary
ZAKI Prod is a multi-tenant BFF over a **shared** NOVA.TYP + Nullalis + one Postgres. Isolation is enforced by a consistent convention: **every tenant-scoped operation derives its partition key 100% server-side from the verified JWT** — canonical integer `zakiUser.id` (agent, hire, billing, brain proxy, Spaces workspace routes) or the lowercased, UNIQUE, immutable session email (Personal-Brain memory). No audited route derives the tenant from client input, and the admin-key workspace create/delete routes verify ownership first. **The model is sound.** The failures are a few routes that *opted out of the shared ownership helper* and call the admin key / a shared ledger / a non-FK table on raw client input. One is a fully-reachable P0.

**Grade: C+** today → **A−** with G0-ISO-1 + G0-ISO-2 closed and the ownership helper (G2-ISO-3) enforced.

## Confirmed leaks
*(All five are itemized above as G0-ISO-1/2 and G2-ISO-3/4/5 with evidence+fix. The P0 — G0-ISO-1 — was independently re-verified by the orchestrator: `streamChatHandler` at `index.js:10843` has no `requireWorkspaceAccess` call where 10 other routes do, and `typ-client.js:190` confirms the admin-key fallback.)*

## Preventative hardening (so the next opt-out is caught, not shipped)
1. **Single `assertWorkspaceAndThreadOwnership` helper** every admin-key thread/chat route MUST call → G2-ISO-3.
2. **One response-header copier, one blocklist** incl. `set-cookie` → G0-ISO-2 + G2-ISO-PREV.
3. **Query-scope CI lint:** flag any `novaAdminRequest(`/`adminRequest(` not preceded by an ownership assertion; flag tenant SQL missing a session-user bound param → G2-ISO-PREV.
4. **User-namespace all idempotency keys** + ledger `AND user_id` → G2-ISO-4.
5. **Per-leak regression tests** in the `multiuser-*-isolation.mjs` harness → G1-ISO-TESTS.
6. **Rate-limit + min-entropy** on public share routes → G4-3.
7. **User-namespace the hire upstream path** (or a leadId-ownership CI negative) so hire IDOR has a BFF backstop, not just the upstream header check.

## Per-surface isolation invariant checklist
- **NOVA admin-key proxy:** ☐ streamChatHandler gated by requireWorkspaceAccess ☐ all thread routes assert *thread* ownership ☐ doc-grounding uses verified `access.slug` only ☐ no admin-key call reads slug/threadSlug from `req.params` without a prior ownership assertion.
- **Memory & Brain:** ☐ every read/write/delete `WHERE user_id=$1` (server-derived) ☐ route 403s client userId ≠ session ☐ export/delete key byte-identical to write key ☐ orphan sweep + login guard until FK/cascade.
- **Billing/quota:** ☐ every meter/ledger op keyed by verified `zakiUser.id` ☐ all idempotency keys user-namespaced ☐ ledger idempotency SELECT filters by user_id ☐ Stripe writes resolve user only from signed event data.
- **Share/provisioning/anon:** ☐ public proxy strips Set-Cookie ☐ share routes rate-limited + min-entropy ☐ anon claim creates fresh rows in the authed caller's workspace ☐ provision sets user_id LAST from canonical id ☐ hire paths namespaced or CI-covered.

---

## Effort roll-up

| Gate | Theme | Owner split | Rough effort |
|---|---|---|---|
| **0** | Stop the bleeding | 1 yours + 3 mine | ~1 day (mine) |
| **1** | Prove it | mine | ~1.5 days |
| **2** | Close isolation + durability | mine | ~2 days |
| **3** | UI S-tier (hero) | mine | ~3–4 days |
| **4** | Hygiene | mine | ~1 day |

**Critical path to a confident A−:** Gate 0 → Gate 1. ~2.5 days of my work + your secret rotation. Gates 2–3 are the difference between "safe to take money" and "S-tier." No item requires re-architecture.
