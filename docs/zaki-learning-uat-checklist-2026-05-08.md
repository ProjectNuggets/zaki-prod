# ZAKI Learn UAT Checklist - 2026-05-08

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
| User isolation | BLOCKED | `npm run smoke:agent-isolation` is wired, but requires at least two bearer tokens via `ZAKI_MULTIUSER_TOKENS` or `ZAKI_MULTIUSER_TOKENS_FILE`. |
| Quota enforcement | BETA READY / GA GATE | Learning quota endpoint and frontend state exist; broad GA requires billing/unit economics thresholds and production monitoring checks. |
| Retention/delete/export | GA GATE | Needs final operator policy verification before GA claim. |
| Monitoring/alerts | GA GATE | Needs production dashboard/alert confirmation before GA claim. |
| Provider routing/secrets | BETA READY / GA GATE | Operator-managed provider routing is enforced in BFF paths already reviewed; production secrets must be injected through infra, not user UI. |

## Current Verdict

Target state after this run: code-level beta candidate. Automated E2E, typecheck, unit tests, production build, backend lint, and backend learning readiness tests pass. Live beta release remains blocked only on the two-user isolation smoke token requirement. GA-ready is intentionally blocked until quota, retention, export/delete, backup/recovery, and monitoring gates are verified against production infrastructure.
