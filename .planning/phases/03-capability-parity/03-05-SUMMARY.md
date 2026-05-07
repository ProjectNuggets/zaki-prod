# 03-05 Summary: Advanced Capability Parity

## Completed

- Verified `/learn?view=solve`, `/learn?view=research`, `/learn?view=visualize`, and `/learn?view=math-animation` route into the shared ZAKI Learn chat surface with the expected downstream capability names.
- Added E2E coverage for hosted capability configs:
  - `deep_solve`
  - `deep_research` with report/quick/source config
  - `visualize` with Mermaid render config
  - `math_animator` with image/high-quality/style config
- Added hosted-safe advanced result rendering for:
  - research outlines
  - visualization responses and source code
  - math animation image/video artifacts and source code
- Preserved advanced results in Markdown downloads so exported transcripts include rendered research, visualization, and math artifact data.

## Verification

- `npm run typecheck`
- `npm test -- --runTestsByPath src/app/components/learning/learningNotebookExport.test.ts`
- `npm run test:e2e -- --project=chromium-desktop e2e/learning-parity.spec.ts`

## Notes

- Raw executable HTML/SVG/script rendering remains blocked by default for hosted production.
- Advanced artifacts render only through safe URL handling and do not execute generated code in the ZAKI origin.
- DeepTutor branding remains absent from the ZAKI production UI.
