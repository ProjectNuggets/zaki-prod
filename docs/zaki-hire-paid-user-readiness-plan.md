# ZAKI Hire Paid-User Readiness Plan

Status: execution started; planning gates remain active.
Owner: Codex in this local workspace.
Last updated: 2026-05-20.

## Reader And Action

Reader: the engineer responsible for taking ZAKI Hire from fork to paid-user
production.

Post-read action: execute the phases without skipping the gates needed for a
multi-user SaaS release.

Related source-of-truth documents:

- `docs/zaki-hire-integration-spec.md`
- `docs/zaki-hire-dependency-inventory.md`
- `docs/zaki-hire-source-boundary-checkpoint.md`
- `docs/zaki-hire-operator-deployment-checklist.md`
- `docs/zaki-hire-backup-restore-runbook.md`
- `docs/zaki-hire-upstream-parity-matrix.md`

## Readiness Definitions

Local beta-ready: ZAKI Hire runs locally through ZAKI auth and `/api/hire/*`,
core user flows work, two test users have isolated data, and no P0/P1 findings
remain.

Paid-user GA-ready: beta gates pass, production deployment readiness is green,
PostgreSQL-backed state is durable, quota and usage telemetry are enforced,
export/delete/retention work, backup/restore is drilled, monitoring is live, and
final security/code review has no open P0/P1 findings.

## Frozen Phases

| Phase | Name | Goal | Exit Gate | Status |
| --- | --- | --- | --- | --- |
| 0 | Source And Dependency Audit | Understand JustHireMe deeply enough to map features, routes, tasks, env vars, provider/API tokens, source adapters, runtime packages, and data stores. | Dependency inventory is complete and accepted before implementation starts. | DRAFTED |
| 1 | Source And License Boundary | Fork JustHireMe into `zaki-hire-engine`, preserve AGPL notices, define proprietary ZAKI boundary, and remove misleading ZAKI MIT release claims before production. | Legal/product owner accepts boundary and source-offer process. | IN PROGRESS |
| 2 | Engine Hosted Runtime | Convert local-first sidecar assumptions into hosted service assumptions: internal auth, tenant headers, PostgreSQL primary state, durable artifacts, health/readiness. | Engine local tests prove hosted auth, tenant isolation, and PostgreSQL-backed core flows. | IN PROGRESS |
| 3 | BFF Contract | Add ZAKI backend `/api/hire/*`, errors, internal token forwarding, quotas, usage events, task normalization, export/delete hooks. | Contract tests pass with mocked engine and live local engine. | NOT STARTED |
| 4 | ZAKI-Native UI Port | Port JustHireMe workflows into `/hire` using the ZAKI shell and product patterns. | Route-by-route UAT passes and no upstream branding leaks. | NOT STARTED |
| 5 | Source Policy And Discovery | Make every upstream discovery source safe for hosted SaaS with operator-managed credentials, source policies, egress controls, quotas, and audit. | Manual, feed/API, broad scan, X, Apify, custom connector, and logged-in/source-provider lanes all pass readiness or report controlled degradation. | NOT STARTED |
| 6 | Multi-User Isolation | Prove users cannot cross-read profile, leads, generated documents, graph/vector state, events, tasks, or artifacts. | Two-user smoke passes with zero marker leakage. | NOT STARTED |
| 7 | Quota And Cost Telemetry | Enforce BFF limits and emit normalized usage events for central cost telemetry. | Quota tests and usage-event tests pass. | NOT STARTED |
| 8 | Governance | Implement account export, deletion, retention cleanup, audit, backup, and restore for all Hire stores. | Governance tests and staging restore drill pass. | NOT STARTED |
| 9 | Observability And Failure UX | Add health, readiness, task state, sanitized failures, operator status, and alerts. | Internal observability endpoint and user failure states are verified. | NOT STARTED |
| 10 | Production Deployment Readiness | Add infrastructure chart, ArgoCD app, secrets, validator, staging deployment, and readiness endpoint. | Staging readiness is green with immutable images and source pins. | NOT STARTED |
| 11 | Final Review | Run code review, security review, UI review, source-policy review, browser automation review, auto-apply consent/audit review, and operational review. | No open P0/P1; accepted P2/P3 items are documented. | NOT STARTED |
| 12 | Beta/GA Declaration | Record the highest truthful readiness level. | Beta or GA verdict written with exact remaining blockers. | NOT STARTED |

## Phase 0 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| Feature map | Every JustHireMe user workflow is mapped to frontend, API route, service, task, and data store | DRAFTED in dependency inventory |
| LLM dependency map | Every LLM-using workflow lists provider capability, model need, token shape, timeout, retry, and fallback | DRAFTED in dependency inventory |
| API token inventory | Required operator-provided API keys are listed, including LLM, embedding, search/source, GitHub, or other external APIs | DRAFTED in dependency inventory |
| Runtime dependency map | Python, Node, system libraries, Kuzu, LanceDB, PDF, Playwright, and browser dependencies are classified as required for full parity or as degraded-provider fallbacks | DRAFTED in dependency inventory |
| Source adapter review | Every discovery adapter is assigned an enabled safety lane, provider prerequisite, and readiness check | DRAFTED in dependency inventory |
| Storage map | SQLite tables, graph data, vectors, generated files, settings, tasks, and activity are mapped to PostgreSQL, companion stores, or artifacts | DRAFTED in dependency inventory |
| Operator settings map | Every upstream local setting is classified as user-safe or hidden operator/connector configuration while preserving the user-facing feature | DRAFTED in dependency inventory |
| Readiness probes | Every external dependency has a readiness check and controlled degradation state | DRAFTED in dependency inventory |

