# ZAKI Hire Dependency Inventory

Status: Phase 0 source and dependency audit draft.
Last updated: 2026-05-20.

## Reader And Action

Reader: an internal ZAKI engineer or operator who needs to implement ZAKI Hire
without knowing the planning conversation.

Post-read action: decide which JustHireMe capabilities can enter the first
hosted ZAKI Hire release, provision the required operator dependencies, and
start implementation with the correct service, storage, source, and security
boundaries.

## Source Snapshot

This inventory is based on the upstream JustHireMe repository:

- upstream repository: `https://github.com/vasu-devs/justhireme`
- upstream branch: `main`
- audited upstream commit: `3831a0f8b1393a8da3c5b6d6511dce52a8ee6381`
- upstream release marker: `v1.0.15`
- upstream license: `AGPL-3.0-only`

The dependency audit was first drafted against `v1.0.14`. Before creating the
local engine workspace, upstream advanced to `v1.0.15`; the observed delta was
release/version metadata only, so this document now pins the newer commit. The
implementation plan must re-audit upstream before forking if this commit is not
the initial source commit used for `ProjectNuggets/zaki-hire-engine`.

## Executive Finding

JustHireMe is a strong source product for ZAKI Hire, but it is not a drop-in
SaaS service. The audited version is a local-first Tauri desktop workbench with
a React UI, a FastAPI gateway, optional local child services, a local bearer
token, SQLite primary state, Kuzu graph state, LanceDB vector state, local file
artifacts, local settings, and several operator-style API keys exposed in the
end-user settings UI.

ZAKI Hire should reuse the upstream product logic inside an isolated
`zaki-hire-engine` fork, while ZAKI production owns `/hire`, `/api/hire/*`,
central auth, quota, telemetry, billing, export, deletion, operator settings,
and deployment. Normal users should never configure model keys, source
credentials, browser runtimes, internal URLs, storage paths, or automation
switches.

The first paid-user release should aim for full upstream feature parity:
profile ingestion, source discovery, broad source scanning, X and Apify-backed
sources, custom connectors, lead scoring, pipeline management, document
generation, contact lookup, form reading, apply preview, auto-apply,
background automation, activity, follow-ups, export/delete hooks, tenant
isolation, and production readiness checks.

The implementation rule is not to disable risky features. The rule is to give
each risky feature a hosted safety lane: operator-managed credentials, source
policy, egress controls, sandboxed browser workers, explicit user consent,
quota, cost telemetry, audit events, and readiness probes. Normal users should
see the product capability, not the provider keys, raw cookies, actor ids,
browser paths, source headers, or internal controls that make it work.

## Implementation Checkpoint 2026-05-20

Completed in the local engine branch `codex/zaki-hire-engine-hosted`:

- hosted internal-token and tenant-header gate
- request-scoped tenant context propagation
- contextual repository resolution for lower-level upstream code that calls
  `create_repository()` without an explicit request object
- PostgreSQL schema for `zaki_hire_leads`, `zaki_hire_profiles`,
  `zaki_hire_settings`, `zaki_hire_events`, `zaki_hire_gateway_jobs`, and
  `zaki_hire_artifacts`
- PostgreSQL repository modules for the same core stores
- hosted startup path that requires PostgreSQL instead of initializing SQLite
- optional PostgreSQL integration test using `ZAKI_HIRE_TEST_DATABASE_URL`
- hashed tenant-scoped graph/vector base paths under `HIRE_TENANT_DATA_ROOT`
- graph executor context propagation so tenant-bound path resolution survives
  threaded graph work
- tenant-scoped hosted generated artifact paths and PostgreSQL cataloging for
  generated resume/cover-letter file metadata
- hosted artifact response sanitization so browser/API payloads expose only
  safe artifact references and reject cross-tenant filesystem paths
- internal deployment readiness endpoint at `/internal/v1/deployment-readiness`
  protected by the engine internal token
- hosted LLM operator env resolution through `HIRE_LLM_PROVIDER`,
  `HIRE_LLM_MODEL`, and provider-specific API key envs, without falling back to
  user/repo-stored provider credentials in hosted mode
- bounded PostgreSQL connect timeout via `ZAKI_HIRE_PG_CONNECT_TIMEOUT`
- hosted engine internal routes now use the operator internal token at gateway
  startup
- initial ZAKI-prod Hire BFF boundary for central-auth `/api/hire/*`, internal
  token forwarding, tenant forwarding, sanitized JSON proxying, and super-admin
  readiness proxying
- initial ZAKI-prod Hire BFF route allowlist that exposes only user-facing Hire
  routes and blocks engine-local operator routes such as settings, provider
  model probing, runtime status/installation, shutdown, and diagnostics
- first-class central `hire` product/quota/usage surface with weekly BFF quota
  enforcement for cost-bearing manual lead, scan, ingestion, generation, help,
  and automation routes
- central `zaki_usage_events` ledger plus normalized route-level Hire BFF usage
  event capture after successful quota admission
