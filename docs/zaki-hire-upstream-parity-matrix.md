# ZAKI Hire Upstream Parity Matrix

Status: planning source of truth.
Last updated: 2026-05-19.

## Reader And Action

Reader: the engineer porting JustHireMe into ZAKI Hire.

Post-read action: track which upstream capabilities are shipped or adapted
through hosted safety lanes in ZAKI.

## Parity Rule

Use as much of the JustHireMe product as possible inside `zaki-hire-engine`.
Only rebuild where hosted SaaS, ZAKI auth, ZAKI design, tenancy, PostgreSQL, or
operator policy requires it.

Do not treat desktop/Tauri packaging, local app settings, or local filesystem
trust as hosted product requirements. Do treat upstream browser automation and
auto-apply as product capabilities that need ZAKI safety lanes.

## Prerequisite Discovery Matrix

| Dependency Area | Upstream Signal | ZAKI Hire Decision Needed |
| --- | --- | --- |
| LLM provider | OpenAI, Anthropic, DeepSeek, Groq, NVIDIA, and Ollama-compatible local routes exist in local configuration | Pick operator-owned production provider/model and hide keys from users |
| Embeddings | Semantic matching depends on vectorization and LanceDB | Pick embedding provider/model, dimension, quota, and rebuild policy |
| Source APIs | Discovery can use configured boards, feeds, communities, APIs, and free-source scans | Approve source catalog, credentials, terms review, and rate limits |
| GitHub import | Profile import can use GitHub evidence | Decide unauthenticated versus operator-token versus user OAuth later |
| LinkedIn import | Profile import can use LinkedIn export data and local live credential settings | Keep export upload and replace raw credential entry with approved connector/session lanes |
| Portfolio import | Profile import can fetch portfolio URLs | Define fetch allowlist, size limits, and content extraction behavior |
| Documents | Resume parsing and generated package output need PDF/Markdown tooling | Install runtime libraries and define artifact storage |
| Browser automation | Playwright and auto-apply exist as experimental lab paths | Enable through sandboxed browser workers, consent, and audit |
| Persistence | Upstream local CRM uses SQLite with Kuzu and LanceDB companion stores | Move hosted primary state to PostgreSQL and scope companions by tenant |
| Runtime packaging | Upstream bundles a desktop app and Python sidecar | Build production container image with required runtime dependencies |

## Capability Matrix

| Area | Upstream capability | ZAKI Hire target | V1 status |
| --- | --- | --- | --- |
| App shell | Desktop/Tauri local app | ZAKI web route `/hire` | Adapt |
| Dashboard | Product overview and operating status | Native ZAKI Hire dashboard | Port |
| Lead ingestion | Manual lead creation | Manual lead creation through BFF | Port |
| Lead ingestion | Job URL ingestion | Manual URL import with validation and quota | Port |
| Lead discovery | Board/source scans | Operator-approved source catalog | Adapt |
| Lead discovery | Free-source scan | Enabled through reviewed source lanes | Adapt |
| Lead discovery | Broad scraping | Enabled through policy lane | Adapt |
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
| Browser automation | Form read and apply preview | Sandboxed browser worker with consent and audit | Adapt |
| Auto-apply | Automated submission | Consented apply lane with allowlists, cancellation, and kill switch | Adapt |
| MCP/server tools | Job scoring tool endpoints | Internal tool/API capability after BFF contract exists | Adapt |
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
- auto-apply moves behind a ZAKI consent, compliance, audit, and reliability
  safety lane

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
- read forms, preview applications, and run consented auto-apply
- change user-safe Hire preferences
- export and delete their account data through ZAKI governance flows

## Operator Acceptance

For parity to count in hosted production, an operator must be able to:

- deploy engine through infrastructure GitOps
- pin image and source commit
- configure provider/source credentials without browser exposure
- inspect and control source safety lanes globally
- confirm auto-apply safety lane is healthy or intentionally degraded
- inspect readiness and health
- see source-scan and provider failures
- back up and restore all Hire data stores
- rotate internal token and provider secrets

## Controlled Safety Lanes

No upstream feature is intentionally removed from the target product. The items
below require explicit safety-lane implementation:

- auto-apply consent, audit, cancellation, and kill switch
- logged-in browser automation through approved APIs/providers or ephemeral
  browser sessions
- broad scanning through source policy, egress allowlist, and extraction audit
- user-facing provider choice without exposing raw provider keys
- user-facing source choice without exposing arbitrary job-board credentials
- shared team hiring workspaces
- recruiter/team workflows
- central cost dashboard integration
- notification integrations for follow-ups
- public API or MCP exposure

## Parity Release Gate

The parity matrix is green when every `Port` or `Adapt` row has passing route
UAT, BFF contract coverage, tenant isolation evidence, safety-lane readiness
where needed, and no exposed operator controls. `Drop` rows must be
non-product packaging/runtime items, not upstream user features.
