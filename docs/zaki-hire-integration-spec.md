# ZAKI Hire Integration Spec

Status: planning source of truth.
Last updated: 2026-05-20.

## Reader And Action

Reader: an internal ZAKI engineer or operator who was not part of the planning
conversation.

Post-read action: implement ZAKI Hire as a first-class SaaS product area, with a
ZAKI-owned `/hire` route and an isolated `zaki-hire-engine` service derived from
JustHireMe.

## Target State

ZAKI Hire is a first-class product beside ZAKI Agent, ZAKI Learn, and ZAKI
Spaces. Users log into ZAKI, open `/hire`, and immediately use hosted job-search
intelligence without seeing deployment controls, provider settings, source
tokens, internal service URLs, or upstream JustHireMe branding.

The production shape mirrors ZAKI Learn:

```text
Browser
  -> ZAKI frontend /hire
  -> ZAKI backend /api/hire/*
  -> zaki-hire-engine /api/v1/*
```

The browser-facing product contract is owned by `zaki-prod`. The downstream
engine API is an implementation detail behind the backend-for-frontend.

## Companion Documents

- `docs/zaki-hire-operator-deployment-checklist.md`
- `docs/zaki-hire-paid-user-readiness-plan.md`
- `docs/zaki-hire-dependency-inventory.md`
- `docs/zaki-hire-source-boundary-checkpoint.md`
- `docs/zaki-hire-backup-restore-runbook.md`
- `docs/zaki-hire-upstream-parity-matrix.md`

## Options Considered

| Option | Verdict | Reason |
| --- | --- | --- |
| Copy JustHireMe source into ZAKI production | Reject | It mixes AGPL-derived code into the proprietary ZAKI product boundary. |
| Iframe or expose the upstream UI directly | Reject | It bypasses ZAKI auth, shell, settings, quota, telemetry, and product control. |
| Rebuild the product from scratch | Reject | It wastes working JustHireMe product logic and slows parity. |
| Fork JustHireMe into an isolated engine | Choose | It preserves the source repo boundary while letting ZAKI own the SaaS frontend and BFF. |
| Seek a commercial JustHireMe license | Keep open | It could reduce AGPL constraints, but the current plan must work without assuming one. |

## Fixed Decisions

- Product name: ZAKI Hire.
- Frontend root: `/hire`.
- Backend API root: `/api/hire/*`.
- Engine repository: `ProjectNuggets/zaki-hire-engine`.
- Engine service name: `zaki-hire-engine`.
- Production deployment model: private ZAKI frontend/backend plus isolated
  internal engine service on the ZAKI Kubernetes cluster.
- Production datastore: PostgreSQL is the durable system of record.
- Source strategy: fork JustHireMe and keep upstream-derived code in the engine
  repository.
- UI strategy: port the JustHireMe user experience into a ZAKI-native `/hire`
  product surface, as ZAKI Learn did with DeepTutor.
- Automation strategy: browser automation and auto-apply are first-class ZAKI
  Hire capabilities. They must run through hosted safety lanes with sandboxed
  browser workers, explicit user consent, destination allowlists, audit logs,
  cancellation, quota, and operator kill switches.
- Cost strategy: emit normalized usage events now; central cost accounting can
  later move behind the central auth/account system.

## Pre-Implementation Discovery Gate

Before implementation starts, the team must understand JustHireMe deeply enough
to explain every user feature, backend dependency, provider credential, runtime
package, storage assumption, and operator setting needed to make hosted ZAKI Hire
work without user setup.

This is a hard gate because JustHireMe is currently a local-first desktop
workbench. Hosted ZAKI has different assumptions: ZAKI owns auth, provider
credentials, deployment, storage, source policies, quota, telemetry, and user
onboarding.

The dependency inventory is tracked in
`docs/zaki-hire-dependency-inventory.md`. It must answer:

- which JustHireMe routes and background tasks power each user-facing workflow
- which workflows call an LLM and which provider/model capabilities they need
- which workflows need embeddings and vector search
- which workflows need external job-board, search, ATS, GitHub, LinkedIn,
  portfolio, or web-fetch APIs
- which workflows need PDF parsing, PDF generation, Markdown rendering, or file
  conversion support
- which workflows need browser automation or Playwright and which hosted safety
  lane makes them production enabled
