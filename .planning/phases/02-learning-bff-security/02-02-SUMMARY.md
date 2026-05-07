# 02-02 Summary: Raw Upload Byte Limits

## Completed

- Audited raw learning upload routes:
  - knowledge create
  - file upload
  - folder upload
  - archive upload
- Confirmed raw proxying uses a byte-counting stream before forwarding to the learning engine.
- Moved byte-limit transform and request-size error helpers into `backend/src/learning-bff-contract.js` so the behavior is contract-testable.
- Kept `backend/src/index.js` responsible for destroying the incoming request when the limiter detects overflow.
- Added a chunked upload regression test that exceeds the byte cap without relying on `Content-Length`.

## Verification

- `npm --prefix backend test -- --runTestsByPath src/learning-bff-contract.test.js`
- `git diff --check`

## Review Result

- Chunked raw learning uploads cannot stream beyond the hosted byte cap without the limiter producing `learning_request_too_large`.
- Existing over-limit `Content-Length` checks remain in the ingress path.

## Residual

- End-to-end HTTP upload tests can be added later if we stand up an isolated fake learning upstream in CI.

## Next

Execute 02-03: WebSocket payload schema and quota hardening.