- BFF automation consent and audit gate for form read, apply preview, and
  auto-apply through `zaki_hire_audit_events`

Verified:

- `uv run pytest tests -q`: 320 passed, 1 skipped
- `uv run ruff check .`: passed
- focused ZAKI-prod Hire BFF/quota/policy tests: 53 passed
- `npm --prefix backend test -- --runInBand`: 480 passed in ZAKI prod
- `npm --prefix backend run lint`: passed in ZAKI prod
- `ZAKI_HIRE_TEST_DATABASE_URL=postgresql://... uv run pytest
  tests/test_postgres_repository.py -q`: 1 passed against a disposable local
  PostgreSQL 16 container
- hosted-mode smoke with disposable PostgreSQL 16 confirmed BFF-style Bearer
  token plus `X-Zaki-User-Id` can call engine leads and internal readiness
- focused ZAKI-prod Hire usage-event tests: 23 passed
- focused ZAKI-prod Hire automation consent tests: 30 passed

Still open dependency conversions:

- graph and vector stores still need rebuild jobs and a final embedded-store
  versus internal-service deployment decision
- generated PDFs still need an object-storage provider, signed/proxied access,
  export/delete/retention, and production backup policy; imported files still
  need durable tenant-scoped artifact cataloging
- browser automation still needs sandboxed hosted workers, log/screenshot
  redaction, destination allowlists, cancellation controls, and cleanup; BFF
  action-scoped consent records are now implemented
- source provider credentials and custom connector definitions still need
  operator-owned configuration storage and runtime probing beyond readiness env
  probes and operator acknowledgements
- hosted background automation needs a tenant-aware scheduler or durable queue;
  the local ghost scheduler is not a safe production multi-tenant scheduler
- granular cost usage events for LLM tokens, embedding tokens, source pages,
  artifact bytes, and task duration remain pending; the first BFF quota surface
  and route-level central usage events are implemented, but storage-specific
  quotas and durable task/concurrency quotas still need their own classes

## Release Classification

| Capability area | V1 treatment | Reason |
| --- | --- | --- |
| Profile CRUD | Enabled | Core user value and low external dependency risk. |
| Resume upload import | Enabled with upload limits | Core onboarding path; requires file parsing and LLM quota. |
| LinkedIn export ZIP import | Enabled with upload limits | Uses user-provided export file, not live login credentials. |
| GitHub profile import | Enabled with caps | Useful enrichment; needs rate limits and optional operator token strategy. |
| Portfolio URL import | Enabled only with strict fetch policy | Valuable, but needs SSRF protection, egress limits, and crawler caps. |
| Manual lead entry | Enabled | Low risk and useful fallback. |
| Approved ATS/feed discovery | Enabled after source policy review | Reuses stable public APIs/feeds and direct ATS adapters. |
| Broad `site:` scraping | Enabled through source-policy lane | Requires approved domains, egress controls, rate limits, and extraction audit. |
| X/Twitter source scan | Enabled through operator credential lane | Requires ZAKI-provided bearer token, rate limits, and source-policy review. |
| Apify actor scan | Enabled through pinned actor lane | Requires approved actor ids, budget caps, source policy, and usage events. |
| Custom JSON connectors | Enabled through curated connector catalog | Users select configured connectors; operators own secrets and schemas. |
| Deterministic ranking | Enabled | Low cost and useful baseline. |
| LLM-assisted ranking | Enabled behind quota | Improves fit explanations; requires operator LLM routing. |
| Semantic matching | Enabled | Core fit value; requires consistent embedding and vector strategy. |
| Document generation | Enabled behind quota | Core monetizable workflow; requires LLM and artifact storage. |
| Contact lookup | Enabled through operator credential lane | Hunter/Proxycurl keys stay hidden; contact sourcing is audited. |
| Form read and preview apply | Enabled through sandboxed browser lane | Requires Playwright workers, tenant isolation, screenshots/log redaction, and retries. |
| Auto-apply | Enabled through consented apply lane | Requires per-run user consent, allowlisted domains, audit trail, and emergency kill switch. |
| Ghost/background automation | Enabled as hosted background automation | Requires durable task state, user-visible controls, quotas, and operator kill switch. |

## Full Feature Enablement Contract

Every upstream feature must be available in the product unless a specific
external provider outage makes it temporarily degraded. A feature may not be
removed simply because it needs credentials, browser automation, or source
review. Instead, implementation must add the missing hosted controls.

