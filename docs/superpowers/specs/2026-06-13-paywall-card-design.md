# Paywall Card (#51) — Design

**Goal:** When the agent refuses a chat turn for a billing reason, show an inline **Upgrade / Top-up card** in the chat stream instead of a bare toast — completing the money loop (metering → reserve → hard-cut → a clear upgrade path).

**Scope:** Frontend-only (`zaki-prod-sa/src/app`). No BFF, engine, or payment-integration changes — Stripe checkout/portal/access-code and the entitlement/meter endpoints already exist and are reused as-is.

## Trigger

In the chat send/stream error handler (`ChatArea.tsx`, where `ChatRequestError` carries `status` + `code`), branch on the error `code`:

| code | HTTP | Card state |
|---|---|---|
| `insufficient_units` | 429 | **Out of usage** |
| `entitlement_inactive` | 402 | **Plan inactive** |
| `access_expired` | (existing) | **Plan inactive** (folds in the current ad-hoc `/pricing` redirect) |

Any **other** error code is unchanged — it keeps the existing `toast.error()` path. Only these three billing codes render the card.

## Card states

Rendered as an inline chat entry (`kind: "paywall"`), styled to match the existing approval-card / Pricing aesthetic.

1. **Out of usage** (`insufficient_units`)
   - Headline: "You're out of usage"
   - Body: current plan tier + weekly remaining + "resets `<human date>`" — from `useEntitlements()` + `useMeterStatus()`. If those are still loading/unavailable, show the denial `message` verbatim (graceful fallback).
   - Primary: **See plans** → `router.push('/pricing')`. Secondary: **Dismiss**.

2. **Plan inactive** (`entitlement_inactive` / `access_expired`)
   - Headline: "Your plan is inactive"
   - Body: plan tier + status (e.g. "expired"), from `useEntitlements()`; fallback to the denial `message`.
   - Primary: **See plans / Renew** → `router.push('/pricing')`. Secondary: **Dismiss**.

## Data

Read-only from already-cached hooks: `useEntitlements()` (tier, status, currentPeriodEnd) and `useMeterStatus()` (weekly remaining, resetAt). No new fetch on the hot path; no new endpoint. The card degrades gracefully to the denial `message` if hook data is absent.

## Component + wiring

- New `PaywallCard.tsx` — pure presentational card: props `{ state: "out_of_usage" | "plan_inactive", planLabel?, remaining?, resetAt?, message, onSeePlans, onDismiss }`.
- Wire it into the chat stream via the existing inline-entry mechanism the approval cards use (a typed entry the renderer switches on), so it appears in the timeline at the point of the refused turn — not as a toast.
- The primary CTA reuses the same `router.push('/pricing')` the current `access_expired` branch already performs.

## Out of scope

- No changes to checkout/portal/billing endpoints or the Stripe integration (already built).
- No proactive "low on usage" banner (only renders on an actual denial).
- No new BFF denial-payload fields (the existing `code` + `message` + the entitlement/meter hooks suffice). If a later polish wants `remaining`/`resetAt` inline in the 429 body to avoid the hook read, that's a separate follow-up.

## Testing

- Card renders for `insufficient_units`, `entitlement_inactive`, `access_expired`; does **not** render for a generic error (e.g. 500 / network) — those still toast.
- Correct state + headline per code; CTA invokes `/pricing` navigation; Dismiss removes the card.
- Graceful fallback to the denial `message` when entitlement/meter data is unavailable.
- `tsc --noEmit` clean; existing chat tests unbroken.
