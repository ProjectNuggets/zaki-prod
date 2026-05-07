# Phase 01 Context: Learn UI Parity And Route Truth

## Objective

Make ZAKI Learn visible surfaces match upstream DeepTutor surface shapes inside the ZAKI shell. This phase is about route truth, page shape, interaction flow, and wiring gaps. It is not a redesign phase.

## Upstream References

- Chat: `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/chat/[[...sessionId]]/page.tsx`
- Books: `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/book/page.tsx`
- Book components: `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/book/components`
- Knowledge: `/Users/nova/Desktop/zaki-learning-engine/web/components/knowledge/KnowledgePage.tsx`
- Co-Writer: `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/co-writer/page.tsx`
- Space: `/Users/nova/Desktop/zaki-learning-engine/web/components/space`
- TutorBot: `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/agents/page.tsx`
- Research: `/Users/nova/Desktop/zaki-learning-engine/web/components/research/ResearchConfigPanel.tsx`
- Visualize: `/Users/nova/Desktop/zaki-learning-engine/web/components/visualize/VisualizeConfigPanel.tsx`
- Math Animator: `/Users/nova/Desktop/zaki-learning-engine/web/components/math-animator/MathAnimatorConfigPanel.tsx`

## ZAKI Files

- `src/app/components/learning/LearningPage.tsx`
- `src/app/components/learning/LearningBookWorkspace.tsx`
- `src/app/components/learning/LearningBookBlockContent.tsx`
- `src/app/components/learning/LearningSpacePickerModal.tsx`
- `src/lib/learningApi.ts`
- `src/routes.tsx`

## Decisions

- D-01: The four always-on ZAKI categories remain untouched; Learn-specific navigation lives under the divider when Learn is selected.
- D-02: Books library is the default books surface. Creator appears only after `New book`.
- D-03: If upstream has a surface, port/adapt that surface. Do not replace it with summary cards.
- D-04: Advanced tools can be routed as named ZAKI surfaces, but their UI should use upstream config panels and chat/workspace behavior.
- D-05: Hosted file/folder UX must use browser upload/folder/archive/connector patterns, never server path linking.

## Validation

- `npm run typecheck`
- Browser snapshots for `/learn?view=chat`, `sources`, `books`, `writer`, `review`, `space`, `agents`, `workspaces`, plus named advanced aliases once added.
- Code review against `docs/zaki-learning-integration-spec.md`.