| Feature lane | User experience | Hidden operator/platform work |
| --- | --- | --- |
| LLM work | Users get generated queries, scoring, documents, help, and extraction. | ZAKI routes all LLM calls through configured provider/model lanes with quota and telemetry. |
| Source discovery | Users choose goals/sources and run scans. | ZAKI owns source policies, credentials, domain allowlists, rate limits, retries, and extraction logs. |
| Logged-in or protected sources | Users can connect or authorize sources where permitted. | ZAKI uses official APIs, approved partner providers, or ephemeral browser sessions; raw cookie paste is not exposed. |
| Custom connectors | Users choose configured connectors by name. | Operators define connector schemas, headers, secrets, response limits, and health checks. |
| Browser automation | Users can read forms, preview applications, and run apply flows. | Sandboxed browser workers isolate tenant sessions, record audits, redact logs, cap runtime, and clean state after each task. |
| Auto-apply | Users explicitly authorize an apply run. | ZAKI enforces consent, domain allowlists, replayable audit, task cancellation, and kill switches. |
| Contact lookup | Users receive contact suggestions and outreach drafts. | Operators provide enrichment providers, sourcing policy, cost caps, and opt-out/delete handling. |
| Background automation | Users can schedule or trigger job-search work. | Durable task state, per-user concurrency, stale-task recovery, and operator controls replace local ghost mode. |

## Minimum Operator Provisioning Bundle

ZAKI Hire should not reach users until operators can pre-provide this bundle and
the readiness endpoint can prove each lane is healthy or in a controlled
provider-degraded state.

| Bundle item | Required for v1 | Notes |
| --- | --- | --- |
| Engine source pin | Yes | Repository, commit, image digest, and AGPL source-offer path. |
| Internal engine token | Yes | Dedicated to Hire; never exposed to browser clients. |
| Tenant header contract | Yes | BFF derives tenant/user from central auth and injects it downstream. |
| PostgreSQL connection | Yes | Production source of truth; schema/migrations owned by the engine. |
| Artifact storage | Yes | Generated documents, imported source files, and export bundles. |
| LLM provider/model/key | Yes | Operator-owned default for scout, ingestor, evaluator, generator, and help. |
| LLM quota policy | Yes | Per user/account limits for generation, scan, ingestion, and evaluator calls. |
| Embedding route | Yes | Baked local model or central embedding service; vector dimension recorded. |
| Vector store | Yes for semantic matching | LanceDB or replacement, tenant-scoped and rebuildable. |
| Graph store | Yes for graph intelligence | Kuzu or replacement, tenant-scoped and rebuildable where practical. |
| Source policy version | Yes | Explicit enabled-lane classification for every adapter and provider. |
| Egress allowlist | Yes | LLM providers, approved sources, GitHub if enabled, artifact storage. |
| Upload and fetch limits | Yes | File size, page count, response bytes, timeout, redirect, and SSRF rules. |
| Usage event schema | Yes | Normalized cost/usage events emitted before central cost aggregation exists. |
| Backup/restore policy | Yes | PostgreSQL and artifacts must have a tested restore path. |
| High-risk source credentials | Yes for full parity | X, Apify, Hunter, Proxycurl, custom connector, and approved source credentials are operator-managed. |
| Browser runtime | Yes for full parity | Playwright/browser dependencies are baked into worker images and enabled behind sandbox controls. |

## Workflow Map

| User workflow | Upstream surface | Engine dependencies | ZAKI SaaS conversion |
| --- | --- | --- | --- |
| Dashboard and health | Dashboard, health, status, events, leads | gateway API, repository, health checks, event stream | Render inside `/hire`; hide internal dependency detail from normal users and expose operator readiness separately. |
| Pipeline browsing | lead list, export, detail, status, feedback, follow-up routes | lead repository, events, generated metadata | Move lead state to PostgreSQL, tenant-scope every query, and normalize exports through ZAKI governance. |
| Manual lead creation | manual lead route and deterministic lead intelligence | lead normalizer, quality signals, repository | Keep enabled; enforce tenant id, URL validation, and rate limits. |
| Profile editing | profile CRUD routes | Kuzu profile graph, SQLite profile snapshot settings, vector sync | Make PostgreSQL the primary profile store, then derive graph/vector state per tenant. |
| Resume import | resume/text/file ingest route | upload parsing, pypdf, DOCX parsing, LLM ingestor, graph/vector sync | Add upload caps, malware/content checks if available, tenant-scoped transient storage, and LLM quota. |
| LinkedIn export import | LinkedIn ZIP ingest route | ZIP/CSV parsing, profile graph import | Keep export upload and add an approved connector path for live authorization where permitted. |
| GitHub import | GitHub username ingest route | GitHub REST API, optional token, LLM ingestor | Start with username import and tight caps; decide whether ZAKI provides an operator token or later adds user OAuth. |
| Portfolio import | portfolio URL ingest route | HTTP fetch, optional Playwright crawl, optional LLM ingestor | Allow only through SSRF-safe fetch policy, domain/IP blocking, page caps, timeouts, and quota. |
| Source scan | scan route | query generation, source adapters, HTTP egress, quality gate, task state | Use an operator-approved source catalog; do not expose raw job-board strings or API credentials to users. |
| Free-source scan | free-source route | HN, GitHub issues, Reddit, direct ATS, custom connectors | Enable all source classes through reviewed source lanes; connector secrets stay operator-managed. |
| Reevaluate leads | reevaluation routes | deterministic ranking, optional LLM evaluator, vector matching | Tenant-scope tasks, apply quota, and persist task/result state in PostgreSQL. |
| Generate package | generation routes | LLM generator, PDF renderer, Markdown renderer, artifact files, optional contact lookup | Store generated files in durable object storage and metadata in PostgreSQL; gate by quota and usage telemetry. |
| Activity and follow-ups | events and follow-up routes | events table, lead timestamps, websocket broadcast | Tenant-scope events and websocket channels; include activity in export/delete. |
| Settings | settings UI and settings routes | local settings, provider keys, source credentials | Split into user preferences and operator-only configuration; remove provider/source secrets from user UI. |
| Form read and apply preview | automation routes | Playwright, browser runtime, selectors, candidate identity, optional vision LLM | Enable through sandboxed browser workers with tenant isolation and audit. |
| Auto-apply | fire route | Playwright, form filling, browser session, vision fallback | Enable through explicit user consent, allowlisted destinations, cancellation, and audit trail. |

