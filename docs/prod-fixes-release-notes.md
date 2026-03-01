# ZAKI `prod-fixes` Release Notes

## Summary
`prod-fixes` hardens the core ZAKI app around trust, responsiveness, memory transparency, and real workspace knowledge management.

This branch is not a feature-expansion branch. It is a production-hardening branch.

## Included Changes

### 1. Chat trust and stability
1. Improved stream behavior so first-token response starts faster.
2. Added stronger identity guardrails.
3. Intercepts direct identity probes so ZAKI does not self-identify as Claude, ChatGPT, OpenAI, or Anthropic.

### 2. Memory hardening
1. Tightened memory extraction and normalization.
2. Reduced noisy or overlapping memory candidates.
3. Improved direct factual recall and introspection-style memory handling.
4. Reduced irrelevant memory injection into generic work prompts.

### 3. Workspace instructions
1. Workspace instructions are now a real backend-backed product capability.
2. ZAKI uses TYP workspace prompt state instead of depending on a fragile proxy path.

### 4. Workspace document lifecycle
1. Added explicit workspace upload route.
2. Added explicit workspace upload-and-embed route.
3. Added explicit workspace document removal route.
4. Added supported-file-type endpoint passthrough.
5. Added file lifecycle states in frontend:
- `processing`
- `embedded`
- `failed`

### 5. Attachment UX truthfulness
1. Chat no longer implies that arbitrary file attachments become thread-grounded knowledge.
2. Users are guided toward workspace uploads for real document grounding.

## Product Contract After This Branch

### Memory
1. user-scoped
2. transparent
3. persistent

### Workspace files
1. shared across the workspace
2. embedded into workspace knowledge
3. removable

### Chat attachments
1. not treated as thread knowledge in this release
2. not marketed as thread-grounded context

## Backend Routes Added / Standardized
1. `GET /workspace/:slug`
2. `POST /workspace/:slug/update`
3. `POST /workspace/:slug/thread/new`
4. `POST /workspace/:slug/thread/:threadSlug/update`
5. `DELETE /workspace/:slug/thread/:threadSlug`
6. `POST /workspace/:slug/upload`
7. `POST /workspace/:slug/upload-and-embed`
8. `POST /workspace/:slug/documents/remove`
9. `GET /api/documents/accepted-file-types`

## Validation Performed
1. frontend typecheck
2. backend lint
3. live local login
4. workspace upload-and-embed smoke
5. workspace remove smoke
6. chat stream smoke
7. memory introspection and factual recall smoke

## Known Limitations
1. Thread-document grounding is not shipped.
2. Memory quality is improved but not final for every compound natural-language case.
3. Some workspace management UX still lives in the sidebar settings surface rather than a fully dedicated workspace management page.