## Phase 1 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| Engine fork exists under ProjectNuggets | Repository URL and initial commit recorded | PENDING REMOTE CREATION |
| Upstream AGPL notices preserved | License files and notices reviewed | LOCALLY VERIFIED |
| ZAKI proprietary boundary documented | Product/legal note accepted | DRAFTED |
| ZAKI MIT public claims cleaned before release | README/package/license metadata reviewed and updated if approved | BLOCKED ON WORDING |
| No JustHireMe source copied into ZAKI prod | Diff review confirms service boundary | VERIFIED AT CHECKPOINT |

## Phase 2 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| Hosted internal auth added | Missing or invalid internal token returns 401/403 | DONE for engine HTTP/WebSocket gate |
| Tenant headers required | Missing tenant context fails closed | DONE for engine protected HTTP routes and WebSocket auth |
| PostgreSQL primary state added | Leads, profile, generated metadata, activity, settings use PostgreSQL | PARTIAL: leads, profile, settings, events, gateway jobs, and generated artifact catalog implemented; source policy, audit/consent, quota, and task scheduling state still pending |
| SQLite demoted | SQLite is local-dev or migration-only, not production primary | PARTIAL: hosted startup and core/profile repositories require PostgreSQL; graph/vector compatibility paths are tenant-scoped but rebuild/service-deployment decisions remain |
| Kuzu/LanceDB tenant scoped | Companion stores isolate and can rebuild from primary state where practical | PARTIAL: hosted graph/vector paths are tenant-scoped; rebuild jobs and service-isolation decision still pending |
| Durable artifacts configured | Generated files use tenant-scoped durable storage | PARTIAL: generated resume/cover-letter paths are tenant-scoped and cataloged in PostgreSQL; object storage, imported artifacts, access, export/delete, and retention still pending |
| Browser worker configured | Playwright runs in isolated tenant/session workers with state cleanup | TODO |
| Source connector config added | X, Apify, custom connectors, contact lookup, and broad scan settings are operator-managed | TODO |
| Health/readiness probes added | Engine reports dependency health without leaking secrets | PARTIAL: internal deployment readiness endpoint implemented for runtime, token, tenant headers, PostgreSQL, artifacts, companion paths, LLM operator env, embeddings, source policy env, and browser env prerequisites; BFF proxy, source runtime probes, and browser worker probes still pending |

Phase 2 implementation evidence as of 2026-05-20:

- Engine branch: `/Users/nova/Desktop/zaki-hire-engine` on
  `codex/zaki-hire-engine-hosted`.
- Added hosted tenant context propagation and contextual repository resolution
  so lower-level JustHireMe code can resolve tenant-bound repositories inside
  request/background-task context.
- Added PostgreSQL schema and repository modules for tenant-scoped leads,
  profiles, settings, events, and gateway jobs.
- Added hashed tenant-scoped hosted graph/vector base paths and preserved
  tenant context through graph executor calls.
- Added tenant-scoped hosted generated artifact paths and a PostgreSQL
  `zaki_hire_artifacts` catalog for generated resume/cover-letter metadata.
- Added internal `/internal/v1/deployment-readiness` endpoint and hosted LLM
  operator env resolution through `HIRE_LLM_PROVIDER` / `HIRE_LLM_MODEL`.
- Added bounded PostgreSQL connect timeout for dependency probes.
- Added optional real-PostgreSQL integration test
  `backend/tests/test_postgres_repository.py`.
- Verified with `uv run pytest tests -q`: 318 passed, 1 skipped.
- Verified optional PostgreSQL integration against a disposable local
  PostgreSQL 16 container: 1 passed.
- Verified with `uv run ruff check .`: passed.

## Phase 3 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| `/api/hire/*` auth gate | Unauthenticated browser requests rejected | TODO |
| Internal token forwarding | Engine receives token only from ZAKI backend | TODO |
| Tenant forwarding | Engine receives canonical user/account id from auth session | TODO |
| Error normalization | User-safe errors returned for engine failures | TODO |
| Quota hooks | Prompt, scan, upload, generation, storage, and task limits enforced | TODO |
| Usage events | Normalized events emitted for LLM, embedding, scan, artifact, and task work | TODO |
| Automation consent hooks | Form read, preview, and auto-apply require user consent and audit records | TODO |
| Export/delete hooks | Account governance includes Hire resources | TODO |

## Phase 4 Route UAT Matrix