## Engine Service Ownership Map

The audited upstream code can run gateway logic in-process or call internal
services for profile, discovery, ranking, generation, automation, and graph
operations. Hosted ZAKI should keep the API contract stable even if the internal
engine topology changes later.

| Capability | Upstream owner | Hosted persistence and task need |
| --- | --- | --- |
| API gateway and public routes | gateway/API layer | BFF-facing HTTP service, internal token validation, tenant headers, request ids. |
| Profile CRUD and imports | profile service/module | PostgreSQL primary profile records, graph sync, vector sync, upload/task records. |
| Discovery planning and scans | discovery service/module | source policy, scan task records, source failure records, lead write path. |
| Ranking and reevaluation | ranking service/module | deterministic score records, optional LLM evaluator usage, vector reads. |
| Generation packages | generation service/module | LLM usage, generated metadata, durable artifacts, optional contact lookup. |
| Graph intelligence | graph service/module | tenant graph partitions, repair/sync tasks, rebuild from primary state. |
| Automation/form handling | automation service/module | browser session isolation, consent records, audit logs, cancellation, and kill switches. |
| Event delivery | gateway event bus/websocket | tenant-scoped event channels and durable activity history. |
| Background jobs | gateway job store and in-memory task registries | PostgreSQL task table or durable queue safe across restarts and replicas. |

## Upstream API Route Map

ZAKI should not mirror every upstream route directly. The BFF should expose a
stable `/api/hire/*` contract and translate to the engine. The upstream route
families are:

| Family | Upstream routes | BFF treatment |
| --- | --- | --- |
| Health and diagnostics | `/health`, `/api/v1/health/subsystems`, `/api/v1/diagnostics` | Split user health from super-admin readiness. |
| Leads | `/api/v1/leads`, `/api/v1/leads/export.csv`, `/api/v1/leads/{id}`, `/api/v1/leads/{id}/versions`, delete, status, feedback, follow-up, PDF | Expose tenant-scoped lead, export, status, and generated artifact routes. |
| Manual lead | `/api/v1/leads/manual`, `/api/v1/leads/manual/generate/start` | Keep, but route through quota and task normalization. |
| Discovery | `/api/v1/scan`, `/api/v1/status`, `/api/v1/scan/stop`, reevaluate, cleanup, free-source scan | Keep with source policy, quota, and durable task state. |
| Generation | `/api/v1/leads/{id}/generate`, `/generate/start`, `/pipeline/run` | Keep with quota, usage telemetry, and artifact storage. |
| Profile | profile candidate, identity, skills, experience, projects, education, certifications, achievements | Keep user profile editing; use PostgreSQL primary state. |
| Ingestion | resume, LinkedIn export, GitHub, JSON profile, template, portfolio | Keep with upload, egress, and task limits. |
| Activity | `/api/v1/events`, websocket `/ws` | Tenant-scope and normalize through ZAKI event/task UI. |
| Settings | template, settings, validation, provider models | User proxy currently allows template only; provider/source settings, validation, and provider model probing are blocked from normal users and need ZAKI-native user-safe preferences/operator admin equivalents. |
| Runtime | vector runtime status/install | Do not expose runtime status/install controls to users. Bake production dependencies into images and surface user-safe readiness through ZAKI-owned views only. |
| Automation | form read, preview apply, fire, selector refresh, identity | Expose through sandboxed browser workers and BFF task controls. |
| Misc | graph, help chat, errors, shutdown | Keep graph/help only if productized; remove shutdown from hosted user surface. |
| Internal services | generation, automation, discovery, profile, graph, ranking internal routes | Either package as an internal engine monolith for v1 or deploy explicit internal service workloads. Do not use local child-process supervision in Kubernetes. |

## External Token And API Inventory

