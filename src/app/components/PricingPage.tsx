import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  useAccessCodePurchaseCheckout,
  useBillingConfig,
  useBillingPortal,
  useCancelSubscription,
  useCheckout,
  useEntitlements,
  useRedeemAccessCode,
  useSyncBilling,
} from "@/queries";
import {
  isProductTelemetrySource,
  trackProductEvent,
  type ProductTelemetrySource,
} from "@/lib/productTelemetry";
import {
  hasActiveSubscription,
  resolveCommercialPlanId,
  resolveEffectiveEntitlement,
} from "@/lib/entitlements";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CommercialPaidPlan = "personal" | "pro" | "pro_max";
type CheckoutProviderKey = "stripe" | "paddle" | "creem";
type BillingInterval = "monthly" | "yearly";

type BillingNotice = {
  tone: "success" | "info";
  message: string;
};

type CheckoutProvider = {
  key: CheckoutProviderKey;
  label: string;
  enabled: boolean;
  comingSoon?: boolean;
};

type PricingCard = {
  id: "chat_free" | CommercialPaidPlan;
  plan?: CommercialPaidPlan;
  translationKey: "free" | CommercialPaidPlan;
  emphasized?: boolean;
  href?: string;
};

const PAID_PLAN_IDS: CommercialPaidPlan[] = ["personal", "pro", "pro_max"];
const PLAN_RANK: Record<CommercialPaidPlan, number> = {
  personal: 1,
  pro: 2,
  pro_max: 3,
};

const PRICING_CARDS: PricingCard[] = [
  { id: "chat_free", translationKey: "free", href: "/spaces" },
  { id: "personal", plan: "personal", translationKey: "personal" },
  { id: "pro", plan: "pro", translationKey: "pro", emphasized: true },
  { id: "pro_max", plan: "pro_max", translationKey: "pro_max" },
];

function normalizeBillingInterval(value: string | null): BillingInterval {
  return value === "yearly" ? "yearly" : "monthly";
}

function checkoutProviderSupportsPlan(provider: CheckoutProvider, plan: CommercialPaidPlan) {
  // Public checkout is Stripe-only for the commercial platform tiers. Legacy
  // provider URLs may remain configured, but must not receive these plan IDs.
  return provider.key === "stripe" && provider.enabled && !provider.comingSoon && Boolean(plan);
}

