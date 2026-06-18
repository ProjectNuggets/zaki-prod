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
  effectiveRemaining?: number;
  requiredUnits?: number;
  constraint?: string | null;
  rollingWindowPercent?: number | null;
  rollingWindowHours?: number | null;
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

function formatClearTime(resetAt?: string | null): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function PaywallCard({
  state,
  planLabel,
  constraint,
  rollingWindowPercent,
  rollingWindowHours,
  resetAt,
  message,
  onSeePlans,
  onDismiss,
}: PaywallCardProps) {
  const headline =
    state === "out_of_usage" && constraint === "rolling"
      ? "Current capacity window needs room"
      : state === "out_of_usage"
        ? "Weekly usage is full"
        : "Your plan is inactive";
  const reset = constraint === "rolling" ? formatClearTime(resetAt) : formatReset(resetAt);
  const roundedRollingPercent =
    typeof rollingWindowPercent === "number" && Number.isFinite(rollingWindowPercent)
      ? Math.max(0, Math.min(100, Math.round(rollingWindowPercent)))
      : null;
  const windowHours =
    typeof rollingWindowHours === "number" && Number.isFinite(rollingWindowHours)
      ? rollingWindowHours
      : 5;
  const usageDetail =
    state === "out_of_usage" && constraint === "rolling"
      ? roundedRollingPercent == null
        ? "Current window is refreshing"
        : `${windowHours}-hour window is ${roundedRollingPercent}% used`
      : state === "out_of_usage" && (planLabel || reset)
        ? "Upgrade for more room"
        : null;
  const hasDetail = Boolean(planLabel || usageDetail || (state === "out_of_usage" && reset));

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
                {usageDetail ? (
                  <span>
                    {planLabel ? " · " : ""}
                    {usageDetail}
                  </span>
                ) : null}
                {state === "out_of_usage" && reset ? (
                  <span>
                    {planLabel || usageDetail ? " · " : ""}
                    {constraint === "rolling" ? "next room clears " : "resets "}
                    {reset}
                  </span>
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
