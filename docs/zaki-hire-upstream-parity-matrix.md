# ZAKI Hire Upstream Parity Matrix

Status: planning source of truth.
Last updated: 2026-05-19.

## Reader And Action

Reader: the engineer porting JustHireMe into ZAKI Hire.

Post-read action: track which upstream capabilities are shipped, adapted,
deferred, or intentionally disabled in hosted ZAKI.

## Parity Rule

Use as much of the JustHireMe product as possible inside `zaki-hire-engine`.
Only rebuild where hosted SaaS, ZAKI auth, ZAKI design, tenancy, PostgreSQL, or
operator policy requires it.

Do not treat desktop/Tauri packaging, local app settings, local filesystem
trust, or auto-apply as product requirements for the first hosted release.

## Capability Matrix

| Area | Upstream capability | ZAKI Hire target | V1 status |
| --- | --- | --- | --- |
| App shell | Desktop/Tauri local app | ZAKI web route `/hire` | Adapt |
| Dashboard | Product overview and operating status | Native ZAKI Hire dashboard | Port |
| Lead ingestion | Manual lead creation | Manual lead creation through BFF | Port |
| Lead ingestion | Job URL ingestion | Manual URL import with validation and quota | Port |
| Lead discovery | Board/source scans | Operator-approved source catalog | Adapt |
| Lead discovery | Free-source scan | Enabled only for reviewed source adapters | Adapt |
| Lead discovery | Broad scraping | Operator-only or deferred | Defer |
| Quality gate | Deterministic stale/thin/spam/seniority checks | Ingestion gate with user-visible reasons | Port |
| Ranking | Deterministic score | Explainable fit score panel | Port |
| Ranking | LLM-assisted evaluation | Operator-routed LLM evaluation with quota | Port |
| Ranking | Semantic profile match | Tenant-scoped vector matching | Port |
| Profile | Candidate identity | ZAKI Hire profile | Port |
| Profile | Skills, experience, projects, education, certifications | ZAKI Hire profile sections | Port |
| Profile ingestion | Resume ingestion | Upload flow with MIME and byte limits | Port |
| Profile ingestion | LinkedIn export ingestion | Upload/import flow | Port |
| Profile ingestion | GitHub ingestion | URL/import flow with rate limits | Port |
| Profile ingestion | Portfolio ingestion | URL/import flow with source policy | Port |
| Graph | Profile/job graph | Tenant-scoped companion graph store | Adapt |
| Vector | LanceDB vectors | Tenant-scoped companion vector store | Adapt |
| Pipeline | Status tabs and lead lifecycle | `/hire/pipeline` | Port |
| Lead detail | Job details, score, versions, assets | `/hire/leads/:leadId` | Port |
| Generation | Resume package | Generate and store tenant artifact | Port |
| Generation | Cover letter | Generate and store tenant artifact | Port |
| Generation | Outreach | Generate and store tenant artifact | Port |
| Generation | Follow-up material | Generate and store tenant artifact | Port |
| Generated docs | PDF/export | BFF-gated export/download | Port |
| Follow-ups | Due follow-ups | `/hire/activity` and reminders surface | Port |
| Events | Live event log | User-safe activity stream | Port |
| Settings | Local API key/model settings | Operator plane only | Adapt |
| Settings | User behavior preferences | `/hire/settings` | Port |
| Diagnostics | Local subsystem diagnostics | Super-admin internal status | Adapt |
| Runtime install | Local vector runtime installer | Image-build/runtime dependency concern | Do not expose |
| Browser automation | Form read and apply preview | Operator-beta only after review | Defer |
| Auto-apply | Automated submission | Disabled for v1 | Disable |
| MCP/server tools | Job scoring tool endpoints | Possible future internal capability | Defer |
| Release packaging | Windows/macOS/Linux installers | Not applicable to hosted ZAKI | Drop |

## API Parity Targets

Initial BFF coverage should map these user-facing route families:

| ZAKI Hire BFF | Engine route family | Purpose |
| --- | --- | --- |
| `/api/hire/health` | `/health` and subsystem health | Availability |
| `/api/hire/status` | `/api/v1/status` | Scan/task status |
| `/api/hire/leads` | `/api/v1/leads` | Lead list |
| `/api/hire/leads/:leadId` | `/api/v1/leads/:jobId` | Lead detail and mutation |
| `/api/hire/leads/manual` | `/api/v1/leads/manual` | Manual lead |
| `/api/hire/scan` | `/api/v1/scan` | Start discovery |
| `/api/hire/scan/stop` | `/api/v1/scan/stop` | Stop discovery |
| `/api/hire/leads/reevaluate` | `/api/v1/leads/reevaluate` | Rescore leads |
| `/api/hire/leads/cleanup` | `/api/v1/leads/cleanup` | Cleanup low-quality leads |
| `/api/hire/leads/:leadId/generate` | `/api/v1/leads/:jobId/generate` | Generate package |
| `/api/hire/profile` | `/api/v1/profile` | Profile read/update |
| `/api/hire/ingest/*` | `/api/v1/ingest/*` | Profile import |
| `/api/hire/events` | `/api/v1/events` | Activity stream |
| `/api/internal/hire/*` | internal engine and BFF status | Operator status |

The BFF does not need to expose every upstream route one-for-one. It should
expose product-shaped routes and adapt upstream details behind the boundary.

## Adaptation Requirements

Hosted ZAKI changes these upstream assumptions:

- local desktop auth becomes ZAKI central auth
- local API token becomes internal service token
- local settings become user-safe settings plus hidden operator settings
- local SQLite becomes PostgreSQL primary state
- local filesystem paths become tenant-scoped artifact storage
- local graph/vector paths become tenant-scoped companion stores
- direct browser-to-sidecar calls become BFF calls
- local API keys become operator secrets
- desktop runtime installation becomes container image responsibility
- auto-apply moves behind a future compliance and reliability review

## User-Facing Acceptance

For parity to count, a normal user must be able to complete the workflow from
inside ZAKI without knowing the engine exists. The user should be able to:

- create or import a profile
- add or discover leads
- see why a lead was accepted, rejected, or scored
- move leads through the pipeline
- generate job-specific materials
- export or download generated materials
- review activity and follow-ups
- change user-safe Hire preferences
- export and delete their account data through ZAKI governance flows

## Operator Acceptance

For parity to count in hosted production, an operator must be able to:

- deploy engine through infrastructure GitOps
- pin image and source commit
- configure provider/source credentials without browser exposure
- disable unsafe source adapters globally
- confirm auto-apply is disabled
- inspect readiness and health
- see source-scan and provider failures
- back up and restore all Hire data stores
- rotate internal token and provider secrets

## Deferred Items

Deferred does not mean forgotten. These items require explicit later planning:

- auto-apply
- logged-in browser automation
- broad scraping across sites without source policy
- user-supplied provider keys
- user-supplied arbitrary job-board credentials
- shared team hiring workspaces
- recruiter/team workflows
- central cost dashboard integration
- notification integrations for follow-ups
- public API or MCP exposure

## Parity Release Gate

The parity matrix is green for v1 when every `Port` or `Adapt` row has passing
route UAT, BFF contract coverage, tenant isolation evidence, and no exposed
operator controls. `Defer`, `Disable`, and `Drop` rows must have product-owner
acceptance before beta.
