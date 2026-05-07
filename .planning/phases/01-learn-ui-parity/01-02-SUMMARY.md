# 01-02 Summary: Sources / Knowledge UI Parity

Status: complete
Date: 2026-05-07

## Completed

- Compared ZAKI `SourcesPanel` against upstream Knowledge page structure.
- Added the missing upstream `Index versions` tab.
- Added knowledge-base status metadata in the detail header.
- Added reindex and delete actions in user-safe settings/actions areas.
- Added archive upload affordance using the hosted BFF `upload-archive` route.
- Preserved browser folder upload and patched upload helpers to keep `webkitRelativePath` filenames instead of flattening folder selections.
- Added hosted-safety copy clarifying that server-local folder paths are not exposed in ZAKI production.

## Browser Verification

- `/learn?view=sources` renders:
  - Knowledge Bases side list
  - Files tab
  - Add documents tab
  - Index versions tab
  - Settings tab
- `/learn?view=knowledge` renders the same surface.
- Add documents tab renders:
  - Pick files
  - Upload folder
  - Pick archive
  - hosted safety note

## Tests

- `npm run typecheck` passed.
- `npm test -- --runTestsByPath src/lib/api.test.ts src/app/components/learning/learningBookCreatePayload.test.ts` passed.

## Notes

- Current local data set has no knowledge bases, so selected-KB detail actions were verified by DOM/code review rather than a live populated KB.
- Backend chunked upload byte limiting was already present through `proxyLearningRawRequest` and `createLearningByteLimitedStream`.

## Next

Execute 01-03: Co-Writer page shape.