| Dependency | Upstream setting or environment | Used by | V1 owner | V1 decision |
| --- | --- | --- | --- | --- |
| Anthropic | `anthropic_key`, `ANTHROPIC_API_KEY` | LLM global/step routing, optional vision actuator | Operator | Supported if selected by ZAKI. |
| OpenAI | `openai_api_key`, `OPENAI_API_KEY` | LLM global/step routing, optional vision actuator | Operator | Supported if selected by ZAKI. |
| Gemini | `gemini_api_key`, `GEMINI_API_KEY`, `GOOGLE_API_KEY` | LLM global/step routing | Operator | Supported if selected by ZAKI. |
| Groq | `groq_api_key`, `GROQ_API_KEY` | LLM global/step routing, optional vision actuator | Operator | Supported if selected by ZAKI. |
| NVIDIA | `nvidia_api_key`, `NVIDIA_API_KEY` | LLM global/step routing, optional vision actuator | Operator | Supported if selected by ZAKI. |
| DeepSeek | `deepseek_api_key`, `DEEPSEEK_API_KEY` | LLM global/step routing | Operator | Supported if selected by ZAKI. |
| OpenAI-compatible providers | xAI, Kimi, Mistral, OpenRouter, Together, Fireworks, Cerebras, Perplexity, HuggingFace, Cohere, SambaNova, Qwen, Azure, custom | LLM global/step routing | Operator | Keep available only if deliberately configured. |
| Ollama | `ollama_url` | local LLM default | Operator only | Not a user default in SaaS. Use only if ZAKI operates an internal compatible endpoint. |
| Step-specific LLM keys | scout, evaluator, generator, ingestor, actuator provider/key/model settings | query generation, scoring, document generation, profile parsing, automation | Operator | Replace with central operator routing and per-step quota; do not expose to users. |
| Embeddings | local sentence-transformer model or hash fallback | profile/job semantic matching, vector store | Operator | No API key required upstream; production must choose baked local model or central embedding service. |
| GitHub REST API | optional user token in import flow | GitHub profile import and GitHub job search | Product/operator decision | Start without user token or with operator/app token; user OAuth can be later. |
| X/Twitter API | `x_bearer_token`, `X_BEARER_TOKEN`, `TWITTER_BEARER_TOKEN` | X job lead scan | Operator | Enabled through ZAKI-managed credential, rate limits, and source policy. |
| Apify | `apify_token`, `apify_actor` | external actor-based board scans | Operator | Enabled through pinned actors, budget caps, and source policy. |
| LinkedIn cookie | `linkedin_cookie` | local scraping settings | Connector service | Replace raw cookie entry with approved live authorization or partner/provider connector. |
| Hunter.io | `hunter_api_key`, `HUNTER_API_KEY` | contact lookup after package generation | Operator | Enabled through ZAKI-managed credential, sourcing policy, and usage caps. |
| Proxycurl | `proxycurl_api_key`, `PROXYCURL_API_KEY` | optional LinkedIn/contact enrichment | Operator | Enabled through ZAKI-managed credential, sourcing policy, and usage caps. |
| Custom connector headers | `custom_connector_headers` | private JSON lead connectors | Operator | Operator-only catalog; never raw user settings. |
| Browser runtime download | `JHM_BROWSER_RUNTIME_URL`, GitHub latest release fallback | browser automation/runtime install | Operator | Do not download latest at production startup; bake browsers into immutable worker images. |
| Vector runtime download | `JHM_VECTOR_RUNTIME_URL`, `JHM_RUNTIME_PACK_URL` | local packaged LanceDB runtime | Operator | Do not download latest at production startup; bake into image. |
| Error telemetry file | `JHM_LOCAL_ERROR_TELEMETRY`, `JHM_ERRORS_JSONL` | local error capture | Operator | Replace with central logs/metrics and redaction. |

## LLM Workflow Inventory

| Step | Uses LLM | Model needs | Required fallback |
| --- | --- | --- | --- |
| Query generation | Yes | cheap text model that can produce targeted source queries | deterministic/default target generation. |
| Source page extraction | Yes for generic web and some browser-crawled targets | text extraction from noisy page content | source-policy lane, extraction audit, and fallback to direct adapters. |
| Profile resume import | Yes for structured profile extraction | reliable JSON/profile extraction | manual profile editing and import error states. |
| GitHub profile import | Yes for repository/project summarization | code/project summarization | cap repos and import deterministic metadata if LLM fails. |
| Portfolio import | Optional LLM enrichment | portfolio summarization from crawled text | import raw extracted evidence or skip enrichment. |
| Ranking evaluator | Optional | reasoning/fit explanation | deterministic scorer and semantic match. |
| Document generation | Yes | high-quality long-form writing with structured output | deterministic package fallback and retry. |
| Help chat | Yes | general support response | static help fallback when provider is degraded. |
| Automation actuator vision | Yes | vision-capable model for browser fallback | route to approved vision model with audit and quota. |

All LLM calls need normalized usage events with tenant id, user id, feature,
provider, model, input units, output units, duration, success state, and error
class. Central cost telemetry can aggregate later, but the engine and BFF must
emit consistent events from day one.

## Runtime Dependency Inventory

