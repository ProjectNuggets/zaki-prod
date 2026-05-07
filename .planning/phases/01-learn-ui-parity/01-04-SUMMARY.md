# 01-04 Summary: Space UI Parity

## Completed

- Kept the upstream Space mini-nav shape inside ZAKI Learn.
- Changed Space default section to Chat History, matching upstream `/space` redirect behavior.
- Added Chat History search and refresh controls.
- Added Question Bank filters for all, bookmarked, and wrong-only views.
- Expanded Memory to match upstream section shape:
  - Summary/Profile tabs
  - edit/preview toggle
  - updated metadata line
  - Save, Refresh, and Clear actions
  - markdown preview
- Expanded Skills to match upstream user-managed behavior:
  - create skill
  - edit skill
  - delete skill
  - comma-separated tags
  - operator-managed provider/model routing note
- Added BFF client calls for memory refresh/clear and skill create/detail/update/delete.

## Verification

- `npm run typecheck`
- `npm test -- --runTestsByPath src/lib/api.test.ts src/app/components/learning/learningBookCreatePayload.test.ts`
- `git diff --check`
- Browser: `/learn?view=space` renders Chat History by default.
- Browser: Memory section renders Summary/Profile tabs, edit/preview, Save, Refresh, Clear.
- Browser: Skills section renders empty state plus create/edit form controls.

## Residual

- Notebook record inspector and Question Bank category manager still need a deeper upstream port. ZAKI has the BFF route truth for these, but the current Space pass focused on high-signal upstream section parity without changing existing notebook/review behavior.

## Next

Execute 01-05: TutorBot management and chat surfaces.
