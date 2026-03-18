import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  useBillingConfig,
  useBillingPortal,
  useCancelSubscription,
  useCheckout,
  useAccessCodePurchaseCheckout,
  useEntitlements,
  useRedeemAccessCode,
  useSyncBilling,
} from "@/queries";
import { trackProductEvent } from "@/lib/productTelemetry";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BillingInterval = "monthly" | "yearly";

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
  const plansSectionRef = useRef<HTMLDivElement | null>(null);
  const [billingNotice, setBillingNotice] = useState<BillingNotice | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>("monthly");
  const [accessCode, setAccessCode] = useState("");
  const [studentSelected, setStudentSelected] = useState(false);
  const [providerModalSelection, setProviderModalSelection] = useState<{
    plan: "student" | "personal";
    interval: BillingInterval;
  } | null>(null);
  const checkout = useCheckout();
  const accessCodePurchaseCheckout = useAccessCodePurchaseCheckout();
  const portal = useBillingPortal();
  const cancelSubscription = useCancelSubscription();
  const syncBilling = useSyncBilling();
  const redeemAccessCode = useRedeemAccessCode();
  const { data: entitlementsResult } = useEntitlements();
  const { data: billingConfigResult } = useBillingConfig();
  const requestedPlanFromQuery = (() => {
    const value = String(searchParams.get("plan") || "")
      .trim()
      .toLowerCase();
    return value === "student" || value === "personal" ? value : null;
  })();
  const requestedIntervalFromQuery = (() => {
    const value = String(searchParams.get("interval") || "")
      .trim()
      .toLowerCase();
    return value === "yearly" || value === "monthly" ? value : null;
  })();
  const requestedIntentFromQuery = (() => {
    const value = String(searchParams.get("intent") || "")
      .trim()
      .toLowerCase();
    return value === "gift_code" || value === "access_code_purchase" ? "gift_code" : null;
  })();
  const giftCodeIntentRequested = requestedIntentFromQuery === "gift_code";
  const trackedPricingViewRef = useRef(false);
  const accessCodePurchaseCardRef = useRef<HTMLDivElement | null>(null);
  const [highlightGiftCodeCard, setHighlightGiftCodeCard] = useState(false);
  const sourceFromQuery: "website_nav" | "website_pricing" | "chat_input" | "settings" | "pricing_page" | "success_page" = (() => {
    const value = String(searchParams.get("source") || "")
      .trim()
      .toLowerCase();
    if (
      value === "website_nav" ||
      value === "website_pricing" ||
      value === "chat_input" ||
      value === "settings" ||
      value === "pricing_page" ||
      value === "success_page"
    ) {
      return value;
    }
    return "pricing_page";
  })();
  const entitlements = entitlementsResult?.data ?? null;
  const currentTier = entitlements?.plan?.tier ?? "free";
  const cancelAtPeriodEnd = Boolean(entitlements?.plan?.cancelAtPeriodEnd);
  const accessActive = Boolean(entitlements?.access?.active);
  const accessExpiresAt = entitlements?.access?.expiresAt ?? null;
  const accessCampaign = entitlements?.access?.campaign ?? null;
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const hasSubscription = hasActiveSubscription(entitlements);
  const currentDisplayTier = activeViaAccessCode ? effectiveEntitlement.tier : currentTier;
  const billingConfig = billingConfigResult?.data?.configured;
  const billingConfigLoaded = Boolean(billingConfigResult);
  const billingPortalEnabled = billingConfigLoaded ? Boolean(billingConfig?.portalEnabled) : true;
  const billingCheckoutEnabled = billingConfigLoaded ? Boolean(billingConfig?.checkoutEnabled) : true;
  const billingCancelEnabled = billingConfigLoaded ? Boolean(billingConfig?.cancelEnabled) : true;
  const accessCodePurchaseEnabled = billingConfigLoaded
    ? Boolean(billingConfig?.accessCodePurchaseEnabled)
    : false;
  const billingUnavailableMessage =
    billingConfigLoaded &&
    (!billingCheckoutEnabled || (hasSubscription && (!billingPortalEnabled || !billingCancelEnabled)))
      ? t("pricingPage.billingUnavailable")
      : null;
  const pricingAvailability = {
    student: {
      monthly: Boolean(billingConfig?.pricingAvailability?.student?.monthly ?? true),
      yearly: Boolean(billingConfig?.pricingAvailability?.student?.yearly ?? false),
    },
    personal: {
      monthly: Boolean(billingConfig?.pricingAvailability?.personal?.monthly ?? true),
      yearly: Boolean(billingConfig?.pricingAvailability?.personal?.yearly ?? false),
    },
  };
  const anyYearlyAvailable =
    pricingAvailability.student.yearly || pricingAvailability.personal.yearly;
  const formatCurrencyAmount = (unitAmount?: number | null, currency?: string | null) => {
    if (typeof unitAmount !== "number" || !Number.isFinite(unitAmount) || !currency) return null;
    try {
      return new Intl.NumberFormat(language, {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
        maximumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
      }).format(unitAmount / 100);
    } catch {
      return null;
    }
  };
  const getCatalogPlanPriceLabel = (
    plan: "student" | "personal",
    interval: BillingInterval,
    fallback: string
  ) => {
    const entry = billingConfig?.pricingCatalog?.[plan]?.[interval];
    const formatted = formatCurrencyAmount(entry?.unitAmount, entry?.currency);
    if (!formatted) return fallback;
    return t("pricingPage.priceWithSuffix", {
      price: formatted,
      suffix: t(`pricingPage.priceSuffix.${interval}`),
    });
  };
  const accessCodePriceLabel = (() => {
    const entry = billingConfig?.pricingCatalog?.access?.monthly;
    const formatted = formatCurrencyAmount(entry?.unitAmount, entry?.currency);
    if (!formatted) return t("pricingPage.access.purchase.price");
    return t("pricingPage.priceWithSuffix", {
      price: formatted,
      suffix: t("pricingPage.priceSuffix.oneTime"),
    });
  })();
  const pricingHighlights = [
    t("pricingPage.highlightsTemplates.free"),
    t("pricingPage.highlightsTemplates.personal", {
      price: getCatalogPlanPriceLabel(
        "personal",
        "monthly",
        t("pricingPage.plans.personal.priceMonthly", {
          defaultValue: t("pricingPage.plans.personal.price"),
        })
      ),
    }),
    t("pricingPage.highlightsTemplates.zaki"),
  ];
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
  }, [billingConfig?.checkoutProviders, billingConfigLoaded]);

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
    if (currentDisplayTier === "student") {
      return t("pricingPage.plans.student.label");
    }
    if (currentDisplayTier === "personal") {
      return t("pricingPage.plans.personal.label");
    }
    return t("pricingPage.plans.free.label");
  }, [activeViaAccessCode, currentDisplayTier, t]);

  const localizedPlanStatus = useMemo(() => {
    if (activeViaAccessCode) {
      return t("pricingPage.statusValues.code_active");
    }
    return t(`pricingPage.statusValues.${effectiveEntitlement.status}`, {
      defaultValue: effectiveEntitlement.status,
    });
  }, [activeViaAccessCode, effectiveEntitlement.status, t]);

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
  const accessSecondaryHint = useMemo(() => {
    if (!accessActive) return null;
    return t("pricingPage.access.extendHint");
  }, [accessActive, t]);

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

  const resolveIntervalForPlan = (
    plan: "student" | "personal",
    requestedInterval: BillingInterval
  ): BillingInterval => {
    const available = pricingAvailability[plan];
    if (requestedInterval === "yearly" && !available.yearly) {
      return "monthly";
    }
    return requestedInterval;
  };
  const freeFeatures = t("pricingPage.plans.free.features", {
    returnObjects: true,
  }) as string[];
  const personalFeatures = t("pricingPage.plans.personal.features", {
    returnObjects: true,
  }) as string[];
  const zakiFeatures = t("pricingPage.plans.zaki.features", {
    returnObjects: true,
  }) as string[];
  const studentRateLabel = getCatalogPlanPriceLabel(
    "student",
    selectedInterval === "yearly" ? resolveIntervalForPlan("student", selectedInterval) : "monthly",
    selectedInterval === "yearly"
      ? t("pricingPage.plans.student.priceYearly", {
          defaultValue: t("pricingPage.plans.student.price"),
        })
      : t("pricingPage.plans.student.priceMonthly", {
          defaultValue: t("pricingPage.plans.student.price"),
        })
  );
  const personalPriceLabel = getCatalogPlanPriceLabel(
    "personal",
    selectedInterval === "yearly" ? resolveIntervalForPlan("personal", selectedInterval) : "monthly",
    selectedInterval === "yearly"
      ? t("pricingPage.plans.personal.priceYearly", {
          defaultValue: t("pricingPage.plans.personal.price"),
        })
      : t("pricingPage.plans.personal.priceMonthly", {
          defaultValue: t("pricingPage.plans.personal.price"),
        })
  );
  const paidPlanCurrent = hasSubscription && (currentTier === "student" || currentTier === "personal");
  const selectedPaidPlan: "student" | "personal" = studentSelected ? "student" : "personal";
  const selectedPaidPriceLabel = studentSelected ? studentRateLabel : personalPriceLabel;

  const beginCheckout = async (
    plan: "student" | "personal",
    interval: BillingInterval,
    provider?: "stripe" | "paddle" | "creem"
  ) => {
    if (!billingCheckoutEnabled) {
      throw new Error(t("pricingPage.checkoutError"));
    }
    void trackProductEvent({
      event: "checkout_started",
      source: sourceFromQuery,
      language: isRtl ? "ar" : "en",
      plan,
      interval,
    }).catch(() => {
      // Best-effort telemetry only.
    });
    await checkout.mutateAsync({
      plan,
      provider,
      interval,
      context: { source: sourceFromQuery },
    });
  };

  const openProviderSelection = (
    plan: "student" | "personal",
    requestedInterval: BillingInterval
  ) => {
    void trackProductEvent({
      event: "upgrade_cta_clicked",
      source: sourceFromQuery,
      language: isRtl ? "ar" : "en",
      plan,
      interval: requestedInterval,
    }).catch(() => {
      // Best-effort telemetry only.
    });
    const interval = resolveIntervalForPlan(plan, requestedInterval);
    const yearlyStripeOnly = interval === "yearly";
    const available = checkoutProviders.filter(
      (provider) =>
        provider.enabled &&
        !provider.comingSoon &&
        (!yearlyStripeOnly || provider.key === "stripe")
    );
    const onlyProvider = available[0];
    if (available.length === 1 && onlyProvider) {
      void beginCheckout(plan, interval, onlyProvider.key).catch((err) => {
        toast.error(err instanceof Error ? err.message : t("pricingPage.checkoutError"));
      });
      return;
    }
    if (available.length === 0) {
      toast.error(yearlyStripeOnly ? t("pricingPage.yearlyStripeOnly") : t("pricingPage.checkoutError"));
      return;
    }
    setProviderModalSelection({ plan, interval });
  };

  useEffect(() => {
    if (trackedPricingViewRef.current) return;
    trackedPricingViewRef.current = true;
    void trackProductEvent({
      event: "pricing_viewed",
      source: sourceFromQuery,
      language: isRtl ? "ar" : "en",
      plan:
        effectiveEntitlement.tier === "student" || effectiveEntitlement.tier === "personal"
          ? effectiveEntitlement.tier
          : "free",
      interval: selectedInterval,
    }).catch(() => {
      // Best-effort telemetry only.
    });
  }, [effectiveEntitlement.tier, isRtl, selectedInterval, sourceFromQuery]);

  useEffect(() => {
    if (!requestedIntervalFromQuery) return;
    setSelectedInterval((previous) =>
      previous === requestedIntervalFromQuery ? previous : requestedIntervalFromQuery
    );
  }, [requestedIntervalFromQuery]);

  useEffect(() => {
    if (requestedPlanFromQuery === "student") {
      setStudentSelected(true);
      return;
    }
    if (requestedPlanFromQuery === "personal") {
      setStudentSelected(false);
      return;
    }
    if (hasSubscription && currentTier === "student") {
      setStudentSelected(true);
      return;
    }
    if (hasSubscription && currentTier === "personal") {
      setStudentSelected(false);
    }
  }, [currentTier, hasSubscription, requestedPlanFromQuery]);

  useEffect(() => {
    if (!giftCodeIntentRequested || requestedPlanFromQuery) return;
    const node = accessCodePurchaseCardRef.current;
    if (!node) return;
    if (typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightGiftCodeCard(true);
    const timer = window.setTimeout(() => {
      setHighlightGiftCodeCard(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [giftCodeIntentRequested, requestedPlanFromQuery]);

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden overscroll-y-contain zaki-scrollbar-fade px-6 py-10"
      style={{ WebkitOverflowScrolling: "touch" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
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
            {hasSubscription ? (
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
            ) : activeViaAccessCode ? (
              <>
                <button type="button" className="zaki-btn zaki-btn-primary opacity-80" disabled>
                  {t("pricingPage.accessActiveCta")}
                </button>
                <button
                  type="button"
                  className="zaki-btn zaki-btn-secondary"
                  onClick={() => plansSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {t("pricingPage.viewPlans")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="zaki-btn zaki-btn-primary"
                onClick={() => plansSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {t("pricingPage.viewPlans")}
              </button>
            )}
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

        <div ref={plansSectionRef} className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="order-3 md:col-span-2 xl:col-span-3 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-4 shadow-[0px_12px_24px_rgba(15,15,15,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {t("pricingPage.access.title")}
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
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
            {accessSecondaryHint ? (
              <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
                {accessSecondaryHint}
              </div>
            ) : null}
            <div className="mt-4 border-t border-zaki-subtle pt-4 dark:border-zaki-dark-border">
              <div
                id="access-code-purchase"
                ref={accessCodePurchaseCardRef}
                className={cn(
                  "flex flex-col gap-3 rounded-xl bg-[#fbf8f4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#181512]",
                  highlightGiftCodeCard &&
                    "ring-2 ring-[#D24430] ring-offset-2 ring-offset-white dark:ring-offset-[#171411]"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
                    {t("pricingPage.access.purchase.eyebrow")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {t("pricingPage.access.purchase.title")}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                    {t("pricingPage.access.purchase.description")}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 sm:flex-nowrap",
                    isRtl && "sm:flex-row-reverse sm:justify-start"
                  )}
                >
                  <span className="rounded-full border border-zaki-subtle bg-white px-2.5 py-1 text-2xs font-medium text-zaki-secondary dark:border-[#4a382c] dark:bg-[#221b16] dark:text-zaki-dark-subtle">
                    {accessCodePriceLabel}
                  </span>
                  <button
                    type="button"
                    className="zaki-btn zaki-btn-secondary disabled:opacity-50"
                    disabled={accessCodePurchaseCheckout.isPending || !accessCodePurchaseEnabled}
                    onClick={async () => {
                      void trackProductEvent({
                        event: "upgrade_cta_clicked",
                        source: sourceFromQuery,
                        language: isRtl ? "ar" : "en",
                        plan: "free",
                        interval: null,
                      }).catch(() => {
                        // Best-effort telemetry only.
                      });
                      try {
                        await accessCodePurchaseCheckout.mutateAsync({
                          source: sourceFromQuery,
                        });
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : t("pricingPage.access.purchase.checkoutError")
                        );
                      }
                    }}
                  >
                    {accessCodePurchaseCheckout.isPending
                      ? t("pricingPage.access.purchase.processing")
                      : t("pricingPage.access.purchase.cta")}
                  </button>
                </div>
              </div>
              {!accessCodePurchaseEnabled ? (
                <div className="mt-2 text-2xs text-zaki-muted">
                  {t("pricingPage.access.purchase.unavailable")}
                </div>
              ) : null}
            </div>
          </div>
          <div className="order-1 md:col-span-2 xl:col-span-3 h-0" />
          <div className="order-2 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("pricingPage.plans.free.label")}
              </div>
              {currentDisplayTier === "free" && (
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
              {t("pricingPage.plans.free.price")}
            </div>
            <p className="text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("pricingPage.plans.free.blurb")}
            </p>
            <ul
              className={cn(
                "mt-2 flex list-disc flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle",
                isRtl ? "pr-4" : "pl-4"
              )}
            >
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="mt-auto pt-3">
              <button type="button" className="w-full zaki-btn-sm zaki-btn-secondary" disabled>
                {t("pricingPage.included")}
              </button>
            </div>
          </div>
          <div
            className={cn(
              "order-2 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] flex flex-col gap-3",
              paidPlanCurrent && "border-zaki-brand"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("pricingPage.plans.personal.label")}
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-zaki-subtle bg-white px-1 py-1 dark:border-zaki-dark dark:bg-zaki-dark-card",
                  isRtl && "flex-row-reverse"
                )}
              >
                <button
                  type="button"
                  aria-pressed={selectedInterval === "monthly"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    selectedInterval === "monthly"
                      ? "bg-zaki-brand text-white"
                      : "text-zaki-secondary dark:text-zaki-dark-subtle"
                  )}
                  onClick={() => setSelectedInterval("monthly")}
                >
                  {t("pricingPage.interval.monthly")}
                </button>
                <button
                  type="button"
                  disabled={!anyYearlyAvailable}
                  aria-pressed={selectedInterval === "yearly"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    selectedInterval === "yearly"
                      ? "bg-zaki-brand text-white"
                      : "text-zaki-secondary dark:text-zaki-dark-subtle",
                    !anyYearlyAvailable && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => setSelectedInterval("yearly")}
                >
                  {t("pricingPage.interval.yearly")}
                </button>
              </div>
            </div>
            <div className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {selectedPaidPriceLabel}
            </div>
            <p className="text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("pricingPage.plans.personal.blurb")}
            </p>
            <ul
              className={cn(
                "mt-2 flex list-disc flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle",
                isRtl ? "pr-4" : "pl-4"
              )}
            >
              {personalFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <label
              className={cn(
                "inline-flex items-center gap-2 text-xs text-zaki-secondary dark:text-zaki-dark-subtle",
                isRtl && "flex-row-reverse"
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zaki-subtle text-zaki-brand focus:ring-zaki-focus"
                checked={studentSelected}
                onChange={(event) => setStudentSelected(event.target.checked)}
              />
              <span>{t("pricingPage.studentToggle")}</span>
            </label>
            <div className="mt-auto grid gap-2 pt-3">
              {paidPlanCurrent ? (
                <button
                  type="button"
                  className="w-full zaki-btn-sm border border-zaki-strong dark:border-[#643126] text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(210,68,48,0.15)] transition-colors disabled:opacity-50"
                  disabled={cancelAtPeriodEnd || cancelSubscription.isPending || !billingCancelEnabled}
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
                <>
                  <button
                    type="button"
                    className="w-full zaki-btn-sm zaki-btn-primary disabled:opacity-50"
                    disabled={checkout.isPending || isPremium}
                    onClick={() => {
                      openProviderSelection(selectedPaidPlan, selectedInterval);
                    }}
                  >
                    {activeViaAccessCode
                      ? t("pricingPage.accessActiveCta")
                      : isPremium
                      ? t("pricingPage.alreadySubscribed")
                      : t("pricingPage.choose", { plan: t("pricingPage.plans.personal.label") })}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="order-2 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("pricingPage.plans.zaki.label")}
              </div>
              <span className="rounded-full border border-zaki-subtle px-2.5 py-1 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle">
                {t("pricingPage.plans.zaki.badge")}
              </span>
            </div>
            <div className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {t("pricingPage.plans.zaki.price")}
            </div>
            <p className="text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("pricingPage.plans.zaki.blurb")}
            </p>
            <ul
              className={cn(
                "mt-2 flex list-disc flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle",
                isRtl ? "pr-4" : "pl-4"
              )}
            >
              {zakiFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="mt-auto pt-3">
              <button
                type="button"
                className="w-full zaki-btn-sm zaki-btn-secondary"
                disabled
              >
                {t("pricingPage.plans.zaki.cta")}
              </button>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "mt-6 flex flex-wrap gap-2 border-t border-zaki-subtle pt-4 dark:border-zaki-dark",
            isRtl ? "justify-end" : "justify-start"
          )}
        >
          <p className="w-full max-w-3xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {activeViaAccessCode ? t("pricingPage.subtitleAccessActive") : t("pricingPage.subtitle")}
          </p>
          {pricingHighlights.map((item) => (
            <span
              key={item}
              className="inline-flex rounded-full border border-zaki-subtle bg-white px-3 py-1 text-xs text-zaki-secondary dark:border-zaki-dark dark:bg-zaki-dark-card dark:text-zaki-dark-subtle"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      {providerModalSelection && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
          <div
            className={cn(
              "w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.24)]",
              isRtl ? "text-right" : "text-left"
            )}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {t("pricingPage.providerModal.title")}
            </div>
            <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("pricingPage.providerModal.description")}
            </p>
            {providerModalSelection.interval === "yearly" ? (
              <p className="mt-2 text-xs text-zaki-muted">{t("pricingPage.yearlyStripeOnly")}</p>
            ) : null}
            <div className="mt-4 grid gap-2">
              {checkoutProviders.map((provider) => {
                const disabledForInterval =
                  providerModalSelection.interval === "yearly" && provider.key !== "stripe";
                const selectable =
                  provider.enabled &&
                  !provider.comingSoon &&
                  !checkout.isPending &&
                  !disabledForInterval;
                return (
                <button
                  key={provider.key}
                  type="button"
                  disabled={!selectable}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-sm transition-colors",
                    selectable
                      ? "border-zaki-subtle bg-zaki-base hover:bg-zaki-hover text-zaki-primary dark:bg-zaki-dark-elevated dark:text-zaki-dark-primary"
                      : "border-zaki-subtle/60 bg-zaki-hover text-zaki-muted cursor-not-allowed"
                  )}
                  onClick={async () => {
                    try {
                      await beginCheckout(
                        providerModalSelection.plan,
                        providerModalSelection.interval,
                        provider.key
                      );
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : t("pricingPage.checkoutError")
                      );
                    } finally {
                      setProviderModalSelection(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{provider.label}</div>
                    {provider.comingSoon ? (
                      <span className="rounded-full border border-zaki-subtle px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                        {t("pricingPage.providerModal.comingSoon")}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-zaki-muted mt-0.5">
                    {provider.comingSoon
                      ? t("pricingPage.providerModal.locked")
                      : selectable
                      ? t("pricingPage.providerModal.available")
                      : t("pricingPage.providerModal.notConfigured")}
                  </div>
                </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={() => setProviderModalSelection(null)}
              >
                {t("pricingPage.providerModal.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
