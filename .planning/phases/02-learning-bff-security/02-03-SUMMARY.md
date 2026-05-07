# 02-03 Summary: WebSocket Schema And Quota Hardening

## Completed

- Reviewed learning WebSocket aliases:
  - `/api/learning/ws`
  - `/api/learning/book/ws`
  - `/api/learning/chat/ws`
  - `/api/learning/solve/ws`
  - `/api/learning/vision/solve/ws`
  - `/api/learning/questions/mimic/ws`
  - `/api/learning/questions/generate/ws`
- Changed WebSocket JSON sanitization to strict root allowlisting for client messages.
- Preserved recursive stripping of provider/model/API-key/base URL fields.
- Kept passive subscribe/progress identifiers such as `book_id` allowed.
- Confirmed quota logic still exempts passive messages and consumes quota for prompt/mutating messages.

## Verification

- `npm --prefix backend test -- --runTestsByPath src/learning-bff-contract.test.js`
- `git diff --check`

## Review Result

- Unknown root fields are removed from WebSocket JSON messages.
- Nested operator-managed fields are removed from allowed payload structures.
- Passive subscribe messages remain quota-free.
- Prompt/mutating messages still consume quota.

## Residual

- Binary frames still pass through and consume quota. Keep this behavior unless a route-specific binary protocol requires finer-grained policy.

## Next

Execute 02-04: generated HTML renderer safety.
