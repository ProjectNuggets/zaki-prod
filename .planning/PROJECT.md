# ZAKI Learn DeepTutor Parity

Last updated: 2026-05-07

## Source Of Truth

- Product and security spec: `docs/zaki-learning-integration-spec.md`
- Upstream implementation reference: `/Users/nova/Desktop/zaki-learning-engine`
- ZAKI production repo: `/Users/nova/Desktop/zaki-prod`
- Learning engine downstream service: `ProjectNuggets/zaki-learning-engine`

## Goal

Make ZAKI Learn a hosted, multi-user, production-safe learning product with all learning-relevant upstream capabilities available through ZAKI-owned surfaces.

The integration must adapt DeepTutor capabilities into ZAKI without exposing DeepTutor branding, direct engine APIs, internal service tokens, raw provider settings, or local-server filesystem linking.

## Non-Negotiables

- Browser clients only call ZAKI backend `/api/learning/*`.
- Browser clients never receive or send `X-Internal-Token`.
- ZAKI central auth is the only browser-facing auth path.
- ZAKI backend derives the canonical user id and injects `X-Zaki-User-Id`.
- Learning data remains tenant-scoped by authenticated ZAKI user id.
- Raw provider/model/API-key/base-url settings are operator-managed only.
- Hosted production does not expose arbitrary server-local folder paths.
- All upstream learning-relevant modules become ZAKI offerings, even if they overlap existing ZAKI features.
- UI should port/adapt the upstream DeepTutor shape inside the ZAKI shell; do not invent dashboard wrappers around upstream surfaces.
- No user-facing production copy mentions DeepTutor.

## Hosted Adaptation Rules

Local DeepTutor can assume a trusted local machine. Hosted ZAKI cannot.

Allowed hosted source transports:

- browser file upload
- image upload
- mixed document/image attachments
- browser folder upload where supported
- drag-and-drop folder upload where supported
- zipped folder upload with safe extraction
- connector-backed folder linking in V1.1, starting with Google Drive if approved

Disallowed hosted transport:

- arbitrary server-local filesystem path linking exposed to normal users

## Current Code Truth

Frontend:

- `src/routes.tsx`
- `src/stores/navigationStore.ts`
- `src/lib/api.ts`
- `src/lib/learningApi.ts`
- `src/app/components/learning/LearningPage.tsx`
- `src/app/components/learning/LearningBookWorkspace.tsx`
- `src/app/components/learning/LearningBookBlockContent.tsx`
- `src/app/components/learning/LearningSpacePickerModal.tsx`

Backend:

- `backend/src/index.js`
- `backend/src/require-auth-user.js`
- `backend/src/learning-client.js`
- `backend/src/learning-bff-contract.js`
- `backend/src/learning-quota.js`
- `backend/src/learning-upload-limits.js`
- `backend/src/learning-ws-policy.js`

Upstream reference:

- `web/app/(workspace)/chat/[[...sessionId]]/page.tsx`
- `web/app/(workspace)/book/page.tsx`
- `web/app/(workspace)/book/components/*`
- `web/components/knowledge/KnowledgePage.tsx`
- `web/app/(workspace)/co-writer/page.tsx`
- `web/app/(workspace)/agents/page.tsx`
- `web/components/space/*`
- `web/components/research/ResearchConfigPanel.tsx`
- `web/components/visualize/VisualizeConfigPanel.tsx`
- `web/components/math-animator/MathAnimatorConfigPanel.tsx`

## Operating Model

GSD drives this work page by page and capability by capability:

1. Compare ZAKI route against upstream reference.
2. Record exact parity gaps.
3. Patch only the affected surface and BFF contract.
4. Validate with typecheck, targeted tests, browser verification, and code review.
5. Commit locally only.

## Definition Of Done

ZAKI Learn is ready when:

- every upstream learning-relevant capability is reachable in ZAKI
- every capability is tenant-safe and auth-gated
- every mutating route strips or rejects operator-managed fields
- uploads are size/type bounded even with chunked transfer
- WebSockets consume quota only on real mutating/prompt messages
- generated/LLM HTML cannot run arbitrary scripts by default
- retention/export/delete/backup behavior is implemented or explicitly gated
- route-level browser verification confirms UI parity against upstream shape
- contract tests cover BFF trust boundaries
- no direct learning-engine browser URL remains
