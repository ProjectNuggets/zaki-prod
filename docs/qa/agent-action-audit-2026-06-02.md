# Agent Action Audit - 2026-06-02

Owner: Codex orchestrator  
Surface: `/agent`  
Account: `alaasuccar@gmail.com` local test account  
Frontend: `http://localhost:5173`  
BFF: `http://localhost:8787`  

## Purpose

Map and test the visible ZAKI Agent controls as a QA user. The bar is not "the
button exists"; the bar is:

1. The action has an obvious intended outcome.
2. The button is reachable on desktop and mobile where applicable.
3. The BFF/downstream route works when the action is production-facing.
4. Failure or unavailable states are visible and user-safe.
5. The behavior is suitable for a repeatable release E2E test.

This audit used source inventory plus live Playwright interaction. Destructive
actions such as delete/revoke were tested only to the confirmation boundary
unless a disposable artifact/thread was created by the audit.

## Generated Evidence

Structured reports:

- `/tmp/zaki-agent-live-audit.json`
- `/tmp/zaki-agent-right-panel-scoped-audit.json`
- `/tmp/zaki-agent-mobile-focused-audit.json`
- `/tmp/zaki-agent-artifact-export-audit.json`
- `/tmp/zaki-agent-pptx-ui-audit.json`
- `/tmp/zaki-agent-approval-flow-audit.json`
- `/tmp/zaki-agent-approved-session-artifact-audit.json`

Screenshots:

- `/tmp/zaki-agent-audit-desktop-initial.png`
- `/tmp/zaki-agent-audit-desktop-final.png`
- `/tmp/zaki-agent-audit-artifact-canvas-scoped.png`
- `/tmp/zaki-agent-pptx-ui-audit.png`
- `/tmp/zaki-agent-audit-right-panel-scoped-final.png`
- `/tmp/zaki-agent-audit-mobile-initial.png`
- `/tmp/zaki-agent-audit-mobile-panel.png`
- `/tmp/zaki-agent-mobile-schedule-after-fixed-position.png`
- `/tmp/zaki-agent-audit-approval-flow.png`
- `/tmp/zaki-agent-audit-approved-session-artifact.png`

## Summary

Current status: strong enough to continue hardening, not final S-tier yet.

Passed live:

- Authenticated `/agent` load.
- Route stays in app for Agent navigation.
- Desktop right rail tabs: Plan, Cron, Sources, Artifacts, Browser, Trace.
- Mobile inspector sheet opens and all six tabs switch.
- Composer mode, reasoning, and autonomy controls cycle and persist without UI
  errors.
- Context meter no longer shows a false exact `100%`; it reports unknown/fallback
  honestly in the tested state.
- Desktop session row select works; rename/delete work when the row is hovered.
- Artifact row opens a separate right-side canvas beside the conversation.
- Artifact canvas exports and downloads HTML, DOCX, PDF, and PPTX through the
  ZAKI BFF.
- Supervised approval card appears for a disposable artifact-create run.
- Approval submit completes; BFF session detail reports no pending approvals.
- Created artifact exists in `/api/agent/artifacts` and appears when the owning
  session is selected.
- Browser tab shows the app-browser and extension lanes.
- Manage extension devices routes to Settings.

Fixed during audit:

- Mobile composer `+` menu was visually open, but the scroll lane intercepted
  taps on `Schedule a follow-up`. Fixed in `src/styles/v2.css` by making the
  Agent composer menu fixed-position on mobile and raising the composer stack.
  Retested: schedule workflow opens on mobile.

Still open:

- Trace tab can render, but the tested account had no durable trace rows for the
  active scoped session. This needs a deterministic trace fixture in release E2E.
- Cron create/edit/delete/run were only tested to tab/surface visibility and the
  composer schedule workflow. Full mutation coverage needs disposable schedule
  fixtures and cleanup.
- Task stop/detail and extension live commands need deterministic backend or
  mocked-live fixtures.
- Share/revoke flows for artifacts/traces should be added to E2E with cleanup.

## Action Matrix

