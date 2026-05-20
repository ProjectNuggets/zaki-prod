# ZAKI Hire Operator Deployment Checklist

Status: planning source of truth.
Last updated: 2026-05-20.

Related dependency source: `docs/zaki-hire-dependency-inventory.md`.

## Reader And Action

Reader: a ZAKI production operator.

Post-read action: deploy and validate ZAKI Hire on the ZAKI DigitalOcean
Kubernetes production path without exposing engine internals to users.

## Production Baseline

ZAKI production is operated through the infrastructure GitOps repository on the
DigitalOcean Kubernetes cluster. ZAKI Hire must follow the same production
control rule as ZAKI Learn:

- current production target: `do-fra1-zaki`
- application repositories publish images
- infrastructure promotes immutable image tags
- ArgoCD applies production state
- the only supported production namespace is `zaki`
- browser traffic enters through ZAKI web and ZAKI API
- downstream product engines are internal services
- durable application state uses PostgreSQL as the primary production store

## Required Infrastructure Objects

Create or verify:

- ArgoCD application named `zaki-hire-engine`
- Helm chart named `zaki-hire-engine`
- internal Kubernetes service named `zaki-hire-engine`
- dedicated service account
- deployment with liveness, readiness, and startup probes
- HPA only after task execution and storage are safe under multiple replicas
- PDB after replica count is above one
- dedicated internal token secret
- dedicated provider/source secret
- PostgreSQL credential secret or existing database secret reference
- object storage or persistent storage for generated tenant artifacts
- network policy allowing ZAKI API to reach the engine and blocking public
  browser access

## Required ZAKI API Environment

Core BFF:

```bash
ZAKI_HIRE_ENABLED=true
HIRE_ENGINE_BASE_URL=http://zaki-hire-engine:8002
HIRE_ENGINE_INTERNAL_TOKEN=<cluster-secret>
```

Production source of truth:

```bash
ZAKI_HIRE_ENGINE_IMAGE_TAG=ghcr.io/projectnuggets/zaki-hire-engine@sha256:<digest>
ZAKI_HIRE_ENGINE_SOURCE_REPOSITORY=github.com/ProjectNuggets/zaki-hire-engine
ZAKI_HIRE_ENGINE_SOURCE_COMMIT=<40-character-source-commit>
```

Quota and limits:

```bash
ZAKI_HIRE_DAILY_PROMPT_LIMIT=<plan-calibrated-limit>
ZAKI_HIRE_DAILY_SCAN_LIMIT=<plan-calibrated-limit>
ZAKI_HIRE_MAX_UPLOAD_BYTES=<hosted-upload-cap>
ZAKI_HIRE_MAX_GENERATED_ARTIFACT_BYTES=<hosted-artifact-cap>
ZAKI_HIRE_MAX_CONCURRENT_TASKS=<plan-calibrated-limit>
```

Backup and retention:

```bash
ZAKI_HIRE_BACKUPS_ENABLED=true
ZAKI_HIRE_BACKUP_PROVIDER=s3
ZAKI_HIRE_BACKUP_TARGET=s3://zaki-hire-prod
ZAKI_HIRE_LAST_RESTORE_DRILL_AT=<ISO-timestamp>
ZAKI_HIRE_RETENTION_CLEANUP_ENABLED=true
```

Operator AI stack record:

```bash
ZAKI_HIRE_LLM_PROVIDER=<operator-provider>
ZAKI_HIRE_LLM_MODEL=<operator-model>
ZAKI_HIRE_EMBEDDING_PROVIDER=<operator-provider>
ZAKI_HIRE_EMBEDDING_MODEL=<operator-model>
ZAKI_HIRE_SEARCH_PROVIDER=<operator-provider>
ZAKI_HIRE_SOURCE_POLICY_VERSION=<policy-version>
```

## Required Engine Environment

Runtime:

```bash
PORT=8002
ZAKI_RUNTIME_MODE=hosted
ZAKI_INTERNAL_TOKEN=<cluster-secret>
ZAKI_REQUIRE_TENANT_HEADERS=true
ZAKI_TENANT_HEADER=X-Zaki-User-Id
```

Database:

```bash
ZAKI_HIRE_DATABASE_URL=<postgres-or-pgbouncer-connection>
ZAKI_HIRE_PG_POOL_SIZE=10
ZAKI_HIRE_PG_CONNECT_TIMEOUT=5
HIRE_SQLITE_COMPAT_MODE=false
```

