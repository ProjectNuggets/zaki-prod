# ZAKI V1 Click Path Audit

Date: 2026-06-15
Scope: `/`, V1 website product pages, direct parked-product routes.

## Ship Verdict

Ready with focused follow-up.

No release-blocking click cliff remains in the audited surfaces. The main
remaining work is to finish the core product loops for Agent, Chat, Brain, and
Settings before rebuilding the public V2 website.

## Audited Paths

### Anonymous first contact

1. Visit `/`.
2. Land on the V2 command dashboard, not a login screen.
3. Dashboard defaults to Chat.
4. One textarea is visible.
5. Header actions expose `V1 website`, `Sign in`, and `Sign up`.
6. Chat, Agent, and Brain are selectable; Learn, Design, and Career are visible
   but marked coming soon.

Status: correct first-contact shape. Next audit should submit a real anonymous
Chat turn against the deployed BFF and verify local anonymous work recovery.

### Website product pages

1. `/products/brain` presents Brain as an included memory control plane and
   links to `/brain`.
2. `/products/learn` presents Learn as coming soon and links back to `/`.
3. `/products/design` presents Design as coming soon and links back to `/`.
4. `/products/hire` presents Career as coming soon and links back to `/`.
5. Website nav primary action says `Start chat`, while still routing to the
   existing `/spaces` implementation.

Status: product truth now matches V1: Chat, Agent, Brain public; Learn, Design,
and Career parked.

### Direct app routes

1. `/learn`, `/design`, and `/hire` render a coming-soon gate.
2. They do not redirect anonymous users to login.
3. They expose `Launch state: coming soon`, not raw registry states such as
   `enabled`.
4. The only normal action is `Open dashboard`.

Status: direct route cliffs are removed.

### Pricing and billing entry

1. `/pricing` presents `Chat Free`, `ZAKI Agent`, `ZAKI Brain`, and `Coming next`.
2. The only normal paid checkout path is Agent.
3. Brain is presented as included with account continuity.
4. Learn, Design, and Career are described as future products and not sold.
5. Legacy `?plan=complete&autostart=1` pricing intents are ignored by the public
   pricing UI instead of starting unavailable checkout.
6. Access-code copy says V1 core access, not whole-app access.

Status: pricing now matches the V1 product truth.

## Findings

### Fixed in this pass

- Website pages no longer sell `ZAKI Complete`, paid Learn, `$19`, `$39`, or
  unavailable full products.
- Primary website CTAs now use Chat language instead of user-facing Spaces
  language.
- Direct parked routes no longer leak raw backend registry state.
- Product page tests cover Learn, Design, and Career coming-soon behavior.
- Pricing no longer exposes public Learn or Complete checkout.
- Pricing access-code copy no longer claims whole-app access.
- Runtime `/pricing` check confirms visible cards are Chat Free, Agent, Brain,
  and Coming next, with no stale Complete/Learn paid copy.

### Follow-up this sprint

- Run deployed anonymous Chat E2E: submit prompt, receive reply, reload, continue
  from browser-only history.
- Run signed-in resume E2E: dashboard prompt, auth, resume into Agent or Brain
  without losing the prompt.
- Audit `/settings` account/billing panels against the same V1 product truth so
  no account state implies unavailable Learn, Design, or Career access.
- Rebuild the public V2 website behind the dashboard with the same hierarchy:
  Chat first, Agent and Brain as continuity, future lanes parked.

## Next Sequence

1. Core loop QA: `/`, `/spaces`, `/agent`, `/brain`, `/settings`.
2. Auth and credit QA: anonymous credits, signup preservation, free-account
   meter, exhausted-credit state, paid-plan state.
3. Settings cleanup: align account, product access, and billing panels with the
   V1 product truth.
4. Website V2 rebuild: replace old marketing structure with concise product
   truth and dashboard-first entry.
5. Staging spokes: bring Learn, Design, and Career back only when backend health,
   entitlement, route, and UI copy agree.
