import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useEntitlements, useResendPurchasedAccessCodeEmail, useSyncBilling } from "@/queries";
import { useAuthStore } from "@/stores";
import { trackProductEvent } from "@/lib/productTelemetry";
import { cn } from "@/lib/utils";

type PlanTier = "student" | "personal" | "agent" | "learn" | "complete" | null;
type BillingInterval = "monthly" | "yearly" | null;

function normalizePlan(value: string | null): PlanTier {
  if (
    value === "student" ||
    value === "personal" ||
    value === "agent" ||
    value === "learn" ||
    value === "complete"
  ) {
    return value;
  }
  return null;
}

function normalizeInterval(value: string | null): BillingInterval {
  if (value === "monthly" || value === "yearly") return value;
  return null;
}

export function BillingSuccessPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [searchParams] = useSearchParams();
  const [sharePending, setSharePending] = useState(false);
  const syncHandledRef = useRef(false);
  const syncBilling = useSyncBilling();
  const resendAccessCodeEmail = useResendPurchasedAccessCodeEmail();
  const { data: entitlementsResult } = useEntitlements();
  const user = useAuthStore((s) => s.user);

  const billingStatus = String(searchParams.get("billing") || "").toLowerCase();
  const successKind = String(searchParams.get("kind") || "").toLowerCase();
  const checkoutSessionId = String(searchParams.get("session_id") || "").trim();
  const isAccessCodeSuccess = billingStatus === "code_success" && successKind === "access_code";
  const requestedPlan = normalizePlan(searchParams.get("plan"));
  const requestedInterval = normalizeInterval(searchParams.get("interval"));

  const fallbackPlan = normalizePlan(String(entitlementsResult?.data?.plan?.tier || ""));
  const fallbackInterval = normalizeInterval(String(entitlementsResult?.data?.plan?.interval || ""));
  const plan = requestedPlan || fallbackPlan;
  const interval = requestedInterval || fallbackInterval;

  useEffect(() => {
    if (syncHandledRef.current) return;
    if (billingStatus !== "success") return;
    syncHandledRef.current = true;
    void trackProductEvent({
      event: "checkout_succeeded",
      source: "success_page",
      language: isRtl ? "ar" : "en",
      plan,
      interval,
    }).catch(() => {
      // Best-effort telemetry only.
    });
    void syncBilling.mutateAsync().catch(() => {
      // Webhook may still finalize shortly; no blocking UX.
    });
  }, [billingStatus, interval, isRtl, plan, syncBilling]);

  const displayName = useMemo(() => {
    const raw = String(user?.fullName || user?.username || "").trim();
    if (raw) return raw;
    return t("billingSuccess.defaultName");
  }, [t, user?.fullName, user?.username]);

  const planLabel = plan
    ? t(`pricingPage.plans.${plan}.label`, { defaultValue: plan })
    : t("billingSuccess.planFallback");
  const intervalLabel = interval
    ? t(`pricingPage.interval.${interval}`, { defaultValue: interval })
    : t("billingSuccess.intervalFallback");

  const punchlines = (t("billingSuccess.punchlines", {
    returnObjects: true,
  }) as string[]) || [t("billingSuccess.punchlineFallback")];
  const punchline = punchlines[Math.max(0, displayName.length % punchlines.length)];

  const shareText = t("billingSuccess.shareText", { name: displayName });

  const onShare = async () => {
    if (sharePending) return;
    setSharePending(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: t("billingSuccess.shareTitle"),
          text: shareText,
          url: window.location.origin,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} ${window.location.origin}`);
        toast.success(t("billingSuccess.shareCopied"));
        return;
      }
      toast(t("billingSuccess.shareManual"));
    } catch {
      // User canceled share dialog; no error toast.
    } finally {
      setSharePending(false);
    }
  };

  const onResendAccessCodeEmail = async () => {
    if (!checkoutSessionId) {
      toast.error(t("billingSuccess.accessCode.resendMissing"));
      return;
    }
    try {
      const result = await resendAccessCodeEmail.mutateAsync(checkoutSessionId);
      if (result.status === "processing") {
        toast(t("billingSuccess.accessCode.resendProcessing"));
        return;
      }
      if (result.status === "already_sent") {
        toast(t("billingSuccess.accessCode.resendAlreadySent"));
        return;
      }
      toast.success(t("billingSuccess.accessCode.resendSent"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("billingSuccess.accessCode.resendError")
      );
    }
  };

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden overscroll-y-contain zaki-scrollbar-fade px-4 py-8 sm:px-6 sm:py-10"
      style={{ WebkitOverflowScrolling: "touch" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-zaki-subtle bg-[linear-gradient(180deg,#fff8f0_0%,#f9ecdb_100%)] p-6 shadow-[0_20px_36px_rgba(15,12,11,0.08)] dark:border-zaki-dark dark:bg-[linear-gradient(180deg,#1b140f_0%,#140f0b_100%)] dark:shadow-[0_24px_52px_rgba(0,0,0,0.45)] sm:p-8 md:p-9">
          <div
            className={cn(
              "inline-flex items-center rounded-full border border-zaki-strong bg-zaki-raised px-3 py-1 text-xs font-semibold text-zaki-secondary",
              isRtl ? "tracking-normal" : "uppercase tracking-[0.14em]"
            )}
          >
            {isAccessCodeSuccess
              ? t("billingSuccess.accessCode.badge")
              : t("billingSuccess.badge")}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-zaki-primary md:text-4xl">
            {isAccessCodeSuccess
              ? t("billingSuccess.accessCode.title", { name: displayName })
              : t("billingSuccess.title", { name: displayName })}
          </h1>
          <p className="mt-3 text-sm leading-7 text-zaki-secondary md:text-base">
            {isAccessCodeSuccess
              ? t("billingSuccess.accessCode.subtitle")
              : t("billingSuccess.subtitle")}
          </p>

          {!isAccessCodeSuccess ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-zaki-strong bg-zaki-raised px-3 py-1 text-xs font-medium text-zaki-secondary">
                {t("billingSuccess.planLabel", { plan: planLabel })}
              </span>
              <span className="rounded-full border border-zaki-strong bg-zaki-raised px-3 py-1 text-xs font-medium text-zaki-secondary">
                {t("billingSuccess.intervalLabel", { interval: intervalLabel })}
              </span>
            </div>
          ) : null}

          <p className="mt-5 rounded-2xl border border-zaki-strong bg-zaki-raised px-4 py-3 text-sm leading-7 text-zaki-secondary">
            {isAccessCodeSuccess ? t("billingSuccess.accessCode.punchline") : punchline}
          </p>

          <ul
            className={cn(
              "mt-5 flex list-disc flex-col gap-2 text-sm text-zaki-secondary",
              isRtl ? "pr-5" : "pl-5"
            )}
          >
            {(
              isAccessCodeSuccess
                ? (t("billingSuccess.accessCode.nextSteps", {
                    returnObjects: true,
                  }) as string[])
                : (t("billingSuccess.nextSteps", { returnObjects: true }) as string[])
            ).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/" className="zaki-btn zaki-btn-primary w-full sm:w-auto">
              {t("billingSuccess.actions.start")}
            </Link>
            <Link to="/pricing" className="zaki-btn zaki-btn-secondary w-full sm:w-auto">
              {t("billingSuccess.actions.manage")}
            </Link>
            {isAccessCodeSuccess ? (
              <button
                type="button"
                onClick={onResendAccessCodeEmail}
                disabled={resendAccessCodeEmail.isPending}
                className="zaki-btn zaki-btn-ghost w-full border border-zaki-strong sm:w-auto"
              >
                {resendAccessCodeEmail.isPending
                  ? t("billingSuccess.accessCode.resending")
                  : t("billingSuccess.accessCode.resendCta")}
              </button>
            ) : (
              <button
                type="button"
                onClick={onShare}
                disabled={sharePending}
                className="zaki-btn zaki-btn-ghost w-full border border-zaki-strong sm:w-auto"
              >
                {sharePending
                  ? t("billingSuccess.actions.sharing")
                  : t("billingSuccess.actions.share")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
