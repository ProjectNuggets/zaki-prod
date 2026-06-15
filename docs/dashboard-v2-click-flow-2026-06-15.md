# ZAKI Dashboard V2 Click Flow

Date: 2026-06-15
Surface: `/`

## Goal

The dashboard is the first contact point. The user should not have to decide
between "app" and "website" before trying ZAKI. They land on one command box,
pick the type of work, write once, and keep or upgrade only when the next action
requires it.

## Product Language

- Chat: immediate answers and drafting.
- Agent: plan and execute user work.
- Brain: map and save what ZAKI should remember.
- Design: coming soon; use Chat or Agent today for briefs and design planning.
- Learn: coming soon; use Chat or Agent today for study help and learning paths.
- Career: help the user find a new role, improve CV positioning, compare fit,
  and prepare applications. This is not employer-side recruiting. Career is
  coming soon until the private job-search flow is ready.

## Anonymous User Flow

1. User visits `/`.
2. If first visit, intro card appears.
3. User can click `Start typing` and remain on the dashboard.
4. User can click `Visit V1 website` and go to `/story`.
5. Dashboard defaults to `Chat`.
6. User sees weekly free credits and the text input.
7. The user reads the selected product explainer, then types a prompt.
8. If `Chat` is selected, `Start chat` sends immediately using anonymous
   credits and stores a browser-only draft/history row.
9. If Agent or Brain is selected, `Preview first`
   stores the prompt in browser history and session pending intent, then opens
   auth when the selected action requires persistence or gated access.
10. If Design, Learn, or Career is selected, the tab explains that the product
    is coming soon and the submit button remains disabled. No prompt, ledger
    record, or auth intent is created for unavailable spokes.
11. If user clicks `Sign in` or `Sign up` with a typed Agent, Brain, or Chat
    prompt, the prompt is preserved before auth.
12. If user returns later in the same browser, `Continue what you started`
    appears above the command box.
13. `Save this work` opens sign-up with the latest local work as pending intent.

## Signed-In Free User Flow

1. User visits `/`.
2. Dashboard defaults to `Agent`.
3. User sees the same command box and free weekly credit state.
4. User picks an available product and types the outcome.
5. `Continue in Agent/Brain/Chat` opens the selected
   product route with pending intent preserved.
6. Design, Learn, and Career remain visible as coming soon and do not navigate
   to unavailable full-product routes from the command submit.
7. Durable memory, files, exports, browser control, and long-lived histories are
   allowed only where the product gate and entitlement allow them.
8. If credits are exhausted, the prompt stays visible and the user sees choices:
   save/sign up if needed, view plans, or wait for reset.

## Subscribed User Flow

1. User visits `/`.
2. Dashboard defaults to `Agent`.
3. Meter reflects the paid plan allowance from backend config.
4. Product selection still controls the destination, but fewer actions hit auth
   cliffs because account continuity already exists.
5. Beta/waitlist products remain truthful: subscription capacity does not imply
   Design or Career full access until product state and entitlement agree.

## Website Path

The current website is now behind the dashboard as V1 while the V2 website is
rebuilt. It remains accessible from:

- intro slide 03 `Visit V1 website`
- header `V1 website`
- dashboard link `How it works`, which opens the three-slide intro popup
- dashboard links `V1: Ways to buy` and `V1: Product palette`

The future website rebuild should reuse the dashboard's new product truth:
command first, memory and continuity second, account/plan only at the moment of
need.
