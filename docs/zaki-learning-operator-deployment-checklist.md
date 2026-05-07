# ZAKI Learn Operator Deployment Checklist

This checklist is the paid-user rollout gate for hosted ZAKI Learn. It separates final-user setup from operator-managed infrastructure so normal users never see DeepTutor branding, raw model/provider settings, internal tokens, or deployment controls.

## Readiness Endpoint

Super-admin check:

```bash
curl "$ZAKI_BACKEND_URL/api/internal/learning/deployment-readiness" \
  -H "Authorization: Bearer $SUPER_ADMIN_ZAKI_TOKEN"
```

`deploymentReadiness.ready` must be `true` before broad paid-user rollout.

Blocking gates:

- `central_auth_signing_key`: `ZAKI_JWT_SIGNING_KEY` is configured with a production-strength value.
- `learning_enabled_configured`: if `ZAKI_LEARNING_ENABLED=true`, `LEARNING_ENGINE_BASE_URL` and `LEARNING_ENGINE_INTERNAL_TOKEN` are configured.
- `learning_internal_token`: the learning engine internal token is present and operator-managed.
- `tenant_data_root`: `LEARNING_ENGINE_TENANT_DATA_ROOT` or `ZAKI_TENANT_DATA_ROOT` is explicit.
- `zaki_image_immutable`: ZAKI app/backend image uses a digest or git-SHA style tag.
- `learning_engine_image_immutable`: learning engine image uses a digest or git-SHA style tag.
- `learning_source_mirror_pinned`: ZAKI records the mirrored learning-engine repository and exact source commit.
- `retention_policy_enabled`: hosted retention cleanup remains enabled.
- `disaster_recovery_ready`: backup target, tenant root, immutable learning image, and fresh restore drill evidence are ready.

## Required Operator Environment

Core learning BFF:

```bash
ZAKI_LEARNING_ENABLED=true
LEARNING_ENGINE_BASE_URL=http://zaki-learning-engine:8001
LEARNING_ENGINE_INTERNAL_TOKEN=<cluster-secret>
LEARNING_ENGINE_TENANT_DATA_ROOT=/srv/zaki-learning/users
```

Central auth:

```bash
ZAKI_JWT_SIGNING_KEY=<64+ char production signing key>
ZAKI_JWT_KID=<active-key-id>
```

Immutable deployment references:

```bash
ZAKI_APP_IMAGE_TAG=ghcr.io/projectnuggets/zaki:sha-<git-sha>
ZAKI_LEARNING_ENGINE_IMAGE_TAG=ghcr.io/projectnuggets/zaki-learning-engine@sha256:<digest>
ZAKI_LEARNING_ENGINE_SOURCE_REPOSITORY=github.com/projectnuggets/zaki-learning-engine
ZAKI_LEARNING_ENGINE_SOURCE_COMMIT=<40+ char mirrored source commit sha>
```

Backup and retention:

```bash
ZAKI_LEARNING_BACKUPS_ENABLED=true
ZAKI_LEARNING_BACKUP_PROVIDER=s3
ZAKI_LEARNING_BACKUP_TARGET=s3://zaki-learning-prod
ZAKI_LEARNING_LAST_RESTORE_DRILL_AT=<ISO timestamp from successful drill>
ZAKI_LEARNING_RETENTION_CLEANUP_ENABLED=true
```

Quota remains operator-owned until unit economics are finalized:

```bash
ZAKI_LEARNING_DAILY_PROMPT_LIMIT=<plan-calibrated limit>
ZAKI_LEARNING_MAX_REQUEST_BYTES=<absolute hosted cap>
```

## Final User Setup

Final users only need:

- a ZAKI central-auth account
- active entitlement/access according to ZAKI billing/access-code state
- user-managed content and behavior settings inside Learn

Final users can manage:

- knowledge sources, documents, images, browser folder uploads, and archives
- books
- chat sessions
- notebooks and exports
- Co-Writer drafts
- question bank and review categories
- skills
- memory files
- TutorBot persona/profile files
- bot channels: WhatsApp, Telegram, Discord, Email, Slack

Final users cannot manage:

- model/provider/API-key/base-url routing
- learning engine internal token
- deployment image tags
- source mirror commit pins
- quota economics
- backup, restore, retention, or disaster recovery policy

## Route And Function User-Test Plan

Run the automated parity test:

```bash
npm run test:e2e -- --project=chromium-desktop e2e/learning-parity.spec.ts
```

Manual route pass before rollout:

| Route | User-visible functions to verify |
| --- | --- |
| `/learn?view=chat` | capability menu, tools menu, file/image attach, Space context picker, send, save to notebook, markdown download, new chat |
| `/learn?view=books` | book library, stats, search, new book flow, source selections, book reader/progress when backend returns a book |
| `/learn?view=sources` | knowledge base list, create source library, file upload, image upload, browser folder upload, archive upload, reindex, delete, details |
| `/learn?view=notebooks` | create notebook, inspect records, open linked chat sessions, download notebook, download record, remove record, delete notebook |
| `/learn?view=writer` | new draft, template draft, editor, preview, AI rewrite/shorten/expand, source selector, save to notebook, markdown export, delete draft |
| `/learn?view=space` | chat history, notebooks, question bank, skills CRUD, memory edit/preview/save/refresh/clear |
| `/learn?view=review` | question filters, category manager, bookmark, wrong-only review, delete entries |
| `/learn?view=agents` | bot create/start/stop/delete, TutorBot chat, save transcript, profiles, soul templates, channels |
| `/learn?view=workspaces` | Deep Solve, Deep Research, Quiz Generation, Visualize, Math Animator entry cards, image solve |
| `/learn?view=solve` | Deep Solve preset, tools, Space context, send, save/export |
| `/learn?view=research` | sources menu, mode/depth settings, send, research outline rendering, save/export |
| `/learn?view=quiz` | Custom and Mimic Paper modes, count/difficulty/type/preference, send, save/export |
| `/learn?view=visualize` | render mode, send, artifact/code rendering, save/export |
| `/learn?view=math-animation` | output/quality/style settings, send, artifact/code rendering, save/export |

UI pass rules:

- Popup menus must close on outside click and Escape.
- Popup menus must not navigate away from Learn.
- Route controls must keep the upstream DeepTutor shape where applicable.
- ZAKI shell categories stay fixed; Learn-specific options appear below the Learn divider only.
- No DeepTutor branding appears in production UI.
