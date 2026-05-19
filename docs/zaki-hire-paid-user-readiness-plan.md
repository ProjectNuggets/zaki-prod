# ZAKI Hire Paid-User Readiness Plan

Status: frozen for planning; not yet executed.
Owner: Codex in this local workspace.
Date frozen: 2026-05-19.

## Reader And Action

Reader: the engineer responsible for taking ZAKI Hire from fork to paid-user
production.

Post-read action: execute the phases without skipping the gates needed for a
multi-user SaaS release.

Related source-of-truth documents:

- `docs/zaki-hire-integration-spec.md`
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
| 1 | Source And License Boundary | Fork JustHireMe into `zaki-hire-engine`, preserve AGPL notices, define proprietary ZAKI boundary, and remove misleading ZAKI MIT release claims before production. | Legal/product owner accepts boundary and source-offer process. | NOT STARTED |
| 2 | Engine Hosted Runtime | Convert local-first sidecar assumptions into hosted service assumptions: internal auth, tenant headers, PostgreSQL primary state, durable artifacts, health/readiness. | Engine local tests prove hosted auth, tenant isolation, and PostgreSQL-backed core flows. | NOT STARTED |
| 3 | BFF Contract | Add ZAKI backend `/api/hire/*`, errors, internal token forwarding, quotas, usage events, task normalization, export/delete hooks. | Contract tests pass with mocked engine and live local engine. | NOT STARTED |
| 4 | ZAKI-Native UI Port | Port JustHireMe workflows into `/hire` using the ZAKI shell and product patterns. | Route-by-route UAT passes and no upstream branding leaks. | NOT STARTED |
| 5 | Source Policy And Discovery | Make job discovery safe for hosted SaaS with an operator-approved source catalog and conservative limits. | Scan flows work using allowed sources; high-risk adapters stay operator-only. | NOT STARTED |
| 6 | Multi-User Isolation | Prove users cannot cross-read profile, leads, generated documents, graph/vector state, events, tasks, or artifacts. | Two-user smoke passes with zero marker leakage. | NOT STARTED |
| 7 | Quota And Cost Telemetry | Enforce BFF limits and emit normalized usage events for central cost telemetry. | Quota tests and usage-event tests pass. | NOT STARTED |
| 8 | Governance | Implement account export, deletion, retention cleanup, audit, backup, and restore for all Hire stores. | Governance tests and staging restore drill pass. | NOT STARTED |
| 9 | Observability And Failure UX | Add health, readiness, task state, sanitized failures, operator status, and alerts. | Internal observability endpoint and user failure states are verified. | NOT STARTED |
| 10 | Production Deployment Readiness | Add infrastructure chart, ArgoCD app, secrets, validator, staging deployment, and readiness endpoint. | Staging readiness is green with immutable images and source pins. | NOT STARTED |
| 11 | Final Review | Run code review, security review, UI review, source-policy review, and operational review. | No open P0/P1; accepted P2/P3 items are documented. | NOT STARTED |
| 12 | Beta/GA Declaration | Record the highest truthful readiness level. | Beta or GA verdict written with exact remaining blockers. | NOT STARTED |

## Phase 1 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| Engine fork exists under ProjectNuggets | Repository URL and initial commit recorded | TODO |
| Upstream AGPL notices preserved | License files and notices reviewed | TODO |
| ZAKI proprietary boundary documented | Product/legal note accepted | TODO |
| ZAKI MIT public claims cleaned before release | README/package/license metadata reviewed and updated if approved | TODO |
| No JustHireMe source copied into ZAKI prod | Diff review confirms service boundary | TODO |

## Phase 2 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| Hosted internal auth added | Missing or invalid internal token returns 401/403 | TODO |
| Tenant headers required | Missing tenant context fails closed | TODO |
| PostgreSQL primary state added | Leads, profile, generated metadata, activity, settings use PostgreSQL | TODO |
| SQLite demoted | SQLite is local-dev or migration-only, not production primary | TODO |
| Kuzu/LanceDB tenant scoped | Companion stores isolate and can rebuild from primary state where practical | TODO |
| Durable artifacts configured | Generated files use tenant-scoped durable storage | TODO |
| Health/readiness probes added | Engine reports dependency health without leaking secrets | TODO |

## Phase 3 Checklist

| Check | Evidence Required | Status |
| --- | --- | --- |
| `/api/hire/*` auth gate | Unauthenticated browser requests rejected | TODO |
| Internal token forwarding | Engine receives token only from ZAKI backend | TODO |
| Tenant forwarding | Engine receives canonical user/account id from auth session | TODO |
| Error normalization | User-safe errors returned for engine failures | TODO |
| Quota hooks | Prompt, scan, upload, generation, storage, and task limits enforced | TODO |
| Usage events | Normalized events emitted for LLM, embedding, scan, artifact, and task work | TODO |
| Export/delete hooks | Account governance includes Hire resources | TODO |

## Phase 4 Route UAT Matrix

| Route | Required Result | Status |
| --- | --- | --- |
| `/hire` | Dashboard works for empty and populated tenants | TODO |
| `/hire/pipeline` | Leads can be searched, filtered, sorted, updated, and deleted | TODO |
| `/hire/leads/:leadId` | Details, fit score, evidence, generated packages, and activity render | TODO |
| `/hire/profile` | User can edit candidate profile | TODO |
| `/hire/profile/import` | Resume, LinkedIn, GitHub, portfolio, and JSON import flows work | TODO |
| `/hire/sources` | Approved source catalog and scan controls work | TODO |
| `/hire/generated` | Generated documents can be reviewed, exported, and deleted | TODO |
| `/hire/activity` | Events, task state, failures, and follow-ups are visible | TODO |
| `/hire/settings` | Only user-safe preferences appear | TODO |

## Phase 5 Source Policy Matrix

| Source Type | V1 Treatment | Status |
| --- | --- | --- |
| Manual job URL | Allowed with validation and rate limits | TODO |
| Manual lead entry | Allowed | TODO |
| Approved ATS pages | Allowed after adapter review | TODO |
| Public feeds/APIs | Allowed where terms permit | TODO |
| Broad scraping | Operator-only until reviewed | TODO |
| Logged-in job-board automation | Disabled for v1 | TODO |
| Auto-apply | Disabled for v1 | TODO |

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
- browser automation session if later enabled

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
proprietary ZAKI production repo, or while backup/restore is unproven.
