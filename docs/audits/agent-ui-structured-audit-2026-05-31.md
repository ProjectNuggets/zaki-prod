# ZAKI Agent UI Structured Audit - 2026-05-31

## Scope

Surface audited: `/agent` in the local ZAKI production app.

Local stack used:
- ZAKI app: `http://localhost:5173`
- ZAKI BFF: `http://localhost:8787`
- Nullalis gateway: `http://127.0.0.1:3000`
- Test account: local test user already provided in this thread

Evidence files:
- Desktop screenshot: `/tmp/zaki-agent-audit-desktop-live-3.png`
- Mobile screenshot: `/tmp/zaki-agent-audit-mobile-live.png`
- Artifact manager screenshot: `/tmp/zaki-agent-artifact-manager.png`
- Button/input inventory: `/tmp/zaki-agent-button-map.json`
- Structured audit output: `/tmp/zaki-agent-structured-audit-3.json`

## Code Review Findings

### Fixed - artifact download URL trust boundary

`normalizeAgentExportDownloadUrl` previously allowed arbitrary non-upstream absolute URLs to pass through. That violated the production rule that generated downloads must flow through the ZAKI BFF bridge.

Fix:
- Only `/api/v1/users/:id/exports/:filename` upstream paths are rewritten.
- Only `/api/agent/exports/:filename` BFF paths are accepted.
- Arbitrary URLs such as `https://download.local/artifact.pdf` and plain `report.pdf` now return `null`.

### Fixed - export download BFF async failure path

`GET /api/agent/exports/:filename` now catches proxy failures and returns a named `503` JSON error instead of relying on uncaught async behavior.

Fix:
- Filename remains traversal guarded.
- Successful responses stream the upstream binary body and preserve content type.
- Missing content disposition receives an attachment filename.

### Fixed - artifact share links copied raw Nullalis paths

The right panel could share an artifact and then copy `/api/v1/share/artifact/:code`. From the app origin this is not a stable ZAKI public route.

Fix:
- Frontend normalizes artifact share URLs to `/api/agent/share/artifact/:code`.
- BFF adds `GET /api/agent/share/artifact/:shareCode`.
- BFF also adds `GET /api/agent/share/trace/:shareCode` for the equivalent trace-share case.
- Share codes are bounded and pattern-validated before proxying.

Verification:
- Copied artifact link after the fix: `/api/agent/share/artifact/ggzkgshc666884rr`
- `curl http://localhost:8787/api/agent/share/artifact/ggzkgshc666884rr` returned HTTP 200 and shared artifact JSON.

## Button And Feature Map

### Product Rail

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| ZAKI mark / Dashboard | Route to command-center dashboard | Pass |
| Agent | Route to `/agent` in-app, never marketing website | Pass |
| Chat | Route to Chat/Spaces surface | Pass as app-local `/spaces`; naming remains Chat/Spaces |
| Brain | Route to `/brain` | Pass |
| Learn | Private beta gate, disabled for normal users | Pass |
| Hire | Private beta gate, disabled for normal users | Pass |
| Design | Waitlist/early access gate unless enabled | Pass |
| Settings | Route to `/settings` | Pass |

### Topbar And Status Strip

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| Command palette | Open command/search/jump palette | Pass |
| Focus | Toggle focused Agent mode | Pass |
| Panel | Hide/show right Agent panel | Pass |
| Stage · Dark | Runtime/theme stage control | Visible; not deeply tested |
| Account avatar | Open account/settings/logout menu | Pass |
| Trace status button | Open Trace panel | Pass |
| Mode/status/context/weekly labels | Show current runtime mode and usage state | Visible; context caveat below |

### Session Rail

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| Search | Filter thread list and clear | Pass |
| Thread row | Select active session | Pass |
| New Thread | Create/select a blank session shell | Pass |
| Rename | Open editable title state | Pass on visible controls |
| Share | Open share state | Pass on visible controls |
| Download | Download session JSON | Pass, `Main.json` observed |
| Delete | Open confirmation only; destructive confirm not run | Pass |

Notes:
- The rail renders many repeated row action buttons; the inventory saw 469 visible buttons because every session row contributes rename/share/download/delete.
- Controls are accessible, but the row action source still has rounded/hover-only residue. This is a visual polish gap, not a wiring blocker.

### Chat Lane

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| Share conversation | Open/share active conversation | Visible; not deeply tested |
| Message copy | Copy assistant/user message | Pass |
| Good response | Record positive feedback | Pass |
| Try a different angle | Trigger alternate response path | Visible; not executed to avoid extra run cost |
| Quick reply - go deeper | Prefill/send deeper continuation | Visible; not executed |
| Quick reply - try another angle | Prefill/send alternate continuation | Visible; not executed |
| Quick reply - save to brain | Save/remember useful answer | Not visible on latest minimal response during final pass |

### Composer

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| Add options | Open upload/schedule/pin/report actions | Pass |
| Slash commands | Open command palette from `/` | Pass |
| Mode | Cycle `execute -> plan -> review` | Pass |
| Reasoning | Cycle reasoning effort | Pass |
| Autonomy | Cycle autonomy level | Pass |
| Context meter | Show honest context source/pressure | Pass for honest label, but exact live pressure remains caveated |
| Send | Send prompt and stream/update UI | Pass, network 200 |

Context caveat:
- Some sessions report `ctx --` with `Context usage not yet reported`.
- Network audit still shows `GET /api/agent/sessions/.../context` returning 404 for the active persisted session in some cases.
- Later sessions showed `CONTEXT 22%`, so the fallback path is working, but we still need to prove the `live_session` source is consistently available during real long runs and compaction.

### Right Inspector Panel

