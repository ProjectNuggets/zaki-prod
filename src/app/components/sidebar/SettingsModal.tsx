import {
  useBillingConfig,
  useCancelSubscription,
  useDeleteAccount,
  useEntitlements,
  usePlatformUsageSummary,
} from "@/queries";
import type { PlatformUsageProductId, UsageQuotaSnapshot } from "@/lib/api";
import { exportAccountData } from "@/lib/api";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { SheetShell, SectionHeader, TypeToConfirmDialog } from "@/app/components/ui/zaki";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  onDisplayNameChange: (name: string) => void;
  themePreference: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onSave: () => void | Promise<void>;
  onAccountDeleted: () => void;
  saving?: boolean;
}

const PLATFORM_USAGE_PRODUCTS: PlatformUsageProductId[] = ["spaces", "agent", "learn", "brain"];

function formatUsageCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Intl.NumberFormat().format(Math.max(0, Math.round(value)));
}

function formatUsageReset(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getUsagePeriodLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  period?: string | null
) {
  if (period === "day") return t("settingsModal.usage.period.day");
  if (period === "week") return t("settingsModal.usage.period.week");
  return period || t("settingsModal.usage.period.none");
}

function getQuotaSummaryLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  quota?: UsageQuotaSnapshot
) {
  if (!quota) return t("settingsModal.usage.pending");
  if (quota.unavailable) return t("settingsModal.usage.unavailable");
  if (quota.metered === false) return t("settingsModal.usage.memoryGoverned");
  if (quota.unlimited) {
    return t("settingsModal.usage.usedUnlimited", {
      used: formatUsageCount(quota.used),
    });
  }
  if (typeof quota.limit === "number") {
    return t("settingsModal.usage.usedOfLimit", {
      used: formatUsageCount(quota.used),
      limit: formatUsageCount(quota.limit),
    });
  }
  return t("settingsModal.usage.pending");
}

