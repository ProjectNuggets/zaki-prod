# App Finalization Spec

## Purpose
This spec locks the app-facing release decisions for the final app polish pass. It is meant to be execution-grade: another engineer should be able to review the intended UI states, copy, and acceptance criteria without guessing.

## Global Product Direction
- `Spaces` remain the structured execution surface.
- `ZAKI` remains the experimental persistent agent surface.
- Public free-tier messaging stays qualitative.
- Internal quota defaults are numeric and operational.

## Quota Rules
- Internal default limit:
  - `app_chat = 10`
  - `zaki_bot = 10`
- Public app copy must not promise `10/day`.
- Public app copy should say:
  - free usage is limited
  - resets daily
  - availability can vary with traffic and prompt complexity
- Admin and runtime controls may still show exact numbers.

## Screen Specs

## Login / Signup / Reset
### Purpose
Keep auth screens clean and trustworthy while preserving legal-consent and verification behavior.

### Visual hierarchy
- Product mark at top left
- One primary heading
- One short supporting paragraph
- Compact mode switcher
- Inputs and primary submit CTA
- Secondary navigation below form

### Key states
- `login`
- `signup`
- `reset-request`
- `reset-confirm`
- redirect notice after email verification
- redirect notice after billing return

### Acceptance criteria
- Sign-in mode does not request legal consent.
- Signup mode requires consent before submit.
- Reset request and reset confirm are distinct states.
- Verification and reset notices render cleanly without layout shift.

## Pricing Page
### Purpose
Present paid plans, access-code purchase, and billing actions without mixed design language.

### Visual hierarchy
- Pricing hero and interval toggle
- Plan cards
- Billing state row
- Access-code purchase callout

### States
- free user
- active paid user
- cancellation scheduled
- billing unavailable
- access-code purchase enabled/disabled

### Acceptance criteria
- Primary and secondary CTAs match the app button family.
- Cancel and portal actions remain visually subordinate to plan-selection CTAs.
- Billing warning and success tones use the same token system as settings and auth.

## Billing Success Page
### Purpose
Confirm the billing outcome and give the next correct action.

### Visual hierarchy
- success badge
- personalized heading
- short subtitle
- plan/interval pills for subscription success
- next steps list
- action row

### Access-code success variant
- show access-code-specific heading and copy
- show resend-email CTA
- do not show subscription-specific pills

### Acceptance criteria
- Subscription success and access-code success are distinct.
- Resend code email CTA exists and handles sent/already-sent/processing/error states.

## Settings Modal
### Purpose
Provide a consistent control surface for profile, plan, and privacy.

### Visual hierarchy
- strong modal shell
- section headers
- labeled fields
- plan/billing actions
- destructive controls clearly separated

### Acceptance criteria
- billing-management buttons reuse the same token family as pricing
- destructive actions use the same warning/error language and colors across settings and pricing

## ZAKI Experimental Notice
### Purpose
Make the experimental status of ZAKI explicit at point of use without blocking the chat flow.

### Placement
- inline above the composer in the ZAKI space
- same max width as the composer shell
- visible before the user sends messages in the session

### Copy
- badge: `Open beta`
- title: `Experimental ZAKI space`
- body: `ZAKI is still experimental. Free usage is limited, resets daily, and availability can vary with traffic and prompt complexity.`
- actions:
  - `Continue`
  - `Learn more`

### Behavior
- shown once per browser session
- dismissible via `Continue` or close button
- dismissal persisted in `sessionStorage` under `zaki_bot_experimental_notice_seen`
- does not reappear until a new session

### Acceptance criteria
- visible only in the ZAKI space
- does not appear as a modal or toast
- localized in EN and AR
- works in light and dark themes

## ZAKI Bot Control Panel
### Purpose
Keep ZAKI runtime controls operational while matching the dark product palette.

### Problem fixed
- channel status pills looked light-themed inside a dark panel

### Current styling direction
- panel shell: dark-warm card
- status pill: dark neutral fill with higher-contrast text
- borders: warm dark border family, not white-tinted pills

### Acceptance criteria
- no light-theme artifact remains in the channel setup cards
- pills, banners, and helper text read as part of one dark surface

## Quota Warning States
### Purpose
Show honest free-tier constraints without turning the UX into a hard public contract.

### ZAKI space message
- `You reached today's free experimental limit. Free usage resets daily and can vary with traffic and prompt complexity. Try again after reset.`

### App chat message
- `You reached today's free limit. Free usage resets daily. Try again after reset.`

### Composer badge
- qualitative only
- examples:
  - `Daily experimental access`
  - `Limited free usage`
  - `Today's experimental limit reached`

### Acceptance criteria
- no public `5/day` or `10/day` strings in release surfaces
- exact limit can still exist in API payloads and admin controls

## RTL Notes
- Preserve `ZAKI` as a brand term.
- Arabic copy should preserve meaning rather than literal English structure.
- The experimental notice button order and alignment should remain natural in RTL.

## Validation Checklist
- ZAKI notice appears once per session
- dark bot panel no longer shows light pills
- public quota copy is qualitative
- access-code resend CTA is covered
- reset request and reset confirm flows are covered
