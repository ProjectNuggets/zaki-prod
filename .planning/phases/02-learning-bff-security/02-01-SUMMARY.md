# 02-01 Summary: Mutation Proxy Sanitization

## Completed

- Inventoried learning JSON mutation forwarding in `backend/src/index.js`.
- Confirmed the shared `registerLearningJsonProxyRoute` path sanitizes JSON bodies by default.
- Confirmed hand-written book/session/knowledge JSON mutation routes call `sanitizeLearningJsonBody`.
- Hardened `sanitizeLearningClientPayload` to strip operator-managed fields by normalized key, covering:
  - `api_key` and `apiKey`
  - `base_url` and `baseURL`
  - `llm_selection` and `llmSelection`
  - `model`, `model_id`, and `modelName`
  - `provider`, `provider_config`, and `providerSettings`
- Added a regression test that scans the learning BFF section to prevent raw `req.body` forwarding.
- Added recursive sanitizer coverage for nested payload variants.

## Verification

- `npm --prefix backend test -- --runTestsByPath src/learning-bff-contract.test.js`
- `git diff --check`

## Review Result

- No normal-user learning JSON mutation route was found forwarding `req.body` directly.
- Operator-managed provider/model/API-key/base URL fields are stripped recursively before forwarding.

## Residual

- Route-specific allowlists would be stricter than recursive sanitization for some endpoints. Keep this as a future hardening option if upstream contracts stabilize further.

## Next

Execute 02-02: enforce raw/chunked upload byte limits before proxying.
