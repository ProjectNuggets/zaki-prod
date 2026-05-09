# ZAKI Learn UAT Checklist - updated 2026-05-09

Scope: hosted ZAKI Learn parity with DeepTutor where appropriate for SaaS. Local folder path linking remains intentionally excluded from hosted production; browser file, image, folder, and archive upload are in scope.

## Route-By-Route Button Matrix

| Route | Primary buttons/functions | Status | Evidence |
| --- | --- | --- | --- |
| `/learn?view=chat` | New chat, Send, capability menu, tools menu, space context menu, Save to Notebook, Download Markdown | PASS | Playwright: route smoke, popup close, chat save/export |
| `/learn?view=solve` | Send, tools menu, space context menu | PASS | Playwright: `deep_solve` start_turn routing |
| `/learn?view=research` | Sources, Mode, Depth, Send, Download Markdown | PASS | Playwright: `deep_research` config routing and markdown export |
| `/learn?view=quiz` | Count, Difficulty, Type, Preference, Send | PASS | Playwright: `deep_question` config routing |
| `/learn?view=visualize` | Render Mode, Send, Download Markdown | PASS | Playwright: `visualize` routing and visualization export |
| `/learn?view=math-animation` | Output, Quality, Style Hint, Send, Open artifact, Download artifact, Download Markdown | PASS | Playwright: image and video artifact preview/download wiring |
| `/learn?view=books` | Search, New book, source tabs, language, Generate proposal, Confirm proposal entry | PASS | Playwright: book proposal create payload and proposal detail view |
| `/learn?view=sources` | New knowledge base, Pick files, Pick folder, Pick archive, create/upload/default/settings/details | PASS | Playwright: files, image/folder/archive upload routing and default switch |
| `/learn?view=notebooks` | Create, select notebook, Save from chat, Download Markdown | PASS | Playwright: create notebook, save chat, export markdown |
| `/learn?view=writer` | New draft, From template | PASS-SMOKE | Playwright: route and primary entry smoke; full AI edit flow still needs live operator-provider UAT |
| `/learn?view=agents` | Create bot, Profiles, Channels, Soul Templates, Tutor chat, Save to Notebook, Download Markdown | PASS | Playwright: agent route, allowed channel list, chat WS, returned history persistence |
| `/learn?view=space` | Recent Activity, Chat History, Notebooks, Question Bank, Skills, Memory | PASS-SMOKE | Playwright: route and section entry smoke |
| `/learn?view=review` | Manage Categories, All, Bookmarked, Wrong Only | PASS-SMOKE | Playwright: route and filter entry smoke |
| `/learn?view=workspaces` | Deep Solve, Deep Research, Quiz Generation, Visualize, Math Animator, Analyze | PASS-SMOKE | Playwright: route and capability launcher smoke |

## Production Gates

| Gate | Status | Notes |
| --- | --- | --- |
| User isolation | PASS-BETA | Local two-user API smoke passed with real ZAKI users `57`/`58`; browser smoke passed with real users `63`/`64`. Nullalis confirmed distinct downstream sessions. `NULLALIS_DEV_USER_ID`/`NULLCLAW_DEV_USER_ID` must remain unset for all multi-user tests and hosted environments. |
| Quota enforcement | BETA READY / GA GATE | Learning quota endpoint and frontend state exist; broad GA requires billing/unit economics thresholds and production monitoring checks. |
| Retention/delete/export | PASS-BETA / GA GATE | Local export/delete smoke now completes without account-delete fallback; governance audit and retention tests pass. Production still needs operator policy verification before GA claim. |
| Monitoring/alerts | PASS-BETA / GA GATE | Internal Learn observability endpoint and structured failure counters are live locally. Production dashboard and alert routing still need confirmation before GA claim. |
| Provider routing/secrets | BETA READY / GA GATE | Operator-managed provider routing is enforced in BFF paths already reviewed; production secrets must be injected through infra, not user UI. |
| Dev-user bypass | PASS-BETA | `backend/src/index.js` hard-fails in production when the bypass is set. `backend/src/config-validation.js` now also fails `config:check` in production and warns locally. |