The engine currently also accepts `HIRE_DATABASE_URL`, `DATABASE_URL`, or
`POSTGRES_DSN` as fallback DSN names. Prefer `ZAKI_HIRE_DATABASE_URL` for new
ZAKI deployments so Hire does not accidentally bind to an unrelated app
database variable.

Companion stores:

```bash
HIRE_GRAPH_BACKEND=kuzu
HIRE_VECTOR_BACKEND=lancedb
HIRE_TENANT_DATA_ROOT=/data/users
HIRE_ARTIFACT_STORAGE_PROVIDER=filesystem
HIRE_ARTIFACT_FILESYSTEM_DURABLE=true
```

Current engine code supports tenant-scoped filesystem artifact storage under
`HIRE_TENANT_DATA_ROOT`. Use it only with durable persistent storage in
production. S3/object-storage provider support remains a production-readiness
gap, not an implemented provider.

Provider and source configuration:

```bash
HIRE_LLM_PROVIDER=<operator-provider>
HIRE_LLM_MODEL=<operator-model>
OPENAI_API_KEY=<operator-secret-if-openai-selected>
HIRE_EMBEDDING_PROVIDER=<operator-provider>
HIRE_EMBEDDING_MODEL=<operator-model>
HIRE_EMBEDDING_API_KEY=<operator-secret>
HIRE_SEARCH_PROVIDER=<operator-provider>
HIRE_SEARCH_API_KEY=<operator-secret-if-enabled>
HIRE_SOURCE_POLICY_VERSION=<policy-version>
X_BEARER_TOKEN=<operator-secret-if-x-enabled>
APIFY_TOKEN=<operator-secret-if-apify-enabled>
HUNTER_API_KEY=<operator-secret-if-contact-lookup-enabled>
PROXYCURL_API_KEY=<operator-secret-if-contact-lookup-enabled>
HIRE_CUSTOM_CONNECTOR_CATALOG=<operator-catalog-id-or-path>
HIRE_SOURCE_CONFIG_RUNTIME_READY=true
HIRE_BROWSER_AUTOMATION_ENABLED=true
PLAYWRIGHT_BROWSERS_PATH=<baked-browser-runtime-path>
HIRE_AUTO_APPLY_ENABLED=true
HIRE_AUTO_APPLY_CONSENT_REQUIRED=true
HIRE_BROWSER_SANDBOX_READY=true
HIRE_AUTO_APPLY_AUDIT_READY=true
HIRE_AUTO_APPLY_KILL_SWITCH_READY=true
```

## Prerequisite Inventory Gate

Complete this inventory before implementation or deployment work is treated as
ready. The point is to understand Hire well enough that users can log in and use
it immediately while operators pre-provide every required dependency.

| Area | Must Identify | Operator Provides |
| --- | --- | --- |
| LLM generation | Every workflow that calls an LLM, required model capabilities, token volume, timeout behavior | default provider, model, API key, quota policy |
| Embeddings | Profile/job vectorization, semantic match dimensions, rebuild strategy | embedding provider, model, API key, vector dimension |
| Job sources | Source adapters, terms/rate limits, credentials, enabled regions | source policy, source credentials, egress allowlist |
| Search/web fetch | Whether discovery uses search APIs, direct fetch, ATS APIs, or feeds | search API key if enabled, fetch limits |
| GitHub import | API mode, rate limits, required scopes if authenticated | GitHub token only if needed |
| LinkedIn import | Export upload plus approved live authorization/provider lane | connector policy and credential handling |
| Portfolio import | Allowed URL fetch behavior and content extraction limits | egress policy, fetch limits |
| Documents | Resume parsing, PDF rendering, Markdown conversion, generated package formats | container libraries and artifact storage |
| Browser automation | Playwright/browser dependencies, selectors, account-risk controls | sandboxed workers, consent, audit, and kill switch |
| Persistence | PostgreSQL tables, graph store, vector store, artifacts, cache, task state | database, storage, backup policy |
| Observability | Health, readiness, provider failures, source failures, task failures | logs, metrics, alert destinations |

Known upstream local-development provider variables include `OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`,
`OLLAMA_URL`, `JHM_AUTO_APPLY`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Hosted
ZAKI must translate these into operator-managed production secrets and policies;
normal users must not enter these values.

## Dependency Prerequisites

The engine container must include:

- Python 3.13 runtime
- FastAPI and Uvicorn
- PostgreSQL client libraries
- `psycopg`, `psycopg-binary`, and `psycopg-pool`
- Kuzu runtime dependency support
- LanceDB and PyArrow runtime dependency support
- sentence-transformers dependency support, or an operator-approved remote
  embedding route