- which data must move from SQLite assumptions into PostgreSQL
- which data belongs in Kuzu, LanceDB, object storage, cache, or task state
- which settings are user-safe and which must be operator-only
- which provider API tokens ZAKI must provide centrally
- which source API tokens or credentials ZAKI must provide centrally
- which egress domains, rate limits, and source terms must be reviewed
- which dependencies must be present in the production container image
- which health/readiness checks prove each dependency is configured

Known provider prerequisites from the upstream repo include optional OpenAI,
Anthropic, DeepSeek, Groq, NVIDIA, and Ollama-compatible LLM routes. Hosted ZAKI
must select and configure an operator-owned default LLM route rather than asking
users for API keys. Embedding, source, and search provider choices must be
recorded the same way.

## Product Boundary

`zaki-prod` remains private and proprietary. ZAKI Hire should not copy
AGPL-derived JustHireMe source into `zaki-prod` unless legal approval or a
separate commercial license permits that use.

AGPL summary for this plan: when a modified AGPL program is offered to users
over a network, users interacting with that program need a way to receive the
corresponding source for that modified program. The official GNU AGPLv3 text is
the controlling reference. This plan is not legal advice; it is an engineering
boundary that keeps proprietary ZAKI code and upstream-derived AGPL engine code
separate unless counsel approves a different structure.

The safe boundary is service isolation:

- `zaki-prod` owns proprietary frontend shell, navigation, auth, account,
  entitlement, quota, billing, and BFF routes.
- `zaki-hire-engine` owns upstream-derived JustHireMe application logic.
- Browser clients never call the engine directly.
- `zaki-prod` can call the engine over an internal network API with an internal
  token and canonical ZAKI user id.
- Any AGPL source-offer obligations are handled at the engine boundary, not by
  relicensing the whole ZAKI product.

The existing MIT references in ZAKI production must be treated as a release
blocker for proprietary distribution. Before shipping ZAKI Hire, ZAKI production
needs a licensing cleanup decision: remove MIT public claims, add the intended
proprietary notice, and keep AGPL notices attached to the engine fork.

## Non-Negotiables

- ZAKI central auth is the only browser-facing auth surface.
- Browser clients never receive the engine internal token.
- ZAKI backend derives the canonical user id from the authenticated session.
- ZAKI backend injects `X-Zaki-User-Id` and `X-Internal-Token` downstream.
- All user data, tasks, generated files, graph state, and vector state are
  tenant-bound by the ZAKI user id or account id.
- Operator-managed settings are hidden from normal users.
- Production image tags are immutable.
- Engine source repository and source commit are recorded for every production
  promotion.
- Production state is backed up and restorable before paid-user rollout.
- No hosted production UI mentions JustHireMe unless required in legal notices.

## User Value

ZAKI Hire should give a client a focused job-search operating system:

- ingest a candidate profile from resume, LinkedIn export, GitHub, portfolio,
  or manual entry
- discover and import job leads from approved sources
- reject low-quality leads before they enter the pipeline
- score jobs against the user's profile with explainable evidence
- rank opportunities by fit, risk, freshness, source quality, and effort
- generate tailored resumes, cover letters, outreach drafts, and follow-ups
- manage the job pipeline from discovered to interviewing, rejected, or accepted
- preserve activity history and follow-up reminders
- use ZAKI account, billing, quota, export, and deletion controls like every
  other ZAKI product

The client should experience this as a ready SaaS product, not as a self-hosted
tool. They should not need to configure API keys, database paths, models, source
adapters, browser drivers, or internal services.

## Capability Map