| Tab | Intended outcome | Audit result |
| --- | --- | --- |
| Plan | Show tasks, approvals, narration, active turn state | Pass; no live approval was triggered in this pass |
| Cron | Show scheduled/automation state | Pass for tab open; create/edit/delete not executed |
| Sources | Show research/source evidence | Pass for tab open; no live research run executed |
| Artifacts | Canonical in-flow artifact surface | Pass |
| Browser | Explain/show app-browser and extension browser lanes | Pass for visible lane/status |
| Trace | Show trace/event details | Pass |

### Artifacts

| Control | Intended outcome | Audit result |
| --- | --- | --- |
| Artifact rows | Show active-session artifacts, or recent artifacts if none | Pass |
| Open | Open artifact manager/detail surface | Pass |
| Download HTML | Export via BFF and expose download | Pass, HTTP 200 |
| Download PDF | Export via BFF and expose download | Pass, HTTP 200 |
| Download DOCX | Export via BFF and expose download | Pass, HTTP 200 |
| Share | Create public artifact share | Pass |
| Copy link | Copy ZAKI BFF share URL | Pass after fix |
| Open artifact manager | Open deeper artifact manager | Pass |

### Browser And Extension Model

The UI correctly presents two lanes:
- App browser lane: the agent uses its own controlled browser/tooling for web research, screenshots, DOM/text extraction, and non-user-authenticated browsing.
- Extension lane: the user installs/pairs a browser extension so the agent can act in the user's actual browser session where the user is already logged in. This is required for actions on sites that depend on the user's live cookies/session.

Audit status:
- Browser tab is visible and does not overclaim full control.
- No paired extension device was available in this pass, so live extension navigate/click/type/screenshot was not exercised from the UI.

## Structured Audit Results

### Passed

- Local BFF health.
- Local Nullalis health.
- App loads and authenticates.
- Product rail stays in-app for Agent and core surfaces.
- Learn/Hire/Design are gated.
- Command palette opens.
- Focus mode toggles.
- Right panel hides/shows.
- Account menu opens.
- Trace button opens the Trace area.
- Session search filters.
- Session row actions work on visible controls.
- Inspector tabs open.
- Browser lane is visible.
- Artifact rows are visible.
- Artifact exports return HTTP 200 for HTML, PDF, and DOCX.
- Artifact share and copy link now use the BFF public-share route.
- Composer plus menu, slash menu, mode, reasoning, autonomy, and send all work.
- Minimal Agent send returned HTTP 200 and updated the UI.
- Mobile Agent screenshot captured.

### Not Fully Proven

- Supervised approval card from a slash-command-triggered mutating action was not reproduced in this pass.
- Cron create/edit/delete was not executed because the UI did not expose an obviously safe throwaway test path.
- Extension browser E2E was not executed because no paired extension device was available.
- Source evidence rendering was not deeply tested because no live research task was launched in this pass.
- Context meter exactness remains trust-critical because active session context sometimes falls back after a 404.

### Known Network Events

- `POST /api/auth/refresh` returned 401 before login. This is expected for a cold no-cookie session.
- `GET /api/agent/sessions/:sessionKey/context` returned 404 for `agent:zaki-bot:user:1:thread:main` in some runs. The UI labels the unknown state honestly, but production confidence requires exact live-session context under active runs.

## S-Tier Gaps

1. Context meter needs final proof under a long run:
   - live session source
   - diagnostics fallback source
   - compaction/extraction/continuity notices
   - visible transition when compaction occurs

2. Approval card needs a live supervised mutating-action test:
   - slash command requiring approval
   - card appears above composer
   - approve/deny resolves without stale id
   - run continues after approval

3. Right panel is functional, but not yet world-class:
   - Plan should feel like a real execution cockpit with task hierarchy, approvals, narration, and active turn state.
   - Sources should show source cards with searched sites, snippets, confidence, and citation affordances.
   - Browser should clearly show app-browser versus extension-device state, paired device status, last command, screenshot/DOM result, and failures.
   - Trace should support skim-first diagnostics, not raw event dumping.

4. Session rail visual polish:
   - repeated action buttons still use rounded/hover-only residue.
   - the DOM is very large because every row renders all action controls.
   - this is accessible, but it is not yet the cleanest S-tier implementation.

5. Chat/Spaces route naming needs a product decision:
   - Product rail label is `Chat`.
   - Route is `/spaces`.
   - This is app-local and functional, but the naming should be deliberate before public launch.

## Manual Audit Starting Point

Manual QA should start with:
1. Open `/agent`.
2. Confirm Agent rail stays inside app.
3. Send a supervised mutating command that requires approval.
4. Confirm approval card appears above composer and resolves correctly.
5. Ask Agent to create any artifact.
6. Confirm it appears in the Artifacts tab.
7. Export HTML, PDF, and DOCX.
8. Click the returned download link.
9. Share the artifact and copy the link.
10. Open the copied `/api/agent/share/artifact/:code` link through the BFF.
11. Run a long prompt that causes compaction and confirm user-visible context/compaction notices.
12. Pair a browser extension device and test extension navigate/click/type/screenshot.

## Verification Commands

Executed after fixes:

```bash
npm test -- --runTestsByPath src/lib/api.test.ts src/app/components/chat/AgentInspectorRail.test.tsx src/app/components/agent/PowerUserSheet.test.tsx
npm --prefix backend run lint
npm --prefix backend test -- --runTestsByPath src/agent-bff-contract.test.js
curl -sS -i http://localhost:8787/api/agent/share/artifact/ggzkgshc666884rr | head -40
```

Results:
- Frontend focused Jest: 3 suites, 65 tests passed.
- Backend lint: passed.
- Backend BFF contract Jest: 1 suite, 19 tests passed.
- BFF public artifact share route: HTTP 200.
