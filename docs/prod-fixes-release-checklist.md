# ZAKI `prod-fixes` Release Checklist

## Summary
This checklist is the release gate for the `prod-fixes` branch.

The scope of this branch is:

1. chat trust and response stability
2. memory quality hardening
3. workspace instructions as real prompt state
4. workspace document lifecycle
5. honest attachment UX

Out of scope:

1. website/landing work
2. native/mobile app work
3. speculative thread-document grounding

## Required Checks

### 1. Repo state
1. `git status` is clean.
2. Only `prod-fixes` scope is included.
3. Known limitations are documented before merge.

### 2. Frontend validation
1. Run:
```bash
npm run typecheck
```
2. Expected result:
- exit code `0`

### 3. Backend validation
1. Run:
```bash
npm --prefix backend run lint
```
2. Expected result:
- exit code `0`

### 4. Workspace instructions smoke
1. Edit a workspace instruction to:
- `Reply in one short paragraph.`
2. Reload the workspace.
3. Send a new prompt in that workspace.
4. Expected result:
- instruction persists
- reply style reflects the saved instruction

### 5. Workspace document upload smoke
1. Upload a supported file type, for example:
- `.txt`
2. Expected result:
- file enters `processing`
- file lands in `embedded`
- file appears in workspace file list after reload

### 6. Workspace unsupported file smoke
1. Attempt to upload an unsupported file type, for example:
- `.exe`
2. Expected result:
- user sees a clear error
- file is not treated as embedded
- failure state is visible in the UI

### 7. Workspace document removal smoke
1. Remove an embedded workspace file.
2. Expected result:
- file disappears from the workspace file list
- reload confirms it is gone

### 8. Chat trust smoke
Ask:
1. `what are you?`
2. `are you Claude?`
3. `what company are you from?`

Expected result:
1. response identifies as ZAKI
2. no Claude / ChatGPT / OpenAI / Anthropic leakage

### 9. Chat speed/stability smoke
Ask:
1. `how are you?`
2. `can you suggest cities to travel to in winter?`

Expected result:
1. response starts quickly
2. no backend crash
3. no fetch-failed path

### 10. Memory recall smoke
Store:
1. `I live in Hamburg`
2. `I am from Damascus`
3. `I prefer concise replies`

Ask:
1. `where do I live?`
2. `where am I from?`
3. `what do you know about me?`

Expected result:
1. facts are recalled correctly
2. no noisy duplicate memory wording
3. answers are transparent and direct

### 11. Generic prompt memory guard smoke
Ask:
1. `Help me write a concise work email asking for feedback on a document.`

Expected result:
1. no irrelevant travel/location memory leakage

### 12. Attachment UX smoke
1. Try to use file upload from chat input.

Expected result:
1. user is guided toward workspace upload
2. chat does not imply that thread files become knowledge

## Known Limitations

1. Thread-scoped document grounding is not implemented in this release.
2. Memory quality is improved, but still evolving for complex conversational inputs.
3. Workspace file management is currently centered in the sidebar space settings flow.

## Merge Gate
Merge only when:

1. all required checks above pass
2. known limitations are accepted explicitly
3. `prod-fixes` is clean and reviewable
