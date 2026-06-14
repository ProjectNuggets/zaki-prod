import { CreditCard, X } from "lucide-react";

export type PaywallState = "out_of_usage" | "plan_inactive";

const BILLING_DENIAL_CODES: Record<string, PaywallState> = {
  insufficient_units: "out_of_usage",
  entitlement_inactive: "plan_inactive",
  access_expired: "plan_inactive",
};

export function classifyBillingDenial(
  code: string | null | undefined
): { isPaywall: boolean; state?: PaywallState } {
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

export function PaywallCard({
  state,
  planLabel,
  remaining,
  resetAt,
  message,
  onSeePlans,
  onDismiss,
}: PaywallCardProps) {
  const headline =
    state === "out_of_usage" ? "You're out of usage" : "Your plan is inactive";
  const reset = formatReset(resetAt);
  // Show structured detail line when we have plan data; else fall back to the
  // verbatim server denial message.
  const hasDetail = Boolean(planLabel) || typeof remaining === "number";

  return (
    <div className="zaki-approval-card" role="region" aria-label="Upgrade required">
      <div className="zaki-approval-card__layout">
        <div className="zaki-approval-card__icon" aria-hidden="true">
          <CreditCard className="size-[18px]" />
        </div>
        <div className="zaki-approval-card__body">
          <div className="zaki-approval-card__head">
            <div>
              <p>Billing</p>
              <h3>{headline}</h3>
            </div>
            <button
              type="button"
              className="zaki-approval-card__button"
              aria-label="Close paywall notice"
              onClick={onDismiss}
            >
              <span>
                <X className="size-3.5" />
              </span>
            </button>
          </div>

          <div className="zaki-approval-card__reason">
            {hasDetail ? (
              <>
                {planLabel ? <span>Plan: {planLabel}</span> : null}
                {typeof remaining === "number" ? (
                  <span>{planLabel ? " · " : ""}{remaining} left</span>
                ) : null}
                {state === "out_of_usage" && reset ? (
                  <span> · resets {reset}</span>
                ) : null}
              </>
            ) : (
              <span>{message}</span>
            )}
          </div>

          <div className="zaki-approval-card__actions">
            <button
              type="button"
              className="zaki-approval-card__button is-primary"
              onClick={onSeePlans}
            >
              <span>See plans</span>
            </button>
            <button
              type="button"
              className="zaki-approval-card__button"
              onClick={onDismiss}
            >
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
