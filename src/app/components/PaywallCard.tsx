import { CreditCard, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";

// WP-B2 — `limit_reached` is a REAL limit state, not a toast.
//
// Anonymous chat is not metered by the unit wallet at all (reserveSpacesMeterUnits lets
// anonymous identities straight through). The gate that actually denies them is a DAILY
// PROMPT COUNTER, which the backend reports as `daily_limit_reached` / `weekly_limit_reached`.
// Those codes were missing from this map, so they fell through to a bare toast.error() —
// the exact pattern the spec bans. They are now first-class limit states that name the
// limit, show the exact reset time, preserve the unsent prompt, and offer ONE way forward.
export type PaywallState = "out_of_usage" | "plan_inactive" | "limit_reached";

/** Who is hitting the limit. Anonymous visitors can't "upgrade" — they must sign in first. */
export type PaywallIdentity = "anon" | "authed";

const BILLING_DENIAL_CODES: Record<string, PaywallState> = {
  insufficient_units: "out_of_usage",
  entitlement_inactive: "plan_inactive",
  access_expired: "plan_inactive",
  // The quota codes the backend ACTUALLY enforces — previously unmapped, hence the toast.
  daily_limit_reached: "limit_reached",
  weekly_limit_reached: "limit_reached",
  quota_exceeded: "limit_reached",
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
  // ── limit_reached only ────────────────────────────────────────────────
  /** Drives the CTA: anon → "Sign in to keep going"; authed → "Upgrade". */
  identity?: PaywallIdentity;
  /** "day" | "week" — names WHICH limit was hit. */
  limitPeriod?: "day" | "week" | null;
  /** How many of the allowance were used (for "N of M"). */
  limitUsed?: number | null;
  /** The allowance itself. */
  limitTotal?: number | null;
  /** True when the unsent prompt was restored to the composer. */
  promptPreserved?: boolean;
  /** Sign-in route for the anonymous variant. */
  onSignIn?: () => void;
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

// Spec §C-state-8 demands the EXACT reset date AND time — "tomorrow" is not an answer a
// user can plan around. e.g. "Jul 15 at 12:00 AM".
export function formatResetDateTime(resetAt?: string | null): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
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
  identity = "authed",
  limitPeriod = "day",
  limitUsed,
  limitTotal,
  promptPreserved = false,
  onSignIn,
}: PaywallCardProps) {
  const { t } = useTranslation();
  const isLimitState = state === "limit_reached";
  const isAnon = identity === "anon";

  // ── The limit state: name the limit, show the exact reset, keep the task alive ──
  if (isLimitState) {
    const weekly = limitPeriod === "week";
    const resetLabel = formatResetDateTime(resetAt);
    const headline = weekly
      ? t("paywall.limit.titleWeekly", { defaultValue: "You've used this week's free limit" })
      : t("paywall.limit.titleDaily", { defaultValue: "You've used today's free limit" });

    const hasCount = typeof limitUsed === "number" && typeof limitTotal === "number";
    const usageDetail = hasCount
      ? weekly
        ? t("paywall.limit.usedWeekly", {
            used: limitUsed,
            total: limitTotal,
            defaultValue: `${limitUsed} of ${limitTotal} free chats used this week`,
          })
        : t("paywall.limit.usedDaily", {
            used: limitUsed,
            total: limitTotal,
            defaultValue: `${limitUsed} of ${limitTotal} free chats used today`,
          })
      : null;

    return (
      <div
        className="zaki-approval-card"
        role="region"
        data-testid="zaki-limit-state"
        data-identity={identity}
        aria-label={t("paywall.limit.aria", { defaultValue: "Free limit reached" })}
      >
        <div className="zaki-approval-card__layout">
          <div className="zaki-approval-card__icon" aria-hidden="true">
            <Clock className="size-[18px]" />
          </div>
          <div className="zaki-approval-card__body">
            <div className="zaki-approval-card__head">
              <div>
                <p>{t("paywall.limit.kicker", { defaultValue: "Free limit" })}</p>
                <h3>{headline}</h3>
              </div>
              <button
                type="button"
                className="zaki-approval-card__button"
                aria-label={t("paywall.limit.close", { defaultValue: "Close limit notice" })}
                onClick={onDismiss}
              >
                <span>
                  <X className="size-3.5" />
                </span>
              </button>
            </div>

            <div className="zaki-approval-card__reason">
              {usageDetail ? <span data-testid="zaki-limit-usage">{usageDetail}</span> : null}
              {resetLabel ? (
                // `data-reset` carries the exact formatted instant independently of the
                // i18n layer, so "we showed a REAL reset time" stays assertable.
                <span data-testid="zaki-limit-reset" data-reset={resetLabel}>
                  {usageDetail ? " · " : ""}
                  {t("paywall.limit.resets", {
                    reset: resetLabel,
                    defaultValue: `Resets ${resetLabel}`,
                  })}
                </span>
              ) : null}
              {!usageDetail && !resetLabel ? <span>{message}</span> : null}
            </div>

            {/* The unsent prompt is not lost — say so, because the user is watching their
                work appear to vanish behind a wall. */}
            {promptPreserved ? (
              <div className="zaki-approval-card__reason" data-testid="zaki-limit-preserved">
                <span>
                  {t("paywall.limit.promptSaved", {
                    defaultValue:
                      "Your message is saved in the composer — it'll still be here when you continue.",
                  })}
                </span>
              </div>
            ) : null}

            <div className="zaki-approval-card__actions">
              {isAnon ? (
                // Anonymous visitors have no wallet and nothing to upgrade. The one door
                // forward is an account — which is also what preserves this thread.
                <button
                  type="button"
                  className="zaki-approval-card__button is-primary"
                  onClick={onSignIn ?? onSeePlans}
                >
                  <span>
                    {t("paywall.limit.signInCta", { defaultValue: "Sign in to keep going" })}
                  </span>
                </button>
              ) : (
                // Frame the upgrade as continuing THIS task, not as buying a plan.
                <button
                  type="button"
                  className="zaki-approval-card__button is-primary"
                  onClick={onSeePlans}
                >
                  <span>
                    {t("paywall.limit.upgradeCta", {
                      defaultValue: "Upgrade to finish this task",
                    })}
                  </span>
                </button>
              )}
              <button type="button" className="zaki-approval-card__button" onClick={onDismiss}>
                <span>{t("paywall.limit.dismiss", { defaultValue: "Dismiss" })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Existing billing paywall states (unchanged) ──────────────────────────────
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
