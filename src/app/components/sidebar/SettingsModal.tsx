import {
  useBillingConfig,
  useCancelSubscription,
  useDeleteAccount,
  useEntitlements,
  useMeterStatus,
  usePlatformUsageSummary,
  useProductRegistry,
} from "@/queries";
import type {
  MeterWindowSnapshot,
  MeterStatusProduct,
  PlatformUsageProductId,
  ProductOperationalState,
  ProductRegistryItem,
  ProductRegistryProductId,
  UsageQuotaSnapshot,
} from "@/lib/api";
import { exportAccountData, fetchGoogleOAuthStatus } from "@/lib/api";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useNavigate } from "react-router-dom";
import { Boxes, CreditCard, Database, Gauge, KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
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

const PLATFORM_USAGE_PRODUCTS: PlatformUsageProductId[] = ["spaces", "agent", "learn"];
type MeterUsageRow = {
  product: ProductRegistryItem;
  meterProduct: MeterStatusProduct | null;
};
const PRODUCT_ENTRY_POINT_KEYS: Partial<Record<ProductRegistryProductId, string>> = {
  spaces: "settingsModal.productsAccess.entryPoints.spaces",
  agent: "settingsModal.productsAccess.entryPoints.agent",
  learning: "settingsModal.productsAccess.entryPoints.learning",
  hire: "settingsModal.productsAccess.entryPoints.hire",
  design: "settingsModal.productsAccess.entryPoints.design",
  brain: "settingsModal.productsAccess.entryPoints.brain",
  cli: "settingsModal.productsAccess.entryPoints.cli",
  local_app: "settingsModal.productsAccess.entryPoints.localApp",
  extensions: "settingsModal.productsAccess.entryPoints.extensions",
};

const MEMORY_SCOPE_KEYS: Record<string, string> = {
  personal_brain: "settingsModal.productsAccess.memoryScopes.personalBrain",
  workspace_memory: "settingsModal.productsAccess.memoryScopes.workspaceMemory",
  learner_memory: "settingsModal.productsAccess.memoryScopes.learnerMemory",
  hire_memory: "settingsModal.productsAccess.memoryScopes.hireMemory",
  design_memory: "settingsModal.productsAccess.memoryScopes.designMemory",
  session_memory: "settingsModal.productsAccess.memoryScopes.sessionMemory",
};
const MEMORY_SCOPE_ORDER = [
  "personal_brain",
  "workspace_memory",
  "learner_memory",
  "hire_memory",
  "design_memory",
  "session_memory",
] as const;

const SETTINGS_NAV_ITEMS = [
  { href: "#settings-account", key: "account", icon: UserRound },
  { href: "#settings-connections", key: "connections", icon: KeyRound },
  { href: "#settings-billing", key: "billing", icon: CreditCard },
  { href: "#settings-products", key: "products", icon: Boxes },
  { href: "#settings-usage", key: "usage", icon: Gauge },
  { href: "#settings-memory-data", key: "memoryData", icon: Database },
  { href: "#settings-developer-access", key: "developerAccess", icon: LockKeyhole },
  { href: "#settings-privacy", key: "privacy", icon: ShieldCheck },
] as const;

function SettingsNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("settingsModal.nav.label")}
      className="grid grid-cols-2 gap-2 rounded-zaki-lg border border-zaki-subtle bg-white p-2 dark:border-zaki-dark-border dark:bg-zaki-dark-card sm:grid-cols-4"
    >
      {SETTINGS_NAV_ITEMS.map(({ href, key, icon: Icon }) => (
        <a
          key={key}
          href={href}
          className="flex items-center gap-2 rounded-zaki-md px-2 py-2 text-xs font-medium text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:text-zaki-dark-muted dark:hover:bg-zaki-dark-panel dark:hover:text-zaki-dark-primary"
        >
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{t(`settingsModal.nav.${key}`)}</span>
        </a>
      ))}
    </nav>
  );
}

