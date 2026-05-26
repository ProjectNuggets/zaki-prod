# ZAKI Agent V6 Parity Contract

Date: 2026-05-26
Owner: Codex / ZAKI product engineering
Surface: `/agent`

## Objective

Finish the Agent product surface as the primary consumer product in ZAKI. The surface should feel like a dense production command center for an autonomous agent: Manus-level progress visibility, Codex-level execution control, Claude Code-level compactness, and ZAKI's own graph-memory posture.

This contract is for the UI/UX slice only. It preserves current backend contracts and runtime wiring while making the Agent surface clearer, more complete, and easier to extend.

## Sources Of Truth

1. Code truth: current ZAKI prod runtime, Nullalis SSE events, tool traces, memory plumbing, browser controls, artifacts, settings, and usage/metering data.
2. Reference truth: Codex, Claude Code, and Manus patterns for compact execution control, approvals, progress disclosure, tool traces, sources, and artifacts.
3. V2 design truth: local `ZAKI Design System/v2` exports, especially `V2 Agent v6.html` and the mobile mock.

When these disagree, code truth defines what is wired today, V2 defines the visual language, and references define interaction quality.

## Typography Law

- Agent chrome, tabs, status strips, meters, controls, labels, and right-panel content use `DM Mono`.
- Chat prose and long assistant/user message bodies use `Plus Jakarta Sans`.
- Agent display headings use `DM Mono`, not Cabinet.
- Thmanyah is reserved for Arabic/brand/editorial surfaces later; it should not leak into the Agent execution UI.

## Right Panel Contract

The right panel is the Agent execution truth plane. It is not generic settings, not marketing, and not a loose inspector. It answers: what is the agent doing, why, with what evidence, what did it produce, what external surface is it controlling, and how can the user audit it?

Tabs:

1. Plan
   - Current objective, task tree, subagent/work unit state, approvals, blockers, next step.
   - Default tab for a normal turn.
2. Cron
   - Scheduled work, background jobs, automation handoff, retries, and run history.
   - Empty state is allowed until scheduled-run data is wired.
3. Sources
   - Graph memory, files, docs, web/source grounding, and context pressure.
   - Owns source provenance and memory visibility, not final trace chronology.
4. Artifacts
   - Generated outputs, documents, canvases, exports, shareables, and artifact events.
   - Links to the artifact manager when available.
5. Browser
   - Browser extension/server lane, active page/session, replay/live status, and explicit browser controls.
   - The agent can auto-open browser controls when real browser activity starts; manual user tab selection should be respected in a later persistence slice.
6. Trace
   - Raw execution event stream, narration, tool events, token/cost/weight/model metrics.
   - Trace is for audit, debug, and replay, not for high-level planning.

## Behavior Rules

- Default selected tab is `Plan`.
- Browser can be selected by the user and should eventually auto-select when browser activity starts if the user has not made a manual panel choice.
- Counts/badges should be factual only: task count, source count, artifact count, trace event count, active browser state. No invented completion signals.
- If data is not wired, show a precise empty state and leave the tab present. Production UX should reveal capability shape without pretending data exists.
- Settings remain outside this panel. Right-panel controls may deep-link to Settings, Memory, Browser, Artifacts, or Trace surfaces.

## Execution Slices

S01: Contract and six-tab shell
- Add this contract.
- Replace Agent inspector three-tab model with Plan, Cron, Sources, Artifacts, Browser, Trace.
- Preserve current callbacks and backend wiring.
- Fold the old Context panel into Sources and Trace.
- Tighten right-panel font, tab, action, and list styling.

S02: Live event mapping
- Map Nullalis SSE/tool events into panel-specific derived views.
- Add richer source/artifact/browser detectors once backend event labels are stable.

S03: Composer turn controls
- Finish model picker, autonomy, approval, browser, memory, and output-format controls around the composer without crowding the main chat.

S04: Mobile execution sheets
- Bring Plan/Sources/Artifacts/Browser/Trace into mobile-safe sheets or bottom panels matching the V2 mobile mock.

S05: End-to-end hardening
- Playwright screenshots for `/agent` at desktop and mobile.
- Accessibility pass for tab order, labels, focus, and reduced-motion safety.
- Production copy pass and V1 residue audit.

## Verification

After each slice:

- `npm test -- AgentInspectorRail.test.tsx V2Components.test.tsx`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

For visual completion, also capture `/agent` at `1440x1000` and `390x844` with a signed-in test user.
