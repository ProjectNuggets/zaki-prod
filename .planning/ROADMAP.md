# ZAKI Learn Roadmap

Last updated: 2026-05-07

## Active Milestone: learn ZAKI Learn DeepTutor Parity

**Goal:** Bring ZAKI Learn to DeepTutor capability parity as a hosted, multi-user SaaS surface with ZAKI auth, ZAKI BFF security, upstream-shaped UI, and operator-managed dependencies.

**Spec:** `docs/zaki-learning-integration-spec.md`

## Phase 01: Learn UI Parity And Route Truth

**Goal:** Make each visible Learn route match the upstream DeepTutor surface shape inside the ZAKI shell. Remove dashboard wrappers and route fallbacks that hide upstream surfaces.

**Requirements:** LEARN-PARITY-001 through LEARN-PARITY-010, LEARN-UX-001 through LEARN-UX-007

**Plans:**

- [x] 01-01: Build route parity manifest and browser audit for every Learn view.
- [x] 01-02: Port/adapt Sources/Knowledge page shape from upstream.
- [x] 01-03: Port/adapt Co-Writer page shape from upstream.
- [x] 01-04: Port/adapt Space page sections from upstream.
- [x] 01-05: Port/adapt TutorBot management and chat surfaces from upstream.
- [x] 01-06: Normalize advanced workspace entry points for solve, research, quiz, visualize, and math animation.
- [x] 01-07: Browser parity verification and UI code review.

**Status:** Complete.

## Phase 02: BFF Security And Multi-User Hardening

**Goal:** Make every learning backend route and WebSocket SaaS-safe by construction.

**Requirements:** LEARN-SEC-001 through LEARN-SEC-010, LEARN-SET-001 through LEARN-SET-004

**Plans:**

- [x] 02-01: Convert learning mutation proxying to route allowlists or recursive schema sanitizers.
- [x] 02-02: Enforce byte limits for raw and chunked uploads before proxying.
- [ ] 02-03: Move WebSocket payload handling to allowlist schemas and consume quota only on mutating/prompt messages.
- [ ] 02-04: Gate unsafe generated HTML rendering behind operator policy and safe defaults.
- [ ] 02-05: Split user-managed settings from operator-managed settings.
- [ ] 02-06: Backend security test pass.

**Status:** In progress.

## Phase 03: Capability Parity Completion

**Goal:** Ensure every upstream learning-relevant capability is reachable, wired, and tested in ZAKI.

**Requirements:** LEARN-PARITY-001 through LEARN-PARITY-010

**Plans:**

- [ ] 03-01: Tutor chat and session parity.
- [ ] 03-02: Book/lesson reader and block action parity.
- [ ] 03-03: Quiz, review, question bank, weak-area loop parity.
- [ ] 03-04: Notebooks and save/export flows.
- [ ] 03-05: Deep research, deep solve, visualization, and math animation parity.
- [ ] 03-06: Source upload, image upload, browser folder upload, archive upload, and connector-ready seams.

**Status:** Pending.

## Phase 04: Governance, Quota, Retention, Export

**Goal:** Close production governance gates for paid multi-user rollout.

**Requirements:** LEARN-GOV-001 through LEARN-GOV-006

**Plans:**

- [ ] 04-01: Quota model and enforcement matrix.
- [ ] 04-02: Data deletion/export implementation and audit state.
- [ ] 04-03: Retention and cleanup policies.
- [ ] 04-04: Backup/restore drill and disaster recovery runbook.
- [ ] 04-05: Operator deployment checklist with immutable image tags.

**Status:** Pending.

## Phase 05: Final Parity Audit And Release Gate

**Goal:** Prove ZAKI Learn is ready for limited production rollout.

**Plans:**

- [ ] 05-01: Full upstream-vs-ZAKI feature matrix.
- [ ] 05-02: Browser walkthrough for all Learn surfaces.
- [ ] 05-03: Backend BFF contract test sweep.
- [ ] 05-04: Multi-user isolation smoke.
- [ ] 05-05: Final code review and release-readiness verdict.

**Status:** Pending.
