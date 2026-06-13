# Paywall Card (#51) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Render an inline Upgrade/Top-up card in the chat stream when the agent refuses a turn for a billing reason (instead of a bare toast), with the primary CTA routing to the existing `/pricing` page.

**Architecture:** FE-only. A pure `classifyBillingDenial(code)` helper maps the three billing denial codes to a card state; a presentational `PaywallCard` renders the state; `ChatArea`'s `ChatRequestError` handler branches on the classification — billing codes render the card via the existing inline-entry mechanism, all other errors keep the toast. Reuses `useEntitlements()` + `useMeterStatus()` for live plan/usage; reuses `router.push('/pricing')`. No BFF/engine/payment changes.

**Tech Stack:** React/TS (Vite), existing app hooks (`useEntitlements`, `useMeterStatus`), jest + RTL, the existing inline chat-card pattern (approval cards as template).

**Grounding (executor MUST verify against live code before editing):**
- `ChatRequestError` shape + where it's caught/handled in `src/app/components/ChatArea.tsx` (recon: ~L5880 throw, ~L7545 handle → `toast.error`; an `access_expired` branch already does `router.push('/pricing')`).
- The inline chat-entry mechanism the **approval cards** use (recon: entries tagged `kind`/`source`, e.g. `kind:"approval"`; a renderer switches on `kind`). The paywall card follows the SAME pattern (`kind:"paywall"`).
- `useEntitlements()` return: `plan.tier`, `plan.status`, `plan.currentPeriodEnd` (src/queries/useBilling.ts / src/lib/api.ts). `useMeterStatus()` return: `weekly.remaining`, `weekly.resetAt`.

---

### Task 1: `classifyBillingDenial` helper + `PaywallCard` component

**Files:**
- Create: `src/app/components/PaywallCard.tsx`
- Create: `src/app/components/PaywallCard.test.tsx`

- [ ] **Step 1: Write the failing test** (`PaywallCard.test.tsx`)

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { PaywallCard, classifyBillingDenial } from "./PaywallCard";

describe("classifyBillingDenial", () => {
  it("maps insufficient_units → out_of_usage", () => {
    expect(classifyBillingDenial("insufficient_units")).toEqual({ isPaywall: true, state: "out_of_usage" });
  });
  it("maps entitlement_inactive + access_expired → plan_inactive", () => {
    expect(classifyBillingDenial("entitlement_inactive")).toEqual({ isPaywall: true, state: "plan_inactive" });
    expect(classifyBillingDenial("access_expired")).toEqual({ isPaywall: true, state: "plan_inactive" });
  });
  it("does NOT classify generic/unknown codes", () => {
    expect(classifyBillingDenial("rate_limited").isPaywall).toBe(false);
    expect(classifyBillingDenial(null).isPaywall).toBe(false);
    expect(classifyBillingDenial(undefined).isPaywall).toBe(false);
  });
});

