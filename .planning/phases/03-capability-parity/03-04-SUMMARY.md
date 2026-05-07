# 03-04 Summary: Notebooks And Save/Export Flows

## Status

Complete.

## Delivered

- Notebook create/list/detail flows are covered through the ZAKI Learn notebook view.
- Chat, Co-Writer, and TutorBot saved-output paths already write notebook records through the ZAKI BFF manual record route.
- Notebook detail now supports whole-notebook Markdown export and per-record Markdown export.
- Export formatting is isolated in a tested helper so the large Learn page does not own Markdown construction logic.
- Browser E2E now verifies primary Learn surfaces, TutorBot channels including Slack, notebook export, notebook creation, mocked chat turn generation, and saving a chat transcript into a newly created notebook.

## Verification

- `npm run typecheck`
- `npm test -- --runTestsByPath src/app/components/learning/learningNotebookExport.test.ts`
- `npm run test:e2e -- --project=chromium-desktop e2e/learning-parity.spec.ts`

## Notes

- Hosted SaaS constraints are preserved: no local folder linking, no operator provider settings in user payloads, and notebook save/export remains scoped to authenticated ZAKI Learn BFF routes.
- Production-wide account export, retention, deletion audit, and backup/recovery remain Phase 04 governance work, not notebook UI parity work.