- PDF parsing support
- document generation support
- HTTP client and retry dependencies
- Playwright browser dependencies only if browser automation is explicitly
  enabled for an operator-controlled environment

The cluster must provide:

- PostgreSQL connectivity
- object or persistent artifact storage
- sealed or externalized secrets
- egress policy for approved LLM, embedding, source, and search providers
- metrics server before relying on HPA
- log and metric collection
- backup target with restore credentials

## Readiness Endpoint

Super-admin check:

```bash
curl "$ZAKI_BACKEND_URL/api/internal/hire/deployment-readiness" \
  -H "Authorization: Bearer $SUPER_ADMIN_ZAKI_TOKEN"
```

`deploymentReadiness.ready` must be `true` before paid-user rollout.

Blocking gates:

- `hire_enabled_configured`: Hire is enabled only when base URL and internal
  token are configured.
- `hire_internal_token`: token is present, dedicated, and not reused from Learn
  or Agent.
- `central_auth_configured`: ZAKI auth signing and session config are production
  ready.
- `postgres_primary_ready`: engine can read/write PostgreSQL and SQLite is not
  production primary.
- `tenant_isolation_enabled`: engine requires tenant headers and rejects missing
  tenant context.
- `artifact_storage_ready`: generated documents and tenant artifacts use
  configured durable storage.
- `source_policy_configured`: enabled source adapters have an operator-approved
  policy version.
- `auto_apply_safety_lane_ready`: auto-apply has consent, allowlist, audit,
  cancellation, quota, browser isolation, and kill-switch controls.
- `operator_ai_stack_configured`: LLM and embedding routing are operator-owned.
- `zaki_image_immutable`: ZAKI API/web image references are immutable.
- `hire_engine_image_immutable`: engine image reference is immutable.
- `hire_source_pin_present`: engine source repository and source commit are
  recorded.
- `backup_restore_ready`: backup target and recent restore drill are recorded.
- `retention_policy_enabled`: cleanup policy is enabled.

## Deployment Sequence

1. Fork JustHireMe into `ProjectNuggets/zaki-hire-engine`.
2. Preserve upstream AGPL notices and add ZAKI engine source-offer instructions.
3. Build and publish an immutable engine image.
4. Add infrastructure chart and ArgoCD application for the engine.
5. Create sealed secrets for internal token, provider/source credentials,
   database credentials, and storage credentials.
6. Configure engine with PostgreSQL primary state and tenant-scoped companion
   stores.
7. Configure ZAKI API with `/api/hire/*` routing to the internal service.
8. Deploy to staging through infrastructure.
9. Run deployment validator.
10. Run readiness endpoint as super-admin. ZAKI backend should expose
    `/api/internal/hire/deployment-readiness` and proxy the engine internal
    endpoint `/internal/v1/deployment-readiness`.
11. Run route UAT and two-user isolation smoke.
12. Run backup/restore drill.
13. Promote immutable tags to production only after all gates are green.

## Current Engine Implementation State

As of 2026-05-20, the local `zaki-hire-engine` branch
`codex/zaki-hire-engine-hosted` implements these deployment-facing pieces:

- `ZAKI_RUNTIME_MODE=hosted`
- internal token gate via `ZAKI_INTERNAL_TOKEN`,
  `HIRE_ENGINE_INTERNAL_TOKEN`, or `JHM_INTERNAL_SERVICE_TOKEN`
- tenant header gate via `ZAKI_TENANT_HEADER`, defaulting to
  `X-Zaki-User-Id`
- PostgreSQL startup requirement in hosted mode
- PostgreSQL tenant-scoped schema for leads, profiles, settings, events, and
  gateway jobs
- hashed tenant-scoped graph/vector base paths under `HIRE_TENANT_DATA_ROOT`
- tenant-scoped generated resume/cover-letter filesystem paths under
  `HIRE_TENANT_DATA_ROOT` and PostgreSQL artifact metadata cataloging for
  generated files
- hosted artifact path hardening: API and WebSocket payloads return safe
  artifact references, and file-serving routes reject paths outside the active
  tenant artifact root
- internal `/internal/v1/deployment-readiness` endpoint protected by the engine
  internal token
- hosted gateway startup uses the configured operator internal token for
  internal routes
