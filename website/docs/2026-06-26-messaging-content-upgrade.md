# ZAKI Website — Messaging & Content Upgrade (Design Spec)

**Date:** 2026-06-26
**Status:** Approved (surgical copy + small beats, within current layouts — no page rebuilds)

## Compass (from the founder)
- **Audience:** deliberate blend — individuals lead emotionally, operators' capability as proof, Arabic a distinct pillar, clear hierarchy.
- **Tone:** cinematic homepage + concrete/proof-driven deeper pages.
- **Mission:** a powerful, dedicated band — never the headline (product stays universal).
- **Conversion:** understand → then sign up.
- **Pricing truth:** `$15 / $45 / $99 USD` (live PricingV4). Reconcile the stray `$8/$13/$15` legacy table.
- **Learn:** one honest, richer roadmap card (private beta — no full teaser).
- **Proof we can use:** early traction (framed safely), infra/compliance (EU-hosted, GDPR, Dubai entity), and product-proof. NOT the named model chain.
- **Competitive stance:** implicit (no naming competitors).

## Voice lines adopted (all verified true in repo docs)
- Positioning clarifier: "The user-owned AI operating system — a day-to-day AI that's with you, and remembers."
- Memory: "Most AI treats memory as a lookup table. ZAKI treats it as a relationship." + "You don't fall for an AI because it stores facts — you fall for it because it notices, cares, and follows up. That's the difference between a database and a friend."
- Agent governance: "Reads can auto-run. Writes always ask." + a real per-run receipt (tokens, tools, time, cost).
- Pricing: "One shared weekly allowance across everything — no per-message meters, no separate quota per product." + 5-hour burst window. Pay-it-forward ("every paid seat opens another").
- Mission: "Intelligence shouldn't follow the same map as everything else." → first seats for the Arabic world, Syria & rebuilding regions, and students/teachers/builders. CTA: "Request a seat for your community."
- Warmth (implicit): "Most AI is cold and blue. ZAKI is warm by design." + a quiet "Marhaba" touch.

## Changes by surface

### Homepage (HomeV4.tsx + zaki-scenes.css)
1. **Hero lede** — tighten toward the OS clarifier while keeping the soul.
2. **Memory scene (04)** — add the "lookup-table → relationship" line and the contradiction-detection proof: "Say you love TypeScript, then switch to Go — it notices, and asks. Memory that keeps itself honest."
3. **Agent scene (03)** — add the governance line ("Reads auto-run. Writes always ask.") and the receipt ("every run ends with a receipt — what it touched, how long, what it cost").
4. **Mission band** — a NEW compact dawn strip between the summit and the footer (both dawn, so it's seamless): the "different map" line + the three first seats + a "Request a seat for your community" link. Quiet, not the headline. Reduced-motion + mobile safe.
5. **Proof line** — a quiet credibility line near the close: "Trusted by our first few hundred members · EU-hosted · you own your data."

### Agent page (AgentPage.tsx)
- Name the workbench: live browser panel + STOP button, run timeline, artifacts panel.
- The receipt line. The three governed lanes (websites / APIs / your accounts) with "reads auto-run, writes always ask."

### Pricing page (PricingV4.tsx)
- Add the shared-allowance explainer near the tiers.
- Reconcile any legacy `$8/$13/$15` site copy → `$15/$45/$99`.

### Story page (StoryV4.tsx)
- Add the memory manifesto pull-quote in the memory section.

### FAQ (landingContent.js)
- Add a real **pricing** Q&A ($15/$45/$99, shared weekly allowance, free to start).
- Add a **memory-control** Q&A (see / correct / export / forget; contradiction checks; per-user isolation).

### Learn (ProductPage.tsx / wherever the Soon-Learn card lives)
- One honest, richer card: "ZAKI Learn — a full study product: AI-built books, exam practice, and tutors that live in WhatsApp & Telegram. In private beta; we ship it when it's truly ready."

## Out of scope (deferred, per "stop there" on rebuilds)
- Full design rebuilds of use-cases/FAQ/contact to the homepage system.
- A dedicated Learn teaser page; a named-competitor comparison strip; the model-chain transparency beat.

## Success
A visitor leaves understanding what ZAKI is and why it's different (memory-as-relationship, visible governed agent, honest shared pricing), feels the mission, and the deeper pages read as concrete and credible — without losing the homepage's cinematic soul.
