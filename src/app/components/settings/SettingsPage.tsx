import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  Cable,
  Cpu,
  CreditCard,
  Database,
  Gauge,
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  ServerCog,
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
  deleteAgentChannelBinding,
  deleteAgentSecret,
  fetchAgentChannels,
  fetchAgentExtensionDiagnostics,
  fetchBotSettings,
  fetchGoogleOAuthStatus,
  upsertAgentChannelBinding,
  listAgentSecrets,
  putAgentSecret,
  updateBotSettings,
  updateProfile,
  type AgentChannelBindingPayload,
  type AgentChannelId,
  type AgentChannelStatus,
  type AgentExtensionDiagnosticsResponse,
  type BotSettingsPatch,
  type BotSettingsProfile,
  type MeterStatusProduct,
  type MeterWindowSnapshot,
  type PlatformUsageProductId,
  type ProductOperationalState,
  type ProductRegistryItem,
  type ProductRegistryProductId,
  type UsageQuotaSnapshot,
} from "@/lib/api";
import {
  AGENT_MODEL_CATALOG,
  DEFAULT_AGENT_MODEL_ID,
  formatAgentModelCapabilities,
  resolveAgentModel,
} from "@/lib/agentModelCatalog";
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

const DEFAULT_AGENT_SETTINGS: Pick<
  BotSettingsProfile,
  "dream_enabled" | "query_expansion_enabled" | "selected_model"
> = {
  dream_enabled: true,
  query_expansion_enabled: false,
  selected_model: null,
};

const AGENT_LAUNCH_CHANNELS: Array<{
  id: AgentChannelId;
  label: string;
  helper: string;
  principalPlaceholder: string;
  scopePlaceholder: string;
}> = [
  {
    id: "telegram",
    label: "Telegram",
    helper: "Direct connect plus identity bindings for Telegram chats.",
    principalPlaceholder: "telegram-user-id",
    scopePlaceholder: "telegram-chat-id",
  },
  {
    id: "slack",
    label: "Slack",
    helper: "Workspace bot is live downstream; bind Slack users or channels to this account.",
    principalPlaceholder: "U123456",
    scopePlaceholder: "C123456",
  },
  {
    id: "discord",
    label: "Discord",
    helper: "Discord gateway is live downstream; bind Discord users or guild channels.",
    principalPlaceholder: "discord-user-id",
    scopePlaceholder: "discord-channel-id",
  },
  {
    id: "email",
    label: "Email",
    helper: "IMAP/SMTP channel is live downstream; bind sender addresses or domains.",
    principalPlaceholder: "person@example.com",
    scopePlaceholder: "inbox@example.com",
  },
];

type ChannelBindingDraft = Pick<
  AgentChannelBindingPayload,
  "account_id" | "principal_key" | "scope_key" | "thread_key"
>;