| Capability | JustHireMe source behavior | ZAKI Hire surface |
| --- | --- | --- |
| Dashboard | Overview of leads, activity, health, and progress | `/hire` dashboard |
| Lead discovery | Scan configured boards, feeds, free sources, communities, and APIs | `/hire/sources` and `/api/hire/scan` |
| Quality gate | Reject stale, thin, spammy, unpaid, senior-only, or low-context postings | Lead ingestion gate and review badges |
| Lead list | Search, filter, sort, export, and inspect leads | `/hire/pipeline` |
| Pipeline | Status movement across discovered, evaluated, generated, applied, interviewing, accepted, rejected | `/hire/pipeline` |
| Profile | Candidate identity, skills, experience, projects, education, certifications | `/hire/profile` |
| Profile ingestion | Resume, LinkedIn, GitHub, portfolio, JSON import | `/hire/profile/import` |
| Graph intelligence | Kuzu-backed profile and lead graph | Tenant-scoped companion index |
| Vector matching | LanceDB semantic profile/job matching | Tenant-scoped derived index |
| Ranking | Deterministic and LLM-assisted explainable scoring | Lead fit panel |
| Generation | Resume, cover letter, outreach, follow-up packages | `/hire/leads/:id/generate` |
| Activity | Logs, events, follow-ups, job history | `/hire/activity` |
| Settings | Local API keys and model/source configuration | Split into user preferences and operator controls |
| Browser automation | Experimental auto-apply lab | Production capability through sandboxed browser workers and consented apply flows |
| Desktop/Tauri packaging | Local app distribution | Not shipped in hosted ZAKI |

## Product Shape

Primary routes:

- `/hire`
- `/hire/pipeline`
- `/hire/leads/:leadId`
- `/hire/profile`
- `/hire/sources`
- `/hire/generated`
- `/hire/activity`
- `/hire/settings`

Primary BFF route families:

- `GET /api/hire/health`
- `GET /api/hire/status`
- `GET /api/hire/leads`
- `POST /api/hire/leads/manual`
- `GET /api/hire/leads/:leadId`
- `PATCH /api/hire/leads/:leadId`
- `DELETE /api/hire/leads/:leadId`
- `POST /api/hire/scan`
- `POST /api/hire/scan/stop`
- `POST /api/hire/leads/reevaluate`
- `POST /api/hire/leads/cleanup`
- `POST /api/hire/leads/:leadId/generate`
- `POST /api/hire/leads/:leadId/generate/start`
- `GET /api/hire/profile`
- `PATCH /api/hire/profile/*`
- `POST /api/hire/ingest/*`
- `GET /api/hire/events`
- `GET /api/hire/me/settings`
- `PATCH /api/hire/me/settings`
- `GET /api/internal/hire/*`

WebSocket and long-running tasks can be added under `/api/hire/ws` or task
polling routes. The BFF must normalize task state so the frontend does not need
to know whether the engine used background tasks, local queues, or WebSockets.

## Data Architecture

Production PostgreSQL is the durable source of truth for hosted ZAKI Hire:

- leads and lead versions
- pipeline state
- candidate profile records
- profile ingestion records
- source configuration selected by operators
- generated package metadata
- follow-ups and activity
- user preferences
- audit events
- quota and usage summaries
- export/delete tracking

Kuzu and LanceDB remain useful, but they are not the only durable production
truth. In hosted ZAKI they should be tenant-scoped companion stores:

- Kuzu stores derived graph relationships for profile, skills, leads, companies,
  evidence, and scoring context.
- LanceDB stores derived vectors for semantic job/profile matching.
- Both stores must be rebuildable from PostgreSQL plus object/artifact storage
  whenever practical.

Implementation checkpoint on 2026-05-20:

- The `zaki-hire-engine` branch `codex/zaki-hire-engine-hosted` now has hosted
  internal-token auth, required tenant headers, request-scoped tenant context,
  and PostgreSQL-backed leads, profiles, settings, events, and gateway job
  state.
- Hosted mode now requires PostgreSQL at startup and no longer initializes
  SQLite as the production primary store.
- The implemented PostgreSQL schema is tenant-scoped by `tenant_id` on the core
  write paths above.
- Hosted graph and vector companion store paths now resolve under hashed
  tenant-specific directories, and graph executor calls preserve request tenant
  context.
- Generated resume and cover-letter PDFs now resolve under tenant-scoped hosted
  artifact directories, and generated artifact metadata is cataloged in
  PostgreSQL with tenant id, job id, kind, storage key, MIME type, size, and
  checksum.
- Hosted API/WebSocket responses now sanitize generated artifact references so
  normal browser payloads do not expose server filesystem paths. File-serving
  routes reject requested artifact paths that resolve outside the active tenant
  artifact root.
- The engine now exposes internal `/internal/v1/deployment-readiness`, protected
  by the engine internal token. It reports required production gates without
  returning tokens, API keys, database passwords, resumes, profiles, or other
  sensitive values. Source and browser lanes require explicit operator
  acknowledgement envs until provider-specific runtime probes are implemented.