## Live Local UAT Evidence

| Run | Result |
| --- | --- |
| Mocked desktop parity E2E | PASS: `npm run test:e2e -- e2e/learning-parity.spec.ts --project=chromium-desktop` — 14/14 passed. |
| Repeatable Learn two-user isolation smoke | PASS: `npm run smoke:learning-isolation` — seeded two verified paid local users, wrote separate Learn state, reused the same TutorBot id under both tenants, and detected zero cross-user marker leakage. |
| Typecheck | PASS: `npm run typecheck`. |
| Backend learning contracts | PASS: `npm --prefix backend test -- learning-study.test.js learning-bff-contract.test.js --runInBand` — 30/30 passed. |
| Live route smoke | PASS: 14/14 Learn routes loaded with expected controls and no horizontal overflow. |
| Accessibility landmark smoke | PASS: imported Learn subpanels no longer render nested `<main>` landmarks inside the ZAKI shell main. |
| Live two-user API isolation | PASS: two paid local users, zero marker leaks, downstream sessions `agent:zaki-bot:user:57:thread:main` and `agent:zaki-bot:user:58:thread:main`. |
| Live two-user browser smoke | PASS: two paid local browser users, no visible cross-user marker, no console errors, no failed responses. |
| Config hardening | PASS: production config now rejects `NULLALIS_DEV_USER_ID`/`NULLCLAW_DEV_USER_ID`; local config check passes with it unset. |
| Learning quota/cost controls | PASS-BETA: prompt, request bytes, tenant storage bytes, book generation, external search, and concurrent Learn WebSocket gates are enforced by plan/user. Live quota and account-usage endpoints returned current policy/usage. |
| Account deletion governance | PASS-BETA: repeat Learn two-user isolation smoke run `learniso-moyovhih` completed cleanup without DB-row fallback warnings after export list limits were lowered to the upstream-supported `limit=200`. |
| Retention and DR governance | PASS-BETA / GA GATE: retention, DR, deployment-readiness, and governance audit tests passed 18/18. Local public-schema database restore verified `zaki_users=134`, `zaki_learning_account_audit_events=16`, `zaki_daily_prompt_usage=79`; tenant-root snapshot/restore verified file counts `758 -> 758 -> 758`. Full production GA still requires an off-host backup target and staging restore drill. |
| Learn observability | PASS-BETA / GA GATE: focused observability tests passed 37/37. Live `/api/internal/learning/observability` returned configured status, quota enforcement, active WebSocket aggregates, deployment gates, and DR gates. A deliberate missing-session request recorded a bounded `learning_upstream_failure` event. Production alert wiring remains a GA gate. |
| Production deployment readiness | PASS-BETA / GA GATE: local config check passes and local readiness endpoint fail-closes on production-only gates. `zaki-infra/scripts/validate-learning-deploy.sh` passes with production chart values for internal Learn service, tenant root, secrets, provider routing, immutable refs, and source pin. GA requires target-environment readiness endpoint green plus staging smoke. |
| Final readiness verification | PASS-BETA: backend Learn tests 55/55, backend lint, frontend typecheck, learning-engine tests 19/19, Playwright Learn parity 14/14, and two-user isolation run `learniso-moypsuko` all passed. No open P0/P1 findings remain in the local readiness changes. |

## Current Verdict

Target state after this run: local beta-ready for human daily users. Automated E2E, typecheck, targeted backend contract tests, live route smoke, live two-user isolation smoke, local export/delete cleanup, retention/DR policy tests, local backup/restore evidence, deployment config validation, and internal observability pass. GA-ready remains intentionally blocked until production backup/recovery, monitoring, and target-environment deployment-readiness gates are verified against production infrastructure.
