# 03-03 Summary: Quiz, Review, Question Bank, Weak-Area Loop Parity

## Outcome

Completed the question-bank and quiz review parity slice for ZAKI Learn.

## Changes

- Replaced the remaining generic review list with an upstream-shaped Question Bank panel on both `/learn?view=review` and the Space `Question Bank` section.
- Added category manager parity: list, create, rename, delete, category filter chips, and category counts through the ZAKI learning gateway.
- Added question entry actions: bookmark toggle, delete, active-category removal, wrong-only filtering, and detail opening.
- Rendered question content, options, user answer, reference answer, explanation, original session label, category chips, and created timestamp in the upstream review style.
- Added ZAKI API client methods for question entry update/delete, category add/remove, and category CRUD.
- Aligned the question-bank list size with upstream's 200-entry page.

## Verification

- `npm run typecheck`
- `npm test -- --runTestsByPath src/app/components/learning/LearningBookBlockContent.test.tsx src/lib/api.test.ts src/app/components/learning/learningBookCreatePayload.test.ts src/app/components/learning/learningSpaceReferences.test.ts src/app/components/learning/learningBookProgress.test.ts`
- `git diff --check`
- Browser check with local frontend, ZAKI backend, and learning engine:
  - `/learn?view=space` opens the Space page and the Question Bank section renders Manage Categories, All, Bookmarked, Wrong Only, total count, and empty state.
  - Created a temporary category through the visible UI and verified the category manager count/filter chip updated.
  - Deleted the temporary category and verified the category manager returned to zero categories.
  - `/learn?view=review` renders the same Question Bank controls directly instead of crashing on the removed generic ReviewPanel.
  - `/learn?view=quiz` renders the Quiz Generation chat capability with Custom/Mimic Paper settings, count, difficulty, type, and preference controls.

## Caveats

- Live quiz generation still depends on the operator-managed local model route. The local route can render the workflow, but generation quality and completed question-entry persistence need a working provider configuration.
- Empty local data means bookmark/delete/category-removal actions on existing question entries were code-path verified and typechecked, but need a populated question-bank fixture for full browser exercise.

## Next

Proceed to `03-04 Notebooks and save/export flows`.