function defaultChannelBindingDraft(): ChannelBindingDraft {
  return {
    account_id: "main",
    principal_key: "",
    scope_key: "",
    thread_key: "",
  };
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

function getChannelTone(channel?: AgentChannelStatus | null) {
  if (channel?.connected || channel?.configured) return "success";
  if (channel?.available || channel?.live) return "warn";
  return "default";
}

function getChannelStatusLabel(channel?: AgentChannelStatus | null) {
  if (!channel) return "Checking";
  if (channel.connected) return "Connected";
  if (channel.configured) return "Configured";
  if (channel.available || channel.live) return "Ready";
  return "Not configured";
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
  const [agentSecretsKeys, setAgentSecretsKeys] = useState<string[]>([]);
  const [agentSecretsLoading, setAgentSecretsLoading] = useState(true);
  const [agentSecretsAction, setAgentSecretsAction] = useState<string | null>(null);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [agentChannels, setAgentChannels] = useState<AgentChannelStatus[]>([]);
  const [agentChannelsLoading, setAgentChannelsLoading] = useState(true);
  const [channelAction, setChannelAction] = useState<string | null>(null);
  const [channelBindingDrafts, setChannelBindingDrafts] = useState<
    Record<AgentChannelId, ChannelBindingDraft>
  >({
    telegram: defaultChannelBindingDraft(),
    slack: defaultChannelBindingDraft(),
    discord: defaultChannelBindingDraft(),
    email: defaultChannelBindingDraft(),
  });
  const [extensionDiagnostics, setExtensionDiagnostics] =
    useState<AgentExtensionDiagnosticsResponse | null>(null);
  const [extensionDiagnosticsLoading, setExtensionDiagnosticsLoading] = useState(true);
  const [agentSettingsDraft, setAgentSettingsDraft] =
    useState<Pick<BotSettingsProfile, "dream_enabled" | "query_expansion_enabled" | "selected_model">>(
      DEFAULT_AGENT_SETTINGS
    );
  const [agentSettingsLoading, setAgentSettingsLoading] = useState(true);
  const [agentSettingsSaving, setAgentSettingsSaving] = useState(false);

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

  const loadAgentSecrets = async () => {
    setAgentSecretsLoading(true);
    try {
      const { response, data } = await listAgentSecrets();
      if (!response.ok) throw new Error("agent_secrets_unavailable");
      setAgentSecretsKeys(Array.isArray(data?.keys) ? data.keys : []);
    } catch {
      setAgentSecretsKeys([]);
    } finally {
      setAgentSecretsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setAgentSecretsLoading(true);
    listAgentSecrets()
      .then(({ response, data }) => {
        if (!active) return;
        setAgentSecretsKeys(response.ok && Array.isArray(data?.keys) ? data.keys : []);
      })
      .catch(() => {
        if (active) setAgentSecretsKeys([]);
      })
      .finally(() => {
        if (active) setAgentSecretsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadAgentChannels = async () => {
    setAgentChannelsLoading(true);
    try {
      const { response, data } = await fetchAgentChannels();
      if (!response.ok) throw new Error("agent_channels_unavailable");
      setAgentChannels(Array.isArray(data?.channels) ? data.channels : []);
    } catch {
      setAgentChannels([]);
    } finally {
      setAgentChannelsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setAgentChannelsLoading(true);
    fetchAgentChannels()
      .then(({ response, data }) => {
        if (!active) return;
        setAgentChannels(response.ok && Array.isArray(data?.channels) ? data.channels : []);
      })
      .catch(() => {
        if (active) setAgentChannels([]);
      })
      .finally(() => {
        if (active) setAgentChannelsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setExtensionDiagnosticsLoading(true);
    fetchAgentExtensionDiagnostics()
      .then(({ response, data }) => {
        if (active) setExtensionDiagnostics(response.ok ? data : null);
      })
      .catch(() => {
        if (active) setExtensionDiagnostics(null);
      })
      .finally(() => {
        if (active) setExtensionDiagnosticsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setAgentSettingsLoading(true);
    fetchBotSettings()
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok || data?.error) {
          setAgentSettingsDraft(DEFAULT_AGENT_SETTINGS);
          return;
        }
        setAgentSettingsDraft({
          dream_enabled: data.dream_enabled ?? DEFAULT_AGENT_SETTINGS.dream_enabled,
          query_expansion_enabled:
            data.query_expansion_enabled ?? DEFAULT_AGENT_SETTINGS.query_expansion_enabled,
          selected_model: data.selected_model ?? DEFAULT_AGENT_SETTINGS.selected_model,
        });
      })
      .catch(() => {
        if (!active) return;
        setAgentSettingsDraft(DEFAULT_AGENT_SETTINGS);
      })
      .finally(() => {
        if (active) setAgentSettingsLoading(false);
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
  const effectiveAgentModelId = agentSettingsDraft.selected_model || DEFAULT_AGENT_MODEL_ID;
  const effectiveAgentModel = resolveAgentModel(effectiveAgentModelId);
  const selectedModelIsOperatorDefault = !agentSettingsDraft.selected_model;
  const agentChannelsById = useMemo(
    () => new Map(agentChannels.map((channel) => [channel.id, channel])),
    [agentChannels]
  );

  const updateChannelBindingDraft = (
    channel: AgentChannelId,
    patch: Partial<ChannelBindingDraft>
  ) => {
    setChannelBindingDrafts((current) => ({
      ...current,
      [channel]: {
        ...current[channel],
        ...patch,
      },
    }));
  };

  const handleSaveChannelBinding = async (channel: AgentChannelId) => {
    const draft = channelBindingDrafts[channel] || defaultChannelBindingDraft();
    const accountId = draft.account_id.trim();
    const principalKey = draft.principal_key.trim();
    const scopeKey = draft.scope_key.trim();
    if (!accountId || !principalKey || !scopeKey) {
      toast.error(
        t("settingsModal.channels.bindings.missing", {
          defaultValue: "Account, principal, and scope are required.",
        })
      );
      return;
    }
    setChannelAction(`${channel}:save`);
    try {
      const { response, data } = await upsertAgentChannelBinding(channel, {
        account_id: accountId,
        principal_key: principalKey,
        scope_key: scopeKey,
        thread_key: draft.thread_key?.trim() || null,
      });
      if (!response.ok) throw new Error(data?.message || data?.error || "channel_binding_failed");
      setChannelBindingDrafts((current) => ({
        ...current,
        [channel]: defaultChannelBindingDraft(),
      }));
      await loadAgentChannels();
      toast.success(
        t("settingsModal.channels.bindings.saved", {
          defaultValue: "Channel binding saved.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.channels.bindings.saveError", {
              defaultValue: "Unable to save channel binding.",
            })
      );
    } finally {
      setChannelAction(null);
    }
  };

  const handleDeleteChannelBinding = async (channel: AgentChannelId, bindingId: string) => {
    setChannelAction(`${channel}:${bindingId}`);
    try {
      const { response, data } = await deleteAgentChannelBinding(channel, bindingId);
      if (!response.ok) throw new Error(data?.message || data?.error || "channel_binding_delete_failed");
      await loadAgentChannels();
      toast.success(
        t("settingsModal.channels.bindings.deleted", {
          defaultValue: "Channel binding deleted.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.channels.bindings.deleteError", {
              defaultValue: "Unable to delete channel binding.",
            })
      );
    } finally {
      setChannelAction(null);
    }
  };

  const navItems: V2SettingsNavItem[] = [
    { href: "#settings-account", label: t("settingsModal.nav.account"), icon: UserRound },
    { href: "#settings-connections", label: t("settingsModal.nav.connections"), icon: KeyRound },
    {
      href: "#settings-channels",
      label: t("settingsModal.nav.channels", { defaultValue: "Channels" }),
      icon: Cable,
    },
    {
      href: "#settings-secrets",
      label: t("settingsModal.nav.secrets", { defaultValue: "Secrets" }),
      icon: LockKeyhole,
      meta: agentSecretsKeys.length || undefined,
    },
    {
      href: "#settings-providers",
      label: t("settingsModal.nav.providers", { defaultValue: "Providers" }),
      icon: ServerCog,
    },
    {
      href: "#settings-devices",
      label: t("settingsModal.nav.devices", { defaultValue: "Devices" }),
      icon: MonitorSmartphone,
    },
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
      icon: KeyRound,
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

  const patchAgentSettings = async (patch: BotSettingsPatch) => {
    if (agentSettingsSaving) return;
    const previousDraft = agentSettingsDraft;
    setAgentSettingsSaving(true);
    try {
      const { response, data } = await updateBotSettings(patch);
      if (!response.ok || data?.error) {
        throw new Error(
          data?.message ||
            data?.error ||
            t("settingsModal.agentSettings.errors.update", {
              defaultValue: "Unable to update Agent settings.",
            })
        );
      }
      setAgentSettingsDraft({
        dream_enabled: data.dream_enabled ?? DEFAULT_AGENT_SETTINGS.dream_enabled,
        query_expansion_enabled:
          data.query_expansion_enabled ?? DEFAULT_AGENT_SETTINGS.query_expansion_enabled,
        selected_model: data.selected_model ?? DEFAULT_AGENT_SETTINGS.selected_model,
      });
      toast.success(
        t("settingsModal.agentSettings.success.updated", {
          defaultValue: "Agent settings updated.",
        })
      );
    } catch (err) {
      setAgentSettingsDraft(previousDraft);
      toast.error(
        err instanceof Error
          ? err.message
          : t("settingsModal.agentSettings.errors.update", {
              defaultValue: "Unable to update Agent settings.",
            })
      );
    } finally {
      setAgentSettingsSaving(false);
    }
  };

  const handleSaveSecret = async () => {
    const key = newSecretKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!key || !newSecretValue) {
      toast.error(
        t("settingsModal.secrets.errors.required", {
          defaultValue: "Secret key and value are required.",
        })
      );
      return;
    }
    setAgentSecretsAction("save");
    try {
      const { response, data } = await putAgentSecret(key, newSecretValue);
      if (!response.ok || data?.error) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "agent_secret_save_failed"
        );
      }
      setNewSecretKey("");
      setNewSecretValue("");
      await loadAgentSecrets();
      toast.success(
        t("settingsModal.secrets.success.saved", {
          defaultValue: "Secret saved.",
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settingsModal.secrets.errors.save", {
              defaultValue: "Unable to save secret.",
            })
      );
    } finally {
      setAgentSecretsAction(null);
    }
  };

  const handleDeleteSecret = async (key: string) => {
    setAgentSecretsAction(key);
    try {
      const { response, data } = await deleteAgentSecret(key);
      if (!response.ok || data?.error) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "agent_secret_delete_failed"
        );
      }
      await loadAgentSecrets();
      toast.success(
        t("settingsModal.secrets.success.deleted", {
          defaultValue: "Secret deleted.",
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("settingsModal.secrets.errors.delete", {
              defaultValue: "Unable to delete secret.",
            })
      );
    } finally {
      setAgentSecretsAction(null);
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

            <V2SettingsBlock
              id="settings-channels"
              data-testid="settings-channels"
              title={t("settingsModal.sections.channels", { defaultValue: "Channels" })}
              meta={
                agentChannelsLoading
                  ? t("settingsModal.channels.loading", { defaultValue: "Checking channels" })
                  : t("settingsModal.channels.count", {
                      count: AGENT_LAUNCH_CHANNELS.length,
                      defaultValue: `${AGENT_LAUNCH_CHANNELS.length} launch channels`,
                    })
              }
            >
              {AGENT_LAUNCH_CHANNELS.map((config) => {
                const channel = agentChannelsById.get(config.id);
                const draft = channelBindingDrafts[config.id] || defaultChannelBindingDraft();
                const bindings = channel?.bindings?.items ?? [];
                const statusLabel = agentChannelsLoading
                  ? t("settingsModal.channels.status.checking", { defaultValue: "Checking" })
                  : getChannelStatusLabel(channel);
                const missingSecrets = channel?.missing_secrets ?? [];
                const configuredSecrets = channel?.configured_secrets ?? [];
                const requiredSecrets = channel?.required_secrets ?? [];
                return (
                  <div key={config.id} className="border-b border-[var(--v2-line)] last:border-b-0">
                    <V2SettingsRow
                      name={config.label}
                      description={
                        channel?.operator_managed_runtime
                          ? `${config.helper} Runtime app credentials are operator-managed; user identity bindings are live.`
                          : config.helper
                      }
                    >
                      <div className="grid min-w-[280px] gap-2">
                        <div className="zaki-settings-v2__actions">
                          <V2Badge tone={getChannelTone(channel)}>{statusLabel}</V2Badge>
                          {channel?.bindings_supported ? (
                            <V2Badge tone={bindings.length > 0 ? "success" : "default"}>
                              {t("settingsModal.channels.bindings.count", {
                                count: bindings.length,
                                defaultValue: `${bindings.length} bindings`,
                              })}
                            </V2Badge>
                          ) : null}
                          {config.id === "telegram" ? (
                            <V2Button size="sm" onClick={() => navigate("/agent?settings=channels")}>
                              {t("settingsModal.channels.openAgentChannels", {
                                defaultValue: "Open channels",
                              })}
                            </V2Button>
                          ) : null}
                        </div>
                        {requiredSecrets.length > 0 ? (
                          <p className="text-[11px] leading-5 text-[var(--v2-text-muted)]">
                            {channel?.operator_managed_runtime
                              ? t("settingsModal.channels.secrets.vaultRefs", {
                                  defaultValue: `Vault refs: ${requiredSecrets.join(", ")}`,
                                })
                              : configuredSecrets.length > 0
                              ? t("settingsModal.channels.secrets.configured", {
                                  count: configuredSecrets.length,
                                  defaultValue: `${configuredSecrets.length} secrets stored`,
                                })
                              : t("settingsModal.channels.secrets.required", {
                                  defaultValue: `Secrets: ${requiredSecrets.join(", ")}`,
                                })}
                            {!channel?.operator_managed_runtime && missingSecrets.length > 0
                              ? ` · Missing: ${missingSecrets.join(", ")}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </V2SettingsRow>
                    {channel?.bindings_supported ? (
                      <div className="grid gap-3 px-4 pb-4 md:ml-[min(280px,38%)]">
                        <div className="grid gap-2 md:grid-cols-4">
                          <input
                            className="v2-input"
                            value={draft.account_id}
                            onChange={(event) =>
                              updateChannelBindingDraft(config.id, { account_id: event.target.value })
                            }
                            placeholder={t("settingsModal.channels.bindings.account", {
                              defaultValue: "Account",
                            })}
                            aria-label={`${config.label} account id`}
                          />
                          <input
                            className="v2-input"
                            value={draft.principal_key}
                            onChange={(event) =>
                              updateChannelBindingDraft(config.id, { principal_key: event.target.value })
                            }
                            placeholder={config.principalPlaceholder}
                            aria-label={`${config.label} principal key`}
                          />
                          <input
                            className="v2-input"
                            value={draft.scope_key}
                            onChange={(event) =>
                              updateChannelBindingDraft(config.id, { scope_key: event.target.value })
                            }
                            placeholder={config.scopePlaceholder}
                            aria-label={`${config.label} scope key`}
                          />
                          <input
                            className="v2-input"
                            value={draft.thread_key || ""}
                            onChange={(event) =>
                              updateChannelBindingDraft(config.id, { thread_key: event.target.value })
                            }
                            placeholder={t("settingsModal.channels.bindings.thread", {
                              defaultValue: "Thread optional",
                            })}
                            aria-label={`${config.label} thread key`}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <V2Button
                            size="sm"
                            onClick={() => void handleSaveChannelBinding(config.id)}
                            disabled={channelAction === `${config.id}:save`}
                          >
                            {channelAction === `${config.id}:save`
                              ? t("settingsModal.channels.bindings.saving", {
                                  defaultValue: "Saving",
                                })
                              : t("settingsModal.channels.bindings.save", {
                                  defaultValue: "Save binding",
                                })}
                          </V2Button>
                          <span className="text-[11px] text-[var(--v2-text-muted)]">
                            {t("settingsModal.channels.bindings.helper", {
                              defaultValue:
                                "Bindings route inbound identities to your Agent without exposing channel secrets.",
                            })}
                          </span>
                        </div>
                        {bindings.length > 0 ? (
                          <div className="grid gap-1">
                            {bindings.map((binding) => (
                              <div
                                key={binding.id}
                                className="flex flex-wrap items-center justify-between gap-2 border border-[var(--v2-line)] px-3 py-2 text-xs"
                              >
                                <span className="font-mono text-[var(--v2-text)]">
                                  {binding.account_id} / {binding.principal_key} / {binding.scope_key}
                                </span>
                                <V2Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleDeleteChannelBinding(config.id, binding.id)}
                                  disabled={channelAction === `${config.id}:${binding.id}`}
                                >
                                  {t("settingsModal.channels.bindings.delete", {
                                    defaultValue: "Delete",
                                  })}
                                </V2Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <V2SettingsRow
                name={t("settingsModal.channels.learningTutors.name", {
                  defaultValue: "Learning tutor channels",
                })}
                description={t("settingsModal.channels.learningTutors.description", {
                  defaultValue: "Private-beta tutor channel schema is available through Learning.",
                })}
              >
                <V2Badge tone="warn">
                  {t("settingsModal.channels.status.privateBeta", {
                    defaultValue: "Private beta",
                  })}
                </V2Badge>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.channels.otherChannels.name", {
                  defaultValue: "Additional channels",
                })}
                description={t("settingsModal.channels.otherChannels.description", {
                  defaultValue:
                    "Teams, WhatsApp, Signal, Matrix, and other adapters stay hidden until their user-safe BFF contracts are exposed.",
                })}
              >
                <V2Badge>
                  {t("settingsModal.channels.status.operatorManaged", {
                    defaultValue: "Operator managed",
                  })}
                </V2Badge>
              </V2SettingsRow>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-secrets"
              data-testid="settings-secrets"
              title={t("settingsModal.sections.secrets", { defaultValue: "Secrets & API keys" })}
              meta={
                agentSecretsLoading
                  ? t("settingsModal.secrets.loading", { defaultValue: "Loading secrets" })
                  : t("settingsModal.secrets.count", {
                      count: agentSecretsKeys.length,
                      defaultValue: `${agentSecretsKeys.length} stored`,
                    })
              }
            >
              <V2SettingsRow
                name={t("settingsModal.secrets.addOrRotate", {
                  defaultValue: "Add or rotate secret",
                })}
                description={t("settingsModal.secrets.addOrRotateHelper", {
                  defaultValue: "Values are write-only after save; Settings shows metadata keys only.",
                })}
              >
                <div className="grid min-w-[260px] gap-2">
                  <input
                    className="v2-input"
                    value={newSecretKey}
                    placeholder={t("settingsModal.secrets.keyPlaceholder", {
                      defaultValue: "OPENAI_API_KEY",
                    })}
                    onChange={(event) =>
                      setNewSecretKey(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))
                    }
                  />
                  <input
                    className="v2-input"
                    type="password"
                    value={newSecretValue}
                    placeholder={t("settingsModal.secrets.valuePlaceholder", {
                      defaultValue: "Secret value",
                    })}
                    onChange={(event) => setNewSecretValue(event.target.value)}
                  />
                  <V2Button
                    size="sm"
                    variant="accent"
                    disabled={agentSecretsAction === "save"}
                    onClick={() => void handleSaveSecret()}
                  >
                    {agentSecretsAction === "save"
                      ? t("app.legal.saving")
                      : t("settingsModal.secrets.save", { defaultValue: "Save secret" })}
                  </V2Button>
                </div>
              </V2SettingsRow>
              <div className="zaki-settings-v2__product-list">
                {agentSecretsKeys.map((key) => (
                  <article key={key} className="zaki-settings-v2__product-row">
                    <header>
                      <strong>{key}</strong>
                      <V2Badge tone="success">
                        {t("settingsModal.secrets.metadataOnly", {
                          defaultValue: "Metadata only",
                        })}
                      </V2Badge>
                    </header>
                    <div className="zaki-settings-v2__actions">
                      <V2Button
                        size="sm"
                        variant="danger"
                        disabled={agentSecretsAction === key}
                        onClick={() => void handleDeleteSecret(key)}
                      >
                        {agentSecretsAction === key
                          ? t("app.legal.saving")
                          : t("settingsModal.secrets.delete", { defaultValue: "Delete" })}
                      </V2Button>
                    </div>
                  </article>
                ))}
              </div>
              {!agentSecretsLoading && agentSecretsKeys.length === 0 ? (
                <p className="v2-body-sm">
                  {t("settingsModal.secrets.empty", {
                    defaultValue: "No secrets stored yet.",
                  })}
                </p>
              ) : null}
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-providers"
              data-testid="settings-providers"
              title={t("settingsModal.sections.providers", {
                defaultValue: "Models & providers",
              })}
            >
              <V2SettingsRow
                name={t("settingsModal.providers.operatorDefault.name", {
                  defaultValue: "Operator model routing",
                })}
                description={t("settingsModal.providers.operatorDefault.description", {
                  defaultValue: "ZAKI chooses the production model route unless a controlled Agent model override is set.",
                })}
              >
                <V2Badge tone="success">
                  {selectedModelIsOperatorDefault
                    ? t("settingsModal.agentModel.operatorDefault", {
                        defaultValue: "Operator default",
                      })
                    : effectiveAgentModel.label}
                </V2Badge>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.providers.openAiCompatible.name", {
                  defaultValue: "OpenAI-compatible provider",
                })}
                description={t("settingsModal.providers.openAiCompatible.description", {
                  defaultValue: "BYOK provider profiles require a BFF profile/test contract before self-service launch.",
                })}
              >
                <V2Badge>
                  {t("settingsModal.providers.status.contractNeeded", {
                    defaultValue: "Contract needed",
                  })}
                </V2Badge>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.providers.openapiConnector.name", {
                  defaultValue: "OpenAPI connectors",
                })}
                description={t("settingsModal.providers.openapiConnector.description", {
                  defaultValue: "User-managed connector credentials stay hidden until vault auth_ref support is ready.",
                })}
              >
                <V2Badge>
                  {t("settingsModal.providers.status.operatorManaged", {
                    defaultValue: "Operator managed",
                  })}
                </V2Badge>
              </V2SettingsRow>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-devices"
              data-testid="settings-devices"
              title={t("settingsModal.sections.devices", {
                defaultValue: "Browser extension & devices",
              })}
              meta={
                extensionDiagnosticsLoading
                  ? t("settingsModal.devices.loading", { defaultValue: "Checking" })
                  : extensionDiagnostics?.paired
                    ? t("settingsModal.devices.paired", { defaultValue: "Paired" })
                    : t("settingsModal.devices.notPaired", { defaultValue: "Not paired" })
              }
            >
              <V2SettingsRow
                name={t("settingsModal.devices.extension.name", {
                  defaultValue: "Browser extension",
                })}
                description={t("settingsModal.devices.extension.description", {
                  defaultValue: "Per-user extension diagnostics are live; pairing and revocation UI remain gated.",
                })}
              >
                <V2Badge tone={extensionDiagnostics?.paired ? "success" : "default"}>
                  {extensionDiagnosticsLoading
                    ? t("settingsModal.devices.loading", { defaultValue: "Checking" })
                    : extensionDiagnostics?.paired
                      ? t("settingsModal.devices.paired", { defaultValue: "Paired" })
                      : t("settingsModal.devices.notPaired", { defaultValue: "Not paired" })}
                </V2Badge>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.devices.extension.lastCommand", {
                  defaultValue: "Last extension command",
                })}
              >
                <span className="v2-body-sm">
                  {extensionDiagnostics?.last_command_tool ||
                    extensionDiagnostics?.last_command_result ||
                    t("settingsModal.devices.extension.noCommand", {
                      defaultValue: "No command recorded",
                    })}
                </span>
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
              <div className="zaki-settings-v2__agent-model" data-testid="settings-agent-model">
                <header>
                  <div>
                    <p>{t("settingsModal.agentModel.eyebrow", { defaultValue: "Agent model" })}</p>
                    <h3>{t("settingsModal.agentModel.title", { defaultValue: "AI model routing" })}</h3>
                  </div>
                  <V2Badge tone="accent">
                    {selectedModelIsOperatorDefault
                      ? t("settingsModal.agentModel.operatorDefault", {
                          defaultValue: "Operator default",
                        })
                      : t("settingsModal.agentModel.userSelected", {
                          defaultValue: "User selected",
                        })}
                  </V2Badge>
                </header>
                <div className="zaki-settings-v2__agent-model-active">
                  <Cpu className="size-4" aria-hidden />
                  <div>
                    <strong>{effectiveAgentModel.label}</strong>
                    <span>
                      {effectiveAgentModel.contextWindow} context · {effectiveAgentModel.maxOutput} output ·{" "}
                      {formatAgentModelCapabilities(effectiveAgentModel)}
                    </span>
                  </div>
                </div>
                <div
                  className="zaki-settings-v2__model-table"
                  role="table"
                  aria-label={t("settingsModal.agentModel.tableLabel", {
                    defaultValue: "Agent model options",
                  })}
                >
                  <div role="row" className="zaki-settings-v2__model-table-head">
                    <span role="columnheader">{t("settingsModal.agentModel.columns.model", { defaultValue: "Model" })}</span>
                    <span role="columnheader">{t("settingsModal.agentModel.columns.context", { defaultValue: "Context" })}</span>
                    <span role="columnheader">{t("settingsModal.agentModel.columns.cost", { defaultValue: "Cost" })}</span>
                    <span role="columnheader">{t("settingsModal.agentModel.columns.action", { defaultValue: "Action" })}</span>
                  </div>
                  {AGENT_MODEL_CATALOG.map((model) => {
                    const isActive = effectiveAgentModel.id === model.id;
                    return (
                      <div
                        key={model.id}
                        role="row"
                        className={isActive ? "is-active" : undefined}
                      >
                        <span role="cell">
                          <strong>{model.label}</strong>
                          <small>{model.note}</small>
                        </span>
                        <span role="cell">
                          {model.contextWindow} · {model.maxOutput}
                          <small>{formatAgentModelCapabilities(model)}</small>
                        </span>
                        <span role="cell">
                          <V2Badge tone={model.costClass === "C" ? "warn" : "default"}>
                            {t("settingsModal.agentModel.costClass", {
                              class: model.costClass,
                              defaultValue: `Class ${model.costClass}`,
                            })}
                          </V2Badge>
                        </span>
                        <span role="cell">
                          <V2Button
                            size="sm"
                            disabled={agentSettingsLoading || agentSettingsSaving || isActive}
                            onClick={() => void patchAgentSettings({ selected_model: model.id })}
                          >
                            {isActive
                              ? t("settingsModal.agentModel.current", { defaultValue: "Current" })
                              : t("settingsModal.agentModel.use", { defaultValue: "Use" })}
                          </V2Button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="zaki-settings-v2__actions">
                  <V2Button
                    size="sm"
                    disabled={
                      agentSettingsLoading ||
                      agentSettingsSaving ||
                      selectedModelIsOperatorDefault
                    }
                    onClick={() => void patchAgentSettings({ selected_model: null })}
                  >
                    {t("settingsModal.agentModel.useOperatorDefault", {
                      defaultValue: "Use operator default",
                    })}
                  </V2Button>
                </div>
                <p className="v2-body-sm">
                  {t("settingsModal.agentModel.helper", {
                    defaultValue:
                      "Model changes persist per user and take effect on the next Agent turn.",
                  })}
                </p>
              </div>
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
              {agentSettingsLoading ? (
                <p className="v2-body-sm">
                  {t("settingsModal.agentSettings.loading", {
                    defaultValue: "Loading Agent memory settings...",
                  })}
                </p>
              ) : null}
              <div className="zaki-settings-v2__memory-list">
                {memoryScopeRows.map((row) => (
                  <div key={row.scope}>
                    <strong>{getMemoryScopeLabel(t, row.scope)}</strong>
                    <span>{row.products.join(" · ")}</span>
                  </div>
                ))}
              </div>
              <V2SettingsRow
                name={t("settingsModal.memoryData.dreamReflection")}
                description={t("settingsModal.memoryData.dreamReflectionHelper")}
              >
                <input
                  className="v2-toggle"
                  type="checkbox"
                  aria-label={t("settingsModal.memoryData.dreamReflection")}
                  checked={agentSettingsDraft.dream_enabled ?? true}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const dream_enabled = event.target.checked;
                    setAgentSettingsDraft((current) => ({ ...current, dream_enabled }));
                    void patchAgentSettings({ dream_enabled });
                  }}
                />
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.memoryData.queryExpansion")}
                description={t("settingsModal.memoryData.queryExpansionHelper")}
              >
                <input
                  className="v2-toggle"
                  type="checkbox"
                  aria-label={t("settingsModal.memoryData.queryExpansion")}
                  checked={agentSettingsDraft.query_expansion_enabled ?? false}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const query_expansion_enabled = event.target.checked;
                    setAgentSettingsDraft((current) => ({
                      ...current,
                      query_expansion_enabled,
                    }));
                    void patchAgentSettings({ query_expansion_enabled });
                  }}
                />
              </V2SettingsRow>
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