| Area | Required for hosted v1 | Notes |
| --- | --- | --- |
| Python runtime | Python 3.13 or compatible production decision | Upstream requires Python `>=3.13`. |
| Web API | FastAPI, Uvicorn, websockets, python-multipart | Required for engine API, uploads, and task/event updates. |
| HTTP and retry | httpx, urllib3, tenacity | Required for provider and source calls. |
| LLM clients | anthropic, openai, instructor | Required if using upstream LLM client patterns. |
| Workflow libraries | langchain-core, langgraph | Present upstream; validate whether still needed after hosted conversion. |
| Graph store | Kuzu | Companion store; tenant-scope and make rebuildable where practical. |
| Vector store | LanceDB and PyArrow runtime support | Companion store; tenant-scope and avoid local runtime installers. |
| Embeddings | sentence-transformers or central embedding route | Local model `all-MiniLM-L6-v2` is upstream default; hash fallback exists but should not be the quality target. |
| File parsing | pypdf, DOCX ZIP parsing, text/Markdown parsing | Required for resume/profile ingestion. |
| PDF/document generation | fpdf2, markdown | Required for generated resume and cover letter artifacts. |
| Browser automation | Playwright and browser system libraries | Required for full parity; run in sandboxed worker image. |
| Scheduling | APScheduler | Upstream ghost/background jobs exist; hosted tasks should move to durable task state. |
| Frontend source | React, Vite, Tailwind, Tauri dependencies | Port UX into ZAKI frontend; do not ship Tauri/Rust/updater in ZAKI prod. |
| Packaging | PyInstaller/Tauri release tooling | Not part of hosted runtime. |
| Observability | central logs, metrics, traces, alerts | Replace local JSONL/error tables with production observability. |

## Storage Migration Inventory

| Upstream state | Current upstream store | Hosted ZAKI target |
| --- | --- | --- |
| Leads and lead metadata | SQLite `leads` table | PostgreSQL tenant-scoped tables. |
| Lead versions and generated metadata | SQLite fields plus local files | PostgreSQL metadata plus object storage artifacts. |
| Pipeline status, feedback, follow-ups | SQLite lead columns | PostgreSQL lead state and activity tables. |
| Events/activity | SQLite `events` table and websocket broadcast | PostgreSQL activity/audit tables plus tenant-scoped event channels. |
| Settings | SQLite key/value table | Split between operator config, product defaults, and tenant/user preferences. |
| Profile snapshot and profile deletions | SQLite settings values plus Kuzu graph | PostgreSQL primary profile tables; Kuzu derived graph. |
| Graph nodes and relationships | Kuzu database under local app data | Tenant-scoped Kuzu store or partitioned graph service; rebuild from primary state where practical. |
| Vector tables | LanceDB directory under local app data | Tenant-scoped vector tables; rebuild from primary state and artifact text where practical. |
| Generated PDFs | local app data assets directory | Object storage or durable persistent storage with tenant keys, checksums, MIME type, and retention state. |
| Gateway jobs | SQLite `gateway_jobs` table | PostgreSQL task table or central durable queue/task store. |
| In-process scan and generation state | memory plus SQLite job records | Durable task records safe across restarts and replicas. |
| Error log | SQLite `error_log` and optional JSONL file | Central logs/metrics with redaction and tenant-aware support tooling. |
| Browser runtime/cache | local runtime directories | Ephemeral tenant/session browser storage wiped after each task. |

PostgreSQL must be the production source of truth. SQLite can remain for local
development compatibility, migration fixtures, or upstream parity tests, but it
must not be production primary.

## Source Adapter Policy

| Source | Upstream mechanism | V1 policy | Required controls |
| --- | --- | --- | --- |
| Manual lead | user-entered data | Allowed | URL validation, spam caps, tenant audit. |
| Direct ATS: Greenhouse, Lever, Ashby, Workable | public ATS APIs/widgets | Allowed after terms review | rate limits, egress allowlist, source freshness handling. |
| HN Hiring | Algolia/HN source adapter | Allowed after terms review | caps and dedupe. |
| RemoteOK, Remotive, Jobicy, WeWorkRemotely | public API/RSS adapters | Allowed after terms review | caps, source health checks, failure isolation. |
| GitHub issues search | GitHub REST API | Limited beta | rate limits, optional token strategy, query caps. |
| Reddit search | public Reddit JSON search | Operator-reviewed beta | terms review, caps, failure handling. |
| Portfolio URLs | HTTP/browser crawl | Limited beta | SSRF protection, DNS/IP blocking, size/page/time caps. |
| Generic `site:` web targets | browser/LLM extraction | Enabled through policy lane | source-specific approval, domain allowlist, extraction logs. |
| LinkedIn, Indeed, Glassdoor, Naukri, Wellfound broad scanning | search/browser/provider targets | Enabled through approved lanes | official APIs, partner providers, or consented browser sessions where permitted. |
| X/Twitter | recent search API | Enabled through operator credential lane | bearer token, source terms, cost/rate controls. |
| Apify actors | Apify run-sync dataset API | Enabled through pinned actor lane | actor pin, cost cap, source policy, secret isolation. |
| Custom JSON connectors | operator JSON definitions plus headers | Enabled through connector catalog | connector catalog, secret storage, schema validation. |
| Auto-apply/form submission | Playwright actuator | Enabled through consented apply lane | explicit consent, audit, site policy, reliability gates. |

