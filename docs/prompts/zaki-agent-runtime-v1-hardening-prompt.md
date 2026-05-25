# Prompt: ZAKI Agent Runtime V1 Hardening

Copy this into the ZAKI Agent / Nullalis workstream.

---

You are the ZAKI Agent / Nullalis runtime owner. Work in your own branch/worktree. Do not edit `zaki-prod` unless explicitly coordinated. The experimental runtime is already wired to `zaki-prod`; your job is to make the runtime contract production-ready for the Agent-first V1 commercial release.

## Product Direction

ZAKI Agent is the main consumer product. It must feel closer to Manus-level browser execution plus Codex/Claude Code-level agent discipline, with graph memory as the differentiator.

`zaki-prod` owns:

- Auth, account, anonymous sessions.
- Product registry and operational product state.
- Billing, plans, entitlements.
- Central meter grants and receipts.
- Settings, Dashboard, extension pairing UI, device revocation.
- Final memory governance surfaces and support/audit explainability.

Nullalis owns:

- Agent runtime.
- Tool execution.
- Personal graph memory internals.
- SSE runtime events.
- Browser MCP and browser extension execution.
- Raw runtime usage facts.

Downstream products and runtime services report facts. They do not decide final billing.

## Central Meter Contract To Adopt

Before expensive work:

- Accept a central meter grant from `zaki-prod` or run only through the trusted `zaki-prod` internal proxy.
- Validate grant/product/action/expiry where direct service access is possible.
- Reject direct expensive browser/tool/agent calls without a valid grant or trusted internal context.

After work:

- Emit raw usage facts in a machine-readable way, preferably in `done` or a dedicated usage event:
  - `inputTokens`
  - `outputTokens`
  - `model`
  - `toolCalls`
  - `externalApiCalls`
  - `durationMs`
  - `storageBytes`
  - `jobRuntimeMs`
  - `browserMode`
  - `memoryReads`
  - `memoryWrites`
  - `runId`
  - `toolRunIds`
- Do not compute final weighted debit in Nullalis.
- Preserve idempotency keys/request ids through the run so `zaki-prod` can link grant, receipt, runtime trace, and user-facing run detail.

## Browser Extension V1 Requirements

Current code truth: the gateway and `extension_navigate` are wired. The remaining extension tools are not product-complete.

Implement or prepare production-ready contracts for:

- `extension_click`
- `extension_type`
- `extension_fill_form`
- `extension_screenshot`
- `extension_get_text`
- `extension_get_dom`
- `extension_wait_for`
- `extension_scroll`
- `extension_list_tabs`
- close/disconnect/stop behavior if not already covered

Security rules:

- No internal service token paste in the extension.
- No user id paste in the extension.
- Accept a scoped, revocable token/pairing credential issued by `zaki-prod`.
- Commands before authenticated `auth_ack{ok:true}` must remain impossible to dispatch.
- All extension tools are high-risk/mutating unless clearly read-only.
- Every command result should include command id, tab id where relevant, URL/origin where relevant, status, duration, and safe error code.
- Add per-origin policy hooks even if the first release is allow-by-approval.
- Keep STOP reliable across MV3 worker eviction.

## Server Browser MCP Requirements

Keep the server-side Playwright MCP path for public/non-auth web work.

Required:

- Maintain SSRF defense and redirect/subresource URL sanitization.
- Keep per-session BrowserContext isolation.
- Keep `evaluate_js` hidden unless explicitly enabled.
- Emit usage facts for navigation, screenshots, DOM/text extraction, external calls, and runtime.
- Expose current URL/title/screenshot/tool state enough for `zaki-prod` Agent workbench to show a live run panel.

## Memory Requirements

User-scoped memory must be keyed by canonical ZAKI user id, not email strings.

Report enough facts for `zaki-prod` to audit:

- memory reads
- memory writes
- memory ids
- source product
- source session/run
- confidence/importance where available
- provenance

Memory scope contract:

- Personal Brain: Agent/Brain authority.
- Workspace Memory: Chat/Spaces authority.
- Learner Memory: Learn authority.
- Hire Memory: Hire authority.
- Design Memory: future.
- Session Memory: ephemeral.

Do not mix workspace/learner/hire memories into Personal Brain without explicit promotion policy.

## Runtime Events

Preserve the existing SSE contract:

- `status`
- `progress`
- `reasoning_summary`
- `tool_start`
- `tool_result`
- `approval_required`
- `task_update`
- `reply_start`
- `token`
- `error`
- exactly one terminal `done`

Add or enrich:

- stable `runId`
- stable `toolRunId`
- browser session id
- approval id
- usage facts
- memory read/write summaries
- durable trace references

## Deliverables

1. Audit the current Nullalis runtime against the requirements above.
2. Implement the smallest production-safe slice first:
   - extension tool parity, or
   - raw usage facts, or
   - pairing-token validation contract.
3. Add tests for each changed runtime contract.
4. Produce a short handoff that names:
   - changed files
   - endpoints/events/tools changed
   - how `zaki-prod` should consume the new contract
   - verification commands and results
   - remaining blockers

## Acceptance Bar

This is V1-ready only when:

- ZAKI Agent can control a user browser without token/user-id paste.
- All browser commands are visible, stoppable, auditable, and user-scoped.
- Runtime usage facts are complete enough for central weighted billing.
- Memory reads/writes are user-scoped and traceable.
- Direct expensive calls without grant/trusted context fail.
- `zaki-prod` can build a durable Agent run detail from runtime events.

---
