# ZAKI Learn Paid-User Readiness Plan

Status: frozen for phase-by-phase execution.
Owner: Codex in this local workspace.
Date frozen: 2026-05-09.

This is the execution source of truth for declaring ZAKI Learn ready for paying users. A phase can move to PASS only with fresh evidence recorded in this file or in the referenced checklist/runbook. No phase is skipped, and GA is blocked until every GA gate is green.

Related source-of-truth documents:

- `docs/zaki-learning-integration-spec.md`
- `docs/zaki-learning-uat-checklist-2026-05-08.md`
- `docs/zaki-learning-operator-deployment-checklist.md`
- `docs/zaki-learning-api-contract.md`
- `docs/zaki-learning-upstream-parity-matrix.md`
- `docs/zaki-learning-backup-restore-runbook.md`

## Readiness Definitions

- Local beta-ready: all local correctness, route UAT, and two-user isolation gates pass with no open P0/P1 findings.
- Paid-user GA-ready: local beta gates pass, production deployment readiness passes, quota/unit economics are enforced, retention/export/delete are verified, backup/restore is drilled, monitoring/alerts are live, and final security/code review has no open P0/P1 findings.

## Frozen Phases

| Phase | Name | Goal | Exit Gate | Status |
| --- | --- | --- | --- | --- |
| 1 | Local Correctness Freeze | Confirm both repos, local services, operator config, and automated checks are coherent before deeper UAT. | Frontend/backend/engine health pass; full focused tests pass; no new P0/P1 code findings. | PASS |
| 2 | Route-By-Route UAT | Press every Learn route and primary function as a real student. | Every route/function is PASS or has a deliberate unavailable state; all P0/P1 failures fixed. | PASS |
| 3 | Two-User SaaS Isolation | Prove tenant isolation for data, runtime state, assets, WebSockets, and browser cache. | Two local users can use Learn in parallel with zero cross-user leakage. | PASS-BETA |
| 4 | Quota, Cost, Entitlement | Make paid/free economics enforceable at BFF/operator level. | Quotas are enforced by plan/user/route/provider and unit economics assumptions are recorded. | PASS-BETA |
| 5 | Governance | Verify data export, account deletion, retention cleanup, and backup/restore. | Export/delete/retention/restore evidence is green. | PASS-BETA |
| 6 | Observability And Failure UX | Ensure operators and users see failures clearly. | Health checks, alerts, task states, retries, and long-running progress all work. | PASS-BETA |
| 7 | Production Deployment Readiness | Validate central auth, internal tokens, image/source pins, secrets, CORS/CSP, and staging/production config. | `/api/internal/learning/deployment-readiness` is ready in the target environment and staging smoke passes. | PENDING |
| 8 | Final Code And Security Review | Review all Learn changes after gates are green. | No open P0/P1; P2 items either fixed or explicitly accepted with rationale. | PENDING |
| 9 | Beta/GA Declaration | Declare the highest truthful readiness level based on evidence. | Beta or GA verdict written with exact remaining blockers, if any. | PENDING |

## Phase 1 Checklist

| Check | Evidence | Status |
| --- | --- | --- |
| ZAKI frontend reachable | PASS: `curl -fsS http://localhost:5174/ >/tmp/zaki_frontend_check.html && wc -c /tmp/zaki_frontend_check.html` returned 1525 bytes. | PASS |
| ZAKI backend health/readiness reachable | PASS: `curl -fsS http://localhost:8787/health` returned `ok:true`; `curl -fsS http://localhost:8787/ready` returned `status:"ready"` with learning dependency ready. | PASS |
| Learning engine health reachable | PASS: internal-auth checks to `http://localhost:8001/healthz`, `http://localhost:8001/readyz`, and `/api/v1/book/health` returned healthy/ok. | PASS |
| Backend learning contract tests | PASS: `npm --prefix backend test -- src/learning-bff-contract.test.js src/learning-study.test.js src/learning-client.test.js --runInBand` passed 38/38. | PASS |
| Backend lint/syntax check | PASS: `npm --prefix backend run lint`. | PASS |
| Backend config check | PASS: `npm --prefix backend run config:check`. | PASS |
| Frontend typecheck | PASS: `npm run typecheck`. | PASS |
| Frontend learning component tests | PASS: `npm test -- --runTestsByPath src/app/components/learning/LearningBookBlockContent.test.tsx src/app/components/learning/learningBookProgress.test.ts src/app/components/learning/learningBookCreatePayload.test.ts` passed 6/6. | PASS |
| Learning engine book/runtime tests | PASS: `.venv/bin/python -m pytest -q tests/book/test_engine_controls.py tests/book/test_quiz_generator.py tests/book/test_figure_generator.py tests/book/test_compiler.py tests/book/test_interactive_generator.py tests/book/test_llm_writer.py tests/services/test_zaki_runtime.py tests/services/llm/test_openai_compat_reasoning_content.py` passed 46/46. | PASS |
| Dirty tree reviewed; unrelated generated artifacts isolated | PASS: only this plan doc plus pre-existing generated `dist` drift in ZAKI prod; learning-engine tree clean after latest commits. | PASS |