| Route | Required Result | Status |
| --- | --- | --- |
| `/hire` | Dashboard works for empty and populated tenants | TODO |
| `/hire/pipeline` | Leads can be searched, filtered, sorted, updated, and deleted | TODO |
| `/hire/leads/:leadId` | Details, fit score, evidence, generated packages, and activity render | TODO |
| `/hire/profile` | User can edit candidate profile | TODO |
| `/hire/profile/import` | Resume, LinkedIn, GitHub, portfolio, and JSON import flows work | TODO |
| `/hire/sources` | All source classes are visible through user-safe controls; credentials and raw policy are hidden | TODO |
| `/hire/generated` | Generated documents can be reviewed, exported, and deleted | TODO |
| `/hire/activity` | Events, task state, failures, and follow-ups are visible | TODO |
| `/hire/settings` | Only user-safe preferences appear | TODO |
| `/hire/apply` | Form read, apply preview, and consented auto-apply work through sandboxed browser tasks | TODO |

## Phase 5 Source Policy Matrix

| Source Type | V1 Treatment | Status |
| --- | --- | --- |
| Manual job URL | Allowed with validation and rate limits | TODO |
| Manual lead entry | Allowed | TODO |
| Approved ATS pages | Allowed after adapter review | TODO |
| Public feeds/APIs | Allowed where terms permit | TODO |
| Broad scraping | Enabled through approved source lanes, egress controls, and extraction audit | TODO |
| X/Twitter scan | Enabled through operator bearer token, rate limits, and source policy | TODO |
| Apify actors | Enabled through pinned actors, cost caps, and source policy | TODO |
| Custom connectors | Enabled through curated connector catalog; secrets hidden from users | TODO |
| Logged-in job-board automation | Enabled through approved APIs/providers or consented browser sessions | TODO |
| Contact lookup | Enabled through operator enrichment credentials and audit | TODO |
| Auto-apply | Enabled through explicit consent, allowlists, audit, cancellation, and kill switch | TODO |

## Phase 6 Isolation Matrix

Minimum covered surfaces:

- profile records
- profile imports
- leads and lead versions
- generated documents
- activity and events
- scan tasks
- generation tasks
- graph data
- vector data
- artifact storage
- browser cache and local storage
- account export/delete

Exit evidence:

- two users create the same marker values in parallel
- each user sees only their own data
- generated artifacts cannot be fetched cross-tenant
- background tasks do not leak status or result ids
- export/delete removes only the intended tenant

## Phase 7 Quota And Cost Matrix

Minimum covered dimensions:

- lead scan
- lead reevaluation
- profile ingestion
- LLM ranking
- semantic matching
- document generation
- generated artifact storage
- source page fetch
- browser automation session
- contact lookup
- auto-apply task

Required event fields:

- tenant id
- user id
- request id
- feature
- provider
- model
- input units
- output units
- storage bytes
- task duration
- success/failure state

## Phase 8 Governance Matrix

| Check | Evidence Required | Status |
| --- | --- | --- |
| Export | Export includes profile, leads, activity, generated metadata, source preferences, and audit trail | TODO |
| Artifact export | Generated documents are included or linked through expiring export bundle URLs | TODO |
| Account deletion | PostgreSQL, graph, vector, artifacts, tasks, and events are deleted or tombstoned per policy | TODO |
| Retention cleanup | Old generated files and task logs are cleaned according to policy | TODO |
| Backup | PostgreSQL and artifact/companion stores are backed up | TODO |
| Restore | Staging restore drill proves app usability after restore | TODO |

## Phase 9 Observability Matrix

Signals required:

- engine up/down
- database connectivity
- artifact storage connectivity
- source scan failures
- provider failures
- task queue depth
- task failure rate
- quota rejections
- tenant isolation rejection count
- high-cost event spikes
- backup freshness
- restore drill freshness

User-facing failure rules:

- failed scans explain that discovery failed without exposing provider secrets
- failed generations preserve lead state and allow retry
- provider failures do not lose user edits
- long-running tasks show progress or a stale-task state
- quota failures identify the plan/limit category, not internal implementation

## Phase 10 Deployment Matrix

Minimum covered dimensions:

- central auth signing/session configuration
- internal engine token
- PostgreSQL connection
- artifact storage
- provider/source secrets
- source policy version
- immutable images
- engine source repository and commit pin
- CORS/CSP/upload/request limits
- readiness endpoint
- deployment validator
- staging smoke with real login

## Final Declaration Rules

Allowed verdicts:

- `NOT READY`: any P0/P1, missing tenant isolation, missing governance, missing
  production deployment gate, or missing restore drill.
- `BETA READY`: paid-user candidate behind controlled access, with no P0/P1 and
  clearly documented P2 limitations.
- `GA READY`: broad paid-user rollout, with all gates green and accepted
  residual risk documented.

ZAKI Hire cannot be declared GA-ready while browser automation or auto-apply is
unreviewed, while SQLite is production primary, while MIT claims remain on the
proprietary ZAKI production repo, while backup/restore is unproven, or while the
source and dependency audit is incomplete.
