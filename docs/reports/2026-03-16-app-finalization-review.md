# App Finalization Review

Date: 2026-03-16
Branch: `app-finalization`
Status: `HOLD`

## Summary
This pass moves the app materially closer to release-ready state:
- internal prompt quotas now default to `10` for both `app_chat` and `zaki_bot`
- public quota copy is now qualitative instead of promising a hard public number
- ZAKI space now includes a session-scoped experimental notice
- dark-mode bot surfaces were tightened where they were visually inconsistent
- auth and billing UI coverage was extended with focused tests

The branch is still `HOLD` because the final DEV release gate is not purely local:
- real email verification delivery still needs a live DEV validation
- real billing checkout / portal / cancel / access-code redemption still needs a live DEV validation

## Implemented Changes

## Quota and runtime
- `backend/src/daily-quota.js`
  - default limits raised from `5` to `10`
  - daily-limit payload copy changed from numeric to qualitative
- `backend/src/daily-quota.test.js`
  - updated to the new defaults
- `backend/src/agent-and-chat-quota.integration.test.js`
  - updated to the new defaults and request counts

## App UX
- `src/app/components/ZakiExperimentalNotice.tsx`
  - new session-scoped ZAKI notice
- `src/app/components/ChatArea.tsx`
  - qualitative quota error text
  - qualitative composer badge text
  - ZAKI notice mounted above composer
- `src/app/components/InputArea.tsx`
  - composer badge now displays qualitative labels instead of numeric counters
- `src/app/components/agent/ZakiBotControlPanel.tsx`
  - dark status pill styling aligned to the panel
- `src/app/components/chat/BotStatusRail.tsx`
  - dark mode tokens added

## Localization
- `src/i18n/locales/en.json`
- `src/i18n/locales/ar.json`
  - added ZAKI experimental notice copy

## Added / Expanded Tests
- `src/app/components/ZakiExperimentalNotice.test.tsx`
- `src/app/components/BillingSuccessPage.test.tsx`
- `src/app/components/InputArea.test.tsx`
- `src/app/components/ChatArea.test.tsx`
- `src/app/components/LoginScreen.test.tsx`

## Automated Validation Run

### Frontend component tests
Command:
```bash
npm test -- --runInBand src/app/components/InputArea.test.tsx src/app/components/ZakiExperimentalNotice.test.tsx src/app/components/ChatArea.test.tsx src/app/components/LoginScreen.test.tsx src/app/components/BillingSuccessPage.test.tsx src/app/components/PricingPage.test.tsx src/app/components/agent/ZakiBotControlPanel.test.tsx
```

Result:
- pass

### Backend quota and billing tests
Command:
```bash
npm --prefix backend test -- daily-quota.test.js agent-and-chat-quota.integration.test.js billing-route-handlers.integration.test.js billing-stripe-webhook-handler.integration.test.js
```

Result:
- pass

## Manual DEV Validation Still Required

## Auth / email verification
1. Sign up a fresh user.
2. Confirm verification email delivery.
3. Click verification link.
4. Confirm redirect returns to sign-in with verified state.
5. Confirm verified user can sign in.
6. Request password reset.
7. Confirm reset email delivery.
8. Confirm reset flow updates password and sign-in works.

## Billing
1. Open pricing page in DEV.
2. Start subscription checkout.
3. Complete checkout in provider sandbox.
4. Confirm billing success return page.
5. Confirm entitlements update.
6. Open billing portal.
7. Trigger cancellation.
8. Test access-code purchase checkout.
9. Test resend purchased code email.
10. Test code redemption on target account.

## Remaining Risks
- email delivery could still fail due to environment/provider configuration
- billing flows could still fail due to provider or webhook environment issues
- no full end-to-end browser smoke has been recorded yet for the new ZAKI notice + quota path

## Recommendation
Keep app release status at `HOLD` until the manual DEV auth and billing flows above are run and recorded.

After those pass, the app is in position for a final `GO` review.
