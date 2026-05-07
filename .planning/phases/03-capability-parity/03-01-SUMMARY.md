# 03-01 Summary: Tutor Chat And Session Parity

## Outcome

Completed the first Phase 03 parity slice for TutorBot chat/session behavior inside ZAKI Learn.

## Changes

- Added ZAKI frontend client support for upstream TutorBot recent-session listing.
- Added a separate TutorBot stop action that maps to upstream `DELETE /tutorbot/{bot_id}` while preserving destroy/delete as a distinct action.
- Surfaced recent tutors in the ZAKI TutorBot page, matching the upstream sidebar behavior without adding DeepTutor branding.
- Preserved full TutorBot chat history restoration instead of clipping to the last eight messages.
- Wired live TutorBot chat messages into save/export state so transcript export includes the current in-browser turn.
- Invalidated TutorBot list, history, and recent-session caches after chat turns and lifecycle changes.

## Verification

- `npm run typecheck`
- `npm test -- --runTestsByPath src/app/components/learning/LearningBookBlockContent.test.tsx src/lib/api.test.ts src/app/components/learning/learningBookCreatePayload.test.ts src/app/components/learning/learningSpaceReferences.test.ts src/app/components/learning/learningBookProgress.test.ts`
- `git diff --check`
- Browser check on `http://localhost:5173/learn?view=tutorbot` with local frontend, ZAKI backend, and learning engine:
  - Created a temporary TutorBot.
  - Confirmed Chat, Stop, Delete, running status, and recent-tutor entry render.
  - Opened TutorBot chat through the authenticated ZAKI learning gateway.
  - Sent a test message over WebSocket.
  - Confirmed provider error payload renders in chat and the input recovers for another send.
  - Deleted the temporary TutorBot and returned to a clean empty state.

## Caveats

- The local learning engine currently returns `404` for the configured operator LLM route during TutorBot response generation. This is an environment/operator routing issue, not a user-facing model selector gap; provider/model controls remain intentionally hidden from normal users.
- Save to Notebook is disabled when no notebook exists, matching the current local data state.

## Next

Proceed to `03-02 Book/lesson reader and block action parity`.
