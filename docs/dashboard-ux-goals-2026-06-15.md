# ZAKI Dashboard UX Goals - 2026-06-15

Source mockup: `/Users/nova/Desktop/ZAKI Dashboard (standalone).html`

## Product Goal

Make `/` feel like the fastest possible first contact with ZAKI: a guest lands on a live command surface, picks a product, types once, and receives value before account creation. Signup is a continuation path for saving work, not the first obstacle.

## User Flow Goal

1. Guest arrives at `/` and sees an anonymous session is online.
2. Guest understands there is no setup requirement and that free weekly credits are available.
3. Guest selects the best product lane from the composer tabs.
4. Guest types into one dominant prompt box and starts the run.
5. ZAKI responds using credits.
6. If the guest wants persistence, cross-device history, uploads, memory saves, exports, browser control, or beta workflows, the flow asks them to sign in with the prompt/work preserved.

## Visual Direction

- Center the first viewport around one command stage, not a dashboard grid.
- Use dense V2 chrome: mono labels, hairline borders, low radius, minimal surfaces.
- Keep the top status strip factual: online state, anonymous/signed-in state, plan, latency/reset state.
- Attach product selection directly to the composer so the product choice and prompt feel like one control.
- Put the credit meter inside the composer footer, near the submit action.
- Show one contextual product explanation below the composer instead of multiple competing cards.
- Keep website/pricing/how-it-works navigation secondary and out of the main task path.

## Conversion Goals

- Anonymous users can try Chat immediately.
- Agent, Brain, Learn, Design, and Hire can advertise truthful preview value without implying unsafe full access.
- Signup CTA should mean "keep what you made" or "unlock this next step," not generic account creation.
- Returning same-browser anonymous users should see their recent local work before being asked to register.

## Implementation Goals

- Preserve existing local-only anonymous ledger and pending-intent contracts.
- Rework the current command dashboard toward the mockup structure:
  - centered entry stage,
  - status strip,
  - greeting/copy,
  - composer-attached product tabs,
  - textarea,
  - credit meter/footer,
  - contextual product hint panel,
  - returning-work strip when local work exists.
- Keep route/product gates governed by existing auth, meter, registry, and beta/waitlist logic.
- Do not add backend contracts for this pass.

## Non-Goals

- Do not launch Design or Hire full project workflows from the public dashboard.
- Do not store anonymous work server-side.
- Do not replace billing or entitlement policy with dashboard-only logic.
- Do not make the website pages compete with the command stage on `/`.

## Success Checks

- `npm run build` has no Vite warnings.
- `/` desktop and mobile show one clear first action.
- Empty prompt shows helper copy instead of a dead-feeling disabled product.
- Exhausted credits keep the prompt visible and offer signup, plans, or reset wait.
- Anonymous reload shows same-browser work recovery.
- Signed-in users can still reach Agent, Brain, Settings, Billing, and product routes normally.
