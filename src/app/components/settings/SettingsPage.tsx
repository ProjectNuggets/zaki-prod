import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  Cable,
  CreditCard,
  Database,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBillingConfig,
  useBillingPortal,
  useCancelSubscription,
  useCheckout,
  useDeleteAccount,
  useEntitlements,
  useMeterStatus,
  usePlatformUsageSummary,
  useProductRegistry,
  useSyncBilling,
} from "@/queries";
import {
  exportAccountData,
  connectBotTelegram,
  connectAgentChannelControl,
  deleteAgentChannelBinding,
  deleteAgentSecret,
  disconnectBotTelegram,
  disconnectAgentChannelControl,
  exportAgentMemory,
  fetchAgentChannelControls,
  fetchAgentChannels,
  fetchAgentExtensionDevices,
  fetchAgentExtensionDiagnostics,
  fetchAgentMemoryGovernance,
  fetchBotSettings,
  fetchMemoryPreferences,
  forgetAgentMemory,
  upsertAgentChannelBinding,
  listAgentSecrets,
  pairAgentExtensionDevice,
  putAgentSecret,
  purgeAgentMemoryPii,
  revokeAgentExtensionDevice,
  testAgentChannelControl,
  requestLogout,
  updateBotSettings,
  updateMemoryPreferences,
  updateProfile,
  type AgentChannelControlId,
  type AgentChannelControlStatus,
  type AgentChannelId,
  type AgentChannelStatus,
  type AgentExtensionDevice,
  type AgentExtensionDiagnosticsResponse,
  type AgentMemoryGovernanceResponse,
  type AgentMemoryPurgePiiResponse,
  type BotTelegramConnectPayload,
  type BotSettingsPatch,
  type BotSettingsProfile,
  type MemoryPolicy,
  type MeterStatusProduct,
  type MeterWindowSnapshot,
  type ProductRegistryItem,
} from "@/lib/api";
import { hasActiveSubscription, resolveEffectiveEntitlement } from "@/lib/entitlements";
import {
  estimateTurnsFromUnits,
  formatUnits,
  formatUsagePercentLabel,
  getRoundedUsagePercent,
  getUsagePercent,
  isUsageAtCap,
  isUsageNearCap,
} from "@/lib/usageDisplay";
import {
  AGENT_DEFAULT_REASONING_EFFORTS,
  assistantModeToReasoningEffort,
  reasoningEffortToAssistantMode,
  type AgentDefaultReasoningEffort,
} from "@/lib/agentSettingsDefaults";
import { trackProductEvent } from "@/lib/productTelemetry";
import {
  getProductLaunchState,
  type ProductLaunchState,
} from "@/lib/productRoutes";
import { useAuthStore, useUIStore } from "@/stores";
import { TypeToConfirmDialog } from "@/app/components/ui/zaki";
import { V2Badge, V2Button, V2StatusStrip } from "@/app/components/v2";
import {
  SettingsChannelsSection,
  buildEmptyChannelActivationDrafts,
  compactStringPayload,
  defaultChannelBindingDraft,
  type ChannelBindingDraft,
  type SettingsChannelId,
} from "./SettingsChannelsSection";
import { SettingsTelosSection } from "./SettingsTelosSection";
import {
  GatedRow,
  V2SettingsBlock,
  V2SettingsNav,
  V2SettingsRow,
  type V2SettingsNavItem,
} from "./V2SettingsPrimitives";

type MeterUsageRow = {
  product: ProductRegistryItem;
  meterProduct: MeterStatusProduct | null;
};

type SettingsBillingPlanId =
  | "free"
  | "personal"
  | "agent"
  | "learn"
  | "complete"
  | "pro"
  | "pro_max";
type SettingsCheckoutPlanId = "personal" | "pro" | "pro_max";

const SETTINGS_PAID_PLAN_IDS = ["personal", "pro", "pro_max"] as const satisfies readonly SettingsCheckoutPlanId[];
const SETTINGS_PLAN_RANK: Record<SettingsBillingPlanId, number> = {
  free: 0,
  personal: 1,
  agent: 1,
  learn: 2,
  pro: 2,
  complete: 3,
  pro_max: 3,
};
const SETTINGS_PLAN_LABELS: Record<SettingsBillingPlanId, string> = {
  free: "Free",
  personal: "Personal",
  agent: "ZAKI Agent",
  learn: "ZAKI Learn",
  complete: "ZAKI Complete",
  pro: "Pro",
  pro_max: "Pro MAX",
};

type AgentSettingsDraft = Required<
  Pick<
    BotSettingsProfile,
    | "group_activation"
    | "proactive_updates"
    | "voice_replies"
    | "session_timeout_minutes"
    | "assistant_mode"
    | "autonomy"
    | "dream_enabled"
    | "query_expansion_enabled"
  >
> &
  Pick<BotSettingsProfile, "selected_model">;

const DEFAULT_AGENT_SETTINGS: AgentSettingsDraft = {
  group_activation: "mention",
  proactive_updates: true,
  voice_replies: false,
  session_timeout_minutes: 30,
  assistant_mode: "balanced",
  autonomy: "full",
  dream_enabled: true,
  query_expansion_enabled: false,
  selected_model: null,
};

const AGENT_SESSION_TIMEOUT_MINUTES_MIN = 5;
const AGENT_SESSION_TIMEOUT_MINUTES_MAX = 180;

const SETTINGS_SECTION_QUERY_MAP: Record<string, string> = {
  account: "#settings-account",
  security: "#settings-account",
  billing: "#settings-billing",
  plan: "#settings-billing",
  usage: "#settings-billing",
  products: "#settings-billing",
  access: "#settings-billing",
  agent: "#settings-agent",
  spaces: "#settings-billing",
  chat: "#settings-billing",
  brain: "#settings-memory-data",
  memory: "#settings-memory-data",
  "memory-data": "#settings-memory-data",
  channels: "#settings-channels",
  secrets: "#settings-secrets",
  providers: "#settings-agent",
  models: "#settings-agent",
  devices: "#settings-devices",
  extension: "#settings-devices",
  oauth: "#settings-account",
  connections: "#settings-account",
  developer: "#settings-secrets",
  "developer-access": "#settings-secrets",
  privacy: "#settings-privacy",
  data: "#settings-privacy",
};

const SETTINGS_NAV_HASHES = [
  "#settings-account",
  "#settings-billing",
  "#settings-agent",
  "#settings-channels",
  "#settings-secrets",
  "#settings-devices",
  "#settings-memory-data",
  "#settings-privacy",
] as const;

const SETTINGS_HASH_COMPAT_MAP: Record<string, (typeof SETTINGS_NAV_HASHES)[number]> = {
  "#settings-products": "#settings-billing",
  "#settings-spaces": "#settings-billing",
  "#settings-brain": "#settings-memory-data",
  "#settings-developer-access": "#settings-secrets",
  "#settings-connections": "#settings-account",
  "#settings-usage": "#settings-billing",
  "#settings-providers": "#settings-agent",
};

function isSettingsNavHash(hash: string): hash is (typeof SETTINGS_NAV_HASHES)[number] {
  return (SETTINGS_NAV_HASHES as readonly string[]).includes(hash);
}

const AGENT_GROUP_ACTIVATION_MODES: Array<NonNullable<BotSettingsProfile["group_activation"]>> = [
  "mention",
  "always",
];

const AGENT_AUTONOMY_LEVELS: Array<NonNullable<BotSettingsProfile["autonomy"]>> = [
  "read_only",
  "supervised",
  "full",
];

function normalizeAgentSettingsProfile(profile?: BotSettingsProfile | null): AgentSettingsDraft {
  return {
    group_activation: profile?.group_activation ?? DEFAULT_AGENT_SETTINGS.group_activation,
    proactive_updates: profile?.proactive_updates ?? DEFAULT_AGENT_SETTINGS.proactive_updates,
    voice_replies: profile?.voice_replies ?? DEFAULT_AGENT_SETTINGS.voice_replies,
    session_timeout_minutes:
      typeof profile?.session_timeout_minutes === "number"
        ? profile.session_timeout_minutes
        : DEFAULT_AGENT_SETTINGS.session_timeout_minutes,
    assistant_mode: profile?.assistant_mode ?? DEFAULT_AGENT_SETTINGS.assistant_mode,
    autonomy: profile?.autonomy ?? DEFAULT_AGENT_SETTINGS.autonomy,
    dream_enabled: profile?.dream_enabled ?? DEFAULT_AGENT_SETTINGS.dream_enabled,
    query_expansion_enabled:
      profile?.query_expansion_enabled ?? DEFAULT_AGENT_SETTINGS.query_expansion_enabled,
    selected_model: profile?.selected_model ?? DEFAULT_AGENT_SETTINGS.selected_model,
  };
}

function formatUnixDate(value?: number | null) {
  if (!value) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Memory capture policy is bound to the real BFF route GET|PATCH
// /api/memory/preferences (api.ts: fetchMemoryPreferences / updateMemoryPreferences).
const MEMORY_CAPTURE_POLICIES: MemoryPolicy[] = ["balanced", "off"];

const DEFAULT_MEMORY_CAPTURE_POLICY: MemoryPolicy = "balanced";

function normalizeSettingsPlanId(value: unknown): SettingsBillingPlanId {
  const plan = String(value || "").trim().toLowerCase();
  if (plan === "pro_max" || plan === "promax") return "pro_max";
  if (plan === "complete") return "complete";
  if (plan === "pro") return "pro";
  if (plan === "agent") return "agent";
  if (plan === "learn") return "learn";
  if (
    plan === "personal" ||
    plan === "student" ||
    plan === "legacy_personal" ||
    plan === "access_code"
  ) {
    return "personal";
  }
  return "free";
}

function getSettingsPlanLabel(t: ReturnType<typeof useTranslation>["t"], plan: SettingsBillingPlanId) {
  return t(`settingsModal.plan.tiers.${plan}`, {
    defaultValue: SETTINGS_PLAN_LABELS[plan],
  });
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

function formatUsageClearTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMeterWindowLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  snapshot?: MeterWindowSnapshot | null,
  key = "settingsModal.usage.usagePercent",
  defaultFormatter = formatUsagePercentLabel
) {
  if (!snapshot) return null;
  if (typeof snapshot.limit === "number" && typeof snapshot.used === "number") {
    const percent = getUsagePercent({ used: snapshot.used, limit: snapshot.limit });
    const roundedPercent = getRoundedUsagePercent(percent);
    return t(key, {
      percent: roundedPercent,
      defaultValue: defaultFormatter(percent),
    });
  }
  return null;
}

// Exact "N of M left" from a meter window snapshot (prefers the pooled remaining, which is
// topup-aware; falls back to limit - used).
function getMeterRemainingLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  snapshot?: MeterWindowSnapshot | null
) {
  if (!snapshot || typeof snapshot.limit !== "number") return null;
  const remaining =
    typeof snapshot.remaining === "number"
      ? snapshot.remaining
      : typeof snapshot.used === "number"
      ? Math.max(0, snapshot.limit - snapshot.used)
      : null;
  if (remaining === null) return null;
  return t("settingsModal.usage.remainingOfLimit", {
    remaining: formatUnits(remaining),
    limit: formatUnits(snapshot.limit),
    defaultValue: `${formatUnits(remaining)} of ${formatUnits(snapshot.limit)} left`,
  });
}