| Area | Control | Intended outcome | Live result | Release E2E status |
|---|---|---|---|---|
| Navigation | Product rail Agent | Opens `/agent` inside app | Pass | Add route assertion |
| Navigation | Dashboard/Chat/Brain links | Route in app, not marketing | Pass from DOM/path smoke | Add direct click assertions |
| Header | Focus | Toggles focus execution layout | Visible, not deeply tested | Add visual/layout assertion |
| Header | Panel | Hides/shows right rail | Pass desktop | Add desktop and mobile assertions |
| Header | Stage/account/search | Open stage/account/search surfaces | Visible, not deeply tested | Add non-destructive open/close tests |
| Session rail | Search | Filters sessions and reset state | Pass desktop | Add regression test |
| Session rail | Select session | Activates session and URL thread key | Pass | Add direct route + click test |
| Session rail | Rename | Inline rename on hovered row | Pass with hover | Add hover-before-click E2E |
| Session rail | Delete | Inline compact confirmation, no share/download | Pass with hover to confirmation boundary | Add cancel + disposable confirm test |
| Session rail | New thread | Creates/selects disposable thread | Pass in approval flow | Add fixture cleanup |
| Composer | `+` menu | Opens upload/schedule/pin menu | Pass desktop/mobile | Add mobile regression |
| Composer | Upload | Opens file picker/attachment path | Control visible; no file fixture in this audit | Add file upload fixture |
| Composer | Schedule | Opens schedule workflow | Pass desktop; fixed and pass mobile | Add schedule create/cancel test |
| Composer | Pin context | Opens brain context picker when available | Control visible | Add memory fixture |
| Composer | Mode | Cycles plan/review/execute and persists | Pass | Add BFF request assertion |
| Composer | Reasoning | Cycles reasoning effort and persists | Pass | Add BFF request assertion |
| Composer | Autonomy | Cycles read-only/supervised/full and persists | Pass | Add BFF request assertion |
| Composer | Context meter | Shows truthful pressure/source | Pass in unknown/fallback state | Add live-context fixture |
| Composer | Send | Sends run when non-empty; empty is guarded | Pass in approval flow | Add stream assertions |
| Approval | Approval card | Appears for supervised mutating action | Pass | Add canonical approval-id assertion |
| Approval | Approve | Submits and resumes action | Pass | Add network assertion and final artifact assertion |
| Approval | Deny | Denies action safely | Not executed | Add disposable denied-action test |
| Chat lane | Message actions | Read aloud/copy/regenerate/good/angle | Visible; not deeply tested | Add copy/regenerate smoke |
| Chat lane | Quick replies | Go deeper/try another angle/save to brain | Visible; not deeply tested | Add non-destructive action tests |
| Plan tab | Tasks/jobs/approval/narration | Execution cockpit | Tab pass; fixture coverage pending | Add task/job fixtures |
| Cron tab | Schedule list/form | Create/edit/pause/delete/run schedules | Tab pass; create form visible through schedule path | Add disposable cron lifecycle |
| Sources tab | Sources/audit trail | Shows real memory/web/file/context evidence | Tab pass; source fixture pending | Add source event fixture |
| Artifacts tab | Artifact rows | Shows active or recent artifacts | Pass | Add active-session artifact assertion |
| Artifacts tab | Open | Opens right-side artifact canvas | Pass | Add visual/canvas assertion |
| Artifacts tab | Export/download | Downloads supported formats via BFF | Pass for HTML, DOCX, PDF, PPTX | Add Playwright download assertions |
| Artifacts tab | Share/copy | Share/copy artifact link | Visible; not executed | Add share + revoke cleanup |
| Artifact canvas | Versions strip | Shows versions above artifact body | Pass | Add canvas layout assertion |
| Artifact canvas | Diff | Compares versions | Visible; not executed | Add version fixture |
| Artifact canvas | Edit/save | Updates text/markdown artifact | Visible; not executed | Add editable artifact fixture |
| Browser tab | App browser lane | Explains agent-owned browser lane | Pass | Add copy/status assertion |
| Browser tab | Extension lane | Shows paired/disconnected state | Pass for state display | Add paired extension/mock E2E |
| Browser tab | Manage devices | Routes to Settings devices section | Pass | Add route assertion |
| Trace tab | Trace ledger | Shows durable/live trace rows or empty state | Empty in tested scoped session | Add trace fixture |
| Trace tab | Detail/share/revoke | Opens/shares/revokes trace | Not executed | Add trace lifecycle fixture |
| Mobile | Inspector opener | Opens bottom inspector sheet | Pass | Add mobile E2E |
| Mobile | Six tabs | Switch Plan/Cron/Sources/Artifacts/Browser/Trace | Pass | Add mobile tab E2E |
| Mobile | Composer schedule | Opens schedule workflow | Fixed and pass | Keep regression |