- hosted LLM operator env resolution through `HIRE_LLM_PROVIDER` and
  `HIRE_LLM_MODEL`, with provider keys taken only from operator environment in
  hosted mode
- bounded PostgreSQL connect timeout through `ZAKI_HIRE_PG_CONNECT_TIMEOUT`
- optional integration test that passes against PostgreSQL 16
- initial ZAKI-prod BFF routes for `/api/hire/health`, `/api/hire/status`,
  generic `/api/hire/*`, `/api/internal/hire/status`, and
  `/api/internal/hire/deployment-readiness`
- initial BFF route allowlist that keeps engine-local operator/runtime routes
  hidden from normal users while preserving the user-facing Hire product routes
- first-class ZAKI Hire platform/quota surface and weekly BFF quota enforcement
  for cost-bearing manual lead, scan, ingestion, generation, help, and
  automation routes
- central ZAKI `zaki_usage_events` schema and route-level Hire BFF usage events
  after successful quota admission
- central ZAKI `zaki_hire_audit_events` schema and BFF consent/audit gate for
  form read, apply preview, and auto-apply

Still pending before staging deployment:

- graph/vector rebuild jobs and a final embedded-store versus internal-service
  deployment decision
- generated artifact object storage, imported-file artifact tracking,
  signed/proxied access, retention, export, and deletion
- source policy storage/config bridge and provider runtime probes beyond current
  operator acknowledgements
- browser-worker sandbox isolation, destination allowlists, task cancellation,
  screenshot/log redaction, and emergency kill switch verification
- hosted tenant background scheduler/queue replacement for local ghost mode
- storage-specific quotas, durable task/concurrency quotas, and granular engine
  usage events for LLM tokens, embeddings, source pages, artifact bytes, and
  task duration
- typed ZAKI-native `/hire` frontend route and route-specific UAT

## Deployment Validator

Add a validator equivalent to the Learn deployment validator. It should fail
when:

- ArgoCD does not define `zaki-hire-engine`.
- the engine chart is missing.
- ZAKI API does not point to `http://zaki-hire-engine:8002`.
- internal token secret is missing or shared with another product engine.
- provider/source secret is missing.
- PostgreSQL configuration is absent.
- SQLite is configured as production primary.
- image tags are mutable.
- source repository or source commit is missing.
- auto-apply is enabled for paid-user rollout.
- Helm templates fail to render.

## Final User Setup

Final users only need:

- a ZAKI central-auth account
- active entitlement for ZAKI Hire
- profile and job-search preferences
- uploaded/imported candidate materials

Final users can manage:

- candidate profile
- resumes and profile evidence
- target roles and preferences
- job leads and pipeline status
- generated application materials
- follow-up reminders and activity
- approved source selections exposed by the product

Final users cannot manage:

- provider API keys
- model routing
- embedding provider
- engine base URL
- internal service token
- database connections
- source adapter credentials
- deployment image tags
- source commit pins
- quota economics
- backup and retention policy
- auto-apply enablement

## Manual Route Test Plan

| Route | User-visible functions to verify |
| --- | --- |
| `/hire` | dashboard cards, current pipeline counts, recent activity, scan status, empty state |
| `/hire/pipeline` | lead table, filters, sort, status movement, delete, CSV export |
| `/hire/leads/:leadId` | job detail, score explanation, evidence, generation actions, activity |
| `/hire/profile` | profile view/edit, skills, experience, projects, education, certifications |
| `/hire/profile/import` | resume upload, LinkedIn import, GitHub import, portfolio import, JSON import |
| `/hire/sources` | approved source catalog, manual URL import, scan start/stop, source status |
| `/hire/generated` | generated resume, cover letter, outreach, follow-up packages, export/download |
| `/hire/activity` | event log, follow-up due list, task state, failures |
| `/hire/settings` | user-safe preferences only; no provider, token, source credential, or deployment controls |

UI pass rules:

- The route feels native to ZAKI.
- No JustHireMe branding appears in hosted UI.
- No operator-only setting appears in user settings.
- Long-running scan/generate tasks show progress, cancellation where supported,
  and clear failure states.
- Empty states explain what the user can do next without exposing internals.

## Production Promotion Gate

Do not promote to paid users until:

- readiness endpoint is green in staging
- route UAT passes
- two-user isolation smoke passes
- backup/restore drill passes
- security review has no open P0/P1 findings
- source-policy review has no open P0/P1 findings
- proprietary ZAKI licensing cleanup is complete
- AGPL engine source-offer process is documented
- production rollback path is documented