## Operator Settings Versus User Settings

Normal users can safely manage:

- profile identity, skills, experience, projects, education, certifications, and
  achievements
- target role or market preference if the product exposes it as a user
  preference
- manual leads and approved source selections from a curated catalog
- lead status, feedback, follow-up dates, and generated package review
- document tone/template preferences that do not change provider routing or
  source policy

Operators must own:

- all LLM providers, models, API keys, base URLs, and per-step routing
- embedding provider/model/runtime choice
- source catalog, source policy version, source credentials, and egress rules
- GitHub, X, Apify, Hunter, Proxycurl, custom connector, and browser credentials
- job-board defaults and broad scraping enablement
- auto-apply, form-read, headed browser, ghost/background automation, and
  browser runtime settings
- upload, scan, generation, task, storage, and concurrency limits
- PostgreSQL, graph, vector, artifact storage, backup, restore, and retention
  settings
- internal engine URL, internal token, tenant header contract, CORS, CSP, and
  readiness probes

Any upstream setting that stores a key, token, cookie, provider, model, runtime
path, source header, source adapter definition, or automation switch is hidden
from normal users. The underlying feature remains enabled through a ZAKI-owned
configuration or connector lane.

## Hosted Runtime Shape

Recommended v1 shape: run `zaki-hire-engine` as one hosted FastAPI service with
internal modules in-process, PostgreSQL primary state, tenant-scoped companion
stores, and durable task records. This keeps the first production surface small
and avoids the upstream local child-process supervisor pattern.

Alternative shape: deploy each upstream internal service as its own Kubernetes
workload. This only makes sense after v1 if scaling evidence shows separate
generation, discovery, ranking, automation, graph, or profile workers need
independent scaling. If this option is chosen, service discovery, health,
internal tokens, retries, and task ownership must be made Kubernetes-native.

The upstream local supervisor should not be used as-is in production because it
spawns local child processes, binds random localhost ports, writes local logs,
and assumes one desktop user.

## Multi-User Conversion Risks

| Risk | Why it matters | Required treatment |
| --- | --- | --- |
| Local bearer token auth | Upstream trusts a desktop-generated token and local origins. | Replace with ZAKI internal token plus canonical tenant headers. |
| Local CORS assumptions | Upstream accepts local/Tauri origins only. | Define hosted CORS/CSP at ZAKI frontend and BFF; engine stays internal. |
| Global cached repository/settings | Process-level caches can accidentally share local state assumptions. | Tenant context must be explicit on every repository operation. |
| Local app data paths | SQLite, Kuzu, LanceDB, assets, logs, and runtime packs use local directories. | Replace with PostgreSQL, tenant stores, object storage, and central logs. |
| SQLite and Kuzu locking | Desktop storage is not safe as a shared multi-replica production primary. | PostgreSQL primary; graph/vector companion stores must be tenant-scoped and concurrency-tested. |
| In-process event broadcast | Upstream websocket broadcast assumes one local user. | Tenant-scoped channels and authorization checks on every event stream. |
| Memory-backed task state | Restart or multiple replicas can lose or cross-wire task status. | Durable tenant-scoped task records or queue-backed workers. |
| Local child-service supervisor | Random localhost ports and subprocess logs do not fit Kubernetes operations. | Use one hosted service for v1 or explicit Kubernetes workloads. |
| User-visible secret settings | Upstream settings UI accepts provider keys, cookies, source tokens, and headers. | Remove from user UI; expose only operator admin controls. |
| Runtime installers | Upstream can fetch vector/browser runtime packs from latest releases. | Bake dependencies into immutable images; no production latest downloads. |
| Local artifact paths | Generated PDFs are referenced by filesystem paths. | Store artifacts by tenant object key and serve through authorized BFF routes. |
| Silent provider fallback | Some LLM paths degrade to deterministic or empty output when keys are missing. | Readiness must fail selected provider routes; user UI must show explicit degraded states. |
| Broad source egress | Search/scrape targets can hit job boards with terms or blocking risk. | Source catalog, egress allowlist, caps, and source-specific review. |

## Readiness Checks

The deployment readiness endpoint should block paid-user rollout unless all
selected dependencies are healthy or in a controlled provider-degraded state
with user-safe failure UX.

