# ZAKI Hire S-Tier Product Surface Plan

Status: design plan.
Last updated: 2026-05-25.

## Product Positioning

ZAKI Hire is not a job-board widget. It is the user's hiring command center:
profile evidence in, high-fit opportunities out, tailored application package
ready, then consented apply actions through a controlled safety lane.

The surface should feel like a serious operational tool for repeated daily use:
dense, calm, fast, and trust-preserving. It should not feel like a marketing
landing page, a generic dashboard, or a pasted upstream app.

## Design Direction

Direction: refined operator cockpit for personal career operations.

The memorable idea: every lead is shown as a live dossier with a clear next
best action. The interface should answer three questions in seconds:

- What should I apply to next?
- Why is this worth my time?
- What has ZAKI prepared, and what needs my consent?

Visual language:

- Adopt the central ZAKI V2 visual law: terminal-grade, mono-forward, dense,
  hairline-led, minimal, with no V1 rounded/card/shadow residue.
- Use `#D24430` as the single ember accent for primary/high-impact actions;
  historic marketing red stays out of the product surface.
- The first viewport is the actual workflow surface. Decorative hero treatment
  and marketing explanation blocks are not part of `/hire`.
- Panels should be restrained and functional. Prefer split panes, tables, rails,
  and drawers over nested cards or soft marketing blocks.
- Use familiar lucide icons for actions and tooltips for compact icon controls.
- Motion should be precise: load reveal, selected-lead transition, generation
  progress, and apply safety confirmation. No decorative motion.

## Current Surface Gaps

Observed in the local `/hire` screen and implementation:

- Page tabs duplicate the sidebar subnav and consume vertical space.
- Dashboard, pipeline, add-lead, and automation controls compete equally.
- The first viewport does not clearly show "next best action".
- The lead detail is useful but not yet a dossier. Fit evidence, gaps,
  generated artifacts, history, and apply state are separated or understated.
- Automation consent is present, but high-risk actions still sit visually close
  to routine buttons.
- Generated resume and cover-letter assets are text references, not reviewable
  artifacts.
- Profile strength is a number, but the UI does not guide the user toward the
  missing evidence that improves matching.
- Empty, loading, degraded, quota-limited, and disabled states need richer,
  product-grade treatment.
- The component is too large. Design polish will be easier after splitting the
  route into focused product modules.

## Information Architecture

Keep `/hire` as the first-class product root. Use sidebar navigation as the
primary navigation; remove the redundant in-page tab strip once the sidebar is
stable on desktop and mobile.

Primary user areas:

- `/hire` or `/hire?view=dashboard`: Today and command center.
- `/hire?view=pipeline`: Lead pipeline with board/table modes and detail pane.
- `/hire?view=lead&id=...`: Deep lead dossier, linkable from pipeline.
- `/hire?view=generated`: Resume, cover-letter, outreach, and version history.
- `/hire?view=profile`: Candidate profile and evidence completeness.
- `/hire?view=sources`: User-safe source lanes and discovery controls.
- `/hire?view=activity`: Tasks, follow-ups, failures, and audit-visible events.
- `/hire?view=settings`: User-safe preferences only.

Hidden operator/admin surface:

- Super-admin only, outside normal Hire navigation.
- Shows provider health, source-lane readiness, dependency gates, smoke status,
  kill switches, and deployment version.
- Never exposes raw provider keys, tokens, internal URLs, or engine local paths.

## First View: Today Command Center

The root screen should be an action console, not a metric wall.

Top band:

- Product mark: `ZAKI Hire`.
- Current status: operational/degraded/disabled state, provider ready,
  scan/task state, and central meter grant posture.
- Primary action: `Find opportunities`.
- Secondary actions: add lead, import profile, refresh.
- Compact meter pill: central grant/receipt posture, with disabled/degraded
  state copied from the central product-state contract.

Main content:

- Left: `Today` queue.
  - Needs review.
  - Ready to apply.
  - Follow-up due.
  - Needs profile evidence.
- Center: selected next lead dossier preview.
  - Fit score.
  - Why matched.
  - Gaps.
  - Package state.
  - Suggested next action.