## Phase 2 Route UAT Matrix

Use `docs/zaki-learning-uat-checklist-2026-05-08.md` as the live matrix. This phase is not complete until the matrix is refreshed after the latest fixes and all PASS-SMOKE entries that affect paid-user value are either upgraded to PASS or explicitly scoped out of GA.

Fresh evidence:

- PASS: `npm run test:e2e -- --project=chromium-desktop e2e/learning-parity.spec.ts` passed 14/14 after updating protected-artifact assertions to the current blob-backed preview/open contract.
- Covered routes/functions: chat, solve, research, quiz, visualize, math image/video artifacts, books, sources/uploads, notebooks, writer entry points, agents/TutorBot, space, review, workspaces, popup close behavior, progress retry behavior, and notebook draft user scoping.

## Phase 3 Isolation Matrix

Minimum covered surfaces:

- Chat sessions and post-answer actions.
- Books, pages, blocks, progress polling, generated assets.
- Knowledge uploads, images, folders, archives.
- Notebooks and notebook draft handoff.
- Quiz/question bank/review history.
- TutorBot configs, runtime registry, workspace files, chat history, channels.
- Browser logout/login and shared-browser local storage.

Fresh evidence:

- PASS-BETA: `npm run smoke:learning-isolation` created two verified paid local users (`75`/`76` in run `learniso-moyoj1lv`), logged in via central auth, wrote tenant state for both users, reused the same TutorBot id under both tenants, and found zero cross-user marker leakage.
- Covered surfaces in this run: central auth login, study profile, notebooks and records, knowledge upload/list, memory profile, co-writer documents, and TutorBot same-id tenant runtime/config state.
- Remaining GA expansion: add a browser-level shared-device replay and an authenticated WebSocket message isolation smoke when the real LLM cost budget is explicitly allocated. Existing route parity covers mocked WebSocket UI behavior; this phase is beta-green, not GA-complete.

## Phase 4 Quota And Unit Economics Matrix

Minimum covered dimensions:

- Learn chat turn.
- Deep solve/research.
- Quiz generation and review.
- Visualize/math animation.
- Book proposal/spine/page/block generation.
- Upload/indexing.
- TutorBot chat/channel ingress.
- Provider/model route and user plan.

Fresh evidence:

- PASS: backend quota contract tests: `npm --prefix backend test -- src/learning-quota.test.js src/learning-bff-contract.test.js --runInBand` passed 36/36.
- PASS: backend lint: `npm --prefix backend run lint`.
- PASS: frontend typecheck: `npm run typecheck`.
- PASS: learning-engine tenant usage tests: `.venv/bin/python -m pytest -q tests/api/test_account_usage.py tests/services/test_zaki_runtime.py` passed 19/19.
- PASS: live BFF usage endpoint for a personal test user returned `totalBytes`, `remainingBytes`, `policyTier:"personal"`, and `policyVersion:"2026-05-07.v1"`.
- PASS: live `/api/usage/quota?surface=learning` returned policy enforcement truth with prompt requests, request bytes, storage bytes, books per day, external searches per day, and concurrent sessions marked enforced.
- PASS: repeat two-user smoke after quota changes: `npm run smoke:learning-isolation` run `learniso-moyotexg` passed with zero marker leakage.

Implemented enforcement:

- Prompt quota: consumed on learning-generating HTTP mutations and WebSocket turns.
- Request byte quota: enforced by global cap, plan cap, and chunked-stream byte limiter.
- Tenant storage quota: BFF calls learning-engine tenant usage before storage-affecting Learn mutations and fails closed if usage cannot be checked.
- Book generation quota: `/api/learning/books` consumes a per-plan daily `learning:books` bucket.
- External search quota: `deep_research` WebSocket starts using web/search/papers consume a per-plan daily `learning:external_searches` bucket.
- Concurrent sessions: Learn WebSocket upgrades are capped per user by plan.

Unit economics assumptions for beta:

- Provider stack is operator-managed only.
- Kimi/Together is the default lower-cost LLM route; OpenAI-compatible providers remain an operator fallback, not a user setting.
- Brave search is the default external search route.
- Free plan is intentionally constrained by prompts, books, searches, upload bytes, and storage; student/personal increase limits but are still bounded.
- Artifact max bytes remain listed in policy and are indirectly bounded by tenant storage and request limits; exact generated-artifact per-file enforcement remains a GA hardening candidate.

