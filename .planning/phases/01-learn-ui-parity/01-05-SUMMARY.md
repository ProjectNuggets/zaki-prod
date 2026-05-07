# 01-05 Summary: TutorBot UI Parity

## Completed

- Kept upstream TutorBot management tabs inside ZAKI Learn:
  - Bots
  - Profiles
  - Channels
  - Soul Templates
- Replaced generic detail-sheet chat entry with a full in-Learn TutorBot chat surface.
- Added upstream-shaped chat header controls:
  - back to bots
  - running indicator
  - save to notebook
  - download markdown
- Wired chat to ZAKI authenticated learning WebSocket routes only.
- Fixed agent id normalization so chat and destroy use `bot_id`/`agent_id` before display `name`.
- Kept provider/model settings out of the user surface.

## Verification

- Restarted local ZAKI backend with learning enabled:
  - ZAKI BFF: `http://localhost:8787`
  - learning engine: `http://localhost:8001`
  - frontend: `http://localhost:5173`
- `curl http://localhost:8787/health`
- `curl http://localhost:8001/healthz`
- `curl http://localhost:8001/readyz`
- Browser: `/learn?view=tutorbot` renders management tabs and create form.
- Browser E2E: created temporary bot `zaki-local-tutor`.
- Browser E2E: opened full TutorBot chat surface.
- Browser E2E: chat WebSocket showed `Live`.
- Browser E2E: sent a message through the ZAKI learning gateway.
- Browser E2E: received upstream provider error payload: `{'message': 'Not Found', 'code': 404}`.
- Browser E2E: deleted temporary bot and confirmed list returned to empty.
- `npm run typecheck`
- `npm test -- --runTestsByPath src/lib/api.test.ts src/app/components/learning/learningBookCreatePayload.test.ts`
- `git diff --check`

## Residual

- The local learning engine provider/model config currently returns `404` for TutorBot LLM calls. This is an operator-managed dependency issue, not user-facing settings.
- Profiles/Channels/Soul Templates still need deeper edit forms before final production parity, but their upstream-shaped tabs and read surfaces are present. Keep this in Phase 03 capability parity.

## Next

Execute 01-06: advanced workspace entry points for solve, research, quiz, visualize, and math animation.
