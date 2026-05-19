# ZAKI Hire Operator Deployment Checklist

Status: planning source of truth.
Last updated: 2026-05-19.

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
HIRE_DATABASE_URL=<postgres-or-pgbouncer-connection>
HIRE_DATABASE_SSL_MODE=require
HIRE_DATABASE_SCHEMA=zaki_hire
HIRE_SQLITE_COMPAT_MODE=false
```

Companion stores:

```bash
HIRE_GRAPH_BACKEND=kuzu
HIRE_VECTOR_BACKEND=lancedb
HIRE_TENANT_DATA_ROOT=/data/users
HIRE_ARTIFACT_STORAGE_PROVIDER=s3
HIRE_ARTIFACT_STORAGE_BUCKET=zaki-hire-prod
```

Provider and source configuration:

```bash
HIRE_LLM_PROVIDER=<operator-provider>
HIRE_LLM_MODEL=<operator-model>
HIRE_LLM_API_KEY=<operator-secret>
HIRE_EMBEDDING_PROVIDER=<operator-provider>
HIRE_EMBEDDING_MODEL=<operator-model>
HIRE_EMBEDDING_API_KEY=<operator-secret>
HIRE_SOURCE_POLICY_VERSION=<policy-version>
HIRE_AUTO_APPLY_ENABLED=false
HIRE_BROWSER_AUTOMATION_ENABLED=false
```

## Dependency Prerequisites

The engine container must include:

- Python 3.13 runtime
- FastAPI and Uvicorn
- PostgreSQL client libraries
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
- `auto_apply_disabled`: auto-apply is disabled for v1 paid-user rollout.
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
10. Run readiness endpoint as super-admin.
11. Run route UAT and two-user isolation smoke.
12. Run backup/restore drill.
13. Promote immutable tags to production only after all gates are green.

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