## Phase 5 Governance Matrix

Minimum covered dimensions:

- User export includes all Learn data.
- User deletion removes all Learn data and assets.
- Retention cleanup runs and reports.
- Backup and restore drill succeeds against tenant data root.
- Destructive actions produce audit evidence.

Fresh evidence:

- PASS: account deletion/export enumeration no longer fails on upstream capped list endpoints after lowering ZAKI export calls from `limit=500` to the upstream-supported `limit=200`.
- PASS: repeat two-user isolation smoke after the fix: `npm run smoke:learning-isolation` run `learniso-moyovhih` passed with zero marker leakage and completed account deletion cleanup without DB-row fallback warnings.
- PASS: governance/retention/DR policy tests: `npm --prefix backend test -- src/learning-retention.test.js src/learning-disaster-recovery.test.js src/learning-deployment-readiness.test.js src/learning-governance-audit.test.js --runInBand` passed 18/18.
- PASS-BETA: local database restore drill restored the production-relevant `public` schema using the matching PostgreSQL 16 client inside the local `zaki-postgres` container. Restored verification counts: `zaki_users=134`, `zaki_learning_account_audit_events=16`, `zaki_daily_prompt_usage=79`.
- PASS-BETA: local learning tenant-root snapshot/restore copied `/Users/nova/Desktop/zaki-learning-engine/data/users` to `tmp/backups/learning-readiness/tenant-users-20260509T184720Z` and restored it to `tmp/backups/learning-readiness/tenant-users-restore-20260509T184720Z`; file counts matched `758 -> 758 -> 758`.

Important local-drill note:

- The local development database contains thousands of stale generated `zaki_*` and `nullalis_*` test schemas. A full local `pg_dump`/restore hit PostgreSQL shared-memory limits before reaching the app governance tables. For this phase, the local drill intentionally scoped the database evidence to the production-relevant `public` schema and separately snapshotted the learning tenant data root. Production GA still requires a staging restore from the real off-host backup target with a fresh `ZAKI_LEARNING_LAST_RESTORE_DRILL_AT`.

Remaining GA expansion:

- Run the restore drill in staging using the production backup provider/target, immutable ZAKI and learning-engine images, restored tenant root, and the runbook checks in `docs/zaki-learning-backup-restore-runbook.md`.

## Phase 6 Observability Matrix

Minimum covered dimensions:

- Backend health/readiness.
- Learning engine health.
- LLM provider failures.
- Search provider failures.
- Upload/indexing failures.
- Long-running book/video/artifact task failures.
- Quota spikes and provider cost anomalies.

Fresh evidence:

- PASS: focused observability tests: `npm --prefix backend test -- src/learning-observability.test.js src/learning-quota.test.js src/learning-bff-contract.test.js --runInBand` passed 37/37.
- PASS: backend syntax/lint: `npm --prefix backend run lint`.
- PASS: frontend typecheck: `npm run typecheck`.
- PASS: live internal endpoint smoke with super-admin ZAKI JWT: `GET /api/internal/learning/observability` returned `enabled:true`, `configured:true`, quota enforcement truth, active WebSocket aggregates, deployment-readiness gates, and DR gates.
- PASS: simulated failure signal: `GET /api/learning/sessions/not-real-session-for-observability` returned 404 and the internal observability endpoint recorded one bounded `learning_upstream_failure` event with request id, route, method, status, and sanitized message.

Implemented signals:

- In-memory bounded Learn event store with counters by severity/event and recent events.
- Internal super-admin observability endpoint: `/api/internal/learning/observability`.
- Structured event recording for upstream failures, JSON sanitizer fallbacks, long-running background accept/complete/failure/timeout, proxy errors, raw upload byte-limit errors, asset errors, WebSocket open/close, WebSocket upstream/client errors, and WebSocket quota rejections.
- Active Learn WebSocket aggregate counts only: total, users with sessions, max sessions for any user. User ids are intentionally not exposed.

Remaining GA expansion:

- Wire production alerting to this endpoint/log stream for learning engine down, LLM/search provider failure, quota spikes, and background task failure rates.
- Confirm production dashboard ownership and alert destinations in Phase 7.

## Phase 7 Deployment Matrix

Minimum covered dimensions:

- Central auth signing key and OAuth state.
- Learning engine internal token.
- Tenant data root.
- Immutable image tags/source mirror pins.
- Operator-managed Together/search/embedding secrets.
- CORS/CSP/upload/request limits.
- Staging smoke with real login.

## Change Control

Any change to phase scope must be added here as a dated note. Execution fixes are allowed inside the active phase, but the exit gate cannot be weakened without explicit user approval.