| Check | Healthy condition |
| --- | --- |
| BFF auth | `/api/hire/*` rejects unauthenticated browser requests. |
| Internal token | Engine accepts only ZAKI backend calls with the dedicated internal token. |
| Tenant header | Engine rejects missing tenant/user context and never accepts browser-supplied tenant ids directly. |
| PostgreSQL primary | Engine can migrate/read/write PostgreSQL and production SQLite is local-dev or migration-only. |
| Artifact storage | Engine can write, read, delete, and generate signed or proxied artifact access for tenant-owned documents. |
| Kuzu graph | Graph store is available, tenant-scoped, and rebuildable where practical. |
| LanceDB vector | Vector store is available, tenant-scoped, and semantic matching is healthy. |
| Embeddings | Chosen embedding route is available and dimension is recorded. |
| LLM route | Operator provider/model/key validates with a low-cost probe and records model id. |
| Source policy | Enabled source adapters match an approved policy version. |
| High-risk sources | X, Apify, broad scanning, LinkedIn connectors, custom connectors, and auto-apply each report a healthy safety lane with policy version, quota, audit, and kill switch. |
| Task store | Scan/generation/reevaluation tasks survive restart and are tenant-scoped. |
| Quota hooks | Scan, import, generation, LLM, embedding, artifact, and task quotas reject over-limit requests. Initial BFF weekly prompt quota covers cost-bearing Hire routes; storage, embedding, artifact, and task classes remain. |
| Usage telemetry | LLM/source/artifact/task events emit normalized tenant-aware usage records. |
| Export/delete | Export and deletion include PostgreSQL, graph, vector, artifacts, tasks, and events. |
| Backup/restore | PostgreSQL and artifacts are backed up and a recent restore drill is recorded. |
| Observability | Logs, metrics, health, readiness, source failures, provider failures, and task failures are visible to operators. |

## Implementation Decisions Still Required

| Decision | Recommendation | Why it matters |
| --- | --- | --- |
| Initial upstream source pin | Fork from `3831a0f8b1393a8da3c5b6d6511dce52a8ee6381` unless re-audit finds a newer accepted commit. | Every deployment needs source traceability and AGPL notice handling. |
| Runtime topology | Use one hosted engine service for v1. | Faster to make tenant-safe and production-ready. |
| Default LLM provider/model | Choose one operator-owned default, then optionally override per step internally. | Users must not bring their own keys for a ready SaaS. |
| Embedding strategy | Bake local sentence-transformer support first, or route to central embeddings if ZAKI wants cost telemetry from day one. | Vector quality, image size, cold start, and cost accounting depend on this. |
| Artifact storage provider | Use the same production object-storage pattern as other ZAKI services if available. | Generated documents must be durable, private, exportable, and deletable. |
| Source catalog | Ship all source classes through enabled safety lanes, starting with the lowest-risk adapters but not removing high-risk features from scope. | Discovery is valuable; source risk is handled through policy and controls, not feature removal. |
| GitHub import token model | Use operator/app token first; add user OAuth only if product needs private repo access. | Avoid collecting arbitrary personal tokens while keeping the feature enabled. |
| Contact lookup | Enable with ZAKI-managed Hunter/Proxycurl or equivalent provider plus sourcing policy. | Contact enrichment is part of full parity and needs audit/cost controls. |
| Portfolio crawler mode | Enable HTTP and Playwright paths through SSRF-safe fetch and browser worker controls. | Browser crawling is required for full parity and must be sandboxed. |
| Central cost telemetry | Emit normalized events now; aggregate centrally later with auth/account work. | Avoid another fragmented downstream cost island. |
| PostgreSQL schema ownership | Engine owns Hire schema, BFF owns account/entitlement/quota joins. | Prevents proprietary ZAKI state from drifting into AGPL engine code. |

## Phase 0 Exit Checklist

| Gate | Status | Evidence |
| --- | --- | --- |
| Feature map | Drafted | Workflow map covers dashboard, profile, ingestion, discovery, ranking, generation, activity, settings, and automation. |
| Route map | Drafted | Public, runtime, internal, and automation route families are identified. |
| LLM dependency map | Drafted | LLM workflows and provider/key inventory are identified. |
| API token inventory | Drafted | LLM, source, GitHub, X, Apify, Hunter, Proxycurl, custom connector, and runtime download inputs are identified. |
| Runtime dependency map | Drafted | Python, backend libraries, graph/vector, documents, browser, and frontend packaging dependencies are classified. |
| Source adapter review | Drafted | Source policy table classifies enabled safety lanes and required controls. |
| Storage map | Drafted | SQLite, Kuzu, LanceDB, local files, jobs, events, and errors are mapped to hosted stores. |
| Operator settings map | Drafted | User-safe and operator-only settings are split. |
| Readiness probes | Started | Engine internal deployment readiness endpoint is implemented; BFF proxy, provider-specific runtime probes, and browser worker probes remain pending. |
| Acceptance | Pending | Product/engineering must accept this inventory before implementation begins. |

## Cold-Read Result

A new engineer can use this document to start implementation only if they also
have the integration spec, operator checklist, and paid-user readiness plan. The
remaining blocker is not missing source context; it is product/operator
implementation of the safety lanes above, especially embedding route, artifact
storage, source catalog runtime bridging, browser worker sandbox, auto-apply
consent/audit, and contact lookup policy.