// "≈ N agent runs · or M chats" — only meaningful on the POOLED weekly total (the per-product
// rows are weighted slices of this same pool, not independent budgets).
function getMeterRunsLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  snapshot?: MeterWindowSnapshot | null
) {
  // Only meaningful when there is a real numeric cap; an unlimited/unmetered window (limit null)
  // must NOT render a concrete "≈ N agent runs" headline (it would falsely imply a finite budget).
  if (!snapshot || typeof snapshot.limit !== "number") return null;
  const remaining =
    typeof snapshot.remaining === "number"
      ? snapshot.remaining
      : typeof snapshot.limit === "number" && typeof snapshot.used === "number"
      ? Math.max(0, snapshot.limit - snapshot.used)
      : null;
  const estimate = estimateTurnsFromUnits(remaining);
  if (!estimate) return null;
  return t("settingsModal.usage.runsHeadline", {
    agentRuns: estimate.agentRuns,
    chats: estimate.chats,
    defaultValue: `≈ ${estimate.agentRuns} agent runs · or ${estimate.chats} chats`,
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

function getUsageLifecycleLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  lifecycle?: string
) {
  const lifecycleLabel = getProductLifecycleLabel(t, lifecycle);
  return t("settingsModal.usage.lifecycleLabel", {
    defaultValue: `Lifecycle: ${lifecycleLabel}`,
    lifecycle: lifecycleLabel,
  });
}

function getUsageLaunchStateLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  productId?: string
) {
  const launchState = getProductLaunchState(productId);
  if (launchState === "unknown") return null;
  const fallback: Record<Exclude<ProductLaunchState, "unknown">, string> = {
    public_app: "Launch: public app",
    private_beta: "Launch: private access",
    waitlist: "Launch: waitlist",
    hidden: "Launch: hidden",
  };
  return t(`settingsModal.usage.launchState.${launchState}`, {
    defaultValue: fallback[launchState],
  });
}

function getDeviceTone(device?: AgentExtensionDevice | null) {
  if (device?.connection_state === "connected") return "success";
  if (device?.status === "revoked" || device?.connection_state === "revoked") return "danger";
  if (device?.connection_state === "disconnected") return "warn";
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
  const recurringRemaining = meterWeekly?.recurringRemaining ?? null;
  const topupUnits = meterWeekly?.topupUnits ?? null;
  const used =
    meterWeekly?.used ??
    fallback?.used ??
    (typeof limit === "number" && typeof remaining === "number" ? limit - remaining : null);
  const resetAt = meterWeekly?.resetAt ?? fallback?.resetAt ?? null;
  return { limit, remaining, recurringRemaining, resetAt, topupUnits, used };
}

function getMeterBarStyle(used?: number | null, limit?: number | null) {
  return { "--zaki-meter-percent": `${getUsagePercent({ used, limit })}%` } as CSSProperties;
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSettingsHref, setActiveSettingsHref] = useState<(typeof SETTINGS_NAV_HASHES)[number]>(
    () => (isSettingsNavHash(location.hash) ? location.hash : "#settings-account")
  );
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const themePreference = useUIStore((state) => state.themePreference);
  const setThemePreference = useUIStore((state) => state.setThemePreference);
  const [displayName, setDisplayName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [signOutSaving, setSignOutSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [agentSecretsKeys, setAgentSecretsKeys] = useState<string[]>([]);
  const [agentSecretsLoading, setAgentSecretsLoading] = useState(true);
  const [agentSecretsAvailable, setAgentSecretsAvailable] = useState(true);
  const [agentSecretsAction, setAgentSecretsAction] = useState<string | null>(null);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [agentChannels, setAgentChannels] = useState<AgentChannelStatus[]>([]);
  const [agentChannelsLoading, setAgentChannelsLoading] = useState(true);
  const [channelControls, setChannelControls] = useState<AgentChannelControlStatus[]>([]);
  const [channelControlsLoading, setChannelControlsLoading] = useState(true);
  const [channelControlsAvailable, setChannelControlsAvailable] = useState(true);
  const [channelControlAction, setChannelControlAction] = useState<string | null>(null);
  const [channelActivationDrafts, setChannelActivationDrafts] = useState<
    Record<string, Record<string, string>>
  >(() => buildEmptyChannelActivationDrafts());
  const [channelAction, setChannelAction] = useState<string | null>(null);
  const [expandedChannelId, setExpandedChannelId] = useState<SettingsChannelId | null>(null);
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
  const [extensionDevices, setExtensionDevices] = useState<AgentExtensionDevice[]>([]);
  const [extensionDevicesLoading, setExtensionDevicesLoading] = useState(true);
  const [extensionDevicesAvailable, setExtensionDevicesAvailable] = useState(true);
  const [extensionDeviceLabel, setExtensionDeviceLabel] = useState("");
  const [extensionDeviceAction, setExtensionDeviceAction] = useState<string | null>(null);
  const [memoryGovernance, setMemoryGovernance] =
    useState<AgentMemoryGovernanceResponse | null>(null);
  const [memoryGovernanceLoading, setMemoryGovernanceLoading] = useState(true);
  const [memoryGovernanceAvailable, setMemoryGovernanceAvailable] = useState(true);
  const [piiAction, setPiiAction] = useState<string | null>(null);
  const [lastPiiPurgeResult, setLastPiiPurgeResult] =
    useState<AgentMemoryPurgePiiResponse | null>(null);
  const [memoryForgetKey, setMemoryForgetKey] = useState("");
  const [agentSettingsDraft, setAgentSettingsDraft] =
    useState<AgentSettingsDraft>(DEFAULT_AGENT_SETTINGS);
  const [agentSettingsLoading, setAgentSettingsLoading] = useState(true);
  const [agentSettingsSaving, setAgentSettingsSaving] = useState(false);
  const [sessionTimeoutDraft, setSessionTimeoutDraft] = useState(
    String(DEFAULT_AGENT_SETTINGS.session_timeout_minutes)
  );
  const [sessionTimeoutError, setSessionTimeoutError] = useState<string | null>(null);
  const [capturePolicy, setCapturePolicy] = useState<MemoryPolicy>(
    DEFAULT_MEMORY_CAPTURE_POLICY
  );
  const [capturePolicyLoading, setCapturePolicyLoading] = useState(true);
  const [capturePolicyAvailable, setCapturePolicyAvailable] = useState(true);
  const [capturePolicySaving, setCapturePolicySaving] = useState(false);
  const agentSettingsDraftRef = useRef<AgentSettingsDraft>(DEFAULT_AGENT_SETTINGS);
  const agentSettingsQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const { data: entitlementsResult } = useEntitlements();
  const { data: billingConfigResult } = useBillingConfig();
  const { data: meterStatusResult, isLoading: meterStatusLoading } = useMeterStatus();
  const { data: platformUsageResult, isLoading: platformUsageLoading } = usePlatformUsageSummary();
  const { data: productRegistryResult } = useProductRegistry();
  const checkout = useCheckout();
  const billingPortal = useBillingPortal();
  const syncBilling = useSyncBilling();
  const cancelSubscription = useCancelSubscription();
  const deleteAccountMutation = useDeleteAccount();

  const entitlements = entitlementsResult?.data ?? null;
  const platformUsage = platformUsageResult?.data ?? null;
  const productRegistry = productRegistryResult?.data ?? null;
  const meterStatus = meterStatusResult?.data ?? null;
  const planTier = entitlements?.plan?.tier ?? "free";
  const cancelAtPeriodEnd = Boolean(entitlements?.plan?.cancelAtPeriodEnd);
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
  const billingSyncEnabled = billingConfigLoaded ? Boolean(billingConfig?.stripeEnabled) : true;
  const billingUnavailableMessage =
    billingConfigLoaded &&
    (!billingCheckoutEnabled || (hasSubscription && (!billingPortalEnabled || !billingCancelEnabled)))
      ? t("settingsModal.plan.billingUnavailable", {
          defaultValue: "Payment actions are unavailable in this environment.",
        })
      : null;
  const languageValue = i18n.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
  const normalizedEmail = useMemo(() => (user?.username || "").trim().toLowerCase(), [user?.username]);
  const canApplyPiiPurge =
    memoryGovernanceAvailable &&
    lastPiiPurgeResult?.dry_run === true &&
    lastPiiPurgeResult.category === "all" &&
    (lastPiiPurgeResult.candidate_count ?? 0) > 0;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const section = String(searchParams.get("section") || "")
      .trim()
      .toLowerCase();
    if (!section) return;
    const targetHash = SETTINGS_SECTION_QUERY_MAP[section];
    if (!targetHash) return;
    searchParams.delete("section");
    const nextSearch = searchParams.toString();
    navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${targetHash}`, {
      replace: true,
    });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!location.hash) return;
    const compatibleHash = SETTINGS_HASH_COMPAT_MAP[location.hash];
    if (compatibleHash) {
      navigate(`${location.pathname}${location.search}${compatibleHash}`, { replace: true });
      return;
    }
    const targetId = decodeURIComponent(location.hash.slice(1));
    if (!targetId) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      const scroller = document.querySelector<HTMLElement>(".zaki-settings-v2");
      if (scroller && typeof scroller.scrollTo === "function") {
        const scrollerRect = scroller.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetTop = targetRect.top - scrollerRect.top + scroller.scrollTop - 24;
        scroller.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
      } else {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }
      target.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (isSettingsNavHash(location.hash)) {
      setActiveSettingsHref(location.hash);
    }
  }, [location.hash]);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".zaki-settings-v2");
    if (!scroller) return;

    let frame: number | null = null;

    const updateActiveSection = () => {
      frame = null;
      const scrollerRect = scroller.getBoundingClientRect();
      const anchorY = scrollerRect.top + Math.min(220, Math.max(120, scrollerRect.height * 0.24));
      let nextHref: (typeof SETTINGS_NAV_HASHES)[number] = SETTINGS_NAV_HASHES[0];
      let firstVisibleHref: (typeof SETTINGS_NAV_HASHES)[number] | null = null;

      for (const href of SETTINGS_NAV_HASHES) {
        const section = document.getElementById(href.slice(1));
        if (!section) continue;

        const rect = section.getBoundingClientRect();
        const isVisible =
          rect.bottom > scrollerRect.top + 64 && rect.top < scrollerRect.bottom - 64;

        if (isVisible && firstVisibleHref === null) {
          firstVisibleHref = href;
        }

        if (rect.top <= anchorY && rect.bottom > scrollerRect.top + 64) {
          nextHref = href;
        }
      }

      if (nextHref === SETTINGS_NAV_HASHES[0] && firstVisibleHref !== null) {
        nextHref = firstVisibleHref;
      }

      setActiveSettingsHref((current) => (current === nextHref ? current : nextHref));
    };

    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      scroller.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    agentSettingsDraftRef.current = agentSettingsDraft;
  }, [agentSettingsDraft]);

  useEffect(() => {
    setDisplayName(
      user?.fullName?.trim() ||
        user?.username?.trim() ||
        t("sidebar.profile.defaultName", { defaultValue: "ZAKI user" })
    );
  }, [t, user?.fullName, user?.username]);

  const loadAgentSecrets = async () => {
    setAgentSecretsLoading(true);
    try {
      const { response, data } = await listAgentSecrets();
      if (!response.ok) throw new Error("agent_secrets_unavailable");
      setAgentSecretsAvailable(true);
      setAgentSecretsKeys(Array.isArray(data?.keys) ? data.keys : []);
    } catch {
      setAgentSecretsAvailable(false);
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
        setAgentSecretsAvailable(response.ok);
        setAgentSecretsKeys(response.ok && Array.isArray(data?.keys) ? data.keys : []);
      })
      .catch(() => {
        if (!active) return;
        setAgentSecretsAvailable(false);
        setAgentSecretsKeys([]);
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

  const loadChannelControls = async () => {
    setChannelControlsLoading(true);
    try {
      const { response, data } = await fetchAgentChannelControls();
      if (!response.ok) throw new Error("channel_control_unavailable");
      setChannelControlsAvailable(true);
      setChannelControls(Array.isArray(data?.channels) ? data.channels : []);
    } catch {
      setChannelControlsAvailable(false);
      setChannelControls([]);
    } finally {
      setChannelControlsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setChannelControlsLoading(true);
    fetchAgentChannelControls()
      .then(({ response, data }) => {
        if (!active) return;
        setChannelControlsAvailable(response.ok);
        setChannelControls(response.ok && Array.isArray(data?.channels) ? data.channels : []);
      })
      .catch(() => {
        if (!active) return;
        setChannelControlsAvailable(false);
        setChannelControls([]);
      })
      .finally(() => {
        if (active) setChannelControlsLoading(false);
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

  const loadExtensionDevices = async () => {
    setExtensionDevicesLoading(true);
    try {
      const { response, data } = await fetchAgentExtensionDevices();
      if (!response.ok) throw new Error("extension_devices_unavailable");
      setExtensionDevicesAvailable(true);
      setExtensionDevices(Array.isArray(data?.devices) ? data.devices : []);
    } catch {
      setExtensionDevicesAvailable(false);
      setExtensionDevices([]);
    } finally {
      setExtensionDevicesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setExtensionDevicesLoading(true);
    fetchAgentExtensionDevices()
      .then(({ response, data }) => {
        if (!active) return;
        setExtensionDevicesAvailable(response.ok);
        setExtensionDevices(response.ok && Array.isArray(data?.devices) ? data.devices : []);
      })
      .catch(() => {
        if (!active) return;
        setExtensionDevicesAvailable(false);
        setExtensionDevices([]);
      })
      .finally(() => {
        if (active) setExtensionDevicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadMemoryGovernance = async () => {
    setMemoryGovernanceLoading(true);
    setLastPiiPurgeResult(null);
    try {
      const { response, data } = await fetchAgentMemoryGovernance();
      if (!response.ok) throw new Error("memory_governance_unavailable");
      setMemoryGovernanceAvailable(true);
      setMemoryGovernance(data);
    } catch {
      setMemoryGovernanceAvailable(false);
      setMemoryGovernance(null);
    } finally {
      setMemoryGovernanceLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setMemoryGovernanceLoading(true);
    setLastPiiPurgeResult(null);
    fetchAgentMemoryGovernance()
      .then(({ response, data }) => {
        if (!active) return;
        setMemoryGovernanceAvailable(response.ok);
        setMemoryGovernance(response.ok ? data : null);
      })
      .catch(() => {
        if (!active) return;
        setMemoryGovernanceAvailable(false);
        setMemoryGovernance(null);
      })
      .finally(() => {
        if (active) setMemoryGovernanceLoading(false);
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
        setAgentSettingsDraft(normalizeAgentSettingsProfile(data));
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

  useEffect(() => {
    if (agentSettingsLoading || agentSettingsSaving) return;
    setSessionTimeoutDraft(String(agentSettingsDraft.session_timeout_minutes));
    setSessionTimeoutError(null);
  }, [
    agentSettingsDraft.session_timeout_minutes,
    agentSettingsLoading,
    agentSettingsSaving,
  ]);

  useEffect(() => {
    let active = true;
    setCapturePolicyLoading(true);
    fetchMemoryPreferences()
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok || !data?.policy) {
          setCapturePolicyAvailable(false);
          setCapturePolicy(DEFAULT_MEMORY_CAPTURE_POLICY);
          return;
        }
        setCapturePolicyAvailable(true);
        setCapturePolicy(data.policy);
      })
      .catch(() => {
        if (!active) return;
        setCapturePolicyAvailable(false);
        setCapturePolicy(DEFAULT_MEMORY_CAPTURE_POLICY);
      })
      .finally(() => {
        if (active) setCapturePolicyLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCapturePolicyChange = async (nextPolicy: MemoryPolicy) => {
    if (capturePolicySaving || nextPolicy === capturePolicy) return;
    const previousPolicy = capturePolicy;
    setCapturePolicy(nextPolicy);
    setCapturePolicySaving(true);
    try {
      const { response, data } = await updateMemoryPreferences(nextPolicy);
      if (!response.ok) {
        throw new Error("memory_preferences_update_failed");
      }
      setCapturePolicy(data?.policy ?? nextPolicy);
      toast.success(
        t("settingsModal.memoryData.capturePolicy.saved", {
          defaultValue: "Memory capture policy updated.",
        })
      );
    } catch {
      setCapturePolicy(previousPolicy);
      toast.error(
        t("settingsModal.memoryData.capturePolicy.error", {
          defaultValue: "Could not update memory capture policy.",
        })
      );
    } finally {
      setCapturePolicySaving(false);
    }
  };

  const currentPlatformPlanId = normalizeSettingsPlanId(
    platformUsage?.plan?.id ||
      entitlements?.platform?.plan?.id ||
      effectiveEntitlement.tier ||
      planTier ||
      meterStatus?.plan?.tier
  );
  const currentPlanLabel = getSettingsPlanLabel(t, currentPlatformPlanId);
  const effectiveStatusLabel = t(`settingsModal.plan.statusValues.${effectiveStatus}`, {
    defaultValue: effectiveStatus,
  });
  const platformPlanLabel = currentPlanLabel;
  const availableUpgradePlans = SETTINGS_PAID_PLAN_IDS.filter(
    (plan) => SETTINGS_PLAN_RANK[plan] > SETTINGS_PLAN_RANK[currentPlatformPlanId]
  );
  const accessCodeStatusLabel = activeViaAccessCode
    ? hasSubscription
      ? t("settingsModal.plan.accessCodeSupplement", {
          defaultValue: "Access code is also active",
        })
      : t("settingsModal.plan.activeViaAccessCode", {
          defaultValue: "Active via access code",
        })
    : null;
  const billingSourceLabel =
    activeViaAccessCode && hasSubscription
      ? t("settingsModal.plan.sources.subscriptionWithAccessCode", {
          defaultValue: "Subscription + access code",
        })
      : activeViaAccessCode
        ? t("settingsModal.plan.sources.accessCode", { defaultValue: "Access code" })
        : hasSubscription
          ? t("settingsModal.plan.sources.subscription", { defaultValue: "Subscription" })
          : t("settingsModal.plan.sources.free", { defaultValue: "Free account" });
  const allowance = platformUsage?.allowance;
  const weeklyWindow = normalizeWeeklyWindow(meterStatus?.weekly ?? null, allowance?.weekly ?? null);
  const weeklyUsagePercent = getUsagePercent({
    used: weeklyWindow.used,
    limit: weeklyWindow.limit,
  });
  const weeklyUsagePercentRounded = getRoundedUsagePercent(weeklyUsagePercent);
  const weeklyAllowanceLabel =
    getMeterWindowLabel(t, meterStatus?.weekly) ||
    (allowance?.weekly?.configured && typeof allowance.weekly.used === "number" && typeof allowance.weekly.limit === "number"
      ? t("settingsModal.usage.weeklyAllowanceValue", {
          percent: getRoundedUsagePercent(
            getUsagePercent({ used: allowance.weekly.used, limit: allowance.weekly.limit })
          ),
        })
      : t("settingsModal.usage.weeklyAllowancePending"));
  const weeklyRunsLabel = getMeterRunsLabel(t, meterStatus?.weekly ?? null);
  const weeklyRemainingLabel = getMeterRemainingLabel(t, meterStatus?.weekly ?? null);
  const burstWindowLabel =
    getMeterWindowLabel(
      t,
      meterStatus?.rolling,
      "settingsModal.usage.windowUsagePercent",
      (percent) => `${getRoundedUsagePercent(percent)}% of this capacity window`
    ) ||
    (typeof allowance?.burst?.windowHours === "number"
      ? t("settingsModal.usage.burstWindowValue", {
          percent: 0,
        })
      : t("settingsModal.usage.burstWindowPending"));
  const weeklyRoomLabel = isUsageAtCap(weeklyUsagePercent)
    ? t("settingsModal.usage.full", {
        defaultValue: "Full until reset",
      })
    : isUsageNearCap(weeklyUsagePercent)
      ? t("settingsModal.usage.nearCap", {
          defaultValue: "More room available on higher plans",
        })
      : t("settingsModal.usage.comfortable", {
          defaultValue: "Comfortable this week",
        });
  const extraCapacityLabel =
    typeof weeklyWindow.topupUnits === "number" && weeklyWindow.topupUnits > 0
      ? t("settingsModal.usage.extraCapacityIncluded", {
          defaultValue: "Included in this week",
        })
      : t("settingsModal.usage.extraCapacityDeferred", {
          defaultValue: "Deferred for this release",
        });
  const agentAvailableNow = meterStatus?.availableNow?.agent ?? null;
  const rollingWindowHours =
    typeof meterStatus?.rolling?.windowHours === "number" ? meterStatus.rolling.windowHours : 5;
  const rollingUsagePercentRounded = getRoundedUsagePercent(
    getUsagePercent({
      used: meterStatus?.rolling?.used,
      limit: meterStatus?.rolling?.limit,
    })
  );
  const rollingClearTime = formatUsageClearTime(
    agentAvailableNow?.resetAt || meterStatus?.rolling?.resetAt
  );
  const agentAvailableNowLabel =
    agentAvailableNow?.available === false
      ? agentAvailableNow.constraint === "rolling"
        ? t("settingsModal.plan.agentAvailableNowRollingBlocked", {
            hours: rollingWindowHours,
            percent: rollingUsagePercentRounded,
            reset: rollingClearTime || t("settingsModal.usage.resetPending"),
            defaultValue: `${rollingWindowHours}h window ${rollingUsagePercentRounded}% used; next room clears ${
              rollingClearTime || t("settingsModal.usage.resetPending")
            }`,
          })
        : t("settingsModal.plan.agentAvailableNowBlocked", {
            defaultValue: "Needs more weekly room",
          })
      : agentAvailableNow
        ? t("settingsModal.plan.agentAvailableNowReady", {
            defaultValue: "Ready",
          })
        : t("settingsModal.usage.pending");
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
  const meteredProducts = productAccessRows.filter(
    (product) => product.productKind !== "control_plane" && product.productKind !== "client"
  );
  const meterUsageRows: MeterUsageRow[] = meterStatus
    ? meteredProducts.map((product) => ({
        product,
        meterProduct: product.productId ? meterStatus.products?.[product.productId] ?? null : null,
      }))
    : [];
  const getBooleanStatusLabel = (value: boolean) =>
    value
      ? t("settingsModal.status.on", { defaultValue: "On" })
      : t("settingsModal.status.off", { defaultValue: "Off" });
  const dreamStatusLabel = getBooleanStatusLabel(agentSettingsDraft.dream_enabled);
  const queryExpansionStatusLabel = getBooleanStatusLabel(
    agentSettingsDraft.query_expansion_enabled
  );
  const agentChannelsById = useMemo(
    () => new Map(agentChannels.map((channel) => [channel.id, channel])),
    [agentChannels]
  );
  const channelControlsById = useMemo(
    () => new Map(channelControls.map((channel) => [channel.channel, channel])),
    [channelControls]
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

  const updateChannelActivationDraft = (
    channel: AgentChannelControlId,
    key: string,
    value: string
  ) => {
    setChannelActivationDrafts((current) => ({
      ...current,
      [channel]: {
        ...(current[channel] || {}),
        [key]: value,
      },
    }));
  };

  const handleConnectChannelControl = async (channel: AgentChannelControlId) => {
    if (!channelControlsAvailable && channel !== "telegram") return;
    const payload = compactStringPayload(channelActivationDrafts[channel] || {});
    if (Object.keys(payload).length === 0) {
      toast.error(
        t("settingsModal.channels.control.missing", {
          defaultValue: "Enter the required channel fields first.",
        })
      );
      return;
    }
    setChannelControlAction(`${channel}:connect`);
    try {
      const { response, data } =
        channel === "telegram"
          ? await connectBotTelegram(payload as BotTelegramConnectPayload)
          : await connectAgentChannelControl(channel, payload);
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "channel_connect_failed");
      }
      setChannelActivationDrafts((current) => ({
        ...current,
        [channel]: Object.fromEntries(Object.keys(current[channel] || {}).map((key) => [key, ""])),
      }));
      await loadChannelControls();
      await loadAgentChannels();
      toast.success(
        t("settingsModal.channels.control.connected", {
          defaultValue: "Channel connected.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.channels.control.connectError", {
              defaultValue: "Unable to connect channel.",
            })
      );
    } finally {
      setChannelControlAction(null);
    }
  };

  const handleTestChannelControl = async (channel: AgentChannelControlId) => {
    if (channel === "telegram") return;
    if (!channelControlsAvailable) return;
    setChannelControlAction(`${channel}:test`);
    try {
      const { response, data } = await testAgentChannelControl(channel);
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "channel_test_failed");
      }
      await loadChannelControls();
      toast.success(
        data.last_test?.ok
          ? t("settingsModal.channels.control.testOk", {
              defaultValue: "Channel check passed.",
            })
          : t("settingsModal.channels.control.testComplete", {
              defaultValue: "Channel check completed.",
            })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.channels.control.testError", {
              defaultValue: "Unable to test channel.",
            })
      );
    } finally {
      setChannelControlAction(null);
    }
  };

  const handleDisconnectChannelControl = async (channel: AgentChannelControlId) => {
    if (!channelControlsAvailable && channel !== "telegram") return;
    setChannelControlAction(`${channel}:disconnect`);
    try {
      const { response, data } =
        channel === "telegram"
          ? await disconnectBotTelegram()
          : await disconnectAgentChannelControl(channel);
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "channel_disconnect_failed");
      }
      await loadChannelControls();
      await loadAgentChannels();
      toast.success(
        t("settingsModal.channels.control.disconnected", {
          defaultValue: "Channel disconnected.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.channels.control.disconnectError", {
              defaultValue: "Unable to disconnect channel.",
            })
      );
    } finally {
      setChannelControlAction(null);
    }
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

  const handlePairExtensionDevice = async () => {
    if (!extensionDevicesAvailable) return;
    setExtensionDeviceAction("pair");
    try {
      const { response, data } = await pairAgentExtensionDevice({
        label: extensionDeviceLabel.trim() || undefined,
      });
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "extension_device_pair_failed");
      }
      setExtensionDeviceLabel("");
      await loadExtensionDevices();
      toast.success(
        t("settingsModal.devices.success.paired", {
          defaultValue: "Device registered.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.devices.errors.pair", {
              defaultValue: "Unable to register device.",
            })
      );
    } finally {
      setExtensionDeviceAction(null);
    }
  };

  const handleRevokeExtensionDevice = async (deviceId: string) => {
    if (!extensionDevicesAvailable) return;
    setExtensionDeviceAction(`${deviceId}:revoke`);
    try {
      const { response, data } = await revokeAgentExtensionDevice(deviceId);
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "extension_device_revoke_failed");
      }
      await loadExtensionDevices();
      toast.success(
        t("settingsModal.devices.success.revoked", {
          defaultValue: "Device revoked.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.devices.errors.revoke", {
              defaultValue: "Unable to revoke device.",
            })
      );
    } finally {
      setExtensionDeviceAction(null);
    }
  };

  const navItems: V2SettingsNavItem[] = [
    {
      href: "#settings-account",
      label: t("settingsModal.nav.account"),
      icon: UserRound,
      group: t("settingsModal.navGroups.personal", { defaultValue: "Personal" }),
    },
    {
      href: "#settings-telos",
      label: t("settingsModal.nav.telos", { defaultValue: "Your goals" }),
      icon: UserRound,
      group: t("settingsModal.navGroups.personal", { defaultValue: "Personal" }),
    },
    {
      href: "#settings-billing",
      label: t("settingsModal.nav.planUsage", { defaultValue: "Plan & Usage" }),
      icon: CreditCard,
      group: t("settingsModal.navGroups.personal", { defaultValue: "Personal" }),
    },
    {
      href: "#settings-agent",
      label: t("settingsModal.nav.agent", { defaultValue: "Agent" }),
      icon: Bot,
      group: t("settingsModal.navGroups.agent", { defaultValue: "Agent" }),
    },
    {
      href: "#settings-channels",
      label: t("settingsModal.nav.channels", { defaultValue: "Channels" }),
      icon: Cable,
      group: t("settingsModal.navGroups.agent", { defaultValue: "Agent" }),
    },
    {
      href: "#settings-secrets",
      label: t("settingsModal.nav.secrets", { defaultValue: "Advanced credentials" }),
      icon: LockKeyhole,
      meta: agentSecretsKeys.length || undefined,
      group: t("settingsModal.navGroups.agent", { defaultValue: "Agent" }),
    },
    {
      href: "#settings-devices",
      label: t("settingsModal.nav.devices", { defaultValue: "Extension devices" }),
      icon: MonitorSmartphone,
      group: t("settingsModal.navGroups.agent", { defaultValue: "Agent" }),
    },
    {
      href: "#settings-memory-data",
      label: t("settingsModal.nav.memoryData"),
      icon: Database,
      group: t("settingsModal.navGroups.data", { defaultValue: "Data" }),
    },
    {
      href: "#settings-privacy",
      label: t("settingsModal.nav.privacy"),
      icon: ShieldCheck,
      tone: "danger",
      group: t("settingsModal.navGroups.data", { defaultValue: "Data" }),
    },
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

  const handleSignOut = async () => {
    setSignOutSaving(true);
    try {
      const { response, data } = await requestLogout();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "logout_failed");
      }
      logout();
      navigate("/?auth=login");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t("settingsModal.account.signOutError", {
              defaultValue:
                "Unable to sign out securely. Check your connection and try again.",
            })
          : t("settingsModal.account.signOutError", {
              defaultValue:
                "Unable to sign out securely. Check your connection and try again.",
            })
      );
    } finally {
      setSignOutSaving(false);
    }
  };

  const patchAgentSettings = (patch: BotSettingsPatch): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      const previousDraft = agentSettingsDraftRef.current;
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
        const nextDraft = normalizeAgentSettingsProfile(data);
        agentSettingsDraftRef.current = nextDraft;
        setAgentSettingsDraft(nextDraft);
        toast.success(
          t("settingsModal.agentSettings.success.updated", {
            defaultValue: "Agent settings updated.",
          })
        );
        return true;
      } catch (err) {
        agentSettingsDraftRef.current = previousDraft;
        setAgentSettingsDraft(previousDraft);
        toast.error(
          err instanceof Error
            ? err.message
            : t("settingsModal.agentSettings.errors.update", {
                defaultValue: "Unable to update Agent settings.",
              })
        );
        return false;
      } finally {
        setAgentSettingsSaving(false);
      }
    };

    const queued = agentSettingsQueueRef.current.catch(() => false).then(run);
    agentSettingsQueueRef.current = queued.then(
      () => true,
      () => false
    );
    return queued;
  };

  const commitSessionTimeoutDraft = async () => {
    if (agentSettingsLoading) return;
    const parsed = Number(sessionTimeoutDraft);
    if (
      !Number.isInteger(parsed) ||
      parsed < AGENT_SESSION_TIMEOUT_MINUTES_MIN ||
      parsed > AGENT_SESSION_TIMEOUT_MINUTES_MAX
    ) {
      setSessionTimeoutError(
        t("settingsModal.agentSettings.sessionTimeout.error", {
          defaultValue: "Use a whole number from 5 to 180 minutes.",
        })
      );
      return;
    }
    if (parsed === agentSettingsDraft.session_timeout_minutes) {
      setSessionTimeoutError(null);
      return;
    }
    setSessionTimeoutError(null);
    const ok = await patchAgentSettings({ session_timeout_minutes: parsed });
    if (!ok) {
      setSessionTimeoutDraft(String(agentSettingsDraftRef.current.session_timeout_minutes));
    }
  };

  const handleSessionTimeoutKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitSessionTimeoutDraft();
    }
    if (event.key === "Escape") {
      setSessionTimeoutDraft(String(agentSettingsDraft.session_timeout_minutes));
      setSessionTimeoutError(null);
      event.currentTarget.blur();
    }
  };

  const handleSaveSecret = async () => {
    if (!agentSecretsAvailable) return;
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
    if (!agentSecretsAvailable) return;
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

  const handleExportAgentMemory = async () => {
    if (!memoryGovernanceAvailable) return;
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { response, data } = await exportAgentMemory();
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "memory_export_failed");
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const datePart = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `zaki-agent-memory-export-${datePart}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(
        t("settingsModal.memoryData.exportDownloaded", {
          defaultValue: "Memory export downloaded.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.memoryData.exportError", {
              defaultValue: "Unable to export Agent memory.",
            })
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgePii = async (category: "phone" | "email" | "all", dryRun: boolean) => {
    if (!memoryGovernanceAvailable) return;
    if (!dryRun && !canApplyPiiPurge) {
      toast.error(
        t("settingsModal.memoryData.piiDryRunRequired", {
          defaultValue: "Run a PII dry run before applying purge.",
        })
      );
      return;
    }
    if (dryRun) setLastPiiPurgeResult(null);
    setPiiAction(`${category}:${dryRun ? "dry" : "apply"}`);
    try {
      const { response, data } = await purgeAgentMemoryPii({
        category,
        dry_run: dryRun,
      });
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "memory_pii_purge_failed");
      }
      await loadMemoryGovernance();
      setLastPiiPurgeResult(data);
      toast.success(
        dryRun
          ? t("settingsModal.memoryData.piiDryRunComplete", {
              defaultValue: "PII dry run complete.",
            })
          : t("settingsModal.memoryData.piiPurgeComplete", {
              defaultValue: "PII purge complete.",
            })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.memoryData.piiPurgeError", {
              defaultValue: "Unable to run PII purge.",
            })
      );
    } finally {
      setPiiAction(null);
    }
  };

  const handleForgetMemoryKey = async () => {
    if (!memoryGovernanceAvailable) return;
    const key = memoryForgetKey.trim();
    if (!key) {
      toast.error(
        t("settingsModal.memoryData.forgetMissing", {
          defaultValue: "Enter a memory key first.",
        })
      );
      return;
    }
    setPiiAction("forget");
    try {
      const { response, data } = await forgetAgentMemory(key);
      if (!response.ok || data?.error) {
        throw new Error(data?.message || data?.error || "memory_forget_failed");
      }
      setMemoryForgetKey("");
      await loadMemoryGovernance();
      toast.success(
        data.forgotten
          ? t("settingsModal.memoryData.forgetComplete", {
              defaultValue: "Memory forgotten.",
            })
          : t("settingsModal.memoryData.forgetNoop", {
              defaultValue: "No matching memory was found.",
            })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.memoryData.forgetError", {
              defaultValue: "Unable to forget memory.",
            })
      );
    } finally {
      setPiiAction(null);
    }
  };

  const handleUpgradePlan = async (plan: SettingsCheckoutPlanId) => {
    try {
      await trackProductEvent({
        event: "upgrade_cta_clicked",
        source: "settings",
        language: languageValue,
        plan,
        interval: "monthly",
      }).catch(() => undefined);
      await checkout.mutateAsync({
        plan,
        interval: "monthly",
        context: { source: "settings" },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.plan.errors.checkout", {
              defaultValue: "Unable to start checkout.",
            })
      );
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      if (!billingPortalEnabled) {
        throw new Error(
          t("settingsModal.plan.errors.portalUnavailable", {
            defaultValue: "Subscription portal is not configured.",
          })
        );
      }
      await billingPortal.mutateAsync();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.plan.errors.portal", {
              defaultValue: "Unable to open subscription portal.",
            })
      );
    }
  };

  const handleSyncBilling = async () => {
    try {
      if (!billingSyncEnabled) {
        throw new Error(
          t("settingsModal.plan.errors.syncUnavailable", {
            defaultValue: "Billing sync is not configured.",
          })
        );
      }
      await syncBilling.mutateAsync();
      toast.success(
        t("settingsModal.plan.success.synced", {
          defaultValue: "Billing state synced.",
        })
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settingsModal.plan.errors.sync", {
              defaultValue: "Unable to sync billing state.",
            })
      );
    }
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
          ]}
        />
        <div className="zaki-settings-v2__grid">
          <V2SettingsNav
            eyebrow={t("settingsModal.header.navEyebrow", { defaultValue: "ZAKI" })}
            title={t("settingsModal.header.title", { defaultValue: "Settings" })}
            ariaLabel={t("settingsModal.nav.label")}
            items={navItems}
            activeHref={activeSettingsHref}
          />

          <main className="zaki-settings-v2__main" aria-labelledby="settings-page-title">
            <header className="zaki-settings-v2__hero">
              <div>
                <p>{t("settingsModal.header.heroEyebrow", { defaultValue: "Control plane" })}</p>
                <h1 id="settings-page-title">{t("settingsModal.header.title", { defaultValue: "Settings" })}</h1>
              </div>
            </header>

            <V2SettingsBlock id="settings-account" data-testid="settings-account" title={t("settingsModal.sections.account")}>
              <V2SettingsRow
                name={t("settingsModal.profile.displayName")}
                description={t("settingsModal.profile.displayNameHelper", {
                  defaultValue: "The name shown in ZAKI surfaces and account menus.",
                })}
              >
                <div className="zaki-settings-v2__control-stack">
                  <input
                    className="v2-input"
                    aria-label={t("settingsModal.profile.displayName")}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <V2Button onClick={saveDisplayName} disabled={profileSaving} size="sm">
                    {profileSaving ? t("app.legal.saving") : t("settingsModal.footer.saveChanges")}
                  </V2Button>
                </div>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.profile.email")}
                description={t("settingsModal.profile.emailHelper", {
                  defaultValue: "Read-only sign-in identity for this account.",
                })}
              >
                <input
                  className="v2-input"
                  aria-label={t("settingsModal.profile.email")}
                  value={user?.username || ""}
                  readOnly
                />
              </V2SettingsRow>
              <V2SettingsRow name={t("settingsModal.preferences.theme")}>
                <select
                  className="v2-input"
                  aria-label={t("settingsModal.preferences.theme")}
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
                  aria-label={t("settings.language")}
                  value={languageValue}
                  onChange={(event) => void i18n.changeLanguage(event.target.value)}
                >
                  <option value="en">{t("language.english")}</option>
                  <option value="ar">{t("language.arabic")}</option>
                </select>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.account.signOut", { defaultValue: "Sign out" })}
                description={t("settingsModal.account.signOutHelper", {
                  defaultValue: "End this browser session and return to sign in.",
                })}
              >
                <V2Button size="sm" variant="danger" disabled={signOutSaving} onClick={() => void handleSignOut()}>
                  {signOutSaving
                    ? t("settingsModal.account.signingOut", { defaultValue: "Signing out" })
                    : t("settingsModal.account.signOut", { defaultValue: "Sign out" })}
                </V2Button>
              </V2SettingsRow>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-billing"
              data-testid="settings-billing"
              title={t("settingsModal.sections.billing", { defaultValue: "Plan & Usage" })}
              meta={platformUsageLoading || meterStatusLoading ? t("settingsModal.usage.loading") : null}
            >
              <div className="zaki-settings-v2__billing-cockpit">
                <div className="zaki-settings-v2__billing-hero">
                  <div>
                    <span>{t("settingsModal.plan.currentPlan")}</span>
                    <strong>{platformPlanLabel}</strong>
                    {accessCodeStatusLabel ? (
                      <p>
                        {accessCodeStatusLabel}
                        {accessExpiryLabel
                          ? ` ${t("settingsModal.plan.until", { defaultValue: "until" })} ${accessExpiryLabel}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <V2Badge tone={isPremium ? "success" : "default"}>{effectiveStatusLabel}</V2Badge>
                </div>
                <div className="zaki-settings-v2__billing-meter-grid">
                  <section
                    className="zaki-settings-v2__billing-meter zaki-settings-v2__billing-meter--primary"
                    data-testid="settings-weekly-meter"
                  >
                    <header>
                      <span>{t("settingsModal.usage.weeklyAllowance")}</span>
                      <strong>{weeklyRunsLabel || weeklyAllowanceLabel}</strong>
                    </header>
                    <div
                      className="zaki-settings-v2__meter-track"
                      style={getMeterBarStyle(weeklyWindow.used, weeklyWindow.limit)}
                      aria-hidden="true"
                    >
                      <span />
                    </div>
                    <dl>
                      <div>
                        <dt>{t("settingsModal.usage.usage", { defaultValue: "Usage" })}</dt>
                        <dd>{weeklyAllowanceLabel}</dd>
                      </div>
                      {weeklyRemainingLabel ? (
                        <div>
                          <dt>{t("settingsModal.usage.left", { defaultValue: "Left" })}</dt>
                          <dd>{weeklyRemainingLabel}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{t("settingsModal.usage.reset", { defaultValue: "Reset" })}</dt>
                        <dd>
                          {formatUsageReset(weeklyWindow.resetAt) ||
                            t("settingsModal.usage.resetPending")}
                        </dd>
                      </div>
                    </dl>
                    {isUsageNearCap(weeklyUsagePercent) ? (
                      <p className="v2-body-sm">
                        {t("settingsModal.usage.nearCapNudge", {
                          percent: weeklyUsagePercentRounded,
                          defaultValue: `You're at ${weeklyUsagePercentRounded}% this week — upgrade for more room.`,
                        })}
                      </p>
                    ) : null}
                  </section>
                  <section
                    className="zaki-settings-v2__billing-meter"
                    data-testid="settings-burst-meter"
                  >
                    <header>
                      <span>{t("settingsModal.usage.burstWindow")}</span>
                      <strong>{burstWindowLabel}</strong>
                    </header>
                    <div
                      className="zaki-settings-v2__meter-track"
                      style={getMeterBarStyle(meterStatus?.rolling?.used, meterStatus?.rolling?.limit)}
                      aria-hidden="true"
                    >
                      <span />
                    </div>
                    <dl>
                      <div>
                        <dt>{t("settingsModal.usage.window", { defaultValue: "Window" })}</dt>
                        <dd>
                          {typeof meterStatus?.rolling?.windowHours === "number"
                            ? t("settingsModal.usage.windowHours", {
                                hours: meterStatus.rolling.windowHours,
                                defaultValue: `${meterStatus.rolling.windowHours}h`,
                              })
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("settingsModal.usage.usage", { defaultValue: "Usage" })}</dt>
                        <dd>{burstWindowLabel}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
                <div className="zaki-settings-v2__billing-wallet">
                  <div>
                    <span>{t("settingsModal.plan.recurringRemaining", { defaultValue: "Weekly room" })}</span>
                    <strong>{weeklyRoomLabel}</strong>
                  </div>
                  <div>
                    <span>{t("settingsModal.plan.topupBalance", { defaultValue: "Extra capacity" })}</span>
                    <strong>{extraCapacityLabel}</strong>
                  </div>
                  <div>
                    <span>{t("settingsModal.plan.agentAvailableNow", { defaultValue: "Agent available now" })}</span>
                    <strong>{agentAvailableNowLabel}</strong>
                  </div>
                  <div>
                    <span>{t("settingsModal.plan.billingSource", { defaultValue: "Billing source" })}</span>
                    <strong>{billingSourceLabel}</strong>
                  </div>
                  <div>
                    <span>{t("settingsModal.plan.billingHealth", { defaultValue: "Billing health" })}</span>
                    <strong>
                      {billingConfigLoaded
                        ? t("settingsModal.plan.billingConfigured", { defaultValue: "Configured" })
                        : t("settingsModal.plan.billingChecking", { defaultValue: "Checking" })}
                    </strong>
                  </div>
                </div>
              </div>
              <details className="zaki-settings-v2__usage-details" data-testid="settings-platform-usage">
                <summary className="zaki-settings-v2__usage-heading">
                  <div>
                    <strong>
                      {t("settingsModal.usage.productUsage", { defaultValue: "Weekly by product" })}
                    </strong>
                    <p className="v2-body-sm">
                      {t("settingsModal.usage.helperShared", {
                        defaultValue:
                          "Weighted shares of your one shared weekly allowance — not separate budgets.",
                      })}
                    </p>
                  </div>
                  {meterUsageRows.length > 0 ? (
                    <V2Badge>
                      {t("settingsModal.usage.productCount", {
                        count: meterUsageRows.length,
                        defaultValue: `${meterUsageRows.length} products`,
                      })}
                    </V2Badge>
                  ) : null}
                </summary>
                <div className="zaki-settings-v2__usage-grid">
                  {meterUsageRows.length > 0 ? (
                    meterUsageRows.map(({ product, meterProduct }) => {
                        const productUsed =
                          typeof meterProduct?.weekly?.used === "number"
                            ? meterProduct.weekly.used
                            : null;
                        // Per-product rows are weighted slices of the ONE pooled weekly allowance,
                        // not standalone budgets — show each product's share of that shared pool
                        // (its % of the pooled limit), never a per-product "N of M".
                        const productShare =
                          productUsed !== null && typeof weeklyWindow.limit === "number"
                            ? { used: productUsed, limit: weeklyWindow.limit }
                            : null;
                        const summaryLabel =
                          getMeterWindowLabel(t, productShare) ||
                          t("settingsModal.usage.productUsageLinked", {
                            defaultValue: "Included in weekly usage",
                          });
                        const resetLabel = formatUsageReset(meterProduct?.weekly?.resetAt);
                        return (
                          <div key={product.productId} className="zaki-settings-v2__usage-row">
                            <div>
                              <strong>{product.label}</strong>
                              <small>{getUsageLifecycleLabel(t, product.lifecycle)}</small>
                              <small>{getUsageLaunchStateLabel(t, product.productId)}</small>
                            </div>
                            <div className="zaki-settings-v2__usage-row-meter">
                              <span>{summaryLabel}</span>
                              {productShare ? (
                                <div
                                  className="zaki-settings-v2__meter-track"
                                  style={getMeterBarStyle(productShare.used, productShare.limit)}
                                  aria-hidden="true"
                                >
                                  <span />
                                </div>
                              ) : null}
                            </div>
                            <small>
                              {resetLabel
                                ? t("settingsModal.usage.resetsAt", { reset: resetLabel })
                                : t("settingsModal.usage.resetPending")}
                            </small>
                          </div>
                        );
                      })
                  ) : platformUsageLoading || meterStatusLoading ? null : (
                    // Meter query failed (not loading) but the section is open: don't leave a bare
                    // "0 products" grid — say so plainly. We do NOT fall back to the old per-surface
                    // budgets (the pooled wallet is the source of truth).
                    <p className="v2-body-sm">{t("settingsModal.usage.unavailable")}</p>
                  )}
                </div>
              </details>
              <div className="zaki-settings-v2__billing-actions">
                <div>
                  <strong>
                    {t("settingsModal.plan.actionsTitle", { defaultValue: "Upgrade or manage plan" })}
                  </strong>
                  <p className="v2-body-sm">
                    {billingUnavailableMessage ||
                      t("settingsModal.plan.actionsHelper", {
                        defaultValue:
                          "Choose the monthly plan that keeps ZAKI available when work spikes. Payment details and billing sync stay here.",
                      })}
                  </p>
                </div>
                <div className="zaki-settings-v2__actions zaki-settings-v2__plan-actions">
                  {billingCheckoutEnabled && availableUpgradePlans.length > 0 ? (
                    availableUpgradePlans.map((plan) => (
                      <V2Button
                        key={plan}
                        size="sm"
                        variant="accent"
                        disabled={checkout.isPending}
                        onClick={() => void handleUpgradePlan(plan)}
                      >
                        {t("settingsModal.plan.upgradePlan", {
                          defaultValue: `Upgrade to ${SETTINGS_PLAN_LABELS[plan]}`,
                          plan: getSettingsPlanLabel(t, plan),
                        })}
                      </V2Button>
                    ))
                  ) : null}
                  {hasSubscription && billingPortalEnabled ? (
                    <V2Button
                      size="sm"
                      disabled={billingPortal.isPending}
                      onClick={() => void handleOpenBillingPortal()}
                    >
                      {t("settingsModal.plan.manageSubscription", { defaultValue: "Manage subscription" })}
                    </V2Button>
                  ) : activeViaAccessCode ? (
                    <V2Button size="sm" onClick={() => navigate("/pricing?source=settings")}>
                      {t("settingsModal.plan.viewSubscriptionOptions", {
                        defaultValue: "View subscription options",
                      })}
                    </V2Button>
                  ) : null}
                  {billingSyncEnabled ? (
                    <V2Button
                      size="sm"
                      disabled={syncBilling.isPending}
                      onClick={() => void handleSyncBilling()}
                    >
                      {t("settingsModal.plan.syncBilling", { defaultValue: "Sync billing" })}
                    </V2Button>
                  ) : null}
                  {hasSubscription && billingCancelEnabled ? (
                    <V2Button
                      size="sm"
                      variant="danger"
                      disabled={cancelAtPeriodEnd || cancelSubscription.isPending}
                      onClick={async () => {
                        try {
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
              </div>
              <div className="zaki-settings-v2__topup-strip" data-testid="settings-topup-strip">
                <div>
                  <strong>{t("settingsModal.plan.topups.title", { defaultValue: "Additional capacity" })}</strong>
                  <p className="v2-body-sm">
                    {t("settingsModal.plan.topups.deferred", {
                      defaultValue:
                        "Additional capacity purchases are deferred for this release. Pricing explains the current allowances.",
                    })}
                  </p>
                </div>
                <div className="zaki-settings-v2__actions">
                  <V2Badge>{t("settingsModal.plan.topups.statusOnly", { defaultValue: "Deferred" })}</V2Badge>
                </div>
              </div>
            </V2SettingsBlock>

            <V2SettingsBlock
              id="settings-agent"
              data-testid="settings-agent"
              title={t("settingsModal.sections.agent", { defaultValue: "Agent" })}
              meta={
                agentSettingsLoading
                  ? t("settingsModal.agentSettings.loadingShort", { defaultValue: "Loading" })
                  : t("settingsModal.agentSettings.ready", { defaultValue: "Tenant defaults" })
              }
            >
              {agentSettingsLoading ? (
                <p className="v2-body-sm">
                  {t("settingsModal.agentSettings.loading", {
                    defaultValue: "Loading Agent settings...",
                  })}
                </p>
              ) : null}
              <p className="v2-body-sm">
                {t("settingsModal.agentSettings.defaultsNotice", {
                  defaultValue:
                    "Defaults for new Agent turns and supported channel runtimes. Composer chips can still override the next Agent send only.",
                })}
              </p>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.reasoningEffort.name", {
                  defaultValue: "Reasoning effort",
                })}
                description={t("settingsModal.agentSettings.reasoningEffort.helper", {
                  defaultValue:
                    "Default thinking depth for new Agent turns. Live per-turn controls stay in Agent.",
                })}
              >
                <select
                  className="v2-input"
                  aria-label={t("settingsModal.agentSettings.reasoningEffort.name", {
                    defaultValue: "Reasoning effort",
                  })}
                  value={assistantModeToReasoningEffort(agentSettingsDraft.assistant_mode)}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const reasoningEffort = event.target.value as AgentDefaultReasoningEffort;
                    const assistant_mode = reasoningEffortToAssistantMode(reasoningEffort);
                    setAgentSettingsDraft((current) => ({ ...current, assistant_mode }));
                    void patchAgentSettings({ assistant_mode });
                  }}
                >
                  {AGENT_DEFAULT_REASONING_EFFORTS.map((level) => (
                    <option key={level} value={level}>
                      {t(`settingsModal.agentSettings.reasoningEffort.options.${level}`, {
                        defaultValue:
                          level === "low"
                            ? "Low reasoning"
                            : level === "high"
                              ? "High reasoning"
                              : "Medium reasoning",
                      })}
                    </option>
                  ))}
                </select>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.autonomy.name", {
                  defaultValue: "Autonomy",
                })}
                description={t("settingsModal.agentSettings.autonomy.helper", {
                  defaultValue:
                    "Default autonomy for live runs. Approval and cancel controls remain in Agent.",
                })}
              >
                <select
                  className="v2-input"
                  aria-label={t("settingsModal.agentSettings.autonomy.name", {
                    defaultValue: "Autonomy",
                  })}
                  value={agentSettingsDraft.autonomy}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const autonomy = event.target.value as NonNullable<BotSettingsProfile["autonomy"]>;
                    setAgentSettingsDraft((current) => ({ ...current, autonomy }));
                    void patchAgentSettings({ autonomy });
                  }}
                >
                  {AGENT_AUTONOMY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`settingsModal.agentSettings.autonomy.options.${level}`, {
                        defaultValue:
                          level === "read_only"
                            ? "Read only"
                            : level === "supervised"
                              ? "Supervised"
                              : "Full autonomy",
                      })}
                    </option>
                  ))}
                </select>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.groupActivation.name", {
                  defaultValue: "Group activation",
                })}
                description={t("settingsModal.agentSettings.groupActivation.helper", {
                  defaultValue:
                    "Default wake policy for group channels: require a mention or let the Agent respond whenever the channel runtime wakes it.",
                })}
              >
                <select
                  className="v2-input"
                  aria-label={t("settingsModal.agentSettings.groupActivation.name", {
                    defaultValue: "Group activation",
                  })}
                  value={agentSettingsDraft.group_activation}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const group_activation = event.target
                      .value as NonNullable<BotSettingsProfile["group_activation"]>;
                    setAgentSettingsDraft((current) => ({ ...current, group_activation }));
                    void patchAgentSettings({ group_activation });
                  }}
                >
                  {AGENT_GROUP_ACTIVATION_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {t(`settingsModal.agentSettings.groupActivation.options.${mode}`, {
                        defaultValue: mode === "always" ? "Always active" : "Mention required",
                      })}
                    </option>
                  ))}
                </select>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.proactiveUpdates.name", {
                  defaultValue: "Proactive updates",
                })}
                description={t("settingsModal.agentSettings.proactiveUpdates.helper", {
                  defaultValue:
                    "Paused for launch while scheduled return delivery is hardened.",
                })}
              >
                <input
                  className="v2-toggle"
                  type="checkbox"
                  aria-label={t("settingsModal.agentSettings.proactiveUpdates.name", {
                    defaultValue: "Proactive updates",
                  })}
                  checked={false}
                  disabled
                  onChange={() => undefined}
                />
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.voiceReplies.name", {
                  defaultValue: "Voice replies",
                })}
                description={t("settingsModal.agentSettings.voiceReplies.helper", {
                  defaultValue:
                    "Use text-to-speech replies for supported voice-note or audio-capable channel turns.",
                })}
              >
                <input
                  className="v2-toggle"
                  type="checkbox"
                  aria-label={t("settingsModal.agentSettings.voiceReplies.name", {
                    defaultValue: "Voice replies",
                  })}
                  checked={agentSettingsDraft.voice_replies}
                  disabled={agentSettingsLoading || agentSettingsSaving}
                  onChange={(event) => {
                    const voice_replies = event.target.checked;
                    setAgentSettingsDraft((current) => ({ ...current, voice_replies }));
                    void patchAgentSettings({ voice_replies });
                  }}
                />
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.sessionTimeout.name", {
                  defaultValue: "Session timeout",
                })}
                description={t("settingsModal.agentSettings.sessionTimeout.helper", {
                  defaultValue:
                    "Minutes before idle Agent channel sessions are evicted from the runtime. Direct composer turns can still start a fresh session.",
                })}
              >
                <input
                  className="v2-input"
                  type="number"
                  min={AGENT_SESSION_TIMEOUT_MINUTES_MIN}
                  max={AGENT_SESSION_TIMEOUT_MINUTES_MAX}
                  step={5}
                  aria-label={t("settingsModal.agentSettings.sessionTimeout.name", {
                    defaultValue: "Session timeout",
                  })}
                  value={sessionTimeoutDraft}
                  disabled={agentSettingsLoading}
                  onBlur={() => void commitSessionTimeoutDraft()}
                  onChange={(event) => setSessionTimeoutDraft(event.target.value)}
                  onKeyDown={handleSessionTimeoutKeyDown}
                />
                {sessionTimeoutError ? (
                  <span className="zaki-settings-v2__field-error">{sessionTimeoutError}</span>
                ) : null}
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.agentSettings.memoryStatus.name", {
                  defaultValue: "Memory status",
                })}
                description={t("settingsModal.agentSettings.memoryStatus.helper", {
                  defaultValue:
                    "Notification only. Dream reflection, query expansion, capture, export, forget, and PII actions are edited in Memory & Data.",
                })}
              >
                <div className="zaki-settings-v2__status-chips">
                  <V2Badge tone={agentSettingsDraft.dream_enabled ? "success" : "default"}>
                    {t("settingsModal.agentSettings.memoryStatus.dream", {
                      status: dreamStatusLabel,
                      defaultValue: `Dream ${dreamStatusLabel}`,
                    })}
                  </V2Badge>
                  <V2Badge
                    tone={agentSettingsDraft.query_expansion_enabled ? "success" : "default"}
                  >
                    {t("settingsModal.agentSettings.memoryStatus.query", {
                      status: queryExpansionStatusLabel,
                      defaultValue: `Query ${queryExpansionStatusLabel}`,
                    })}
                  </V2Badge>
                </div>
              </V2SettingsRow>
            </V2SettingsBlock>

            <SettingsTelosSection />

            <SettingsChannelsSection
              agentChannelsById={agentChannelsById}
              agentChannelsLoading={agentChannelsLoading}
              channelControlsById={channelControlsById}
              channelControlsLoading={channelControlsLoading}
              channelControlsAvailable={channelControlsAvailable}
              expandedChannelId={expandedChannelId}
              setExpandedChannelId={setExpandedChannelId}
              channelBindingDrafts={channelBindingDrafts}
              channelActivationDrafts={channelActivationDrafts}
              channelAction={channelAction}
              channelControlAction={channelControlAction}
              updateChannelBindingDraft={updateChannelBindingDraft}
              updateChannelActivationDraft={updateChannelActivationDraft}
              handleSaveChannelBinding={handleSaveChannelBinding}
              handleDeleteChannelBinding={handleDeleteChannelBinding}
              handleConnectChannelControl={handleConnectChannelControl}
              handleTestChannelControl={handleTestChannelControl}
              handleDisconnectChannelControl={handleDisconnectChannelControl}
            />

            <V2SettingsBlock
              id="settings-secrets"
              data-testid="settings-secrets"
              title={t("settingsModal.sections.secrets", { defaultValue: "Advanced credentials" })}
              meta={
                agentSecretsLoading
                  ? t("settingsModal.secrets.loading", { defaultValue: "Loading secrets" })
                  : !agentSecretsAvailable
                    ? t("settingsModal.secrets.unavailable", { defaultValue: "Unavailable" })
                  : t("settingsModal.secrets.count", {
                      count: agentSecretsKeys.length,
                      defaultValue: `${agentSecretsKeys.length} stored`,
                    })
              }
            >
              <V2SettingsRow
                name={t("settingsModal.secrets.addOrRotate", {
                  defaultValue: "Add or rotate a vault credential",
                })}
                description={t("settingsModal.secrets.addOrRotateHelper", {
                  defaultValue:
                    "Use this only for advanced manual keys. Channel tokens should be saved from Channels.",
                })}
              >
                <div className="zaki-settings-v2__control-stack">
                  {agentSecretsAvailable ? (
                    <>
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
                        disabled={
                          agentSecretsAction === "save" ||
                          !newSecretKey.trim() ||
                          !newSecretValue
                        }
                        onClick={() => void handleSaveSecret()}
                      >
                        {agentSecretsAction === "save"
                          ? t("app.legal.saving")
                          : t("settingsModal.secrets.save", { defaultValue: "Save secret" })}
                      </V2Button>
                      {newSecretKey.trim() && newSecretValue ? null : (
                        <span className="zaki-settings-v2__action-note">
                          {t("settingsModal.secrets.requiredHelper", {
                            defaultValue: "Enter a secret key and value to save.",
                          })}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="v2-body-sm">
                      {t("settingsModal.secrets.unavailableHelper", {
                        defaultValue:
                          "Secret actions are unavailable until the Agent vault responds.",
                      })}
                    </p>
                  )}
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
                          : t("settingsModal.secrets.delete", { defaultValue: "Delete secret" })}
                      </V2Button>
                    </div>
                  </article>
                ))}
              </div>
              {!agentSecretsLoading && agentSecretsAvailable && agentSecretsKeys.length === 0 ? (
                <p className="zaki-settings-v2__empty-state">
                  {t("settingsModal.secrets.empty", {
                    defaultValue: "No secrets stored yet.",
                  })}
                </p>
              ) : null}
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
                  : !extensionDevicesAvailable
                    ? t("settingsModal.devices.unavailable", { defaultValue: "Unavailable" })
                  : extensionDiagnostics?.paired
                    ? t("settingsModal.devices.paired", { defaultValue: "Paired" })
                    : t("settingsModal.devices.notPaired", { defaultValue: "Not paired" })
              }
            >
              <V2SettingsRow
                name={t("settingsModal.devices.download.name", {
                  defaultValue: "Download Chrome extension",
                })}
                description={t("settingsModal.devices.download.description", {
                  defaultValue:
                    "Install the extension when ZAKI needs browser control in your signed-in tabs. Chrome, Edge, Arc, and Brave can load this package in developer mode.",
                })}
              >
                <div className="zaki-settings-v2__control-stack">
                  <a
                    className="v2-btn v2-btn--accent v2-btn--sm"
                    href="/downloads/zaki-browser-extension.zip"
                    download
                  >
                    {t("settingsModal.devices.download.action", {
                      defaultValue: "Download extension",
                    })}
                  </a>
                  <span className="zaki-settings-v2__action-note">
                    {t("settingsModal.devices.download.helper", {
                      defaultValue:
                        "Unzip it, open chrome://extensions, enable Developer mode, then Load unpacked.",
                    })}
                  </span>
                </div>
              </V2SettingsRow>
              <V2SettingsRow
                name={t("settingsModal.devices.extension.name", {
                  defaultValue: "Browser extension",
                })}
                description={t("settingsModal.devices.extension.description", {
                  defaultValue:
                    "Pair a user-scoped browser device when ZAKI needs to act in logged-in tabs. Public web automation can still use the in-app browser without this.",
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
              <V2SettingsRow
                name={t("settingsModal.devices.pairDevice", { defaultValue: "Pair extension device" })}
                description={t("settingsModal.devices.pairDeviceHelper", {
                  defaultValue:
                    "Install the ZAKI browser extension, then create a device record here. Revoke the device if the browser is lost or no longer trusted.",
                })}
              >
                <div className="grid min-w-[260px] gap-2">
                  {extensionDevicesAvailable ? (
                    <>
                      <input
                        className="v2-input"
                        value={extensionDeviceLabel}
                        placeholder={t("settingsModal.devices.labelPlaceholder", {
                          defaultValue: "Work laptop",
                        })}
                        onChange={(event) => setExtensionDeviceLabel(event.target.value)}
                      />
                      <V2Button
                        size="sm"
                        variant="accent"
                        disabled={extensionDeviceAction === "pair" || !extensionDeviceLabel.trim()}
                        onClick={() => void handlePairExtensionDevice()}
                      >
                        {extensionDeviceAction === "pair"
                          ? t("app.legal.saving")
                          : t("settingsModal.devices.actions.register", {
                              defaultValue: "Pair device",
                            })}
                      </V2Button>
                      {extensionDeviceLabel.trim() ? null : (
                        <span className="zaki-settings-v2__action-note">
                          {t("settingsModal.devices.pairDeviceRequiredHelper", {
                            defaultValue: "Enter a device label to pair an extension device.",
                          })}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="v2-body-sm">
                      {t("settingsModal.devices.unavailableHelper", {
                        defaultValue:
                          "Device pairing is unavailable until the extension device service responds.",
                      })}
                    </p>
                  )}
                </div>
              </V2SettingsRow>
              <div className="zaki-settings-v2__product-list">
                {extensionDevices.map((device) => {
                  const deviceId = device.id || device.device_id || "";
                  const lastSeen = formatUnixDate(device.last_seen_at_s);
                  return (
                    <article
                      key={deviceId || device.label}
                      className="zaki-settings-v2__product-row"
                      data-testid={`settings-extension-device-${deviceId}`}
                    >
                      <header>
                        <strong>{device.label || deviceId || "Browser device"}</strong>
                        <div className="zaki-settings-v2__actions">
                          <V2Badge tone={getDeviceTone(device)}>
                            {device.connection_state || device.status || "never_connected"}
                          </V2Badge>
                          <V2Button
                            size="sm"
                            variant="danger"
                            disabled={
                              !extensionDevicesAvailable ||
                              !deviceId ||
                              extensionDeviceAction === `${deviceId}:revoke`
                            }
                            onClick={() => void handleRevokeExtensionDevice(deviceId)}
                          >
                            {t("settingsModal.devices.actions.revoke", {
                              defaultValue: "Revoke device",
                            })}
                          </V2Button>
                        </div>
                      </header>
                      <dl>
                        <div>
                          <dt>{t("settingsModal.devices.fields.deviceId", { defaultValue: "Device ID" })}</dt>
                          <dd>{deviceId || "pending"}</dd>
                        </div>
                        <div>
                          <dt>{t("settingsModal.devices.fields.lastSeen", { defaultValue: "Last seen" })}</dt>
                          <dd>{lastSeen || "never"}</dd>
                        </div>
                        <div>
                          <dt>{t("settingsModal.devices.fields.lastCommand", { defaultValue: "Last command" })}</dt>
                          <dd>{device.last_command || "none"}</dd>
                        </div>
                        <div>
                          <dt>{t("settingsModal.devices.fields.lastError", { defaultValue: "Last error" })}</dt>
                          <dd>{device.last_error || "none"}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
                {!extensionDevicesLoading && extensionDevicesAvailable && extensionDevices.length === 0 ? (
                  <p className="zaki-settings-v2__empty-state">
                    {t("settingsModal.devices.empty", {
                      defaultValue: "No extension devices registered yet.",
                    })}
                  </p>
                ) : null}
              </div>
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
              {capturePolicyAvailable ? (
                <V2SettingsRow
                  name={t("settingsModal.memoryData.capturePolicy.name", {
                    defaultValue: "Chat memory capture",
                  })}
                  description={t("settingsModal.memoryData.capturePolicy.helper", {
                    defaultValue:
                      "Controls only Chat/Spaces memory capture. Agent memory does not have a master on/off switch yet.",
                  })}
                >
                  <select
                    className="v2-input"
                    aria-label={t("settingsModal.memoryData.capturePolicy.name", {
                      defaultValue: "Chat memory capture",
                    })}
                    value={capturePolicy}
                    disabled={capturePolicyLoading || capturePolicySaving}
                    onChange={(event) => {
                      void handleCapturePolicyChange(event.target.value as MemoryPolicy);
                    }}
                  >
                    {MEMORY_CAPTURE_POLICIES.map((policy) => (
                      <option key={policy} value={policy}>
                        {t(`settingsModal.memoryData.capturePolicy.options.${policy}`, {
                          defaultValue: policy,
                        })}
                      </option>
                    ))}
                  </select>
                </V2SettingsRow>
              ) : (
                <GatedRow
                  name={t("settingsModal.memoryData.capturePolicy.name", {
                    defaultValue: "Chat memory capture",
                  })}
                  description={t("settingsModal.memoryData.capturePolicy.helper", {
                    defaultValue:
                      "Controls only Chat/Spaces memory capture. Agent memory does not have a master on/off switch yet.",
                  })}
                  reason={t("settingsModal.memoryData.capturePolicy.unavailable", {
                    defaultValue: "Memory preferences are not available in this environment.",
                  })}
                />
              )}
              <div
                className="zaki-settings-v2__product-row zaki-settings-v2__product-row--governance"
                data-testid="settings-memory-governance"
              >
                <header>
                  <strong>
                    {t("settingsModal.memoryData.governance.title", {
                      defaultValue: "Saved Agent memories",
                    })}
                  </strong>
                  <V2Badge
                    tone={
                      memoryGovernanceLoading
                        ? "default"
                        : memoryGovernanceAvailable
                          ? "success"
                          : "danger"
                    }
                  >
                    {memoryGovernanceLoading
                      ? t("settingsModal.usage.loading", { defaultValue: "Loading" })
                      : memoryGovernanceAvailable
                        ? t("settingsModal.memoryData.governance.total", {
                            count: memoryGovernance?.total ?? 0,
                            defaultValue: `${memoryGovernance?.total ?? 0} memories`,
                          })
                        : t("settingsModal.memoryData.governance.unavailable", {
                            defaultValue: "Unavailable",
                          })}
                  </V2Badge>
                </header>
                <dl>
                  <div>
                    <dt>{t("settingsModal.memoryData.governance.phone", { defaultValue: "Phone PII" })}</dt>
                    <dd>{memoryGovernance?.pii?.phone ?? 0}</dd>
                  </div>
                  <div>
                    <dt>{t("settingsModal.memoryData.governance.email", { defaultValue: "Email PII" })}</dt>
                    <dd>{memoryGovernance?.pii?.email ?? 0}</dd>
                  </div>
                  <div>
                    <dt>{t("settingsModal.memoryData.governance.all", { defaultValue: "All PII" })}</dt>
                    <dd>{memoryGovernance?.pii?.all ?? 0}</dd>
                  </div>
                </dl>
                <div className="zaki-settings-v2__actions">
                  <V2Button
                    size="sm"
                    disabled={!memoryGovernanceAvailable || piiAction === "all:dry"}
                    onClick={() => void handlePurgePii("all", true)}
                  >
                    {t("settingsModal.memoryData.actions.dryRunPii", {
                      defaultValue: "Dry run PII purge",
                    })}
                  </V2Button>
                  <V2Button
                    size="sm"
                    variant="danger"
                    disabled={
                      !memoryGovernanceAvailable ||
                      piiAction === "all:apply" ||
                      !canApplyPiiPurge
                    }
                    onClick={() => void handlePurgePii("all", false)}
                  >
                    {canApplyPiiPurge
                      ? t("settingsModal.memoryData.actions.confirmPii", {
                          count: lastPiiPurgeResult?.candidate_count ?? 0,
                          defaultValue: `Confirm purge (${lastPiiPurgeResult?.candidate_count ?? 0})`,
                        })
                      : t("settingsModal.memoryData.actions.applyPii", {
                          defaultValue: "Purge phone/email PII",
                        })}
                  </V2Button>
                  <V2Button
                    size="sm"
                    disabled={!memoryGovernanceAvailable || isExporting}
                    onClick={() => void handleExportAgentMemory()}
                  >
                    {t("settingsModal.memoryData.actions.exportMemory", {
                      defaultValue: "Export Agent memory",
                    })}
                  </V2Button>
                </div>
                {lastPiiPurgeResult ? (
                  <p className="v2-body-sm">
                    {t("settingsModal.memoryData.piiResult", {
                      defaultValue: `PII ${lastPiiPurgeResult.dry_run ? "dry run" : "purge"}: ${
                        lastPiiPurgeResult.candidate_count ?? 0
                      } candidates, ${lastPiiPurgeResult.deleted ?? 0} deleted.`,
                    })}
                  </p>
                ) : null}
              </div>
              <V2SettingsRow
                name={t("settingsModal.memoryData.forgetOne.name", {
                  defaultValue: "Delete by memory key",
                })}
                description={t("settingsModal.memoryData.forgetOne.helper", {
                  defaultValue:
                    "Use a stable memory key from Brain or memory detail views. Topic purges are not exposed here.",
                })}
              >
                <div className="zaki-settings-v2__control-stack">
                  <input
                    className="v2-input"
                    value={memoryForgetKey}
                    aria-label={t("settingsModal.memoryData.forgetOne.inputLabel", {
                      defaultValue: "Memory key to forget",
                    })}
                    placeholder={t("settingsModal.memoryData.forgetOne.placeholder", {
                      defaultValue: "memory key",
                    })}
                    onChange={(event) => setMemoryForgetKey(event.target.value)}
                  />
                  <V2Button
                    size="sm"
                    variant="danger"
                    disabled={
                      !memoryGovernanceAvailable ||
                      piiAction === "forget" ||
                      !memoryForgetKey.trim()
                    }
                    onClick={() => void handleForgetMemoryKey()}
                  >
                    {t("settingsModal.memoryData.actions.forget", {
                      defaultValue: "Forget memory",
                    })}
                  </V2Button>
                </div>
              </V2SettingsRow>
              <details className="zaki-settings-v2__advanced-details">
                <summary>
                  {t("settingsModal.memoryData.advanced.title", {
                    defaultValue: "Advanced Agent memory behavior",
                  })}
                </summary>
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
              </details>
              <div className="zaki-settings-v2__actions">
                <V2Button size="sm" disabled={isExporting} onClick={() => void handleExport()}>
                  {isExporting
                    ? t("settingsModal.privacy.preparingExport", { defaultValue: "Preparing export" })
                    : t("settingsModal.privacy.exportAllData")}
                </V2Button>
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