export function SettingsModal({
  isOpen,
  onClose,
  displayName,
  email,
  onDisplayNameChange,
  themePreference,
  onThemeChange,
  onSave,
  onAccountDeleted,
  saving = false,
}: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: entitlementsResult } = useEntitlements();
  const { data: billingConfigResult } = useBillingConfig();
  const { data: platformUsageResult, isLoading: platformUsageLoading } = usePlatformUsageSummary();
  const cancelSubscription = useCancelSubscription();
  const deleteAccountMutation = useDeleteAccount();
  const entitlements = entitlementsResult?.data ?? null;
  const platformUsage = platformUsageResult?.data ?? null;
  const planTier = entitlements?.plan?.tier ?? "free";
  const accessCampaign = entitlements?.access?.campaign ?? null;
  const accessExpiresAt = entitlements?.access?.expiresAt ?? null;
  const cancelAtPeriodEnd = Boolean(entitlements?.plan?.cancelAtPeriodEnd);
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const hasSubscription = hasActiveSubscription(entitlements);
  const effectiveStatus = effectiveEntitlement.status;
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const billingConfig = billingConfigResult?.data?.configured;
  const billingConfigLoaded = Boolean(billingConfigResult);
  const billingPortalEnabled = billingConfigLoaded ? Boolean(billingConfig?.portalEnabled) : true;
  const billingCheckoutEnabled = billingConfigLoaded ? Boolean(billingConfig?.checkoutEnabled) : true;
  const billingCancelEnabled = billingConfigLoaded ? Boolean(billingConfig?.cancelEnabled) : true;
  const billingUnavailableMessage =
    billingConfigLoaded &&
    (!billingCheckoutEnabled || (hasSubscription && (!billingPortalEnabled || !billingCancelEnabled)))
      ? t("settingsModal.plan.billingUnavailable")
      : null;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const accessExpiryLabel = useMemo(() => {
    if (!accessExpiresAt) return null;
    const parsed = new Date(accessExpiresAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [accessExpiresAt]);
  const languageValue = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const effectiveStatusLabel = t(`settingsModal.plan.statusValues.${effectiveStatus}`, {
    defaultValue: effectiveStatus,
  });
  const currentPlanLabel = activeViaAccessCode
    ? t("sidebar.profile.planBadge.codeActive")
    : t(`sidebar.profile.planBadge.${planTier}`, { defaultValue: planTier });
  const platformPlanLabel = platformUsage?.plan?.label || currentPlanLabel;
  const allowance = platformUsage?.allowance;
  const weeklyAllowanceLabel =
    allowance?.weekly?.configured && typeof allowance.weekly.limit === "number"
      ? t("settingsModal.usage.weeklyAllowanceValue", {
          limit: formatUsageCount(allowance.weekly.limit),
        })
      : t("settingsModal.usage.weeklyAllowancePending");
  const burstWindowLabel =
    typeof allowance?.burst?.windowHours === "number"
      ? t("settingsModal.usage.burstWindowValue", {
          hours: allowance.burst.windowHours,
        })
      : t("settingsModal.usage.burstWindowPending");
  const usageProducts = PLATFORM_USAGE_PRODUCTS.map((productId) => {
    const product = platformUsage?.products?.[productId];
    if (!product) return null;
    return product;
  }).filter(Boolean);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    setDeleteConfirmOpen(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <SheetShell
        isOpen={isOpen}
        onClose={onClose}
        title={t("settingsModal.header.title")}
        subtitle={t("settingsModal.header.subtitle")}
        width="lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
              {t("settingsModal.footer.changesApplyImmediately")}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary"
                onClick={onClose}
              >
                {t("settingsModal.footer.cancel")}
              </button>
              <button
                type="button"
                className="zaki-btn zaki-btn-primary"
                onClick={onSave}
                disabled={saving}
              >
                {t("settingsModal.footer.saveChanges")}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-8">
          <section className="space-y-3">
            <SectionHeader title={t("settingsModal.sections.profile")} />
            <div className="grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
              <label className="flex flex-col gap-1 text-xs text-zaki-muted dark:text-[#c9b8a4]">
                {t("settingsModal.profile.displayName")}
                <input
                  className="rounded-zaki-md border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#120e0b] px-3 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] outline-none focus:border-zaki-focus"
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zaki-muted dark:text-[#c9b8a4]">
                {t("settingsModal.profile.email")}
                <input
                  className="rounded-zaki-md border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#120e0b] px-3 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] outline-none focus:border-zaki-focus"
                  value={email}
                  readOnly
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("settingsModal.sections.preferences")} />
            <div className="grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-secondary dark:text-[#d7c9b7]">
                {t("settingsModal.preferences.theme")}
                <select
                  className="rounded-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#120e0b] px-2 py-1 text-sm text-zaki-primary dark:text-[#efe6d9]"
                  value={themePreference}
                  onChange={(event) =>
                    onThemeChange(event.target.value as "light" | "dark" | "system")
                  }
                >
                  <option value="light">{t("settingsModal.preferences.themeOptions.light")}</option>
                  <option value="dark">{t("settingsModal.preferences.themeOptions.dark")}</option>
                  <option value="system">{t("settingsModal.preferences.themeOptions.system")}</option>
                </select>
              </label>
              <label className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-secondary dark:text-[#d7c9b7]">
                {t("settings.language")}
                <select
                  className="rounded-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#120e0b] px-2 py-1 text-sm text-zaki-primary dark:text-[#efe6d9]"
                  value={languageValue}
                  onChange={(event) => i18n.changeLanguage(event.target.value)}
                >
                  <option value="en">{t("language.english")}</option>
                  <option value="ar">{t("language.arabic")}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("settingsModal.sections.planBilling")} />
            <div className="grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
              <div className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-secondary dark:text-[#d7c9b7]">
                <span>{t("settingsModal.plan.currentPlan")}</span>
                <span className="text-zaki-primary dark:text-[#efe6d9] font-semibold uppercase text-xs tracking-wider">
                  {currentPlanLabel}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-secondary dark:text-[#d7c9b7]">
                <span>{t("settingsModal.plan.status")}</span>
                <span
                  className={`text-xs uppercase tracking-wider ${
                    isPremium ? "text-zaki-success dark:text-[#8fe6cf]" : "text-zaki-muted dark:text-[#c9b8a4]"
                  }`}
                >
                  {effectiveStatusLabel}
                </span>
              </div>
              {activeViaAccessCode && (
                <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
                  {t("settingsModal.plan.activeViaAccessCode")}
                  {accessCampaign ? ` (${accessCampaign})` : ""}
                  {accessExpiryLabel ? ` ${t("settingsModal.plan.until")} ${accessExpiryLabel}` : ""}.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-secondary"
                  onClick={() => {
                    void trackProductEvent({
                      event: "pricing_viewed",
                      source: "settings",
                      language: languageValue === "ar" ? "ar" : "en",
                      plan:
                        planTier === "student" || planTier === "personal" ? planTier : "free",
                      interval: null,
                    }).catch(() => {
                      // Best-effort telemetry only.
                    });
                    onClose();
                    navigate("/pricing?source=settings");
                  }}
                >
                  {t("settingsModal.plan.viewPricing")}
                </button>
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-primary"
                  onClick={() => {
                    if (!isPremium) {
                      void trackProductEvent({
                        event: "upgrade_cta_clicked",
                        source: "settings",
                        language: languageValue === "ar" ? "ar" : "en",
                        plan: "personal",
                        interval: "monthly",
                      }).catch(() => {
                        // Best-effort telemetry only.
                      });
                    }
                    onClose();
                    navigate("/pricing?source=settings");
                  }}
                >
                  {activeViaAccessCode
                    ? t("settingsModal.plan.manageAccess")
                    : hasSubscription
                    ? t("settingsModal.plan.managePlan")
                    : t("settingsModal.plan.upgrade")}
                </button>
                {hasSubscription && (
                  <button
                    type="button"
                    className="zaki-btn-sm border border-zaki-strong dark:border-[#643126] text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(241,2,2,0.15)] transition-colors disabled:opacity-50"
                    onClick={async () => {
                      try {
                        if (!billingCancelEnabled) {
                          throw new Error(t("settingsModal.plan.errors.cancelUnavailable"));
                        }
                        const result = await cancelSubscription.mutateAsync();
                        toast.success(
                          result?.alreadyScheduled
                            ? t("settingsModal.plan.success.cancelAlreadyScheduled")
                            : t("settingsModal.plan.success.cancelScheduled")
                        );
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : t("settingsModal.plan.errors.cancelSubscription")
                        );
                      }
                    }}
                    disabled={
                      cancelAtPeriodEnd || cancelSubscription.isPending || !billingCancelEnabled
                    }
                  >
                    {cancelAtPeriodEnd
                      ? t("settingsModal.plan.cancellationScheduled")
                      : t("settingsModal.plan.cancelSubscription")}
                  </button>
                )}
              </div>
              {billingUnavailableMessage && (
                <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
                  {billingUnavailableMessage}
                </div>
              )}
              {cancelAtPeriodEnd && (
                <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
                  {t("settingsModal.plan.cancelAtPeriodEndNote")}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3" data-testid="settings-platform-usage">
            <SectionHeader title={t("settingsModal.sections.usage")} />
            <div className="grid gap-3 rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:border-zaki-dark-card dark:bg-zaki-dark-card">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 dark:border-zaki-dark-border dark:bg-zaki-dark-panel">
                  <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    {t("settingsModal.usage.plan")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {platformPlanLabel}
                  </div>
                </div>
                <div className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 dark:border-zaki-dark-border dark:bg-zaki-dark-panel">
                  <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    {t("settingsModal.usage.weeklyAllowance")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {weeklyAllowanceLabel}
                  </div>
                </div>
                <div className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 dark:border-zaki-dark-border dark:bg-zaki-dark-panel">
                  <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    {t("settingsModal.usage.burstWindow")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {burstWindowLabel}
                  </div>
                </div>
              </div>

              {platformUsageLoading && !platformUsage ? (
                <p className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted">
                  {t("settingsModal.usage.loading")}
                </p>
              ) : null}

              <div className="grid gap-2">
                {usageProducts.map((product) => {
                  const quota = product?.quota;
                  const resetLabel = formatUsageReset(quota?.resetAt);
                  const periodLabel = getUsagePeriodLabel(t, quota?.period);
                  return (
                    <div
                      key={product?.productId}
                      className="grid gap-1 rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm dark:border-zaki-dark-border dark:bg-zaki-dark-panel"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {product?.label}
                        </span>
                        <span className="font-mono-ui text-xs text-zaki-primary dark:text-zaki-dark-primary">
                          {getQuotaSummaryLabel(t, quota)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                        <span>{periodLabel}</span>
                        <span>
                          {resetLabel
                            ? t("settingsModal.usage.resetsAt", { reset: resetLabel })
                            : t("settingsModal.usage.resetPending")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {t("settingsModal.usage.helper")}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title={t("settingsModal.sections.dataPrivacy")} />
            <div className="grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
              <button
                type="button"
                disabled={isExporting}
                className="flex items-center justify-between rounded-zaki-lg border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-secondary dark:text-[#d7c9b7] hover:bg-zaki-elevated dark:hover:bg-[#251b14] transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (isExporting) return;
                  setIsExporting(true);
                  try {
                    const { response, data } = await exportAccountData();
                    if (!response.ok || !data.success || !data.export) {
                      throw new Error(data.error ?? t("settingsModal.privacy.errors.exportData"));
                    }

                    const blob = new Blob([JSON.stringify(data.export, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    const datePart = new Date().toISOString().slice(0, 10);
                    link.href = url;
                    link.download = `zaki-account-export-${datePart}.json`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                    toast.success(t("settingsModal.privacy.success.exportDownloaded"));
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : t("settingsModal.privacy.errors.exportData")
                    );
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                {isExporting
                  ? t("settingsModal.privacy.preparingExport")
                  : t("settingsModal.privacy.exportAllData")}
                <span className="text-xs text-zaki-disabled dark:text-[#aa947b]">
                  {t("settingsModal.privacy.exportHelper")}
                </span>
              </button>
              <button
                className="flex items-center justify-between rounded-zaki-lg border border-zaki-strong dark:border-[#643126] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(241,2,2,0.15)] transition-colors text-left"
                onClick={() => setDeleteConfirmOpen(true)}
                type="button"
              >
                {t("settingsModal.privacy.deleteAccount")}
                <span className="text-xs text-zaki-brand dark:text-[#ffb6a4]">
                  {t("settingsModal.privacy.deleteWarning")}
                </span>
              </button>
            </div>
          </section>
        </div>
      </SheetShell>

      <TypeToConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t("settingsModal.privacy.deleteAccount")}
        body={t("settingsModal.privacy.deletePrompt")}
        confirmPhrase={normalizedEmail || email}
        confirmLabel={t("settingsModal.privacy.deletePermanently")}
        cancelLabel={t("settingsModal.privacy.keepAccount")}
        isSubmitting={deleteAccountMutation.isPending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await deleteAccountMutation.mutateAsync(normalizedEmail);
            toast.success(t("settingsModal.privacy.success.accountDeleted"));
            setDeleteConfirmOpen(false);
            onClose();
            onAccountDeleted();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : t("settingsModal.privacy.errors.deleteAccount")
            );
          }
        }}
      />
    </>
  );
}
