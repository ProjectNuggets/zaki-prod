import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  useBillingConfig,
  useBillingPortal,
  useCancelSubscription,
  useCheckout,
  useEntitlements,
  useRedeemAccessCode,
  useSyncBilling,
} from "@/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PlanTier = "free" | "student" | "personal";
const planTiers: PlanTier[] = ["free", "student", "personal"];

type BillingNotice = {
  tone: "success" | "info";
  message: string;
};

type CheckoutProvider = {
  key: "stripe" | "paddle" | "creem";
  label: string;
  enabled: boolean;
  comingSoon?: boolean;
};

export function PricingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const language = i18n.language || undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const handledBillingStatusRef = useRef<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<BillingNotice | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [providerModalPlan, setProviderModalPlan] = useState<"student" | "personal" | null>(null);
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const cancelSubscription = useCancelSubscription();
  const syncBilling = useSyncBilling();
  const redeemAccessCode = useRedeemAccessCode();
  const { data: entitlementsResult } = useEntitlements();
  const { data: billingConfigResult } = useBillingConfig();
  const currentTier = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatus = entitlementsResult?.data?.plan?.status ?? "inactive";
  const cancelAtPeriodEnd = Boolean(entitlementsResult?.data?.plan?.cancelAtPeriodEnd);
  const accessActive = Boolean(entitlementsResult?.data?.access?.active);
  const accessExpiresAt = entitlementsResult?.data?.access?.expiresAt ?? null;
  const accessCampaign = entitlementsResult?.data?.access?.campaign ?? null;
  const isPremium =
    ["student", "personal"].includes(currentTier) &&
    ["active", "trialing", "past_due"].includes(planStatus);
  const activeViaAccessCode = accessActive && !isPremium;
  const billingConfig = billingConfigResult?.data?.configured;
  const billingConfigLoaded = Boolean(billingConfigResult);
  const billingPortalEnabled = billingConfigLoaded ? Boolean(billingConfig?.portalEnabled) : true;
  const billingCheckoutEnabled = billingConfigLoaded ? Boolean(billingConfig?.checkoutEnabled) : true;
  const billingCancelEnabled = billingConfigLoaded ? Boolean(billingConfig?.cancelEnabled) : true;
  const billingUnavailableMessage =
    billingConfigLoaded &&
    (!billingPortalEnabled || !billingCheckoutEnabled || (isPremium && !billingCancelEnabled))
      ? t("pricingPage.billingUnavailable")
      : null;
  const checkoutProviders = useMemo<CheckoutProvider[]>(() => {
    const providerCatalog: CheckoutProvider[] = [
      { key: "stripe", label: "Stripe", enabled: false },
      { key: "paddle", label: "Paddle", enabled: false },
      { key: "creem", label: "Creem", enabled: false, comingSoon: true },
    ];
    const configured = Array.isArray(billingConfig?.checkoutProviders)
      ? billingConfig?.checkoutProviders
      : [];
    const providerMap = new Map(providerCatalog.map((provider) => [provider.key, provider]));
    for (const provider of configured) {
      const key = String(provider?.key || "").toLowerCase();
      const normalizedKey = key === "external" ? "paddle" : key;
      if (normalizedKey !== "stripe" && normalizedKey !== "paddle" && normalizedKey !== "creem")
        continue;
      const current = providerMap.get(normalizedKey);
      if (!current) continue;
      providerMap.set(normalizedKey, {
        ...current,
          label:
            normalizedKey === "stripe"
              ? "Stripe"
              : String(provider?.label || current.label || "Provider"),
        enabled: Boolean(provider?.enabled) && !current.comingSoon,
      });
    }
    if (!billingConfigLoaded) {
      providerMap.set("paddle", {
        ...(providerMap.get("paddle") as CheckoutProvider),
        enabled: true,
      });
    }
    return providerCatalog.map((provider) => providerMap.get(provider.key) ?? provider);
  }, [billingConfig?.checkoutProviders, billingCheckoutEnabled]);

  const plans = useMemo(
    () =>
      planTiers.map((tier) => ({
        tier,
        label: t(`pricingPage.plans.${tier}.label`),
        price: t(`pricingPage.plans.${tier}.price`),
        blurb: t(`pricingPage.plans.${tier}.blurb`),
        features: t(`pricingPage.plans.${tier}.features`, {
          returnObjects: true,
        }) as string[],
      })),
    [t, i18n.language]
  );

  const billingNoticeByStatus = useMemo<Record<string, BillingNotice>>(
    () => ({
      success: {
        tone: "success",
        message: t("pricingPage.billingNotices.success"),
      },
      cancel: {
        tone: "info",
        message: t("pricingPage.billingNotices.cancel"),
      },
      manage: {
        tone: "success",
        message: t("pricingPage.billingNotices.manage"),
      },
    }),
    [t, i18n.language]
  );

  const currentPlanLabel = useMemo(() => {
    if (activeViaAccessCode) {
      return t("pricingPage.codeActivePlanLabel");
    }
    const plan = plans.find((p) => p.tier === currentTier);
    return plan?.label ?? t("pricingPage.plans.free.label");
  }, [activeViaAccessCode, currentTier, plans, t]);

  const localizedPlanStatus = useMemo(() => {
    if (activeViaAccessCode) {
      return t("pricingPage.statusValues.code_active");
    }
    return t(`pricingPage.statusValues.${planStatus}`, {
      defaultValue: planStatus,
    });
  }, [activeViaAccessCode, planStatus, t]);

  const accessExpiresLabel = useMemo(() => {
    if (!accessExpiresAt) return null;
    const date = new Date(accessExpiresAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [accessExpiresAt, language]);

  const accessSummary = useMemo(() => {
    if (!accessActive) {
      return t("pricingPage.access.summaryInactive");
    }
    if (accessExpiresLabel && accessCampaign) {
      return t("pricingPage.access.summaryActiveUntilCampaign", {
        date: accessExpiresLabel,
        campaign: accessCampaign,
      });
    }
    if (accessExpiresLabel) {
      return t("pricingPage.access.summaryActiveUntil", { date: accessExpiresLabel });
    }
    if (accessCampaign) {
      return t("pricingPage.access.summaryActiveCampaign", { campaign: accessCampaign });
    }
    return t("pricingPage.access.summaryActive");
  }, [accessActive, accessCampaign, accessExpiresLabel, t]);

  useEffect(() => {
    const status = searchParams.get("billing");
    if (!status) return;
    if (handledBillingStatusRef.current === status) return;
    handledBillingStatusRef.current = status;
    const notice = billingNoticeByStatus[status];
    if (!notice) return;

    setBillingNotice(notice);
    if (notice.tone === "success") {
      toast.success(notice.message);
      if (status === "success") {
        void syncBilling.mutateAsync().catch(() => {
          // Ignore sync failures here; webhook may still arrive shortly.
        });
      }
    } else {
      toast(notice.message);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, syncBilling, billingNoticeByStatus]);

  const beginCheckout = async (
    plan: "student" | "personal",
    provider?: "stripe" | "paddle" | "creem"
  ) => {
    if (!billingCheckoutEnabled) {
      throw new Error(t("pricingPage.checkoutError"));
    }
    await checkout.mutateAsync({ plan, provider });
  };

  const openProviderSelection = (plan: "student" | "personal") => {
    const available = checkoutProviders.filter(
      (provider) => provider.enabled && !provider.comingSoon
    );
    if (available.length === 1) {
      void beginCheckout(plan, available[0].key).catch((err) => {
        toast.error(err instanceof Error ? err.message : t("pricingPage.checkoutError"));
      });
      return;
    }
    if (available.length === 0) {
      toast.error(t("pricingPage.checkoutError"));
      return;
    }
    setProviderModalPlan(plan);
  };

  return (
    <div className="min-h-full px-6 py-10" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-5xl">
        <div className={cn("flex flex-col gap-3", isRtl ? "text-right" : "text-left")}>
          <div
            className={cn(
              "text-xs font-semibold text-zaki-muted",
              isRtl ? "tracking-normal" : "uppercase tracking-[0.3em]"
            )}
          >
            {t("pricingPage.eyebrow")}
          </div>
          <h1 className="text-3xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {t("pricingPage.title")}
          </h1>
          <p className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {t("pricingPage.currentPlan", { plan: currentPlanLabel })}
            {" · "}
            {isPremium
              ? t("pricingPage.currentPlanPremium")
              : activeViaAccessCode
              ? t("pricingPage.currentPlanCodeActive")
              : t("pricingPage.currentPlanFree")}
          </p>
          {billingNotice && (
            <div
              className={cn(
                "inline-flex max-w-fit rounded-full border px-3 py-1 text-xs",
                billingNotice.tone === "success"
                  ? "border-zaki-success bg-zaki-success text-zaki-primary"
                  : "border-zaki-subtle bg-zaki-hover text-zaki-secondary"
              )}
            >
              {billingNotice.message}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="zaki-btn zaki-btn-primary"
              disabled={portal.isPending || !billingPortalEnabled}
              onClick={async () => {
                try {
                  if (!billingPortalEnabled) {
                    throw new Error(t("pricingPage.portalError"));
                  }
                  await portal.mutateAsync();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : t("pricingPage.portalError")
                  );
                }
              }}
            >
              {t("pricingPage.managePlan")}
            </button>
            <span className="text-xs text-zaki-muted self-center">
              {t("pricingPage.statusLabel")}: {localizedPlanStatus}
            </span>
          </div>
          {billingUnavailableMessage && (
            <div className="text-xs text-zaki-muted">{billingUnavailableMessage}</div>
          )}
          {cancelAtPeriodEnd && (
            <div className="text-xs text-zaki-muted">{t("pricingPage.cancelAtPeriodEndNote")}</div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-5 shadow-[0px_16px_30px_rgba(15,15,15,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {t("pricingPage.access.title")}
                </div>
                <p className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                  {t("pricingPage.access.description")}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs",
                  isRtl ? "tracking-normal" : "uppercase tracking-[0.2em]",
                  accessActive
                    ? "border-zaki-success bg-zaki-success text-zaki-primary"
                    : "border-zaki-subtle bg-zaki-hover text-zaki-secondary"
                )}
              >
                {accessActive
                  ? t("pricingPage.access.stateActive")
                  : t("pricingPage.access.stateInactive")}
              </span>
            </div>
            <div
              className={cn(
                "mt-4 flex flex-col gap-2 sm:flex-row",
                isRtl && "sm:flex-row-reverse"
              )}
            >
              <input
                type="text"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder={t("pricingPage.access.placeholder")}
                className="w-full rounded-full border border-zaki-subtle bg-white px-4 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:bg-zaki-dark-card dark:text-zaki-dark-primary"
              />
              <button
                type="button"
                className="zaki-btn zaki-btn-primary disabled:opacity-50"
                disabled={redeemAccessCode.isPending || accessCode.trim().length === 0}
                onClick={async () => {
                  const code = accessCode.trim();
                  if (!code) return;
                  try {
                    const result = await redeemAccessCode.mutateAsync(code);
                    const expiry = result.accessExpiresAt
                      ? new Date(result.accessExpiresAt)
                      : null;
                    const expiryLabel =
                      expiry && !Number.isNaN(expiry.getTime())
                        ? expiry.toLocaleDateString(language, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : null;
                    toast.success(
                      expiryLabel
                        ? t("pricingPage.access.toastActivatedUntil", {
                            date: expiryLabel,
                          })
                        : t("pricingPage.access.toastRedeemed")
                    );
                    setAccessCode("");
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : t("pricingPage.access.toastRedeemFailed")
                    );
                  }
                }}
              >
                {redeemAccessCode.isPending
                  ? t("pricingPage.access.applying")
                  : t("pricingPage.access.apply")}
              </button>
            </div>
            <div className="mt-3 text-xs text-zaki-muted">{accessSummary}</div>
          </div>
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isCurrentActivePaidPlan =
              isPremium && plan.tier !== "free" && currentTier === plan.tier;
            return (
              <div
                key={plan.tier}
                className={cn(
                  "rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] flex flex-col gap-3",
                  isCurrent && "border-zaki-brand"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {plan.label}
                  </div>
                  {isCurrent && (
                    <span
                      className={cn(
                        "text-2xs text-zaki-brand",
                        isRtl ? "tracking-normal" : "uppercase tracking-[0.2em]"
                      )}
                    >
                      {t("pricingPage.currentBadge")}
                    </span>
                  )}
                </div>
                <div className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {plan.price}
                </div>
                <p className="text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                  {plan.blurb}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-3">
                  {plan.tier === "free" ? (
                    <button
                      type="button"
                      className="w-full zaki-btn-sm zaki-btn-secondary"
                      disabled
                    >
                      {t("pricingPage.included")}
                    </button>
                  ) : isCurrentActivePaidPlan ? (
                    <button
                      type="button"
                      className="w-full zaki-btn-sm border border-zaki-strong dark:border-[#643126] text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(210,68,48,0.15)] transition-colors disabled:opacity-50"
                      disabled={
                        cancelAtPeriodEnd || cancelSubscription.isPending || !billingCancelEnabled
                      }
                      onClick={async () => {
                        try {
                          if (!billingCancelEnabled) {
                            throw new Error(t("pricingPage.cancelUnavailable"));
                          }
                          const result = await cancelSubscription.mutateAsync();
                          toast.success(
                            result?.alreadyScheduled
                              ? t("pricingPage.cancelAlreadyScheduled")
                              : t("pricingPage.cancelScheduled")
                          );
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : t("pricingPage.cancelError")
                          );
                        }
                      }}
                    >
                      {cancelAtPeriodEnd
                        ? t("pricingPage.cancellationScheduled")
                        : t("pricingPage.cancelSubscription")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full zaki-btn-sm zaki-btn-primary disabled:opacity-50"
                      disabled={checkout.isPending || isPremium}
                      onClick={async () => {
                        try {
                          openProviderSelection(plan.tier as "student" | "personal");
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : t("pricingPage.checkoutError")
                          );
                        }
                      }}
                    >
                      {isPremium
                        ? t("pricingPage.alreadySubscribed")
                        : t("pricingPage.choose", { plan: plan.label })}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {providerModalPlan && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.24)]">
            <div className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              Choose payment provider
            </div>
            <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
              Select where you want to complete checkout.
            </p>
            <div className="mt-4 grid gap-2">
              {checkoutProviders.map((provider) => (
                <button
                  key={provider.key}
                  type="button"
                  disabled={!provider.enabled || checkout.isPending || Boolean(provider.comingSoon)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    provider.enabled
                      ? "border-zaki-subtle bg-zaki-base hover:bg-zaki-hover text-zaki-primary dark:bg-zaki-dark-elevated dark:text-zaki-dark-primary"
                      : "border-zaki-subtle/60 bg-zaki-hover text-zaki-muted cursor-not-allowed"
                  )}
                  onClick={async () => {
                    try {
                      await beginCheckout(providerModalPlan, provider.key);
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : t("pricingPage.checkoutError")
                      );
                    } finally {
                      setProviderModalPlan(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{provider.label}</div>
                    {provider.comingSoon ? (
                      <span className="rounded-full border border-zaki-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                        Coming soon
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-zaki-muted mt-0.5">
                    {provider.comingSoon
                      ? "Locked for next release"
                      : provider.enabled
                      ? "Available"
                      : "Not configured"}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => setProviderModalPlan(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