- Hosted LLM calls can resolve operator-owned provider/model env defaults via
  `HIRE_LLM_PROVIDER` and `HIRE_LLM_MODEL`, with provider-specific API key envs
  such as `OPENAI_API_KEY`. In hosted mode, the engine no longer falls back to
  user/repo-stored provider credentials or models.
- Object-storage provider support, imported-file artifact cataloging,
  signed/proxied artifact access, artifact export/delete/retention, source
  policy storage, consent/audit records, quota events, and hosted tenant
  background scheduling are still open implementation work. A future deployment
  decision still needs to decide whether graph/vector remain embedded
  Kuzu/LanceDB or move behind dedicated internal services.

Generated documents and large artifacts should use tenant-scoped object storage
or tenant-scoped persistent storage. The database should store metadata,
ownership, checksums, MIME type, retention state, and object keys, not arbitrary
large generated binaries as primary application rows.

SQLite can stay as a local development or upstream compatibility mode, but it
must not be the hosted production primary store.

## Tenant Model

Every request is bound to a ZAKI account identity before it reaches the engine.
The engine must never infer tenancy from browser-supplied user ids.

Minimum tenant controls:

- BFF injects `X-Zaki-User-Id`.
- BFF injects `X-Zaki-Account-Id` if account/team tenancy exists.
- Engine validates `X-Internal-Token`.
- Engine rejects requests with missing or malformed tenant headers.
- Engine stores tenant id on every durable row.
- Engine scopes graph, vector, file, cache, task, and event stores by tenant.
- Engine background jobs carry tenant id explicitly.
- Export/delete flows enumerate tenant data across PostgreSQL, companion stores,
  and artifacts.

If ZAKI later supports organizations or teams, the tenant key should be the
account/workspace id, while user id remains the actor id for audit events.

## Settings Split

User-managed settings:

- target roles
- preferred locations and remote preference
- salary expectations
- seniority preference
- excluded industries or companies
- job board/source opt-in from an operator-approved catalog
- application document tone
- resume variant preferences
- notification and follow-up preferences
- dashboard layout preferences

Operator-managed settings:

- engine base URL
- internal service token
- database credentials
- object storage credentials
- provider credentials
- model routing
- embedding model
- source adapter credentials
- scan frequency limits
- Playwright/browser automation enablement
- auto-apply enablement
- global quota and plan policy
- backup and retention policy
- compliance allowlists and blocklists

User settings must never allow arbitrary provider keys, arbitrary model base
URLs, arbitrary server filesystem paths, or unrestricted scraping targets.

## Source Adapter Policy

Job discovery is a product risk area. ZAKI should use an operator-approved
source catalog for hosted production.

Each source adapter needs a policy record:

- source name and category
- whether scraping, API access, or feed access is used
- rate limit
- robots/terms review status
- required credentials
- allowed regions
- expected data fields
- failure mode
- whether it is enabled for paid users, beta users, or operators only

The first paid-user release should prefer lower-risk sources: user-submitted job
URLs, supported ATS pages, RSS/feed/API sources where permitted, curated boards,
and manual leads. High-risk broad scraping and browser automation should remain
behind operator controls.

## Cost And Usage Telemetry

Cost telemetry can be centralized later behind the central auth/account system,
but the engine must emit usable events from the start. The BFF should record
normalized usage events for:

- LLM prompt and completion tokens
- embedding tokens and vector writes
- source scan count
- source pages fetched
- browser automation sessions when enabled
- generated document count and bytes
- artifact storage bytes
- graph/vector rebuild work
- long-running task duration
- provider, model, feature, tenant, user, and request id

The central auth/account system can later aggregate these events into plan
limits, billing analytics, and operator dashboards. Until then, ZAKI Hire should
still enforce conservative route-level quotas in the BFF.

## Security And Privacy

ZAKI Hire handles resumes, employment history, contact details, company targets,
generated application material, and job-search intent. Treat it as sensitive
personal data.

Minimum security requirements:

