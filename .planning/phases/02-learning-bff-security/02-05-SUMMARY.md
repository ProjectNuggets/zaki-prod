# 02-05 Summary: User And Operator Settings Split

## Completed

- Searched learning frontend, learning API client, learning BFF, and spec for provider/model/API-key/base URL settings.
- Confirmed server-side enforcement from 02-01 and 02-03 strips operator-managed fields even when a client bypasses the UI.
- Redacted Knowledge page RAG provider and embedding model labels from normal user surfaces.
- Preserved user-managed settings:
  - learning behavior
  - sources/uploads
  - tutors/persona/channels
  - memory and skills
  - content and book settings

## Verification

- `rg` scan for provider/model/API-key/base URL terms across learning UI/API/BFF.
- `npm run typecheck`
- `git diff --check`

## Review Result

- Normal users cannot set provider/model/API keys/base URLs through the learning UI.
- Normal users no longer see knowledge provider or embedding model labels.
- Backend sanitizer and WebSocket allowlist enforce the split even if the frontend is bypassed.

## Residual

- Operator admin UI for learning routing is not part of the normal user product surface and remains future operator tooling.

## Next

Execute 02-06: backend security test pass.