function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 shadow-[0px_10px_24px_rgba(15,15,15,0.04)] dark:border-zaki-dark-card dark:bg-zaki-dark-card">
      {children}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "warning" | "neutral";
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
        tone === "good"
          ? "border-zaki-success/30 text-zaki-success dark:border-[#8fe6cf]/30 dark:text-[#8fe6cf]"
          : tone === "warning"
            ? "border-zaki-brand/30 text-zaki-brand dark:border-[#ff9c86]/30 dark:text-[#ff9c86]"
            : "border-zaki-subtle text-zaki-muted dark:border-zaki-dark-border dark:text-zaki-dark-muted"
      }`}
    >
      {children}
    </span>
  );
}

function formatUsageCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Intl.NumberFormat().format(Math.max(0, Math.round(value)));
}

function formatUsageUnits(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(Math.max(0, Number(value)));
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

function getMeterWindowLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  snapshot?: MeterWindowSnapshot | null
) {
  if (!snapshot) return null;
  if (typeof snapshot.limit === "number" && typeof snapshot.remaining === "number") {
    return t("settingsModal.usage.remainingOfLimit", {
      remaining: formatUsageUnits(snapshot.remaining),
      limit: formatUsageUnits(snapshot.limit),
    });
  }
  if (typeof snapshot.limit === "number" && typeof snapshot.used === "number") {
    return t("settingsModal.usage.usedOfLimit", {
      used: formatUsageUnits(snapshot.used),
      limit: formatUsageUnits(snapshot.limit),
    });
  }
  if (typeof snapshot.used === "number") {
    return t("settingsModal.usage.usedUnits", {
      used: formatUsageUnits(snapshot.used),
    });
  }
  return null;
}

function getProductStateLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  state?: ProductOperationalState
) {
  if (!state) return t("settingsModal.productsAccess.states.disabled");
  return t(`settingsModal.productsAccess.states.${state}`, {
    defaultValue: state,
  });
}

function getProductLifecycleLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  lifecycle?: string
) {
  if (!lifecycle) return t("settingsModal.productsAccess.lifecycle.unknown");
  return t(`settingsModal.productsAccess.lifecycle.${lifecycle}`, {
    defaultValue: lifecycle,
  });
}

function getProductEntryPointLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  product?: ProductRegistryItem
) {
  const productId = product?.productId;
  if (!productId) return t("settingsModal.productsAccess.pending");
  const key = PRODUCT_ENTRY_POINT_KEYS[productId];
  return key
    ? t(key, { defaultValue: product?.entryPoint || productId })
    : product?.entryPoint || productId;
}

function getMemoryScopeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  memoryScope?: string | null
) {
  if (!memoryScope) return t("settingsModal.productsAccess.pending");
  const key = MEMORY_SCOPE_KEYS[memoryScope];
  return key ? t(key) : memoryScope;
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
  const { data: meterStatusResult, isLoading: meterStatusLoading } = useMeterStatus();
  const { data: platformUsageResult, isLoading: platformUsageLoading } = usePlatformUsageSummary();
  const { data: productRegistryResult, isLoading: productRegistryLoading } = useProductRegistry();
  const cancelSubscription = useCancelSubscription();
  const deleteAccountMutation = useDeleteAccount();
  const entitlements = entitlementsResult?.data ?? null;
  const platformUsage = platformUsageResult?.data ?? null;
  const productRegistry = productRegistryResult?.data ?? null;
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
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean | null>(null);
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
  const meterStatus = meterStatusResult?.data ?? null;
  const platformPlanLabel = meterStatus?.plan?.label || platformUsage?.plan?.label || currentPlanLabel;
  const allowance = platformUsage?.allowance;
  const weeklyAllowanceLabel =
    getMeterWindowLabel(t, meterStatus?.weekly) ||
    (allowance?.weekly?.configured && typeof allowance.weekly.limit === "number"
      ? t("settingsModal.usage.weeklyAllowanceValue", {
          limit: formatUsageCount(allowance.weekly.limit),
        })
      : t("settingsModal.usage.weeklyAllowancePending"));
  const burstWindowLabel =
    getMeterWindowLabel(t, meterStatus?.rolling) ||
    (typeof allowance?.burst?.windowHours === "number"
      ? t("settingsModal.usage.burstWindowValue", {
          hours: allowance.burst.windowHours,
        })
      : t("settingsModal.usage.burstWindowPending"));
  const legacyUsageProducts = PLATFORM_USAGE_PRODUCTS.map((productId) => {
    const product = platformUsage?.products?.[productId];
    if (!product) return null;
    return product;
  }).filter(Boolean);
  const productAccessRows =
    productRegistry?.products?.filter(
      (product) => product.visibleInSettings !== false && product.state !== "hidden"
    ) ?? [];
  const developerAccessRows =
    productRegistry?.products?.filter((product) => product.productKind === "client") ?? [];
  const memoryScopeRows = useMemo(() => {
    const rows = new Map<string, { scope: string; products: string[] }>();
    for (const product of productAccessRows) {
      const scope = String(product.memoryScope || "").trim();
      if (!scope) continue;
      const row = rows.get(scope) || { scope, products: [] };
      row.products.push(product.label || product.productId || scope);
      rows.set(scope, row);
    }
    return [...rows.values()].sort((a, b) => {
      const aIndex = MEMORY_SCOPE_ORDER.indexOf(a.scope as (typeof MEMORY_SCOPE_ORDER)[number]);
      const bIndex = MEMORY_SCOPE_ORDER.indexOf(b.scope as (typeof MEMORY_SCOPE_ORDER)[number]);
      if (aIndex !== -1 || bIndex !== -1) {
        const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return normalizedAIndex - normalizedBIndex;
      }
      return a.scope.localeCompare(b.scope);
    });
  }, [productAccessRows]);
  const meterUsageRows: MeterUsageRow[] = meterStatus
    ? productAccessRows
        .filter((product) => product.productKind !== "control_plane")
        .map((product) => ({
          product,
          meterProduct: product.productId ? meterStatus.products?.[product.productId] ?? null : null,
        }))
    : [];

  useEffect(() => {
    if (isOpen) {
      return;
    }
    setDeleteConfirmOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setGoogleOAuthEnabled(null);
    fetchGoogleOAuthStatus()
      .then(({ response, data }) => {
        if (!active) return;
        setGoogleOAuthEnabled(Boolean(response.ok && data?.enabled));
      })
      .catch(() => {
        if (active) setGoogleOAuthEnabled(false);
      });
    return () => {
      active = false;
    };
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
        <div className="space-y-7">
          <SettingsNav />

          <section id="settings-account" className="space-y-3" data-testid="settings-account">
            <SectionHeader title={t("settingsModal.sections.account")} />
            <SettingsPanel>
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
            </SettingsPanel>
          </section>

          <section id="settings-connections" className="space-y-3" data-testid="settings-connections">
            <SectionHeader title={t("settingsModal.sections.connections")} />
            <SettingsPanel>
              <div className="flex items-center justify-between gap-3 rounded-zaki-lg border border-zaki-subtle bg-white px-3 py-3 text-sm dark:border-zaki-dark-border dark:bg-zaki-dark-panel">
                <div className="min-w-0">
                  <div className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {t("settingsModal.connections.google")}
                  </div>
                  <div className="mt-0.5 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                    {t("settingsModal.connections.googleHelper")}
                  </div>
                </div>
                <StatusPill tone={googleOAuthEnabled ? "good" : "neutral"}>
                  {googleOAuthEnabled === null
                    ? t("settingsModal.connections.checking")
                    : googleOAuthEnabled
                      ? t("settingsModal.connections.available")
                      : t("settingsModal.connections.notConfigured")}
                </StatusPill>
              </div>
            </SettingsPanel>
          </section>

          <section id="settings-billing" className="space-y-3" data-testid="settings-billing">
            <SectionHeader title={t("settingsModal.sections.billing")} />
            <SettingsPanel>
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
            </SettingsPanel>
          </section>

          <section id="settings-products" className="space-y-3" data-testid="settings-products-access">
            <SectionHeader title={t("settingsModal.sections.productsAccess")} />
            <SettingsPanel>
              <p className="text-sm leading-6 text-zaki-muted dark:text-zaki-dark-muted">
                {t("settingsModal.productsAccess.subtitle")}
              </p>

              {productRegistryLoading && !productRegistry ? (
                <p className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted">
                  {t("settingsModal.productsAccess.loading")}
                </p>
              ) : null}

              <div className="grid gap-2">
                {productAccessRows.map((product) => {
                  const productId = product?.productId;
                  const stateLabel = getProductStateLabel(t, product?.state);
                  const stateIsOpen = product?.state === "enabled";
                  return (
                    <div
                      key={productId || product?.label}
                      data-testid={
                        productId ? `settings-product-access-${productId}` : undefined
                      }
                      className="grid gap-3 rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm dark:border-zaki-dark-border dark:bg-zaki-dark-panel"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                          {product?.label || productId || t("settingsModal.productsAccess.pending")}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                            stateIsOpen
                              ? "border-zaki-success/30 text-zaki-success dark:border-[#8fe6cf]/30 dark:text-[#8fe6cf]"
                              : "border-zaki-subtle text-zaki-muted dark:border-zaki-dark-border dark:text-zaki-dark-muted"
                          }`}
                        >
                          {stateLabel}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="grid gap-1">
                          <span className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                            {t("settingsModal.productsAccess.fields.lifecycle")}
                          </span>
                          <span className="text-xs font-medium text-zaki-primary dark:text-zaki-dark-primary">
                            {getProductLifecycleLabel(t, product?.lifecycle)}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <span className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                            {t("settingsModal.productsAccess.fields.memory")}
                          </span>
                          <span className="text-xs font-medium text-zaki-primary dark:text-zaki-dark-primary">
                            {getMemoryScopeLabel(t, product?.memoryScope)}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <span className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                            {t("settingsModal.productsAccess.fields.entryPoint")}
                          </span>
                          <span className="text-xs font-medium text-zaki-primary dark:text-zaki-dark-primary">
                            {getProductEntryPointLabel(t, product)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {productAccessRows.length === 0 && !productRegistryLoading ? (
                <p className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted">
                  {t("settingsModal.productsAccess.empty")}
                </p>
              ) : null}

              <p className="text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {t("settingsModal.productsAccess.helper")}
              </p>
            </SettingsPanel>
          </section>

          <section id="settings-usage" className="space-y-3" data-testid="settings-platform-usage">
            <SectionHeader title={t("settingsModal.sections.usage")} />
            <SettingsPanel>
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

              {(platformUsageLoading || meterStatusLoading) && !platformUsage && !meterStatus ? (
                <p className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted">
                  {t("settingsModal.usage.loading")}
                </p>
              ) : null}

              <div className="grid gap-2">
                {meterUsageRows.length > 0 ? meterUsageRows.map(({ product, meterProduct }) => {
                  const weekly = meterProduct?.weekly ?? null;
                  const resetLabel = formatUsageReset(weekly?.resetAt);
                  const summaryLabel = getMeterWindowLabel(t, weekly) || t("settingsModal.usage.pending");
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
                          {summaryLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                        <span>{t("settingsModal.usage.period.week")}</span>
                        <span>
                          {resetLabel
                            ? t("settingsModal.usage.resetsAt", { reset: resetLabel })
                            : t("settingsModal.usage.resetPending")}
                        </span>
                      </div>
                    </div>
                  );
                }) : legacyUsageProducts.map((product) => {
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
            </SettingsPanel>
          </section>

          <section id="settings-memory-data" className="space-y-3" data-testid="settings-memory-data">
            <SectionHeader title={t("settingsModal.sections.memoryData")} />
            <SettingsPanel>
              <div className="grid gap-2">
                {memoryScopeRows.map((row) => (
                  <div
                    key={row.scope}
                    className="grid gap-1 rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm dark:border-zaki-dark-border dark:bg-zaki-dark-panel"
                  >
                    <div className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                      {getMemoryScopeLabel(t, row.scope)}
                    </div>
                    <div className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                      {row.products.join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-secondary"
                  onClick={() => {
                    onClose();
                    navigate("/brain");
                  }}
                >
                  {t("settingsModal.memoryData.openMemory")}
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  className="zaki-btn-sm zaki-btn-secondary disabled:opacity-60"
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
                </button>
              </div>
            </SettingsPanel>
          </section>

          <section
            id="settings-developer-access"
            className="space-y-3"
            data-testid="settings-developer-access"
          >
            <SectionHeader title={t("settingsModal.sections.developerAccess")} />
            <SettingsPanel>
              <div className="grid gap-2">
                {developerAccessRows.map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-sm dark:border-zaki-dark-border dark:bg-zaki-dark-panel"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        {product.label}
                      </div>
                      <div className="mt-0.5 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                        {getProductEntryPointLabel(t, product)}
                      </div>
                    </div>
                    <StatusPill tone={product.state === "enabled" ? "good" : "neutral"}>
                      {getProductStateLabel(t, product.state)}
                    </StatusPill>
                  </div>
                ))}
              </div>
            </SettingsPanel>
          </section>

          <section id="settings-privacy" className="space-y-3" data-testid="settings-privacy">
            <SectionHeader title={t("settingsModal.sections.privacy")} />
            <SettingsPanel>
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
            </SettingsPanel>
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
