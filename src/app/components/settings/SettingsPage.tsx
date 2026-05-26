import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  CreditCard,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBillingConfig,
  useCancelSubscription,
  useDeleteAccount,
  useEntitlements,
  useMeterStatus,
  usePlatformUsageSummary,
  useProductRegistry,
} from "@/queries";
import {
  exportAccountData,
  fetchGoogleOAuthStatus,
  updateProfile,
  type MeterStatusProduct,
  type MeterWindowSnapshot,
  type PlatformUsageProductId,
  type ProductOperationalState,
  type ProductRegistryItem,
  type ProductRegistryProductId,
  type UsageQuotaSnapshot,
} from "@/lib/api";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import { trackProductEvent } from "@/lib/productTelemetry";
import { useAuthStore, useUIStore } from "@/stores";
import { TypeToConfirmDialog } from "@/app/components/ui/zaki";
import { V2Badge, V2Button, V2StatusStrip, V2UsageGauge } from "@/app/components/v2";
import {
  V2SettingsBlock,
  V2SettingsNav,
  V2SettingsRow,
  type V2SettingsNavItem,
} from "./V2SettingsPrimitives";

type MeterUsageRow = {
  product: ProductRegistryItem;
  meterProduct: MeterStatusProduct | null;
};

const PLATFORM_USAGE_PRODUCTS: PlatformUsageProductId[] = [
  "spaces",
  "agent",
  "learn",
  "hire",
  "design",
];

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

function getStateTone(state?: ProductOperationalState) {
  if (state === "enabled") return "success";
  if (state === "degraded" || state === "maintenance" || state === "readOnly") return "warn";
  if (state === "disabled") return "default";
  return "default";
}