- central auth only
- service-to-service internal token
- strict CORS and CSP inherited from ZAKI
- per-tenant authorization on every read and write
- upload byte limits and MIME validation
- safe archive extraction if archives are supported
- generated artifact access through signed or BFF-gated URLs
- audit events for export, delete, generation, automation, and source scans
- provider secrets never returned to browser clients
- logs scrub resumes, API keys, cookies, bearer tokens, and generated documents
- account deletion removes or tombstones all tenant data according to policy

## Operational Architecture

Production is operated through the ZAKI infrastructure GitOps repo on the
DigitalOcean Kubernetes cluster. ZAKI Hire should mirror the Learn deployment
pattern:

- internal-only engine service
- Helm chart owned by infrastructure
- ArgoCD application for the engine
- immutable image promotion by infrastructure
- dedicated internal token secret
- dedicated provider/source secret
- PostgreSQL connection through the existing production database path
- persistent tenant artifact storage
- HPA only after storage and task-safety assumptions are satisfied
- readiness checks exposed to ZAKI backend through the engine internal
  `/internal/v1/deployment-readiness` endpoint

The ZAKI backend should expose a super-admin readiness endpoint:

- `GET /api/internal/hire/deployment-readiness`

That endpoint should fail closed when auth, service routing, internal token,
database, storage, secrets, immutable image tags, source commit pins, backups,
retention, or source adapter policy are incomplete.

## Execution Phases

| Phase | Goal | Exit gate |
| --- | --- | --- |
| 1. Fork and licensing boundary | Create `zaki-hire-engine`, preserve AGPL notices, define source-offer process, remove misleading MIT claims from ZAKI production before release | Legal/product boundary accepted |
| 2. Source and dependency audit | Map JustHireMe capabilities, routes, tasks, env vars, provider/API tokens, runtime packages, source adapters, and data stores | Dependency inventory is complete enough to build from |
| 3. Engine SaaS conversion | Replace local-only auth/storage assumptions with internal auth, tenant headers, PostgreSQL primary state, tenant artifacts, and readiness probes | Engine tests prove tenant isolation and PostgreSQL-backed core flows |
| 4. BFF contract | Add `/api/hire/*` with central auth, internal token forwarding, quotas, errors, usage events, export/delete hooks | Contract tests pass with mocked and live engine |
| 5. ZAKI-native UI | Port JustHireMe user workflows into `/hire` using ZAKI shell and design system | Route parity UAT passes |
| 6. Source and automation policy | Build enabled source, browser, and auto-apply safety lanes | Hosted scan and apply flows work without exposing unsafe controls |
| 7. Governance | Export, deletion, retention, audit, backup, and restore | Governance tests and restore drill pass |
| 8. Observability | Health, readiness, failure events, task states, and alerts | Operator dashboard/endpoint shows actionable status |
| 9. Production deployment | Add infrastructure chart, secrets, validation script, ArgoCD app, staging smoke | Production readiness endpoint is green |
| 10. Paid-user readiness | Run multi-user SaaS isolation, route UAT, security review, and cost/quota review | No open P0/P1; beta or GA decision recorded |

## Blind Spots To Resolve

- Exact legal wording for proprietary ZAKI production and AGPL engine source
  availability.
- Whether organizations/teams are tenant keys or whether user id remains the
  only tenant key for v1.
- Which job sources are legally and operationally safe for hosted SaaS.
- Whether generated resumes and cover letters need document-version retention
  or user-controlled purge by default.
- Whether user profile data should sync with ZAKI Spaces or remain Hire-only in
  v1.
- Whether follow-up reminders integrate with ZAKI notifications, email, or a
  later central automation system.
- How much real-time scan/progress behavior must be WebSocket versus polling.
- Whether central cost telemetry is read-only event capture first or also quota
  enforcement in v1.
- Whether auto-apply has any acceptable paid-user beta shape, given job-board
  terms, account-risk, and consent requirements.

## Release Definition

ZAKI Hire is production SaaS ready only when:

- a user can log into ZAKI and use `/hire` without operator setup
- no user can access another user's leads, profile, generated documents, graph,
  vector state, task logs, or artifacts
- no provider secrets or internal settings are exposed to browser clients
- PostgreSQL-backed core flows survive restart and redeploy
- backup and restore have been drilled in staging
- export and deletion cover all Hire data stores
- quota and usage telemetry are enforced at the BFF
- production deployment is owned by ZAKI infra with immutable images
- all P0/P1 findings from code, security, UI, and operational reviews are closed