## Findings

### P0/P1 Launch Blockers

None found after the mobile composer menu fix for the flows that were fully
exercised live.

### P1 Release E2E Gaps

1. Cron lifecycle is not yet proven end to end.
   - Need create, edit, pause/resume, run, delete with disposable schedule.

2. Trace lifecycle is not yet proven end to end.
   - Need deterministic trace creation, detail, share, open, revoke.

3. Extension live commands are not yet proven from the app.
   - Need real paired extension or structurally equivalent mock for navigate,
     click, type, screenshot, get DOM, and get text.

4. Task stop/detail is not yet proven with a live running task fixture.
   - Need backend fixture or controlled long-running task.

5. Artifact version/diff/edit is not yet fully proven.
   - Export/download passed, but version compare and text update need dedicated
     fixtures.

### P2 Polish / Test Discipline

1. Session row action tests must hover the row before clicking rename/delete.
   - The controls are intentionally hover-gated on desktop. E2E should model the
     user interaction instead of clicking hidden opacity-zero controls.

2. Approval artifact test should assert against the owning session.
   - The artifact appears under the disposable thread, not `Main`. Tests must
     select the owning session before checking the Artifacts tab.

3. Existing `e2e/v2-production-ui.spec.ts` is still mostly mocked smoke.
   - It is useful for route visibility, but it does not prove live Agent action
     wiring.

## Next Release E2E Build

Create `e2e/agent-actions-live.spec.ts` with these groups:

1. `agent shell and navigation`
   - Sign in through the BFF.
   - Load `/agent`.
   - Assert product rail in-app routes.
   - Toggle focus and panel.

2. `session rail`
   - Create disposable thread.
   - Select thread and assert `?thread=`.
   - Hover row, rename, assert inline state.
   - Hover row, delete, cancel.
   - Confirm delete only for disposable fixture.

3. `composer controls`
   - Cycle mode/reasoning/autonomy.
   - Assert BFF setting/mode calls.
   - Open `+` menu on desktop and mobile.
   - Upload a small fixture file.
   - Open schedule workflow and cancel.
   - Open pin-context picker when a memory fixture exists.

4. `approval and artifacts`
   - Use supervised mode.
   - Ask for a tiny markdown artifact.
   - Wait for approval card.
   - Assert canonical approval id if surfaced in DOM/network.
   - Approve.
   - Select owning session.
   - Assert artifact row.
   - Open canvas.
   - Export/download HTML, DOCX, PDF, PPTX.
   - Share/copy/revoke where available.

5. `cron`
   - Create disposable schedule.
   - Edit prompt/name/time.
   - Pause/resume.
   - Run now if route supports it.
   - Delete and assert removal.

6. `trace and sources`
   - Generate deterministic trace/source events.
   - Open Trace detail.
   - Share/revoke trace.
   - Assert Sources only shows real emitted sources/events.

7. `browser and extension`
   - Assert app-browser lane state.
   - Route to Settings devices.
   - With mock or paired extension: navigate, click, type, screenshot, get DOM,
     get text.
   - Assert disconnected-extension error state.

8. `mobile`
   - Open inspector sheet.
   - Switch all six tabs.
   - Open `+` menu.
   - Open schedule workflow.
   - Open artifact canvas full/right-side mobile behavior as currently designed.

## Commands Run

Live audit scripts:

```bash
node <inline Playwright desktop/mobile audit>
node <inline Playwright scoped right-panel audit>
node <inline Playwright mobile focused audit>
node <inline Playwright artifact export audit>
node <inline Playwright approval flow audit>
node <inline Playwright approved-session artifact audit>
```

Verification after the CSS fix:

```bash
npm test -- --runTestsByPath src/app/components/ChatArea.test.tsx src/app/components/agent/AgentArtifactCanvas.test.tsx src/app/components/agent/AgentSessionRail.test.tsx --runInBand
npm run typecheck
npm run build
git diff --check
```

Results:

- Focused Jest: 3 suites passed, 45 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed. Vite emitted the existing large-bundle warning.
- PPTX live UI audit: passed. Right-panel PPTX download produced
  `/tmp/zaki-agent-live-pptx-1780413446826-Approval_Reload_Proof_1780319121998.pptx`
  at 74,567 bytes; canvas exposes `Export PPTX`.
- `git diff --check`: clean.
