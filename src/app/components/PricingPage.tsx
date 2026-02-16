import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useBillingPortal, useCheckout, useEntitlements } from "@/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const plans = [
  {
    tier: "free",
    label: "Free",
    price: "$0",
    blurb: "Great for trying ZAKI and basic workflows.",
    features: ["Core chat", "Memory basics", "Standard response quality"],
  },
  {
    tier: "student",
    label: "Student",
    price: "$5 / month",
    blurb: "Premium features for focused learning.",
    features: ["Premium models", "Priority responses", "Expanded memory limits"],
  },
  {
    tier: "personal",
    label: "Personal",
    price: "$10 / month",
    blurb: "Best for everyday use and deeper context.",
    features: ["Premium models", "Priority responses", "Advanced memory insights"],
  },
];

type BillingNotice = {
  tone: "success" | "info";
  message: string;
};

const billingNoticeByStatus: Record<string, BillingNotice> = {
  success: {
    tone: "success",
    message: "Billing update received. Your plan status will refresh shortly.",
  },
  cancel: {
    tone: "info",
    message: "Checkout canceled. You can pick a plan anytime.",
  },
  manage: {
    tone: "success",
    message: "Returned from billing portal.",
  },
};

export function PricingPage() {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingNotice, setBillingNotice] = useState<BillingNotice | null>(null);
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const { data: entitlementsResult } = useEntitlements();
  const currentTier = entitlementsResult?.data?.plan?.tier ?? "free";
  const planStatus = entitlementsResult?.data?.plan?.status ?? "inactive";
  const isPremium =
    ["student", "personal"].includes(currentTier) &&
    ["active", "trialing", "past_due"].includes(planStatus);

  const currentPlanLabel = useMemo(() => {
    const plan = plans.find((p) => p.tier === currentTier);
    return plan?.label ?? "Free";
  }, [currentTier]);

  useEffect(() => {
    const status = searchParams.get("billing");
    if (!status) return;
    const notice = billingNoticeByStatus[status];
    if (!notice) return;

    setBillingNotice(notice);
    if (notice.tone === "success") {
      toast.success(notice.message);
    } else {
      toast(notice.message);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-full px-6 py-10" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-5xl">
        <div className={cn("flex flex-col gap-3", isRtl ? "text-right" : "text-left")}>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-zaki-muted">
            Pricing
          </div>
          <h1 className="text-3xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            Choose the plan that fits you
          </h1>
          <p className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
            You’re currently on <span className="font-semibold">{currentPlanLabel}</span>
            {isPremium ? " · Manage or switch anytime." : " · Upgrade when you’re ready."}
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
              className="rounded-full px-4 py-2 text-sm text-white bg-zaki-brand hover:bg-zaki-brand-hover transition-colors"
              onClick={async () => {
                try {
                  await portal.mutateAsync();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Unable to open billing portal");
                }
              }}
            >
              Manage plan
            </button>
            <span className="text-xs text-zaki-muted self-center">
              Status: {planStatus}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
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
                    <span className="text-2xs uppercase tracking-[0.2em] text-zaki-brand">
                      Current
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
                      className="w-full rounded-full border border-zaki-subtle px-3 py-2 text-xs text-zaki-secondary hover:bg-zaki-hover transition-colors"
                      disabled
                    >
                      Included
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-full bg-zaki-brand text-white px-3 py-2 text-xs hover:bg-zaki-brand-hover transition-colors"
                      onClick={async () => {
                        try {
                          await checkout.mutateAsync(plan.tier as "student" | "personal");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Checkout failed");
                        }
                      }}
                    >
                      Choose {plan.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
