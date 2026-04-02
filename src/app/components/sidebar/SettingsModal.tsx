import { ModalShell } from "@/app/components/ui/ModalShell";
import {
  useBillingConfig,
  useCancelSubscription,
  useDeleteAccount,
  useEntitlements,
} from "@/queries";
import { exportAccountData } from "@/lib/api";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

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
  const cancelSubscription = useCancelSubscription();
  const deleteAccountMutation = useDeleteAccount();
  const entitlements = entitlementsResult?.data ?? null;
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
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
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
  const canDeleteAccount =
    normalizedEmail.length > 0 &&
    deleteConfirmValue.trim().toLowerCase() === normalizedEmail &&
    !deleteAccountMutation.isPending;
  const languageValue = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const effectiveStatusLabel = t(`settingsModal.plan.statusValues.${effectiveStatus}`, {
    defaultValue: effectiveStatus,
  });
  const currentPlanLabel = activeViaAccessCode
    ? t("sidebar.profile.planBadge.codeActive")
    : t(`sidebar.profile.planBadge.${planTier}`, { defaultValue: planTier });

  useEffect(() => {
    if (isOpen) {
      return;
    }
    setDeleteConfirmOpen(false);
    setDeleteConfirmValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("settingsModal.aria.label")}
      className="w-full max-w-[620px] overflow-hidden rounded-[28px] border border-zaki-subtle bg-white shadow-[0px_30px_80px_rgba(15,15,15,0.18)] dark:border-[#2e241b] dark:bg-[#120e0b] dark:shadow-[0px_44px_110px_rgba(0,0,0,0.62)]"
      containerClassName="items-start overflow-y-auto py-6 sm:items-center sm:py-4"
    >
      <div className="relative max-h-[calc(100vh-3rem)] overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-20 size-56 rounded-full bg-zaki-brand opacity-10 dark:opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-zaki-accent opacity-10 dark:opacity-20 blur-3xl" />
        <div className="relative flex items-center justify-between border-b border-zaki-subtle bg-[linear-gradient(135deg,#fff8f0_0%,#f3e7d9_100%)] px-5 py-5 dark:border-[#2e241b] dark:bg-[linear-gradient(140deg,#21170f_0%,#17110d_58%,#120e0b_100%)] sm:px-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1a140f] flex items-center justify-center text-zaki-brand text-sm font-semibold shadow-[0px_6px_18px_rgba(15,15,15,0.08)] dark:shadow-none">
              S
            </div>
            <div>
              <div className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">
                {t("settingsModal.header.title")}
              </div>
              <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
                {t("settingsModal.header.subtitle")}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="zaki-icon-btn size-9"
            onClick={onClose}
            aria-label={t("settingsModal.aria.close")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="relative max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-5 space-y-6 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-[#bca992]">
              {t("settingsModal.sections.profile")}
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
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
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-[#bca992]">
              {t("settingsModal.sections.preferences")}
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
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
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-[#bca992]">
              {t("settingsModal.sections.planBilling")}
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
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
                    className="zaki-btn-sm border border-zaki-strong dark:border-[#643126] text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(210,68,48,0.15)] transition-colors disabled:opacity-50"
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
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-[#bca992]">
              {t("settingsModal.sections.dataPrivacy")}
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#17110d] px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.32)]">
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
                className="flex items-center justify-between rounded-zaki-lg border border-zaki-strong dark:border-[#643126] bg-white dark:bg-[#1d1611] px-3 py-2 text-sm text-zaki-brand dark:text-[#ff9c86] hover:bg-zaki-error dark:hover:bg-[rgba(210,68,48,0.15)] transition-colors text-left"
                onClick={() => setDeleteConfirmOpen((open) => !open)}
                type="button"
              >
                {t("settingsModal.privacy.deleteAccount")}
                <span className="text-xs text-zaki-brand dark:text-[#ffb6a4]">
                  {t("settingsModal.privacy.deleteWarning")}
                </span>
              </button>
              {deleteConfirmOpen && (
                <div className="rounded-zaki-lg border border-zaki-strong dark:border-[#643126] bg-[rgba(210,68,48,0.08)] dark:bg-[rgba(210,68,48,0.14)] px-3 py-3">
                  <p className="text-xs text-zaki-brand dark:text-[#ffb6a4]">
                    {t("settingsModal.privacy.deletePrompt")}
                  </p>
                  <input
                    className="mt-2 w-full rounded-zaki-md border border-zaki-strong dark:border-[#643126] bg-white dark:bg-[#120e0b] px-3 py-2 text-sm text-zaki-primary dark:text-[#efe6d9] outline-none focus:border-zaki-brand"
                    value={deleteConfirmValue}
                    onChange={(event) => setDeleteConfirmValue(event.target.value)}
                    placeholder={email || t("settingsModal.privacy.emailPlaceholder")}
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="zaki-btn-sm zaki-btn-secondary"
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setDeleteConfirmValue("");
                      }}
                    >
                      {t("settingsModal.privacy.keepAccount")}
                    </button>
                    <button
                      type="button"
                      className="zaki-btn-sm zaki-btn-danger disabled:opacity-50"
                      disabled={!canDeleteAccount}
                      onClick={async () => {
                        try {
                          await deleteAccountMutation.mutateAsync(normalizedEmail);
                          toast.success(t("settingsModal.privacy.success.accountDeleted"));
                          onClose();
                          onAccountDeleted();
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : t("settingsModal.privacy.errors.deleteAccount")
                          );
                        }
                      }}
                    >
                      {deleteAccountMutation.isPending
                        ? t("settingsModal.privacy.deleting")
                        : t("settingsModal.privacy.deletePermanently")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-2 px-6 py-4 border-t border-zaki-subtle dark:border-[#2e241b] bg-zaki-base/80 dark:bg-[#17110d]">
          <div className="text-xs text-zaki-muted dark:text-[#c9b8a4]">
            {t("settingsModal.footer.changesApplyImmediately")}
          </div>
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
    </ModalShell>
  );
}