function normalizeWeeklyWindow(
  meterWeekly?: MeterWindowSnapshot | null,
  fallback?: {
    limit?: number | null;
    used?: number | null;
    remaining?: number | null;
    resetAt?: string | null;
  } | null
) {
  const limit = meterWeekly?.limit ?? fallback?.limit ?? null;
  const remaining = meterWeekly?.remaining ?? fallback?.remaining ?? null;
  const used =
    meterWeekly?.used ??
    fallback?.used ??
    (typeof limit === "number" && typeof remaining === "number" ? limit - remaining : null);
  const resetAt = meterWeekly?.resetAt ?? fallback?.resetAt ?? null;
  return { limit, remaining, resetAt, used };
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const themePreference = useUIStore((state) => state.themePreference);
  const setThemePreference = useUIStore((state) => state.setThemePreference);
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean | null>(null);

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
  const meterStatus = meterStatusResult?.data ?? null;
  const planTier = entitlements?.plan?.tier ?? "free";
  const cancelAtPeriodEnd = Boolean(entitlements?.plan?.cancelAtPeriodEnd);
  const accessCampaign = entitlements?.access?.campaign ?? null;
  const accessExpiresAt = entitlements?.access?.expiresAt ?? null;
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const isPremium = effectiveEntitlement.premium;
  const hasSubscription = hasActiveSubscription(entitlements);
  const activeViaAccessCode = effectiveEntitlement.source === "access_code";
  const effectiveStatus = effectiveEntitlement.status;
  const billingConfig = billingConfigResult?.data?.configured;
  const billingConfigLoaded = Boolean(billingConfigResult);
  const billingPortalEnabled = billingConfigLoaded ? Boolean(billingConfig?.portalEnabled) : true;
  const billingCheckoutEnabled = billingConfigLoaded ? Boolean(billingConfig?.checkoutEnabled) : true;
  const billingCancelEnabled = billingConfigLoaded ? Boolean(billingConfig?.cancelEnabled) : true;
  const billingUnavailableMessage =
    billingConfigLoaded &&
    (!billingCheckoutEnabled || (hasSubscription && (!billingPortalEnabled || !billingCancelEnabled)))
      ? t("settingsModal.plan.billingUnavailable", {
          defaultValue: "Billing actions are not configured in this environment.",
        })
      : null;
  const languageValue = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const normalizedEmail = useMemo(() => (user?.username || "").trim().toLowerCase(), [user?.username]);

  useEffect(() => {
    setDisplayName(
      user?.fullName?.trim() ||
        user?.username?.trim() ||
        t("sidebar.profile.defaultName", { defaultValue: "ZAKI user" })
    );
  }, [t, user?.fullName, user?.username]);

  useEffect(() => {
    let active = true;
    setGoogleOAuthEnabled(null);
    fetchGoogleOAuthStatus()
      .then(({ response, data }) => {
        if (active) setGoogleOAuthEnabled(Boolean(response.ok && data?.enabled));
      })
      .catch(() => {
        if (active) setGoogleOAuthEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const currentPlanLabel = activeViaAccessCode
    ? t("sidebar.profile.planBadge.codeActive", { defaultValue: "Access code" })
    : t(`sidebar.profile.planBadge.${planTier}`, { defaultValue: planTier });
  const effectiveStatusLabel = t(`settingsModal.plan.statusValues.${effectiveStatus}`, {
    defaultValue: effectiveStatus,
  });
  const platformPlanLabel = meterStatus?.plan?.label || platformUsage?.plan?.label || currentPlanLabel;
  const allowance = platformUsage?.allowance;
  const weeklyWindow = normalizeWeeklyWindow(meterStatus?.weekly ?? null, allowance?.weekly ?? null);
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

  const productAccessRows =
    productRegistry?.products?.filter(
      (product) => product.visibleInSettings !== false && product.state !== "hidden"
    ) ?? [];
  const developerAccessRows =
    productRegistry?.products?.filter((product) => product.productKind === "client") ?? [];
  const meteredProducts = productAccessRows.filter(
    (product) => product.productKind !== "control_plane" && product.productKind !== "client"
  );
  const meterUsageRows: MeterUsageRow[] = meterStatus
    ? meteredProducts.map((product) => ({
        product,
        meterProduct: product.productId ? meterStatus.products?.[product.productId] ?? null : null,
      }))
    : [];
  const legacyUsageProducts = PLATFORM_USAGE_PRODUCTS.map((productId) => {
    const product = platformUsage?.products?.[productId];
    if (!product) return null;
    return product;
  }).filter(Boolean);
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

  const navItems: V2SettingsNavItem[] = [
    { href: "#settings-account", label: t("settingsModal.nav.account"), icon: UserRound },
    { href: "#settings-connections", label: t("settingsModal.nav.connections"), icon: KeyRound },
    { href: "#settings-billing", label: t("settingsModal.nav.billing"), icon: CreditCard },
    {
      href: "#settings-products",
      label: t("settingsModal.nav.products"),
      icon: Boxes,
      meta: productAccessRows.length || undefined,
    },
    { href: "#settings-usage", label: t("settingsModal.nav.usage"), icon: Gauge },
    { href: "#settings-memory-data", label: t("settingsModal.nav.memoryData"), icon: Database },
    {
      href: "#settings-developer-access",
      label: t("settingsModal.nav.developerAccess"),
      icon: LockKeyhole,
      meta: developerAccessRows.length || undefined,
    },
    { href: "#settings-privacy", label: t("settingsModal.nav.privacy"), icon: ShieldCheck, tone: "danger" },
  ];

  const saveDisplayName = async () => {
    if (!user?.username) return;
    setProfileSaving(true);
    try {
      const nextName = displayName.trim();
      const { response, data } = await updateProfile(nextName);
      if (!response.ok || data?.error) {
        toast.error(data?.error || t("sidebar.profile.saveError", { defaultValue: "Unable to save profile." }));
        return;
      }
      setUser({
        ...user,
        fullName: nextName || null,
      });
      toast.success(t("sidebar.profile.saveSuccess", { defaultValue: "Profile saved." }));
    } catch {
      toast.error(t("sidebar.profile.saveError", { defaultValue: "Unable to save profile." }));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExport = async () => {
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
      toast.success(t("settingsModal.privacy.success.exportDownloaded", { defaultValue: "Export downloaded." }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("settingsModal.privacy.errors.exportData", { defaultValue: "Unable to export data." })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePricingAction = async (source: "view" | "upgrade") => {
    if (source === "view") {
      await trackProductEvent({
        event: "pricing_viewed",
        source: "settings",
        language: languageValue,
        plan: planTier === "student" || planTier === "personal" ? planTier : "free",
        interval: null,
      }).catch(() => undefined);
    } else if (!isPremium) {
      await trackProductEvent({
        event: "upgrade_cta_clicked",
        source: "settings",
        language: languageValue,
        plan: "personal",
        interval: "monthly",
      }).catch(() => undefined);
    }
    navigate("/pricing?source=settings");
  };

  return (
    <>
      <div className="zaki-settings-v2 zaki-scrollbar-fade">
        <V2StatusStrip
          aria-label={t("settingsModal.nav.label")}
          items={[
            { id: "plan", label: t("settingsModal.usage.plan"), value: platformPlanLabel },
            { id: "weekly", label: t("settingsModal.usage.weeklyAllowance"), value: weeklyAllowanceLabel },
            { id: "burst", label: t("settingsModal.usage.burstWindow"), value: burstWindowLabel },
            {
              id: "oauth",
              label: t("settingsModal.nav.connections"),
              value:
                googleOAuthEnabled === null
                  ? t("settingsModal.connections.checking")
                  : googleOAuthEnabled
                    ? t("settingsModal.connections.available")
                    : t("settingsModal.connections.notConfigured"),
              tone: googleOAuthEnabled ? "success" : "default",
            },
          ]}
        />
        <div className="zaki-settings-v2__grid">
          <V2SettingsNav
            eyebrow={t("settingsModal.header.title")}
            title={t("settingsModal.header.subtitle")}
            ariaLabel={t("settingsModal.nav.label")}
            items={navItems}
          />

          <main className="zaki-settings-v2__main" aria-labelledby="settings-page-title">
            <header className="zaki-settings-v2__hero">
              <div>
                <p>{t("settingsModal.header.title")}</p>
                <h1 id="settings-page-title">{t("settingsModal.header.subtitle")}</h1>
              </div>
              <V2Button onClick={saveDisplayName} disabled={profileSaving} variant="accent">
                {profileSaving ? t("app.legal.saving") : t("settingsModal.footer.saveChanges")}
              </V2Button>
            </header>

            <V2SettingsBlock id="settings-account" data-testid="settings-account" title={t("settingsModal.sections.account")}>
              <V2SettingsRow name={t("settingsModal.profile.displayName")}>
                <input
                  className="v2-input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </V2SettingsRow>
              <V2SettingsRow name={t("settingsModal.profile.email")}>
                <input className="v2-input" value={user?.username || ""} readOnly />
              </V2SettingsRow>
              <V2SettingsRow name={t("settingsModal.preferences.theme")}>
                <select
                  className="v2-input"
                  value={themePreference}
                  onChange={(event) =>
                    setThemePreference(event.target.value as "light" | "dark" | "system")
                  }
                >
                  <option value="light">{t("settingsModal.preferences.themeOptions.light")}</option>
                  <option value="dark">{t("settingsModal.preferences.themeOptions.dark")}</option>
                  <option value="system">{t("settingsModal.preferences.themeOptions.system")}</option>
                </select>
              </V2SettingsRow>
              <V2SettingsRow name={t("settings.language")}>
                <select
                  className="v2-input"
                  value={languageValue}
                  onChange={(event) => void i18n.changeLanguage(event.target.value)}
                >
                  <option value="en">{t("language.english")}</option>
                  <option value="ar">{t("language.arabic")}</option>
                </select>
              </V2SettingsRow>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-connections"
              data-testid="settings-connections"
              title={t("settingsModal.sections.connections")}
            >
              <V2SettingsRow
                name={t("settingsModal.connections.google")}
                description={t("settingsModal.connections.googleHelper")}
              >
                <V2Badge tone={googleOAuthEnabled ? "success" : "default"}>
                  {googleOAuthEnabled === null
                    ? t("settingsModal.connections.checking")
                    : googleOAuthEnabled
                      ? t("settingsModal.connections.available")
                      : t("settingsModal.connections.notConfigured")}
                </V2Badge>
              </V2SettingsRow>
            </V2SettingsBlock>

            <V2SettingsBlock id="settings-billing" data-testid="settings-billing" title={t("settingsModal.sections.billing")}>
              <div className="zaki-settings-v2__plan-card">
                <div>
                  <span>{t("settingsModal.plan.currentPlan")}</span>
                  <strong>{currentPlanLabel}</strong>
                  {activeViaAccessCode ? (
                    <p>
                      {t("settingsModal.plan.activeViaAccessCode", { defaultValue: "Active via access code" })}
                      {accessCampaign ? ` (${accessCampaign})` : ""}
                      {accessExpiryLabel
                        ? ` ${t("settingsModal.plan.until", { defaultValue: "until" })} ${accessExpiryLabel}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <V2Badge tone={isPremium ? "success" : "default"}>{effectiveStatusLabel}</V2Badge>
              </div>
              <div className="zaki-settings-v2__actions">
                <V2Button size="sm" onClick={() => void handlePricingAction("view")}>
                  {t("settingsModal.plan.viewPricing")}
                </V2Button>
                <V2Button size="sm" variant="accent" onClick={() => void handlePricingAction("upgrade")}>
                  {activeViaAccessCode
                    ? t("settingsModal.plan.manageAccess", { defaultValue: "Manage access" })
                    : hasSubscription
                      ? t("settingsModal.plan.managePlan")
                      : t("settingsModal.plan.upgrade")}
                </V2Button>
                {hasSubscription ? (
                  <V2Button
                    size="sm"
                    variant="danger"
                    disabled={cancelAtPeriodEnd || cancelSubscription.isPending || !billingCancelEnabled}
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
                  >
                    {cancelAtPeriodEnd
                      ? t("settingsModal.plan.cancellationScheduled")
                      : t("settingsModal.plan.cancelSubscription")}
                  </V2Button>
                ) : null}
              </div>
              {billingUnavailableMessage ? <p className="v2-body-sm">{billingUnavailableMessage}</p> : null}
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-products"
              data-testid="settings-products-access"
              title={t("settingsModal.sections.productsAccess")}
              meta={productRegistryLoading && !productRegistry ? t("settingsModal.productsAccess.loading") : null}
            >
              <p className="v2-body-sm">{t("settingsModal.productsAccess.subtitle")}</p>
              <div className="zaki-settings-v2__product-list">
                {productAccessRows.map((product) => (
                  <article
                    key={product.productId}
                    data-testid={`settings-product-access-${product.productId}`}
                    className="zaki-settings-v2__product-row"
                  >
                    <header>
                      <strong>{product.label || product.productId}</strong>
                      <V2Badge tone={getStateTone(product.state)}>
                        {getProductStateLabel(t, product.state)}
                      </V2Badge>
                    </header>
                    <dl>
                      <div>
                        <dt>{t("settingsModal.productsAccess.fields.lifecycle")}</dt>
                        <dd>{getProductLifecycleLabel(t, product.lifecycle)}</dd>
                      </div>
                      <div>
                        <dt>{t("settingsModal.productsAccess.fields.memory")}</dt>
                        <dd>{getMemoryScopeLabel(t, product.memoryScope)}</dd>
                      </div>
                      <div>
                        <dt>{t("settingsModal.productsAccess.fields.entryPoint")}</dt>
                        <dd>{getProductEntryPointLabel(t, product)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              {productAccessRows.length === 0 && !productRegistryLoading ? (
                <p className="v2-body-sm">{t("settingsModal.productsAccess.empty")}</p>
              ) : null}
              <p className="v2-body-sm">{t("settingsModal.productsAccess.helper")}</p>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-usage"
              data-testid="settings-platform-usage"
              title={t("settingsModal.sections.usage")}
              meta={platformUsageLoading || meterStatusLoading ? t("settingsModal.usage.loading") : null}
            >
              <V2UsageGauge
                label={t("settingsModal.usage.weeklyAllowance")}
                used={weeklyWindow.used}
                limit={weeklyWindow.limit}
                remaining={
                  typeof weeklyWindow.remaining === "number"
                    ? t("settingsModal.usage.remainingOfLimit", {
                        remaining: formatUsageUnits(weeklyWindow.remaining),
                        limit: formatUsageUnits(weeklyWindow.limit),
                      })
                    : weeklyAllowanceLabel
                }
                reset={
                  formatUsageReset(weeklyWindow.resetAt)
                    ? t("settingsModal.usage.resetsAt", {
                        reset: formatUsageReset(weeklyWindow.resetAt),
                      })
                    : t("settingsModal.usage.resetPending")
                }
                unit={t("settingsModal.usage.units", { defaultValue: "units" })}
              />
              <div className="zaki-settings-v2__usage-grid">
                {meterUsageRows.length > 0
                  ? meterUsageRows.map(({ product, meterProduct }) => {
                      const summaryLabel =
                        getMeterWindowLabel(t, meterProduct?.weekly ?? null) ||
                        t("settingsModal.usage.pending");
                      const resetLabel = formatUsageReset(meterProduct?.weekly?.resetAt);
                      return (
                        <div key={product.productId} className="zaki-settings-v2__usage-row">
                          <strong>{product.label}</strong>
                          <span>{summaryLabel}</span>
                          <small>
                            {resetLabel
                              ? t("settingsModal.usage.resetsAt", { reset: resetLabel })
                              : t("settingsModal.usage.resetPending")}
                          </small>
                        </div>
                      );
                    })
                  : legacyUsageProducts.map((product) => {
                      const quota = product?.quota;
                      const resetLabel = formatUsageReset(quota?.resetAt);
                      return (
                        <div key={product?.productId} className="zaki-settings-v2__usage-row">
                          <strong>{product?.label}</strong>
                          <span>{getQuotaSummaryLabel(t, quota)}</span>
                          <small>
                            {resetLabel
                              ? t("settingsModal.usage.resetsAt", { reset: resetLabel })
                              : t("settingsModal.usage.resetPending")}
                          </small>
                        </div>
                      );
                    })}
              </div>
              <p className="v2-body-sm">{t("settingsModal.usage.helper")}</p>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-memory-data"
              data-testid="settings-memory-data"
              title={t("settingsModal.sections.memoryData")}
            >
              <div className="zaki-settings-v2__memory-list">
                {memoryScopeRows.map((row) => (
                  <div key={row.scope}>
                    <strong>{getMemoryScopeLabel(t, row.scope)}</strong>
                    <span>{row.products.join(" · ")}</span>
                  </div>
                ))}
              </div>
              <div className="zaki-settings-v2__actions">
                <V2Button size="sm" onClick={() => navigate("/brain")}>
                  {t("settingsModal.memoryData.openMemory")}
                </V2Button>
                <V2Button size="sm" disabled={isExporting} onClick={() => void handleExport()}>
                  {isExporting
                    ? t("settingsModal.privacy.preparingExport", { defaultValue: "Preparing export" })
                    : t("settingsModal.privacy.exportAllData")}
                </V2Button>
              </div>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-developer-access"
              data-testid="settings-developer-access"
              title={t("settingsModal.sections.developerAccess")}
            >
              <div className="zaki-settings-v2__product-list">
                {developerAccessRows.map((product) => (
                  <article key={product.productId} className="zaki-settings-v2__product-row">
                    <header>
                      <strong>{product.label}</strong>
                      <V2Badge tone={getStateTone(product.state)}>
                        {getProductStateLabel(t, product.state)}
                      </V2Badge>
                    </header>
                    <p>{getProductEntryPointLabel(t, product)}</p>
                  </article>
                ))}
              </div>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-privacy"
              data-testid="settings-privacy"
              title={t("settingsModal.sections.privacy")}
            >
              <V2SettingsRow
                tone="danger"
                name={t("settingsModal.privacy.deleteAccount")}
                description={t("settingsModal.privacy.deleteWarning")}
              >
                <V2Button variant="danger" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
                  {t("settingsModal.privacy.deleteAccount")}
                </V2Button>
              </V2SettingsRow>
            </V2SettingsBlock>
          </main>
        </div>
      </div>

      <TypeToConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t("settingsModal.privacy.deleteAccount")}
        body={t("settingsModal.privacy.deletePrompt")}
        confirmPhrase={normalizedEmail || user?.username || ""}
        confirmLabel={t("settingsModal.privacy.deletePermanently")}
        cancelLabel={t("settingsModal.privacy.keepAccount")}
        isSubmitting={deleteAccountMutation.isPending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await deleteAccountMutation.mutateAsync(normalizedEmail);
            toast.success(t("settingsModal.privacy.success.accountDeleted"));
            setDeleteConfirmOpen(false);
            logout();
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
