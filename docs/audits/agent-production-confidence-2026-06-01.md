# Agent Production Confidence Report - 2026-06-01

## Scope
- Surface: `/agent`
- Local frontend: `http://localhost:5173`
- ZAKI BFF: `http://localhost:8787`
- Nullalis gateway: `http://127.0.0.1:3000`
- Test user: local signed-in test user

## What was fixed
- Approval cards now recover from session detail after reload instead of disappearing when the SSE event is gone.
- BFF session detail now merges upstream Nullalis session detail before falling back to the local thread record, so pending approvals can be hydrated.
- Artifact exports now download through an authenticated BFF blob fetch. Plain links were not enough because `/api/agent/exports/:filename` requires a bearer token.
- Right-panel artifact actions now support export, authenticated download, share, copy link, and public share resolution.
- Context meter tooltip now reports source and confidence, e.g. `Live session · exact`, with token counts.
- Blocking Agent onboarding compaction tour is disabled on the execution surface.
- Persisted backend approval instructions are rendered as compact operational approval rows instead of raw `Use /approve` slash-command text.

## Live evidence
- Approval card visible before reload: `/tmp/zaki-agent-live-approval-before-reload.png`
- Approval card survived reload: `/tmp/zaki-agent-live-approval-after-reload.png`
- Approval route returned `200`:
  - `POST /api/agent/sessions/agent%3Azaki-bot%3Auser%3A1%3Athread%3Amain/approve`
- Session artifact created:
  - `Approval Reload Proof 1780319121998`
  - artifact id `d5167304-c9db-41ef-ac4a-72f54d31b11c`
- Right-panel PDF download succeeded:
  - downloaded `Approval_Reload_Proof_1780319121998.pdf`
  - `GET /api/agent/exports/Approval_Reload_Proof_1780319121998_1780319666915_d630d692.pdf`
  - content type `application/pdf`
- Artifact share succeeded:
  - `POST /api/agent/artifacts/d5167304-c9db-41ef-ac4a-72f54d31b11c/share`
  - public URL `/api/agent/share/artifact/jnku5ecdh4cfrrnq`
  - unauthenticated `curl` returned HTTP 200 and artifact JSON.
- Context tooltip evidence:
  - `/tmp/zaki-agent-context-tooltip-source.png`
  - showed `Live session · exact. 178,309 / 262,144 tokens`
- Blocking tour removed:
  - `/tmp/zaki-agent-no-blocking-tour.png`
  - `Conversation getting long?` absent.
- Browser panel state:
  - `/tmp/zaki-agent-browser-panel-live.png`
  - app browser lane ready, extension lane explicitly `NOT PAIRED`.

## Verification commands
- `npm test -- --runTestsByPath src/lib/api.test.ts src/app/components/ChatArea.test.tsx src/app/components/InputArea.test.tsx src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/agent/PowerUserSheet.test.tsx src/app/components/chat/MessageBubble.test.tsx --runInBand`
  - PASS: 6 suites, 119 tests.
- `npm --prefix backend run lint`
  - PASS.
- `npm --prefix backend test -- --runTestsByPath src/agent-bff-contract.test.js --runInBand`
  - PASS: 19 tests.
- `npm run typecheck`
  - PASS.
- `npm run build`
  - PASS, with existing large chunk warning.
- `git diff --check`
  - PASS.

## Remaining blocker
- Paired browser-extension E2E was not run because no user browser extension is paired in the local session.
- Current diagnostics are production-safe:
  - `GET /api/agent/diagnostics/extension` returned `paired:false`.
  - Browser panel clearly separates app browser automation from the user-browser extension lane.
  - To close this fully, pair a real extension session and run navigate/click/type/screenshot/get_dom/get_text against it.

## Manual audit notes
- Start from `/agent`.
- Check the Artifacts tab: the active session artifact should appear under `ARTIFACTS · SESSION`.
- Use `Download PDF` to verify authenticated download.
- Use `Share` then `Copy link`; copied links should use `/api/agent/share/artifact/:code`, never raw upstream `/api/v1/users/...` paths.
- Hover the context meter: it should show source/confidence and token counts, not just a percent.