export function PricingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const language = i18n.language || undefined;
  const token = useAuthStore((state) => state.token);
  const [searchParams, setSearchParams] = useSearchParams();
  const handledBillingStatusRef = useRef<string | null>(null);
  const autostartRef = useRef<string | null>(null);
  const plansSectionRef = useRef<HTMLDivElement | null>(null);
  const accessCodePurchaseCardRef = useRef<HTMLDivElement | null>(null);
  const [billingNotice, setBillingNotice] = useState<BillingNotice | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [highlightGiftCodeCard, setHighlightGiftCodeCard] = useState(false);
  const [providerModalSelection, setProviderModalSelection] =
    useState<CommercialPaidPlan | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(() =>
    normalizeBillingInterval(searchParams.get("interval"))
  );

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
    return PAID_PLAN_IDS.includes(value as CommercialPaidPlan)
      ? (value as CommercialPaidPlan)
      : null;
  })();
  const giftCodeIntentRequested =
    String(searchParams.get("intent") || "").trim().toLowerCase() === "gift_code" ||
    String(searchParams.get("intent") || "").trim().toLowerCase() ===
      "access_code_purchase";
  const sourceFromQuery: ProductTelemetrySource = (() => {
    const value = String(searchParams.get("source") || "")
      .trim()
      .toLowerCase();
    if (isProductTelemetrySource(value)) return value;
    return "pricing_page";
  })();

  const entitlements = entitlementsResult?.data ?? null;
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const commercialPlanId = resolveCommercialPlanId(entitlements);
  const currentTier = entitlements?.plan?.tier ?? "free";
  const hasSubscription = hasActiveSubscription(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const cancelAtPeriodEnd = Boolean(entitlements?.plan?.cancelAtPeriodEnd);
  const accessActive = Boolean(entitlements?.access?.active);
  const accessExpiresAt = entitlements?.access?.expiresAt ?? null;
  const accessCampaign = entitlements?.access?.campaign ?? null;

  const billingConfig = billingConfigResult?.data?.configured;
  const billingConfigLoaded = Boolean(billingConfigResult);
  const billingPortalEnabled = billingConfigLoaded ? Boolean(billingConfig?.portalEnabled) : true;
  const billingCheckoutEnabled = !token
    ? true
    : billingConfigLoaded
    ? Boolean(billingConfig?.checkoutEnabled)
    : true;
  const billingCancelEnabled = billingConfigLoaded ? Boolean(billingConfig?.cancelEnabled) : true;
  const accessCodePurchaseEnabled = billingConfigLoaded
    ? Boolean(billingConfig?.accessCodePurchaseEnabled)
    : false;
  const billingUnavailableMessage =
    token &&
    billingConfigLoaded &&
    (!billingCheckoutEnabled || (hasSubscription && (!billingPortalEnabled || !billingCancelEnabled)))
      ? t("pricingPage.billingUnavailable")
      : null;

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

  const isPlanIntervalAvailable = (plan: CommercialPaidPlan, interval = billingInterval) => {
    // Preserve the existing monthly provider/error flow. Annual checkout is
    // stricter because only explicitly configured Stripe yearly Prices are valid.
    if (interval === "monthly") return true;
    if (!billingConfigLoaded) return true;
    return Boolean(billingConfig?.pricingAvailability?.[plan]?.[interval]);
  };

  const getPlanPriceLabel = (plan: CommercialPaidPlan) => {
    const entry = billingConfig?.pricingCatalog?.[plan]?.[billingInterval];
    const formatted = formatCurrencyAmount(entry?.unitAmount, entry?.currency);
    if (!formatted) {
      if (billingInterval === "yearly" && !isPlanIntervalAvailable(plan, "yearly")) {
        return t("pricingPage.intervalUnavailable", { interval: t("pricingPage.interval.yearly") });
      }
      return t(`pricingPage.plans.${plan}.price`);
    }
    return t("pricingPage.priceWithSuffix", {
      price: formatted,
      suffix: t(`pricingPage.priceSuffix.${billingInterval}`),
    });
  };

  const yearlySavingsPercent = useMemo(() => {
    const percentages = PAID_PLAN_IDS.flatMap((plan) => {
      const monthly = billingConfig?.pricingCatalog?.[plan]?.monthly?.unitAmount;
      const yearly = billingConfig?.pricingCatalog?.[plan]?.yearly?.unitAmount;
      if (
        typeof monthly !== "number" ||
        typeof yearly !== "number" ||
        monthly <= 0 ||
        yearly <= 0 ||
        yearly >= monthly * 12
      ) {
        return [];
      }
      return [Math.round((1 - yearly / (monthly * 12)) * 100)];
    });
    return percentages.length > 0 ? Math.max(...percentages) : null;
  }, [billingConfig?.pricingCatalog]);

  const yearlyBillingAvailable = PAID_PLAN_IDS.some((plan) =>
    Boolean(billingConfig?.pricingAvailability?.[plan]?.yearly)
  );

  const accessCodePriceLabel = (() => {
    const entry = billingConfig?.pricingCatalog?.access?.monthly;
    const formatted = formatCurrencyAmount(entry?.unitAmount, entry?.currency);
    if (!formatted) return t("pricingPage.access.purchase.price");
    return t("pricingPage.priceWithSuffix", {
      price: formatted,
      suffix: t("pricingPage.priceSuffix.oneTime"),
    });
  })();

  const formatAllowanceNumber = (value?: number | null) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
  };

  const getPlanAllowanceLabel = (card: PricingCard) => {
    const allowancePlan =
      card.id === "chat_free"
        ? billingConfig?.platformPlanAllowances?.free
        : card.plan
        ? billingConfig?.platformPlanAllowances?.[card.plan]
        : null;
    const allowance = formatAllowanceNumber(allowancePlan?.weeklyAllowanceUnits);
    if (!allowance) return null;
    return t("pricingPage.allowance.weekly", { allowance });
  };

  const checkoutProviders = useMemo<CheckoutProvider[]>(() => {
    const providerCatalog: CheckoutProvider[] = [
      { key: "stripe", label: "Stripe", enabled: false },
      { key: "paddle", label: "Paddle", enabled: false },
      { key: "creem", label: "Creem", enabled: false, comingSoon: true },
    ];
    const configured = Array.isArray(billingConfig?.checkoutProviders)
      ? billingConfig.checkoutProviders
      : [];
    const providerMap = new Map(providerCatalog.map((provider) => [provider.key, provider]));
    for (const provider of configured) {
      const key = String(provider?.key || "").toLowerCase();
      const normalizedKey = key === "external" ? "paddle" : key;
      if (normalizedKey !== "stripe" && normalizedKey !== "paddle" && normalizedKey !== "creem") {
        continue;
      }
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
    return providerCatalog.map((provider) => providerMap.get(provider.key) ?? provider);
  }, [billingConfig?.checkoutProviders]);

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
    if (activeViaAccessCode) return t("pricingPage.codeActivePlanLabel");
    if (PAID_PLAN_IDS.includes(commercialPlanId as CommercialPaidPlan)) {
      return t(`pricingPage.plans.${commercialPlanId}.label`);
    }
    if (commercialPlanId === "agent" || commercialPlanId === "learn" || commercialPlanId === "complete" || commercialPlanId === "legacy_personal") {
      return t("pricingPage.legacyPremiumPlanLabel");
    }
    if (PAID_PLAN_IDS.includes(currentTier as CommercialPaidPlan)) {
      return t(`pricingPage.plans.${currentTier}.label`);
    }
    if (currentTier === "student") {
      return t("pricingPage.legacyPremiumPlanLabel");
    }
    return t("pricingPage.plans.free.label");
  }, [activeViaAccessCode, commercialPlanId, currentTier, t]);

  const localizedPlanStatus = useMemo(() => {
    if (activeViaAccessCode) return t("pricingPage.statusValues.code_active");
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
    if (!accessActive) return t("pricingPage.access.summaryInactive");
    if (accessExpiresLabel && accessCampaign) {
      return t("pricingPage.access.summaryActiveUntilCampaign", {
        date: accessExpiresLabel,
        campaign: accessCampaign,
      });
    }
    if (accessExpiresLabel) return t("pricingPage.access.summaryActiveUntil", { date: accessExpiresLabel });
    if (accessCampaign) return t("pricingPage.access.summaryActiveCampaign", { campaign: accessCampaign });
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
          // Webhook may still arrive shortly.
        });
      }
    } else {
      toast(notice.message);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, syncBilling, billingNoticeByStatus]);

  useEffect(() => {
    if (!giftCodeIntentRequested || requestedPlanFromQuery) return;
    const node = accessCodePurchaseCardRef.current;
    if (!node) return;
    if (typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightGiftCodeCard(true);
    const timer = window.setTimeout(() => setHighlightGiftCodeCard(false), 2200);
    return () => window.clearTimeout(timer);
  }, [giftCodeIntentRequested, requestedPlanFromQuery]);

  const requestSignInForPlan = (plan: CommercialPaidPlan) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("plan", plan);
    nextParams.set("interval", billingInterval);
    nextParams.set("autostart", "1");
    nextParams.set("auth", "login");
    nextParams.set("source", sourceFromQuery);
    setSearchParams(nextParams, { replace: false });
  };

  const beginCheckout = async (plan: CommercialPaidPlan, provider?: CheckoutProviderKey) => {
    if (!token) {
      requestSignInForPlan(plan);
      return;
    }
    if (!billingCheckoutEnabled) {
      throw new Error(t("pricingPage.checkoutError"));
    }
    void trackProductEvent({
      event: "checkout_started",
      source: sourceFromQuery,
      language: isRtl ? "ar" : "en",
      plan,
      interval: billingInterval,
    }).catch(() => {
      // Best-effort telemetry only.
    });
    await checkout.mutateAsync({
      plan,
      provider,
      interval: billingInterval,
      context: { source: sourceFromQuery },
    });
  };

  const openProviderSelection = (plan: CommercialPaidPlan) => {
    void trackProductEvent({
      event: "upgrade_cta_clicked",
      source: sourceFromQuery,
      language: isRtl ? "ar" : "en",
      plan,
      interval: billingInterval,
    }).catch(() => {
      // Best-effort telemetry only.
    });

    if (!token) {
      requestSignInForPlan(plan);
      return;
    }

    if (!isPlanIntervalAvailable(plan)) {
      toast.error(
        t("pricingPage.intervalUnavailable", {
          interval: t(`pricingPage.interval.${billingInterval}`),
        })
      );
      return;
    }

    const available = checkoutProviders.filter((provider) =>
      checkoutProviderSupportsPlan(provider, plan)
    );
    const onlyProvider = available[0];
    if (available.length === 1 && onlyProvider) {
      void beginCheckout(plan, onlyProvider.key).catch((err) => {
        toast.error(err instanceof Error ? err.message : t("pricingPage.checkoutError"));
      });
      return;
    }
    if (available.length === 0) {
      toast.error(t("pricingPage.checkoutError"));
      return;
    }
    setProviderModalSelection(plan);
  };

  useEffect(() => {
    if (!token || !requestedPlanFromQuery || searchParams.get("autostart") !== "1") return;
    if (!billingConfigLoaded) return;
    const key = `${requestedPlanFromQuery}:${searchParams.toString()}`;
    if (autostartRef.current === key) return;
    autostartRef.current = key;
    openProviderSelection(requestedPlanFromQuery);
  }, [billingConfigLoaded, requestedPlanFromQuery, searchParams, token]);

  const renderPlanButton = (card: PricingCard) => {
    if (!card.plan) {
      return (
        <a href={card.href || "/"} className="w-full zaki-btn-sm zaki-btn-secondary text-center">
          {t(`pricingPage.plans.${card.translationKey}.cta`)}
        </a>
      );
    }

    const current = commercialPlanId === card.plan;
    const currentPaidPlan = PAID_PLAN_IDS.includes(commercialPlanId as CommercialPaidPlan)
      ? (commercialPlanId as CommercialPaidPlan)
      : PAID_PLAN_IDS.includes(currentTier as CommercialPaidPlan)
      ? (currentTier as CommercialPaidPlan)
      : null;
    const currentPlanIncludesCard = Boolean(
      hasSubscription &&
      card.plan &&
      currentPaidPlan &&
      PLAN_RANK[currentPaidPlan] > PLAN_RANK[card.plan]
    );
    const checkoutPlan = card.plan;
    const intervalAvailable = isPlanIntervalAvailable(checkoutPlan);
    const emphasized =
      billingInterval === "yearly" ? checkoutPlan === "personal" : Boolean(card.emphasized);

    if (hasSubscription && current) {
      return (
        <button
          type="button"
          className="w-full zaki-btn-sm zaki-btn-secondary"
          disabled={!billingPortalEnabled || portal.isPending}
          onClick={async () => {
            try {
              await portal.mutateAsync();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("pricingPage.portalError"));
            }
          }}
        >
          {t("pricingPage.managePlan")}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={cn(
          "w-full zaki-btn-sm disabled:opacity-50",
          emphasized ? "zaki-btn-primary" : "zaki-btn-secondary"
        )}
        disabled={checkout.isPending || currentPlanIncludesCard || !intervalAvailable}
        onClick={() => openProviderSelection(checkoutPlan as CommercialPaidPlan)}
      >
        {!intervalAvailable
          ? t("pricingPage.intervalUnavailable", {
              interval: t(`pricingPage.interval.${billingInterval}`),
            })
          : !token
          ? t("pricingPage.signInToChoose", {
              plan: t(`pricingPage.plans.${card.translationKey}.label`),
            })
          : currentPlanIncludesCard
          ? t("pricingPage.included")
          : t("pricingPage.choose", {
              plan: t(`pricingPage.plans.${card.translationKey}.label`),
            })}
      </button>
    );
  };

  const pricingHighlights = [
    t("pricingPage.highlightsTemplates.free"),
    t("pricingPage.highlightsTemplates.personal"),
    t("pricingPage.highlightsTemplates.pro"),
    t("pricingPage.highlightsTemplates.pro_max"),
  ];

  return (
    <div
      className="zaki-pricing-page h-full overflow-y-auto overflow-x-hidden overscroll-y-contain zaki-scrollbar-fade px-4 py-6 sm:px-6 sm:py-10"
      style={{ WebkitOverflowScrolling: "touch" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto w-full max-w-6xl">
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
          <p className="max-w-3xl text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {t("pricingPage.subtitle")}
          </p>
          <p className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {token
              ? t("pricingPage.currentPlan", { plan: currentPlanLabel })
              : t("pricingPage.currentPlanSignedOut")}
            {" · "}
            {token
              ? activeViaAccessCode
                ? t("pricingPage.currentPlanCodeActive")
                : isPremium
                ? t("pricingPage.currentPlanPremium")
                : t("pricingPage.currentPlanFree")
              : t("pricingPage.currentPlanSignInHint")}
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
          <div className="zaki-pricing-page__hero-actions flex flex-wrap gap-3">
            {hasSubscription ? (
              <button
                type="button"
                className="zaki-btn zaki-btn-primary"
                disabled={portal.isPending || !billingPortalEnabled}
                onClick={async () => {
                  try {
                    await portal.mutateAsync();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : t("pricingPage.portalError"));
                  }
                }}
              >
                {t("pricingPage.managePlan")}
              </button>
            ) : (
              <button
                type="button"
                className="zaki-btn zaki-btn-primary"
                onClick={() => plansSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                {t("pricingPage.viewPlans")}
              </button>
            )}
            {token ? (
              <span className="text-xs text-zaki-muted self-center">
                {t("pricingPage.statusLabel")}: {localizedPlanStatus}
              </span>
            ) : null}
          </div>
          {billingUnavailableMessage && (
            <div className="text-xs text-zaki-muted">{billingUnavailableMessage}</div>
          )}
          {cancelAtPeriodEnd && (
            <div className="text-xs text-zaki-muted">{t("pricingPage.cancelAtPeriodEndNote")}</div>
          )}
        </div>

        <div
          className={cn(
            "mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
            isRtl && "sm:flex-row-reverse"
          )}
        >
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-zaki-muted">
            {t("pricingPage.billingCadence")}
          </div>
          <div
            className="inline-flex w-fit border border-zaki-strong bg-white dark:bg-zaki-dark-card"
            role="group"
            aria-label={t("pricingPage.billingCadence")}
          >
            {(["monthly", "yearly"] as BillingInterval[]).map((interval) => {
              const selected = billingInterval === interval;
              const disabled = interval === "yearly" && billingConfigLoaded && !yearlyBillingAvailable;
              const intervalLabel = t(`pricingPage.interval.${interval}`);
              const savingsLabel =
                interval === "yearly" && yearlySavingsPercent
                  ? t("pricingPage.savePercent", { percent: yearlySavingsPercent })
                  : null;
              return (
                <button
                  key={interval}
                  type="button"
                  aria-label={savingsLabel ? `${intervalLabel} ${savingsLabel}` : intervalLabel}
                  aria-pressed={selected}
                  disabled={disabled}
                  className={cn(
                    "border-r border-zaki-strong px-3 py-2 text-xs last:border-r-0 disabled:cursor-not-allowed disabled:opacity-40",
                    selected
                      ? "bg-zaki-primary text-white dark:bg-zaki-dark-primary dark:text-zaki-dark"
                      : "text-zaki-secondary hover:text-zaki-primary dark:text-zaki-dark-subtle"
                  )}
                  onClick={() => setBillingInterval(interval)}
                >
                  {intervalLabel}
                  {savingsLabel ? (
                    <span className={cn("ml-1", isRtl && "ml-0 mr-1")}>
                      {savingsLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div ref={plansSectionRef} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_CARDS.map((card) => {
            const features = t(`pricingPage.plans.${card.translationKey}.features`, {
              returnObjects: true,
            }) as string[];
            const priceLabel = card.plan
              ? getPlanPriceLabel(card.plan)
              : t(`pricingPage.plans.${card.translationKey}.price`);
            const allowanceLabel = getPlanAllowanceLabel(card);
            const emphasized =
              billingInterval === "yearly" ? card.plan === "personal" : Boolean(card.emphasized);
            return (
              <div
                key={card.id}
                className={cn(
                  "zaki-pricing-page__plan rounded-2xl border bg-white dark:bg-zaki-dark-card px-5 py-6 shadow-[0px_16px_30px_rgba(15,15,15,0.06)] flex flex-col gap-3",
                  emphasized
                    ? "border-zaki-brand ring-1 ring-zaki-brand/20"
                    : "border-zaki-subtle"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {t(`pricingPage.plans.${card.translationKey}.label`)}
                  </div>
                  {emphasized ? (
                    <span className="rounded-full border border-zaki-brand/30 bg-zaki-brand/10 px-2.5 py-1 text-2xs text-zaki-brand">
                      {t("pricingPage.recommendedBadge")}
                    </span>
                  ) : null}
                </div>
                <div className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {priceLabel}
                </div>
                <p className="text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                  {t(`pricingPage.plans.${card.translationKey}.blurb`)}
                </p>
                {allowanceLabel ? (
                  <div className="rounded-md border border-zaki-subtle bg-zaki-hover px-3 py-2 text-xs font-medium text-zaki-primary dark:text-zaki-dark-primary">
                    {allowanceLabel}
                  </div>
                ) : null}
                <ul
                  className={cn(
                    "mt-2 flex list-disc flex-col gap-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle",
                    isRtl ? "pr-4" : "pl-4"
                  )}
                >
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-3">{renderPlanButton(card)}</div>
              </div>
            );
          })}
        </div>

        <div className="zaki-pricing-page__access mt-6 rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card px-5 py-4 shadow-[0px_12px_24px_rgba(15,15,15,0.05)]">
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
              disabled={!token || redeemAccessCode.isPending || accessCode.trim().length === 0}
              onClick={async () => {
                const code = accessCode.trim();
                if (!code) return;
                try {
                  const result = await redeemAccessCode.mutateAsync(code);
                  const expiry = result.accessExpiresAt ? new Date(result.accessExpiresAt) : null;
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
                      ? t("pricingPage.access.toastActivatedUntil", { date: expiryLabel })
                      : t("pricingPage.access.toastRedeemed")
                  );
                  setAccessCode("");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : t("pricingPage.access.toastRedeemFailed")
                  );
                }
              }}
            >
              {!token
                ? t("pricingPage.signInRequired")
                : redeemAccessCode.isPending
                ? t("pricingPage.access.applying")
                : t("pricingPage.access.apply")}
            </button>
          </div>
          <div className="mt-3 text-xs text-zaki-muted">{accessSummary}</div>
          {accessActive ? (
            <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("pricingPage.access.extendHint")}
            </div>
          ) : null}
          <div className="mt-4 border-t border-zaki-subtle pt-4 dark:border-zaki-dark-border">
            <div
              id="access-code-purchase"
              ref={accessCodePurchaseCardRef}
              className={cn(
                "zaki-pricing-page__access-purchase flex flex-col gap-3 rounded-xl bg-[#fbf8f4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-[#181512]",
                highlightGiftCodeCard &&
                  "ring-2 ring-[#f10202] ring-offset-2 ring-offset-white dark:ring-offset-[#171411]"
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
                  "zaki-pricing-page__purchase-actions flex flex-wrap items-center gap-2 sm:flex-nowrap",
                  isRtl && "sm:flex-row-reverse sm:justify-start"
                )}
              >
                <span className="rounded-full border border-zaki-subtle bg-white px-2.5 py-1 text-2xs font-medium text-zaki-secondary dark:border-[#4a382c] dark:bg-[#221b16] dark:text-zaki-dark-subtle">
                  {accessCodePriceLabel}
                </span>
                <button
                  type="button"
                  className="zaki-btn zaki-btn-secondary disabled:opacity-50"
                  disabled={!token || accessCodePurchaseCheckout.isPending || !accessCodePurchaseEnabled}
                  onClick={async () => {
                    if (!token) {
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.set("intent", "gift_code");
                      nextParams.set("auth", "login");
                      nextParams.set("source", sourceFromQuery);
                      setSearchParams(nextParams, { replace: false });
                      return;
                    }
                    void trackProductEvent({
                      event: "upgrade_cta_clicked",
                      source: sourceFromQuery,
                      language: isRtl ? "ar" : "en",
                      plan: null,
                      interval: null,
                    }).catch(() => {
                      // Best-effort telemetry only.
                    });
                    try {
                      await accessCodePurchaseCheckout.mutateAsync({ source: sourceFromQuery });
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : t("pricingPage.access.purchase.checkoutError")
                      );
                    }
                  }}
                >
                  {!token
                    ? t("pricingPage.signInRequired")
                    : accessCodePurchaseCheckout.isPending
                    ? t("pricingPage.access.purchase.processing")
                    : t("pricingPage.access.purchase.cta")}
                </button>
              </div>
            </div>
            {token && !accessCodePurchaseEnabled ? (
              <div className="mt-2 text-2xs text-zaki-muted">
                {t("pricingPage.access.purchase.unavailable")}
              </div>
            ) : null}
          </div>
        </div>

        {hasSubscription ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="zaki-btn-sm border border-zaki-strong dark:border-[#643126] text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(241,2,2,0.15)] transition-colors disabled:opacity-50"
              disabled={cancelAtPeriodEnd || cancelSubscription.isPending || !billingCancelEnabled}
              onClick={async () => {
                try {
                  if (!billingCancelEnabled) throw new Error(t("pricingPage.cancelUnavailable"));
                  const result = await cancelSubscription.mutateAsync();
                  toast.success(
                    result?.alreadyScheduled
                      ? t("pricingPage.cancelAlreadyScheduled")
                      : t("pricingPage.cancelScheduled")
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("pricingPage.cancelError"));
                }
              }}
            >
              {cancelAtPeriodEnd
                ? t("pricingPage.cancellationScheduled")
                : t("pricingPage.cancelSubscription")}
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            "zaki-pricing-page__highlights mt-6 flex flex-wrap gap-2 border-t border-zaki-subtle pt-4 dark:border-zaki-dark",
            isRtl ? "justify-end" : "justify-start"
          )}
        >
          <p className="w-full max-w-3xl text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            {activeViaAccessCode ? t("pricingPage.subtitleAccessActive") : t("pricingPage.comparisonNote")}
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-3">
          <div
            className={cn(
              "zaki-pricing-page__provider-modal w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-zaki-subtle bg-white dark:bg-zaki-dark-card p-5 shadow-[0px_18px_40px_rgba(15,15,15,0.24)]",
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
            <div className="mt-4 grid gap-2">
              {checkoutProviders.map((provider) => {
                const selectable = provider.enabled && !provider.comingSoon && !checkout.isPending;
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
                        await beginCheckout(providerModalSelection, provider.key);
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
