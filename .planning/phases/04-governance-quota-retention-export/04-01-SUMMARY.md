# 04-01 Quota Model And Enforcement Matrix Summary

Date: 2026-05-07

## Completed

- Chose `learning` as the permanent Learn quota surface instead of folding Learn into `zaki_bot`.
- Added entitlement-aware Learn quota policy resolution for free, student, personal, and active access-code users.
- Exposed Learn quota policy through `/api/usage/quota?surface=learning` alongside the existing daily prompt usage payload.
- Enforced plan-specific learning request/upload byte limits after authentication while retaining the operator global cap before auth.
- Made raw/chunked learning upload stream limiting use the authenticated Learn policy cap.
- Expanded the ZAKI auth user projection used by this server so quota policy can see access-code and student-verification fields.
- Updated the integration spec with the hosted quota matrix and closed the open quota-surface decision.

## Verification

- `npm --prefix backend test -- --runTestsByPath src/learning-quota.test.js src/daily-quota.test.js src/agent-and-chat-quota.integration.test.js src/learning-bff-contract.test.js`
- `npm --prefix backend run lint`
- `node --check backend/src/learning-quota.js`

## Remaining Governance Work

- Add parser-level max file count enforcement where raw multipart/folder uploads expose file counts.
- Add storage accounting for tenant source files and generated artifacts.
- Add daily counters for generated books and external searches.
- Add concurrent learning session accounting.
- Continue with 04-02: data deletion/export implementation and audit state.