- Right: action rail.
  - Generate package.
  - Preview application.
  - Schedule follow-up.
  - Auto-apply behind explicit consent.

Bottom band:

- Source status summary.
- Recent activity.
- Generated document shortcuts.

## Pipeline Surface

Pipeline should support two modes:

- Board mode for lifecycle status: discovered, evaluating, tailoring, approved,
  applied, interviewing, rejected, discarded.
- Table mode for scanning, comparison, sorting, and bulk review.

Required interactions:

- Search, status filter, score slider, source filter, date filter.
- Sort by fit score, freshness, company, follow-up due, generated state.
- Inline status update.
- Multi-select for generate, discard, follow-up, export.
- Keyboard shortcuts for next/previous lead and approve/discard.
- Sticky detail pane on desktop, bottom sheet on mobile.

Lead rows should show:

- Title, company, location or remote.
- Fit score with tone and confidence.
- Top match signal.
- Gap count.
- Generated package state.
- Follow-up due date.
- Source and last updated.

## Lead Dossier

Each lead should feel like an inspectable case file.

Sections:

- Header: status, score, title, company, source, external job link.
- Fit summary: why this lead is worth applying to.
- Evidence map: candidate strengths mapped to role requirements.
- Gaps: missing skills, weak evidence, or low-confidence requirements.
- Package studio: resume, cover letter, outreach, follow-up versions.
- Application safety: form read, preview, consent, auto-apply.
- Activity: generation, status changes, downloads, apply attempts.

Artifact UX:

- Show generated PDFs as reviewable documents, not filenames.
- Provide `Open`, `Download`, `Regenerate`, and `Compare version` actions.
- Show version metadata: model/provider, generated at, source lead version,
  and safety/meter note where available.

## Profile And Evidence

Profile is a matching engine input, not a static form.

Design:

- Evidence completeness meter with concrete missing items.
- Sections for identity, summary, skills, experience, projects, education,
  certifications, achievements.
- Import tray for resume, LinkedIn export, GitHub, portfolio, and pasted notes.
- Before/after extraction review, so users understand what ZAKI learned.
- "Improve matching" recommendations based on profile gaps.

Acceptance:

- A new user can import or paste a profile and understand what is missing.
- A returning user can quickly update evidence without hunting through forms.

## Sources And Discovery

Users should see source choices, not operator secrets.

Design:

- Source catalog with enabled/disabled lanes.
- Each lane shows coverage, freshness, cost/meter class, and policy state.
- Discovery controls: run scan, stop scan, free-source scan, approved sources.
- Results explain why a lead was accepted, rejected, or parked.
- Any disabled source has a user-safe reason such as "Operator configuration
  pending" or "Temporarily unavailable".

Do not expose:

- API keys.
- Raw provider settings.
- Internal engine routes.
- Scraping implementation details.
- Browser worker internals.

## Apply Safety Lane

Auto-apply is a high-trust flow and needs its own visual treatment.

Flow:

1. Read form.
2. Show extracted fields.
3. Preview application package and form payload.
4. Explicit consent for the specific lead and destination.
5. Submit or hand off, with cancellation where available.
6. Audit-visible result.

UI rules:

- `Auto-apply` is not visually equivalent to routine actions.
- Consent is lead-specific and destination-specific.
- Show destination host, form confidence, and what will be sent.
- Provide a clear abort path before submission.
- Show failure reasons in plain language.

## Visual System Notes

Use the local ZAKI V2 references as the source of truth:
`ZAKI Design System/v2`, `v2-tokens.css`, `V2 Agent v6.html`,
`V2 Dashboard.html`, `V2 Settings.html`, and `BRAND_LAW.md`.

Hire-specific composition:

- Surface background: V2 grid/hairline field, mostly unframed.
- Panels: 1px hairline boundaries, radius 4px or less, no blurred shadows.
- Data density: 11-13px support text, 32px controls, 18-22px section titles.
- Ember accent: primary action and destructive/high-impact only.
- Success/warn/danger states: muted operational indicators, never loud badges.
- Mono-forward: labels, actions, ids, run ids, provider/model facts, and
  product chrome should all sit comfortably in the V2 terminal-grade language.

Avoid:

