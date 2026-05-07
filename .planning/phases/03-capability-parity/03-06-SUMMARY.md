# 03-06 Summary: Source Upload, Images, Folders, Archives

## Completed

- Added ZAKI API support for the learning engine upload policy and explicit browser-folder upload route.
- Updated the ZAKI source panel to:
  - use the engine-supported upload policy,
  - validate unsupported and oversized selections,
  - preserve browser folder relative filenames,
  - route folder uploads through `/upload-folder`,
  - route archive uploads through `/upload-archive`.
- Updated the learning engine to:
  - include image extensions in knowledge source support,
  - route images as KB source material without changing chat multimodal image behavior,
  - safely expand uploaded archives with path traversal, member count, per-member size, and extracted-size controls.
- Added E2E coverage for source create, normal file upload, browser folder upload, and archive upload routing.

## Verification

- ZAKI:
  - `npm run typecheck`
  - `npm test -- --runTestsByPath src/lib/learningApi.test.ts src/app/components/learning/learningNotebookExport.test.ts`
  - `npm run test:e2e -- --project=chromium-desktop e2e/learning-parity.spec.ts`
- Learning engine:
  - `.venv/bin/python -m pytest tests/services/rag/test_file_routing.py tests/services/rag/test_llamaindex_document_loader.py tests/api/test_knowledge_router.py tests/utils/test_document_extractor.py`

## Notes

- Hosted ZAKI still intentionally excludes server-local linked folders.
- Cloud folder connectors remain a V1.1 product surface, using the same relative-path/source ingestion seams.
