# ZAKI Learn Parity Manifest

Last updated: 2026-05-07

This is the route-by-route execution baseline for ZAKI Learn. It maps each ZAKI route to upstream reference code, current ZAKI implementation, browser status, and next work.

## Browser Audit Summary

Audit target: `http://localhost:5173/learn?view=*`

| View | Browser Status | Verdict |
| --- | --- | --- |
| `chat` | Renders Chat shell, composer, tools, attachments, Space picker, save/download actions. Local WebSocket currently reports connection failure when backend/engine is unavailable. | UI shell present; backend/runtime verification needed. |
| `sources` / `knowledge` | Renders Knowledge Bases side list, empty detail, files/add/settings tabs. | Present; compare deeper against upstream `KnowledgePage.tsx`. |
| `books` / `book` | Renders book library first with header, stats, My library, empty state. `New book` opens creator with Configure inputs and Generate proposal. | Good current parity for library/creator shape; reader/action parity still needs full pass. |
| `writer` / `co-writer` | Renders Co-Writer header, title field, template/new buttons, empty draft state. | Present; compare against upstream document flow. |
| `review` / `questions` | Renders Question review with empty state. | Present but too thin; needs upstream question bank/category/follow-up parity pass. |
| `space` | Renders side nav for Chat History, Notebooks, Question Bank, Skills, Memory and notebook default content. | Present; compare each upstream space section. |
| `agents` / `tutorbot` | Renders TutorBot Agents tabs and create bot form. | Present; needs profile/channel/soul/history parity pass. |
| `workspaces` / `solve` / `vision` | Renders Solve and vision panel after route alias fix. | Present for solve/vision only; advanced workspace routing remains incomplete. |
| `research` | Not a first-class route yet. Available only as Chat capability/config path. | Gap. |
| `quiz` | Not a first-class route yet. Available only as Chat capability/config path and book quiz blocks. | Gap. |
| `visualize` | Not a first-class route yet. Available only as Chat capability/config path. | Gap. |
| `math-animator` / `math` | Not a first-class route yet. Available only as Chat capability/config path. | Gap. |

## Route Manifest

### Chat

- ZAKI routes: `/learn?view=chat`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/chat/[[...sessionId]]/page.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/chat/home/*`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx`
  - `src/lib/learningApi.ts`
- Must preserve:
  - unified WebSocket stream
  - tool/capability selection
  - file/image attachments
  - Space references
  - save-to-notebook
  - markdown download
  - session persistence
- Next work:
  - verify backend/engine runtime locally
  - compare event rendering against upstream `ChatMessages`
  - add direct capability entry state if named advanced routes are kept

### Sources / Knowledge

- ZAKI routes: `/learn?view=sources`, `/learn?view=knowledge`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/knowledge/KnowledgePage.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/knowledge/*`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx` (`SourcesPanel`)
  - `src/lib/learningApi.ts`
- Must preserve:
  - knowledge base list/detail
  - file upload
  - image/document upload where supported
  - folder upload via hosted-safe browser transport
  - archive upload with safe extraction
  - reindex/progress/settings
- Next work:
  - port missing upstream list/detail affordances
  - validate upload paths against hosted safety requirements

### Books / Lessons

- ZAKI routes: `/learn?view=books`, `/learn?view=book`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/book/page.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/book/components/*`
- ZAKI files:
  - `src/app/components/learning/LearningBookWorkspace.tsx`
  - `src/app/components/learning/LearningBookBlockContent.tsx`
  - `src/app/components/learning/learningBookCreatePayload.ts`
- Must preserve:
  - library
  - creator
  - proposal confirmation
  - spine editor
  - reader
  - progress WebSocket
  - block actions
  - page chat
  - quiz attempts
  - rebuild/supplement
- Current note:
  - Library and creator shape are currently aligned with upstream.
  - Interactive generated HTML remains governed by the hosted security policy.
- Next work:
  - full reader/block parity audit
  - verify unsafe HTML default remains safe

### Co-Writer

- ZAKI routes: `/learn?view=writer`, `/learn?view=co-writer`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/co-writer/page.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/co-writer/[docId]/page.tsx`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx` (`WriterPanel`)
- Must preserve:
  - document list
  - new draft
  - template flow
  - markdown editing
  - save/delete
  - stream/edit routes where available
- Next work:
  - compare upstream document detail flow
  - wire missing stream/edit affordances if backend supports them

### Review / Question Bank

- ZAKI routes: `/learn?view=review`, `/learn?view=questions`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/quiz/*`
  - `/Users/nova/Desktop/zaki-learning-engine/deeptutor/api/routers/question_notebook.py`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx` (`ReviewPanel`)
- Must preserve:
  - entries
  - categories
  - attempts
  - bookmarks
  - follow-up tutor panel
  - weak-area loops
- Current note:
  - Current ZAKI review surface is too thin.
- Next work:
  - port category and follow-up panel shape

### Space

- ZAKI routes: `/learn?view=space`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/space/*`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx` (`LearningSpacePanel`)
  - `src/app/components/learning/LearningSpacePickerModal.tsx`
- Must preserve:
  - chat history
  - books
  - notebooks
  - question bank
  - skills
  - memory
  - child-level source selection where available
- Next work:
  - compare every upstream section and patch missing controls

### TutorBot / Agents

- ZAKI routes: `/learn?view=agents`, `/learn?view=tutorbot`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/app/(workspace)/agents/page.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/deeptutor/api/routers/tutorbot.py` if present
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx` (`AgentsPanel`, `TutorAgentChatPanel`)
- Must preserve:
  - bots
  - profiles
  - channels
  - soul templates
  - agent history/chat
  - user-safe persona/channel settings
  - operator-managed provider routing
- Next work:
  - full upstream tab parity pass

### Advanced Workspaces

- ZAKI routes today:
  - `/learn?view=workspaces`
  - `/learn?view=solve`
  - `/learn?view=vision`
- Missing named aliases:
  - `/learn?view=research`
  - `/learn?view=quiz`
  - `/learn?view=visualize`
  - `/learn?view=math-animator`
- Upstream reference:
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/research/ResearchConfigPanel.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/quiz/QuizConfigPanel.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/visualize/VisualizeConfigPanel.tsx`
  - `/Users/nova/Desktop/zaki-learning-engine/web/components/math-animator/MathAnimatorConfigPanel.tsx`
- ZAKI files:
  - `src/app/components/learning/LearningPage.tsx`
- Must preserve:
  - deep research
  - quiz generation
  - deep solve
  - visualization
  - math animation
  - document/image inputs
  - operator-controlled external dependencies
- Next work:
  - decide whether these are named routes or Chat capability deep-links
  - if named routes, add route state that opens the correct upstream-shaped config panel

## Execution Order

1. Sources/Knowledge
2. Space
3. TutorBot
4. Co-Writer
5. Review/Question Bank
6. Advanced workspaces
7. Books reader/block action audit
8. Chat runtime/event parity

This order prioritizes visible mismatches and thin surfaces before already-aligned Books library work.