describe("PaywallCard", () => {
  const base = { message: "fallback msg", onSeePlans: jest.fn(), onDismiss: jest.fn() };
  it("out_of_usage shows the usage headline + plan/remaining/reset when provided", () => {
    render(<PaywallCard state="out_of_usage" planLabel="Free" remaining={0} resetAt="2026-06-20T00:00:00Z" {...base} />);
    expect(screen.getByText(/out of usage/i)).toBeInTheDocument();
    expect(screen.getByText(/Free/)).toBeInTheDocument();
  });
  it("plan_inactive shows the inactive headline", () => {
    render(<PaywallCard state="plan_inactive" planLabel="Agent" {...base} />);
    expect(screen.getByText(/plan is inactive/i)).toBeInTheDocument();
  });
  it("falls back to the denial message when plan data is absent", () => {
    render(<PaywallCard state="out_of_usage" {...base} />);
    expect(screen.getByText("fallback msg")).toBeInTheDocument();
  });
  it("fires onSeePlans and onDismiss", () => {
    const onSeePlans = jest.fn(); const onDismiss = jest.fn();
    render(<PaywallCard state="out_of_usage" message="m" onSeePlans={onSeePlans} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /see plans/i }));
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onSeePlans).toHaveBeenCalled(); expect(onDismiss).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run → FAIL** — `npx jest PaywallCard` (module not found).

- [ ] **Step 3: Implement** `PaywallCard.tsx`

```tsx
import React from "react";

export type PaywallState = "out_of_usage" | "plan_inactive";

const BILLING_DENIAL_CODES: Record<string, PaywallState> = {
  insufficient_units: "out_of_usage",
  entitlement_inactive: "plan_inactive",
  access_expired: "plan_inactive",
};

export function classifyBillingDenial(code: string | null | undefined): { isPaywall: boolean; state?: PaywallState } {
  const state = code ? BILLING_DENIAL_CODES[code] : undefined;
  return state ? { isPaywall: true, state } : { isPaywall: false };
}

export interface PaywallCardProps {
  state: PaywallState;
  planLabel?: string;
  remaining?: number;
  resetAt?: string | null;
  message: string;
  onSeePlans: () => void;
  onDismiss: () => void;
}

function formatReset(resetAt?: string | null): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PaywallCard({ state, planLabel, remaining, resetAt, message, onSeePlans, onDismiss }: PaywallCardProps) {
  const headline = state === "out_of_usage" ? "You're out of usage" : "Your plan is inactive";
  const reset = formatReset(resetAt);
  // Detail line is shown only when we actually have plan data; else fall back to the server message.
  const hasDetail = Boolean(planLabel) || typeof remaining === "number";
  return (
    <div className="paywall-card" role="region" aria-label="Upgrade required" style={{ /* executor: match the
      app's existing card styling (Tailwind classes / the approval-card container). Keep it a self-contained
      bordered card with a header, body, and a button row. */ }}>
      <div className="paywall-card__headline">{headline}</div>
      <div className="paywall-card__body">
        {hasDetail ? (
          <>
            {planLabel ? <span>Plan: {planLabel}</span> : null}
            {typeof remaining === "number" ? <span> · {remaining} left</span> : null}
            {state === "out_of_usage" && reset ? <span> · resets {reset}</span> : null}
          </>
        ) : (
          <span>{message}</span>
        )}
      </div>
      <div className="paywall-card__actions">
        <button type="button" onClick={onSeePlans}>See plans</button>
        <button type="button" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  );
}
```

> **Executor:** match the app's real styling conventions (Tailwind utility classes or the existing card/CSS-module approach used by the approval card) instead of the placeholder `className`/`style` above — keep the structure (headline, body, two buttons) and the test-visible text/roles intact.

- [ ] **Step 4: Run → PASS** — `npx jest PaywallCard`.
- [ ] **Step 5: Commit** — `feat(paywall): PaywallCard component + classifyBillingDenial helper (#51 T1)`.

---

### Task 2: Wire the card into the chat error path

**Files:**
- Modify: `src/app/components/ChatArea.tsx` (the `ChatRequestError` handler + the inline-entry render switch)

- [ ] **Step 1: Verify the live mechanism.** Read the `ChatRequestError` catch site in `ChatArea.tsx` (recon: ~L7545, currently `toast.error(error.message)` with an `access_expired` → `/pricing` special-case) and the inline-entry creation + render switch the approval cards use (recon: entries tagged `kind`/`source`; a renderer switches on `kind`). Confirm how `useEntitlements()`/`useMeterStatus()` data is reachable from this component (hook in the component, or via context/props).

- [ ] **Step 2: Branch on the classification.** In the error handler, replace the unconditional toast with:

```tsx
const { isPaywall, state } = classifyBillingDenial(error.code);
if (isPaywall && state) {
  // Pull live plan/usage from the already-mounted hooks (entitlements + meter status).
  const planLabel = entitlements?.effective?.tier ?? entitlements?.plan?.tier;
  const remaining = meter?.weekly?.remaining;
  const resetAt = meter?.weekly?.resetAt ?? null;
  // Append a paywall entry to the chat stream using the SAME inline-entry mechanism the approval
  // cards use (kind:"paywall"), carrying { state, planLabel, remaining, resetAt, message: error.message }.
  // (Executor: mirror the approval-card entry-creation call exactly.)
  appendPaywallEntry({ state, planLabel, remaining, resetAt, message: error.message });
} else {
  toast.error(error.message); // unchanged for all non-billing errors
}
```

- [ ] **Step 3: Render the card.** In the entry render switch, add the `kind === "paywall"` case:

```tsx
case "paywall":
  return (
    <PaywallCard
      state={entry.paywallState}
      planLabel={entry.planLabel}
      remaining={entry.remaining}
      resetAt={entry.resetAt}
      message={entry.text}
      onSeePlans={() => router.push("/pricing")}
      onDismiss={() => dismissEntry(entry.id)}
    />
  );
```

> **Executor:** adapt the entry field names + the append/dismiss/render calls to the codebase's actual inline-entry types and helpers (verified in Step 1). Keep: billing codes → card; everything else → toast; primary CTA → the same `/pricing` navigation the `access_expired` path already used (so the old special-case is now subsumed by the card).

- [ ] **Step 4: Verify** — `npm run typecheck` (`tsc --noEmit`) clean; existing chat tests still pass (`npx jest ChatArea` or the repo's chat test file, if present).
- [ ] **Step 5: Commit** — `feat(paywall): render inline paywall card on billing denials, keep toast for others (#51 T2)`.

---

### Task 3: Build + full FE check

- [ ] **Step 1:** `npm run typecheck` → 0 errors.
- [ ] **Step 2:** `npx jest PaywallCard` + the chat test → green.
- [ ] **Step 3:** `npm run build` (Vite) → clean.
- [ ] **Step 4: Commit** any lint/format fixups — `chore(paywall): typecheck + build green (#51 T3)`.

> Deploy (controller): PR → CI green → merge → zaki-prod build → bump `charts/zaki-web` staging tag → ArgoCD roll → confirm the served bundle contains the paywall card. (BFF unchanged, so only `zaki-web` rolls.)

---

## Self-review

- **Spec coverage:** trigger codes (T1 classify + T2 branch) ✓; 2 card states (T1) ✓; data from hooks with message fallback (T1 fallback + T2 wiring) ✓; CTA → /pricing (T2) ✓; non-billing → toast (T2) ✓; FE-only/no BFF (whole plan) ✓; tests (T1 unit + T2 typecheck/integration) ✓.
- **Placeholders:** the card `className`/`style` is intentionally left to the executor to match the app's real styling — flagged explicitly with the structure + test-visible text fixed (not a silent TODO). The T2 `appendPaywallEntry`/`dismissEntry`/`entry.*` names are flagged for executor verification against the live inline-entry types (the plan can't hard-code them without the live ChatArea internals; the contract + behavior are fully specified).
- **Type consistency:** `PaywallState` ("out_of_usage" | "plan_inactive"), `classifyBillingDenial`, `PaywallCardProps` are used consistently across T1 and T2.