- More metric cards as the main experience.
- Repeating the same warm beige at every depth.
- Generic "AI assistant" sparkles as primary meaning.
- Landing-page hero sections.
- Soft V1 rounded-card/shadow patterns.
- Text-heavy instructions inside the app.

## Component Architecture

Split [HirePage.tsx](/Users/nova/Desktop/zaki-prod-hire/src/app/components/hire/HirePage.tsx)
before heavy redesign:

- `HirePage.tsx`: route orchestration, query setup, active view.
- `HireShell.tsx`: product header, status band, sidebar/route sync.
- `HireTodayView.tsx`: command center.
- `HirePipelineView.tsx`: board/table, filters, selection.
- `HireLeadDossier.tsx`: detail and package/action sections.
- `HireGeneratedView.tsx`: artifact review and versions.
- `HireProfileView.tsx`: candidate evidence.
- `HireSourcesView.tsx`: discovery lanes.
- `HireActivityView.tsx`: events and task state.
- `HireApplySafetyPanel.tsx`: read/preview/consent/submit lane.
- `HireOperatorCockpit.tsx`: hidden super-admin surface if kept in ZAKI prod UI.
- `hireDesign.ts`: status labels, tone maps, score bands, view metadata.

## Implementation Slices

Slice 1: UI architecture and shell

- Split `HirePage.tsx` without behavior changes.
- Remove duplicate in-page nav or make it mobile-only if sidebar is hidden.
- Add stable layout primitives for status band, action rail, split pane,
  section headers, empty states, and metric strips.
- Verify existing Hire tests and browser smoke still pass.

Slice 2: Today command center

- Replace metric-first dashboard with next-action command center.
- Add readiness/meter/source/task status in a compact top band.
- Add empty-state onboarding for first profile, first lead, and first package.
- Add route UAT for empty and populated tenants.

Slice 3: Pipeline redesign

- Build table/board mode.
- Add stronger filters, selected-lead state, bulk actions, and responsive
  bottom-sheet detail on mobile.
- Preserve tenant-isolation smoke and browser smoke.

Slice 4: Lead dossier and generated artifacts

- Convert lead detail into a dossier.
- Add generated package preview/download/version controls.
- Add follow-up and activity sections per lead.
- Add E2E coverage for generation and PDF download from UI, not only API.

Slice 5: Profile and sources

- Redesign profile as evidence completeness.
- Add import review states.
- Add source catalog with user-safe lane state.
- Hide all operator-only settings from normal users.

Slice 6: Apply safety lane

- Build dedicated read-form, preview, consent, submit flow.
- Add destination host and payload preview.
- Add cancellation/failure states.
- Add E2E coverage with sandboxed local destination.

Slice 7: Operator cockpit

- Add hidden super-admin Hire cockpit.
- Surface provider health, smoke status, readiness dependencies, source lanes,
  kill switches, and deployment version.
- Ensure redaction tests cover every operator payload displayed.

Slice 8: Polish and launch checks

- Desktop, tablet, mobile responsive pass.
- Keyboard navigation and focus order.
- Accessibility audit.
- Dark mode pass.
- Empty/loading/error/offline/quota-limited states.
- Visual regression screenshots for core views.

## S-Tier Acceptance Criteria

User value:

- A first-time user can import a profile, add or discover a lead, generate
  tailored documents, download them, and understand the next action.
- A returning user can open `/hire` and know what to do next in under 10 seconds.
- Users never need to know provider keys, engine details, or operator settings.

Trust:

- Every high-risk apply action has explicit preview and consent.
- Degraded providers, source lanes, quota limits, and task failures are visible
  in user-safe language.
- Generated artifacts are inspectable before use.

Operations:

- Super-admin can verify readiness and provider/source health from a hidden
  cockpit.
- Normal users cannot access operator controls.
- The UI reflects central ZAKI metering and product enablement.

Quality:

- Desktop and mobile browser smokes pass.
- API value smoke remains green.
- Multi-user isolation smoke remains green.
- UI tests cover empty, populated, degraded, quota-limited, and consent states.
- No upstream JustHireMe branding or local-settings assumptions appear.
- No duplicated local billing, usage, account, OAuth, or privacy settings appear;
  those link to central `/settings`.
