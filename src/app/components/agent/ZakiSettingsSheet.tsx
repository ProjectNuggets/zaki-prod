import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  Eye,
  Gamepad2,
  Gauge,
  Hash,
  Link2,
  MessageCircle,
  Rocket,
  Send,
  Settings,
  Shield,
  Telescope,
  Volume2,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  connectBotTelegram,
  disconnectBotTelegram,
  fetchBotHeartbeat,
  fetchBotOnboarding,
  fetchBotSettings,
  fetchBotUsage,
  updateBotHeartbeat,
  type BotHeartbeatState,
  updateBotSettings,
  type BotErrorCode,
  type BotOnboardingState,
  type BotTelegramConnectPayload,
  type BotSettingsPatch,
  type BotSettingsProfile,
  type BotUsageSummary,
} from "@/lib/api";
import { useAuthStore } from "@/stores";
import { useEntitlements } from "@/queries";
import { resolveEffectiveEntitlement } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import { MetaLabel, SheetShell } from "@/app/components/ui/zaki";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type BannerState =
  | { tone: "success"; text: string }
  | { tone: "error"; text: string }
  | null;

// Phase 4-B (2026-05-08) — Sidebar-nav layout. Five sections, user-facing.
// Models / Brain / Privacy / Advanced were removed per Nova's direction:
//   - Models: ZAKI does not let users choose providers, so don't promise it.
//   - Brain: lives at /brain, doesn't belong in agent settings.
//   - Privacy: GDPR + delete-on-request is a footnote, not a toggle page.
//   - Advanced: nothing to expose at the user level.
type SectionValue =
  | "identity"
  | "responseStyle"
  | "channels"
  | "autonomy"
  | "plan";
type TelegramUiStatus =
  | "not_connected"
  | "connecting"
  | "verifying"
  | "connected"
  | "needs_attention";

type SettingsDraft = {
  assistant_mode: "fast" | "balanced" | "deep";
  group_activation: "mention" | "always";
  proactive_updates: boolean;
  voice_replies: boolean;
  session_timeout_minutes: string;
  autonomy: "read_only" | "supervised" | "full";
};

type SettingsFieldErrorKey =
  | "assistant_mode"
  | "group_activation"
  | "proactive_updates"
  | "voice_replies"
  | "session_timeout_minutes"
  | "autonomy";

type TelegramFieldErrorKey = "bot_token" | "allow_from";

type SettingsFieldErrors = Partial<Record<SettingsFieldErrorKey, string>>;
type TelegramFieldErrors = Partial<Record<TelegramFieldErrorKey, string>>;

const DEFAULT_SETTINGS: SettingsDraft = {
  assistant_mode: "balanced",
  group_activation: "mention",
  proactive_updates: true,
  voice_replies: false,
  session_timeout_minutes: "30",
  autonomy: "supervised",
};

const TELEGRAM_CONFIRMATION_DELAYS_MS = [0, 300, 1000, 2000];

type TFn = (key: string, options?: { defaultValue?: string }) => string;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : Boolean(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter(Boolean)
    : [];
}

function getBotErrorCode(payload: unknown): BotErrorCode | null {
  const raw = asString(asRecord(payload).error).toLowerCase();
  if (
    raw === "temporary_contention" ||
    raw === "unauthorized" ||
    raw === "forbidden" ||
    raw === "invalid_telegram_token" ||
    raw === "provision_failed" ||
    raw === "settings_update_failed" ||
    raw === "usage_unavailable"
  ) {
    return raw;
  }
  return null;
}

function getBotErrorText(t: TFn, payload: unknown, fallback: string) {
  const code = getBotErrorCode(payload);
  return code ? t(`zakiSettingsSheet.errors.bot.${code}`, { defaultValue: fallback }) : fallback;
}

function getErrorText(t: TFn, payload: unknown, fallback: string) {
  const record = asRecord(payload);
  return asString(record.message) || asString(record.error) || getBotErrorText(t, payload, fallback);
}

function isUnknownBotUserError(payload: unknown) {
  const record = asRecord(payload);
  const raw = `${asString(record.message)} ${asString(record.error)}`.toLowerCase();
  return raw.includes("unknown_user_id");
}

function getSetupSummary(setup: Record<string, unknown> | null | undefined) {
  const source = asRecord(setup);
  return (
    asString(source.summary) ||
    asString(asRecord(source.guidance).summary) ||
    asString(source.description) ||
    asString(asRecord(source.onboarding).summary)
  );
}

function getChannelSetup(
  setup: Record<string, unknown> | null | undefined,
  channel: "telegram"
) {
  const source = asRecord(setup);
  const channels = asRecord(source.channels);
  const channelGuides = asRecord(source.channel_guides);
  return asRecord(channels[channel] ?? channelGuides[channel] ?? source[channel]);
}

function getChannelStatus(setup: Record<string, unknown>) {
  return asString(setup.status) || asString(setup.connection_status) || asString(setup.state);
}

function getChannelMeta(setup: Record<string, unknown>) {
  return (
    asString(setup.bot_username) ||
    asString(setup.username) ||
    asString(setup.webhook_base_url) ||
    asString(setup.webhook_url)
  );
}

function normalizeAllowFromInput(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getTelegramConnected(status: string) {
  return status === "connected" || status === "active" || status === "normal";
}

function getTelegramConnectedFromOnboarding(
  onboarding: BotOnboardingState | null | undefined
) {
  return getTelegramConnected(getChannelStatus(getChannelSetup(asRecord(onboarding?.setup), "telegram")));
}

function getStatusTone(status: "ready" | "warning" | "error" | "neutral") {
  if (status === "ready") {
    return "border-zaki-accent/30 bg-zaki-accent/10 text-zaki-primary dark:text-zaki-dark-primary";
  }
  if (status === "warning") {
    return "border-zaki-strong bg-zaki-hover text-zaki-primary dark:text-zaki-dark-primary";
  }
  if (status === "error") {
    return "border-zaki-brand/30 bg-zaki-brand/10 text-zaki-primary dark:text-zaki-dark-primary";
  }
  return "border-zaki-subtle bg-zaki-raised text-zaki-secondary dark:bg-[#1a1714] dark:text-zaki-dark-subtle";
}

function formatCompletedAt(value?: number | null, fallback?: string) {
  if (!value) return fallback || "Not completed yet";
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? fallback || "Not completed yet" : date.toLocaleString();
}

function extractSettingsFieldErrors(payload: unknown, t: (key: string) => string): SettingsFieldErrors {
  const record = asRecord(payload);
  const raw = `${asString(record.error)} ${asString(record.message)}`.toLowerCase();
  const fieldErrors: SettingsFieldErrors = {};
  if (raw.includes("invalid_assistant_mode")) {
    fieldErrors.assistant_mode = t("zakiSettingsSheet.errors.invalidAssistantMode");
  }
  if (raw.includes("invalid_group_activation")) {
    fieldErrors.group_activation = t("zakiSettingsSheet.errors.invalidGroupActivation");
  }
  if (raw.includes("invalid_proactive_updates")) {
    fieldErrors.proactive_updates = t("zakiSettingsSheet.errors.invalidProactiveUpdates");
  }
  if (raw.includes("invalid_voice_replies")) {
    fieldErrors.voice_replies = t("zakiSettingsSheet.errors.invalidVoiceReplies");
  }
  if (raw.includes("invalid_session_timeout_minutes")) {
    fieldErrors.session_timeout_minutes = t("zakiSettingsSheet.errors.invalidSessionTimeoutMinutes");
  }
  if (raw.includes("invalid_autonomy")) {
    fieldErrors.autonomy = t("zakiSettingsSheet.errors.invalidAutonomy");
  }
  return fieldErrors;
}

function extractTelegramFieldErrors(payload: unknown, t: (key: string) => string): TelegramFieldErrors {
  const record = asRecord(payload);
  const raw = `${asString(record.error)} ${asString(record.message)}`.toLowerCase();
  const fieldErrors: TelegramFieldErrors = {};
  if (raw.includes("missing bot_token") || raw.includes("bot token") && raw.includes("required")) {
    fieldErrors.bot_token = t("zakiSettingsSheet.errors.telegramTokenRequired");
  } else if (raw.includes("invalid bot_token") || raw.includes("invalid_telegram_token") || raw.includes("telegram token is invalid")) {
    fieldErrors.bot_token = t("zakiSettingsSheet.errors.telegramTokenInvalid");
  }
  if (raw.includes("allow_from")) {
    fieldErrors.allow_from = t("zakiSettingsSheet.errors.telegramAllowFromRequired");
  }
  return fieldErrors;
}

function CompactRow({
  title,
  summary,
  helper,
  control,
  children,
  isRtl = false,
  disabled = false,
}: {
  title: string;
  summary: string;
  helper?: string;
  control?: ReactNode;
  children?: ReactNode;
  isRtl?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-zaki-xl border border-zaki-strong bg-zaki-raised px-4 py-3 font-body transition-colors dark:bg-[#1a1714]",
        disabled && "bg-zaki-hover/30 dark:bg-[#141210]"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className={cn("min-w-0", disabled && "opacity-75", isRtl && "text-right")}>
          <div className="font-display text-sm font-bold text-zaki-primary dark:text-zaki-dark-primary">
            {title}
          </div>
          <div className="mt-1 text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
            {summary}
          </div>
          {helper ? (
            <p className="mt-2 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {helper}
            </p>
          ) : null}
        </div>
        {control ? <div className={cn("w-full", disabled && "opacity-80")}>{control}</div> : null}
      </div>
      {children ? <div className="mt-3 border-t border-zaki pt-3">{children}</div> : null}
    </div>
  );
}

// Phase 4-B (2026-05-08) — Sidebar-nav rail meta. The 5 currently-shipped
// All 5 entries are real, shipped settings. No placeholders.
type RailIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

type RailMetaEntry = {
  id: SectionValue;
  icon: RailIcon;
};

const SECTION_META: readonly RailMetaEntry[] = [
  { id: "identity", icon: Bot },
  { id: "responseStyle", icon: Volume2 },
  { id: "channels", icon: Link2 },
  { id: "autonomy", icon: Activity },
  { id: "plan", icon: BarChart3 },
];

function SettingsRail({
  activeSection,
  onSelect,
  suggestedSection,
  isRtl,
  t,
}: {
  activeSection: SectionValue;
  onSelect: (id: SectionValue) => void;
  suggestedSection: SectionValue;
  isRtl: boolean;
  t: (key: string, opts?: { defaultValue?: string }) => string;
}) {
  // The sheet is `sm:max-w-[720px]`, so at the sm breakpoint and up we
  // always have ≥720px for rail + content. Only fall back to the
  // horizontal-tab layout when the sheet is full-width on small phones.
  return (
    <nav
      aria-label={t("zakiSettingsSheet.placeholders.navAria")}
      className={cn(
        "shrink-0 border-zaki",
        "max-sm:flex max-sm:gap-1 max-sm:overflow-x-auto max-sm:border-b max-sm:px-4 max-sm:py-3",
        isRtl
          ? "sm:border-l sm:pl-3 sm:pr-4 sm:py-4"
          : "sm:border-r sm:pl-4 sm:pr-3 sm:py-4",
        "sm:flex sm:w-52 sm:flex-col sm:gap-0.5"
      )}
    >
      {SECTION_META.map(({ id, icon: Icon }) => {
        const isActive = activeSection === id;
        const isSuggested = !isActive && suggestedSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "group relative flex items-center gap-2 rounded-zaki-md px-3 py-2 text-sm transition-colors",
              "max-sm:shrink-0",
              isActive
                ? "bg-zaki-brand-10 text-zaki-primary dark:text-zaki-dark-primary"
                : "text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary dark:text-zaki-dark-subtle dark:hover:text-zaki-dark-primary",
              isRtl ? "text-right" : "text-left"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={cn("size-4 shrink-0", isActive && "text-zaki-brand")} aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {t(`zakiSettingsSheet.rail.${id}.label`)}
            </span>
            {isSuggested ? (
              <span className="size-1.5 shrink-0 rounded-full bg-zaki-brand" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function SettingsSection({
  title,
  summary,
  isRtl,
  children,
}: {
  // icon kept in props for API symmetry but the section header lives in
  // the rail; the content panel only needs the title and one-line summary.
  icon: RailIcon;
  title: string;
  summary: string;
  isRtl: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className={cn("flex flex-col gap-1", isRtl && "text-right")}>
        <h3 className="font-display text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {title}
        </h3>
        <p className="text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">{summary}</p>
      </header>
      <div>{children}</div>
    </section>
  );
}

function InlineFieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-2 text-xs text-zaki-brand">{text}</p>;
}

// Phase 4-B (2026-05-08) — Channel cards. The Channels section surfaces all
// integrations (Telegram, Slack, Discord, WhatsApp) as stacked cards.
// Telegram is fully wired and renders its setup flow inline; the other
// three are honest "coming soon" cards so the surface is ready for the
// backend handoff Nova is coordinating. Each card uses the platform's
// brand color for its icon tile so users recognize the channel without
// reading.
type ChannelStatus =
  | "connected"
  | "not_connected"
  | "connecting"
  | "verifying"
  | "needs_attention"
  | "coming_soon";

function ChannelCard({
  icon,
  iconBg,
  name,
  tagline,
  status,
  isRtl,
  t,
  children,
}: {
  icon: ReactNode;
  iconBg: string;
  name: string;
  tagline: string;
  status: ChannelStatus;
  isRtl: boolean;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  children?: ReactNode;
}) {
  const isComingSoon = status === "coming_soon";
  const statusLabel = (() => {
    switch (status) {
      case "connected":
        return t("zakiSettingsSheet.channelsList.connectedPill");
      case "not_connected":
        return t("zakiSettingsSheet.channelsList.notConnectedPill");
      case "connecting":
        return t("zakiSettingsSheet.channelsList.connectingPill");
      case "verifying":
        return t("zakiSettingsSheet.channelsList.verifyingPill");
      case "needs_attention":
        return t("zakiSettingsSheet.channelsList.needsAttentionPill");
      default:
        return t("zakiSettingsSheet.channelsList.comingSoonPill");
    }
  })();
  const statusClass = (() => {
    switch (status) {
      case "connected":
        return "bg-zaki-accent-15 text-zaki-accent";
      case "connecting":
      case "verifying":
        return "bg-zaki-brand-15 text-zaki-brand";
      case "needs_attention":
        return "bg-zaki-warning text-zaki-warning";
      case "not_connected":
        return "bg-zaki-hover text-zaki-secondary";
      default:
        return "bg-zaki-hover text-zaki-muted";
    }
  })();

  return (
    <div
      className={cn(
        "rounded-zaki-xl border border-zaki bg-zaki-raised dark:bg-zaki-dark-card dark:border-zaki-dark-card",
        isComingSoon && "opacity-90"
      )}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-3",
          isRtl && "flex-row-reverse text-right"
        )}
      >
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-zaki-md text-white"
          style={{ background: iconBg }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
            <span className="font-display text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {name}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                statusClass
              )}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
            {tagline}
          </p>
        </div>
      </div>
      {children ? (
        <div className="border-t border-zaki/60 px-4 py-4 dark:border-zaki-dark-card">
          {children}
        </div>
      ) : null}
    </div>
  );
}

// Phase 4-B (2026-05-08) — Tier visibility. Surfaces the caller's plan
// in the sheet header so free users see their tier without leaving the
// panel. The "locked" variant was for rail entries that are no longer
// in the rail (Models / Brain / Privacy / Advanced were trimmed), so
// the prop type collapses to PlanTierKey.
type PlanTierKey = "free" | "personal" | "student" | "pro" | "codeActive";

function TierBadge({
  tier,
  label,
  className,
  size = "sm",
}: {
  tier: PlanTierKey;
  label: string;
  className?: string;
  size?: "xs" | "sm";
}) {
  const isElevated = tier === "pro" || tier === "personal" || tier === "codeActive";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        isElevated ? "bg-zaki-brand-15 text-zaki-brand" : "bg-zaki-hover text-zaki-secondary",
        className
      )}
    >
      <span>{label}</span>
    </span>
  );
}

// Phase 4-B (2026-05-08) — Visual mode picker. Replaces a `<select>` for
// assistant_mode (fast / balanced / deep). The 3-card layout makes the
// trade-off legible without a click: each card carries its own icon plus
// a one-line description, so the user picks the personality directly
// rather than guessing what "Deep" means in a dropdown.
type ModeCardOption<V extends string> = {
  value: V;
  label: string;
  description: string;
  icon: RailIcon;
};

function ModeCardGroup<V extends string>({
  legend,
  helper,
  value,
  onChange,
  options,
  isRtl,
  errorText,
  disabled,
}: {
  legend: string;
  helper?: string;
  value: V;
  onChange: (next: V) => void;
  options: readonly ModeCardOption<V>[];
  isRtl: boolean;
  errorText?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset
      className={cn(
        "flex flex-col gap-3 rounded-zaki-xl border border-zaki bg-zaki-raised p-4 dark:bg-zaki-dark-card dark:border-zaki-dark-card",
        disabled && "opacity-70"
      )}
      aria-disabled={disabled || undefined}
    >
      <legend className="sr-only">{legend}</legend>
      {helper ? (
        <p className={cn("text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted", isRtl && "text-right")}>
          {helper}
        </p>
      ) : null}
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {options.map(({ value: optionValue, label, description, icon: Icon }) => {
          const isActive = optionValue === value;
          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => !disabled && onChange(optionValue)}
              disabled={disabled}
              className={cn(
                "group flex h-full flex-col gap-2 rounded-zaki-md border p-3 text-left transition-colors",
                isActive
                  ? "border-zaki-brand bg-zaki-brand-10 text-zaki-primary dark:text-zaki-dark-primary"
                  : "border-zaki bg-zaki-base text-zaki-secondary hover:border-zaki-brand-40 hover:bg-zaki-hover dark:bg-zaki-base dark:text-zaki-dark-subtle",
                disabled && "cursor-not-allowed",
                isRtl && "text-right"
              )}
            >
              <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-zaki-md",
                    isActive ? "bg-zaki-brand text-white" : "bg-zaki-hover text-zaki-secondary"
                  )}
                  aria-hidden
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {label}
                </span>
              </div>
              <span className="text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {description}
              </span>
            </button>
          );
        })}
      </div>
      <InlineFieldError text={errorText} />
    </fieldset>
  );
}

export function ZakiSettingsSheet({ isOpen, onClose }: Props) {
  const authLoading = useAuthStore((state) => state.isLoading);
  const authUser = useAuthStore((state) => state.user);
  const isAuthReady = !authLoading && Boolean(authUser);
  const { data: entitlementsResult } = useEntitlements();
  const entitlements = entitlementsResult?.data ?? null;
  const planTierRaw = entitlements?.plan?.tier ?? "free";
  const effectiveEntitlement = resolveEffectiveEntitlement(entitlements);
  const planTierKey: PlanTierKey =
    effectiveEntitlement.source === "access_code"
      ? "codeActive"
      : planTierRaw === "personal"
        ? "personal"
        : planTierRaw === "student"
          ? "student"
          : planTierRaw === "pro"
            ? "pro"
            : "free";
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [onboarding, setOnboarding] = useState<BotOnboardingState | null>(null);
  const [settings, setSettings] = useState<BotSettingsProfile | null>(null);
  const [heartbeat, setHeartbeat] = useState<BotHeartbeatState | null>(null);
  const [usage, setUsage] = useState<BotUsageSummary | null>(null);
  const [usageUnavailable, setUsageUnavailable] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(DEFAULT_SETTINGS);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramAllowFrom, setTelegramAllowFrom] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramUiStatusOverride, setTelegramUiStatusOverride] = useState<TelegramUiStatus | null>(null);
  const [heartbeatBusy, setHeartbeatBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionValue>("identity");
  const [settingsErrors, setSettingsErrors] = useState<SettingsFieldErrors>({});
  const [telegramErrors, setTelegramErrors] = useState<TelegramFieldErrors>({});
  const [agentUserUnavailable, setAgentUserUnavailable] = useState(false);

  const setup = useMemo(
    () => (onboarding?.setup && typeof onboarding.setup === "object" ? onboarding.setup : null),
    [onboarding]
  );
  const telegramSetup = useMemo(() => getChannelSetup(setup, "telegram"), [setup]);
  const telegramStatus = getChannelStatus(telegramSetup);
  const telegramConnected = getTelegramConnected(telegramStatus);
  const minimumRequired = asStringArray(
    onboarding?.minimum_required ?? asRecord(onboarding?.setup).minimum_required
  );
  const setupSummary = getSetupSummary(setup);
  const operatorConfigRequired = asBoolean(
    onboarding?.operator_configure_model_provider ??
      asRecord(onboarding?.setup).operator_configure_model_provider
  );
  const canStartChatNow = asBoolean(
    onboarding?.can_start_chat_now ?? asRecord(onboarding?.setup).can_start_chat_now
  );
  const heartbeatEnabled = Boolean(heartbeat?.enabled);
  const heartbeatToggleDisabled = agentUserUnavailable || !telegramConnected || heartbeatBusy;
  const voiceRepliesDisabled = agentUserUnavailable || !telegramConnected;
  const settingsDirty =
    settingsDraft.assistant_mode !== (settings?.assistant_mode ?? DEFAULT_SETTINGS.assistant_mode) ||
    settingsDraft.group_activation !== (settings?.group_activation ?? DEFAULT_SETTINGS.group_activation) ||
    settingsDraft.proactive_updates !==
      Boolean(settings?.proactive_updates ?? DEFAULT_SETTINGS.proactive_updates) ||
    settingsDraft.voice_replies !==
      Boolean(settings?.voice_replies ?? DEFAULT_SETTINGS.voice_replies) ||
    settingsDraft.session_timeout_minutes !==
      String(settings?.session_timeout_minutes ?? DEFAULT_SETTINGS.session_timeout_minutes) ||
    settingsDraft.autonomy !== (settings?.autonomy ?? DEFAULT_SETTINGS.autonomy);

  const responseStyleLabel = t(`zakiSettingsSheet.options.${settingsDraft.assistant_mode}`);
  const joinBehaviorLabel = t(
    settingsDraft.group_activation === "always"
      ? "zakiSettingsSheet.options.alwaysActive"
      : "zakiSettingsSheet.options.mentionOnly"
  );
  const setupDateLabel = formatCompletedAt(
    onboarding?.completed_at_s ?? null,
    t("zakiSettingsSheet.workspace.setupNotCompleted")
  );
  const overviewStatusTone: "ready" | "warning" | "error" | "neutral" = operatorConfigRequired
    ? "error"
    : canStartChatNow
      ? "ready"
      : minimumRequired.length > 0
        ? "warning"
        : "neutral";
  const overviewSummary = operatorConfigRequired
    ? t("zakiSettingsSheet.overview.operatorRequired")
    : canStartChatNow
      ? t("zakiSettingsSheet.overview.readyToStart")
      : minimumRequired.length > 0
        ? t("zakiSettingsSheet.overview.missingRequirements")
        : t("zakiSettingsSheet.overview.awaitingStatus");

  const suggestedSection: SectionValue = operatorConfigRequired
    ? "identity"
    : !telegramConnected
      ? "channels"
      : minimumRequired.length > 0
        ? "identity"
        : "responseStyle";

  const syncPostMutationTelegramState = async (
    targetState: "connected" | "disconnected",
    enablePolling = false
  ) => {
    const readState = async () => {
      let nextAgentUserUnavailable = false;

      const [onboardingResult, heartbeatResult] = await Promise.all([
        fetchBotOnboarding(),
        fetchBotHeartbeat(),
      ]);

      if (onboardingResult.response.ok) {
        setOnboarding(onboardingResult.data);
        const nextTelegram = getChannelSetup(asRecord(onboardingResult.data.setup), "telegram");
        setTelegramAllowFrom(asStringArray(nextTelegram.allow_from).join(", "));
      } else {
        const unknownUser = isUnknownBotUserError(onboardingResult.data);
        if (unknownUser) nextAgentUserUnavailable = true;
        setOnboarding(null);
      }

      if (heartbeatResult.response.ok) {
        setHeartbeat(heartbeatResult.data);
      } else {
        setHeartbeat({ enabled: false });
      }

      setAgentUserUnavailable(nextAgentUserUnavailable);
      return {
        onboardingResult,
        confirmedConnected: onboardingResult.response.ok
          ? getTelegramConnectedFromOnboarding(onboardingResult.data)
          : false,
      };
    };

    let latestResult = await readState();
    const initialTargetReached =
      targetState === "connected" ? latestResult.confirmedConnected : !latestResult.confirmedConnected;
    if (initialTargetReached || !enablePolling) {
      return latestResult;
    }

    for (const delay of TELEGRAM_CONFIRMATION_DELAYS_MS.slice(1)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      latestResult = await readState();
      const targetReached =
        targetState === "connected" ? latestResult.confirmedConnected : !latestResult.confirmedConnected;
      if (targetReached) {
        return latestResult;
      }
    }

    return latestResult;
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!isAuthReady) {
      setLoading(true);
      return;
    }
    let active = true;

    async function loadSettingsState() {
      setLoading(true);
      setBanner(null);
      setAgentUserUnavailable(false);
      let nextAgentUserUnavailable = false;

      const [onboardingResult, settingsResult, heartbeatResult, usageResult] = await Promise.allSettled([
        fetchBotOnboarding(),
        fetchBotSettings(),
        fetchBotHeartbeat(),
        fetchBotUsage(),
      ]);

      if (!active) return;

      if (onboardingResult.status === "fulfilled") {
        const { response, data } = onboardingResult.value;
        if (response.ok) {
          setOnboarding(data);
          const nextSetup = asRecord(data.setup);
          const nextTelegram = getChannelSetup(nextSetup, "telegram");
          if (!telegramAllowFrom) {
            setTelegramAllowFrom(asStringArray(nextTelegram.allow_from).join(", "));
          }
        } else {
          const unknownUser = isUnknownBotUserError(data);
          if (unknownUser) nextAgentUserUnavailable = true;
          setBanner({
            tone: "error",
            text: unknownUser
              ? t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser")
              : getErrorText(t, data, t("zakiSettingsSheet.errors.onboardingLoad")),
          });
          setOnboarding(null);
        }
      } else {
        setBanner({ tone: "error", text: t("zakiSettingsSheet.errors.onboardingLoad") });
        setOnboarding(null);
      }

      if (settingsResult.status === "fulfilled") {
        const { response, data } = settingsResult.value;
        if (response.ok) {
          setSettings(data);
          setSettingsDraft({
            assistant_mode: data.assistant_mode ?? DEFAULT_SETTINGS.assistant_mode,
            group_activation: data.group_activation ?? DEFAULT_SETTINGS.group_activation,
            proactive_updates: Boolean(data.proactive_updates ?? DEFAULT_SETTINGS.proactive_updates),
            voice_replies: Boolean(data.voice_replies ?? DEFAULT_SETTINGS.voice_replies),
            session_timeout_minutes:
              typeof data.session_timeout_minutes === "number"
                ? String(data.session_timeout_minutes)
                : DEFAULT_SETTINGS.session_timeout_minutes,
            autonomy: data.autonomy ?? DEFAULT_SETTINGS.autonomy,
          });
        } else {
          const unknownUser = isUnknownBotUserError(data);
          if (unknownUser) nextAgentUserUnavailable = true;
          setBanner({
            tone: "error",
            text: unknownUser
              ? t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser")
              : getErrorText(t, data, t("zakiSettingsSheet.errors.settingsLoad")),
          });
          setSettings(null);
        }
      } else {
        setBanner({ tone: "error", text: t("zakiSettingsSheet.errors.settingsLoad") });
        setSettings(null);
      }

      if (heartbeatResult.status === "fulfilled") {
        const { response, data } = heartbeatResult.value;
        if (response.ok) {
          setHeartbeat(data);
        } else {
          setBanner({
            tone: "error",
            text: getErrorText(t, data, t("zakiSettingsSheet.errors.heartbeatLoad")),
          });
          setHeartbeat(null);
        }
      } else {
        setBanner({ tone: "error", text: t("zakiSettingsSheet.errors.heartbeatLoad") });
        setHeartbeat(null);
      }

      if (usageResult.status === "fulfilled") {
        const { response, data } = usageResult.value;
        if (response.ok) {
          setUsage(data);
          setUsageUnavailable(false);
        } else {
          setUsage(null);
          setUsageUnavailable(getBotErrorCode(data) === "usage_unavailable");
        }
      } else {
        setUsage(null);
        setUsageUnavailable(true);
      }

      setAgentUserUnavailable(nextAgentUserUnavailable);
      setLoading(false);
    }

    void loadSettingsState();

    return () => {
      active = false;
    };
  }, [isAuthReady, isOpen, t]);

  useEffect(() => {
    if (isOpen) return;
    setTelegramToken("");
    setTelegramAllowFrom("");
    setTelegramUiStatusOverride(null);
    setActiveSection("identity");
    setSettingsErrors({});
    setTelegramErrors({});
    setAgentUserUnavailable(false);
  }, [isOpen]);

  const sectionInitRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      sectionInitRef.current = false;
      return;
    }
    if (loading || sectionInitRef.current) return;
    setActiveSection(suggestedSection);
    sectionInitRef.current = true;
  }, [isOpen, loading, suggestedSection]);

  useEffect(() => {
    if (telegramConnected || !settingsDraft.voice_replies) return;
    setSettingsDraft((current) =>
      current.voice_replies
        ? {
            ...current,
            voice_replies: false,
          }
        : current
    );
  }, [telegramConnected, settingsDraft.voice_replies]);

  useEffect(() => {
    if (telegramBusy) return;
    setTelegramUiStatusOverride((current) => {
      if (telegramConnected) {
        return null;
      }
      if (current === "connecting" || current === "verifying") {
        return "not_connected";
      }
      return current;
    });
  }, [telegramBusy, telegramConnected]);

  const handleSaveAssistantSettings = async () => {
    setSavingSettings(true);
    setBanner(null);
    setSettingsErrors({});
    if (agentUserUnavailable) {
      setSavingSettings(false);
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser"),
      });
      return false;
    }
    const parsedTimeout = Number.parseInt(settingsDraft.session_timeout_minutes, 10);
    if (!Number.isInteger(parsedTimeout) || parsedTimeout < 5 || parsedTimeout > 180) {
      setSavingSettings(false);
      setSettingsErrors({
        session_timeout_minutes: t("zakiSettingsSheet.errors.sessionTimeoutRange"),
      });
      return false;
    }

    const payload: BotSettingsPatch = {
      assistant_mode: settingsDraft.assistant_mode,
      group_activation: settingsDraft.group_activation,
      proactive_updates: settingsDraft.proactive_updates,
      voice_replies: telegramConnected ? settingsDraft.voice_replies : false,
      session_timeout_minutes: parsedTimeout,
    };
    // Only patch autonomy when the user explicitly changed it from what the
    // server returned. Avoids silently writing the default to every account
    // the first time anyone opens the sheet on an older runtime that did not
    // round-trip the field.
    if (settings?.autonomy !== undefined && settingsDraft.autonomy !== settings.autonomy) {
      payload.autonomy = settingsDraft.autonomy;
    } else if (settings?.autonomy === undefined && settingsDraft.autonomy !== DEFAULT_SETTINGS.autonomy) {
      payload.autonomy = settingsDraft.autonomy;
    }
    const { response, data } = await updateBotSettings(payload);
    setSavingSettings(false);
    if (!response.ok) {
      const fieldErrors = extractSettingsFieldErrors(data, t);
      setSettingsErrors(fieldErrors);
      setBanner({
        tone: "error",
        text: getErrorText(t, data, t("zakiSettingsSheet.errors.settingsSave")),
      });
      return false;
    }

    setSettings(data);
    setSettingsDraft({
      assistant_mode: data.assistant_mode ?? DEFAULT_SETTINGS.assistant_mode,
      group_activation: data.group_activation ?? DEFAULT_SETTINGS.group_activation,
      proactive_updates: Boolean(data.proactive_updates ?? DEFAULT_SETTINGS.proactive_updates),
      voice_replies: Boolean(data.voice_replies ?? DEFAULT_SETTINGS.voice_replies),
      session_timeout_minutes:
        typeof data.session_timeout_minutes === "number"
          ? String(data.session_timeout_minutes)
          : DEFAULT_SETTINGS.session_timeout_minutes,
      autonomy: data.autonomy ?? DEFAULT_SETTINGS.autonomy,
    });
    setBanner({ tone: "success", text: t("zakiSettingsSheet.success.settingsSaved") });
    return true;
  };

  const handleTelegramConnect = async () => {
    setBanner(null);
    setTelegramErrors({});
    if (agentUserUnavailable) {
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser"),
      });
      return;
    }

    const botToken = telegramToken.trim();
    const nextErrors: TelegramFieldErrors = {};

    if (!botToken) {
      nextErrors.bot_token = t("zakiSettingsSheet.errors.telegramTokenRequired");
    }
    if (Object.keys(nextErrors).length > 0) {
      setTelegramErrors(nextErrors);
      return;
    }

    const allowFrom = normalizeAllowFromInput(telegramAllowFrom);
    const payload: BotTelegramConnectPayload = { bot_token: botToken };
    if (allowFrom.length > 0) {
      payload.allow_from = allowFrom;
    }

    setTelegramUiStatusOverride("connecting");
    setTelegramBusy(true);
    const { response, data } = await connectBotTelegram(payload);
    if (!response.ok) {
      setTelegramBusy(false);
      setTelegramUiStatusOverride("needs_attention");
      setTelegramErrors(extractTelegramFieldErrors(data, t));
      setBanner({
        tone: "error",
        text: getErrorText(t, data, t("zakiSettingsSheet.errors.telegramConnectFailed")),
      });
      return;
    }

    setTelegramUiStatusOverride("verifying");
    const { confirmedConnected } = await syncPostMutationTelegramState("connected", true);
    setTelegramBusy(false);

    if (confirmedConnected) {
      setTelegramToken("");
      setTelegramUiStatusOverride(null);
      setBanner({
        tone: "success",
        text: t("zakiSettingsSheet.success.telegramConnected"),
      });
      return;
    }

    setTelegramUiStatusOverride("needs_attention");
    setBanner({
      tone: "error",
      text: t("zakiSettingsSheet.errors.telegramConnectStillVerifying"),
    });
  };

  const handleTelegramDisconnect = async () => {
    setBanner(null);
    setTelegramErrors({});
    if (agentUserUnavailable) {
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser"),
      });
      return;
    }
    setTelegramBusy(true);
    setTelegramUiStatusOverride("verifying");
    const { response, data } = await disconnectBotTelegram();
    const { confirmedConnected } = await syncPostMutationTelegramState("disconnected", response.ok);
    setTelegramBusy(false);
    if (response.ok && !confirmedConnected) {
      setTelegramToken("");
      setTelegramUiStatusOverride("not_connected");
      setBanner({
        tone: "success",
        text: t("zakiSettingsSheet.success.telegramDisconnected"),
      });
      return;
    }

    setTelegramUiStatusOverride("needs_attention");
    setBanner({
      tone: "error",
      text: response.ok
        ? t("zakiSettingsSheet.errors.telegramDisconnectUnconfirmed")
        : getErrorText(t, data, t("zakiSettingsSheet.errors.telegramDisconnectFailed")),
    });
  };

  const handleHeartbeatToggle = async (enabled: boolean) => {
    setBanner(null);
    if (agentUserUnavailable) {
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser"),
      });
      return;
    }
    setHeartbeatBusy(true);
    const { response, data } = await updateBotHeartbeat({ enabled });
    setHeartbeatBusy(false);
    if (!response.ok) {
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.heartbeatSave"),
      });
      return;
    }
    setHeartbeat(data);
    setBanner({
      tone: "success",
      text: enabled
        ? t("zakiSettingsSheet.success.heartbeatEnabled")
        : t("zakiSettingsSheet.success.heartbeatDisabled"),
    });
  };

  if (!isOpen) return null;

  const footer = (
    <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
      {settingsDirty ? (
        <span className={cn("rounded-full bg-zaki-brand/10 px-2.5 py-1 text-[11px] font-semibold text-zaki-brand", isRtl ? "ms-auto" : "me-auto")}>
          {t("zakiSettingsSheet.footer.unsaved")}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-zaki-strong px-4 py-2 text-sm font-medium text-zaki-primary transition-colors hover:bg-zaki-hover"
          onClick={onClose}
        >
          {t("settingsModal.footer.cancel")}
        </button>
        <button
          type="button"
          className="rounded-full bg-zaki-brand px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          onClick={() => {
            void handleSaveAssistantSettings();
          }}
          disabled={savingSettings || operatorConfigRequired || agentUserUnavailable}
        >
          {savingSettings
            ? t("zakiSettingsSheet.footer.saving")
            : t("zakiSettingsSheet.footer.saveAssistant")}
        </button>
      </div>
    </div>
  );

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("zakiSettingsSheet.title")}
      subtitle={t("zakiSettingsSheet.subtitle")}
      icon={<Settings className="size-4" />}
      side={isRtl ? "left" : "right"}
      width="lg"
      className="w-full sm:w-[720px] sm:max-w-[90vw] dark:text-zaki-dark-primary"
      description={t("zakiSettingsSheet.closeAria")}
      padded={false}
      footer={footer}
    >
      <div dir={isRtl ? "rtl" : "ltr"} className="relative flex h-full flex-col">
        <div className="px-5 pt-3">
          <div className={cn("flex items-center", isRtl ? "justify-start" : "justify-end")}>
            <TierBadge
              tier={planTierKey}
              label={t(`sidebar.profile.planBadge.${planTierKey}`)}
            />
          </div>
          {banner ? (
            <div
              className={cn(
                "mt-4 rounded-zaki-xl border px-4 py-3 text-sm",
                banner.tone === "success"
                  ? "border-zaki-accent/30 bg-zaki-accent/10 text-zaki-primary dark:text-zaki-dark-primary"
                  : "border-zaki-brand/30 bg-zaki-brand/10 text-zaki-primary dark:text-zaki-dark-primary"
              )}
            >
              {banner.text}
            </div>
          ) : null}
        </div>

        <div className="relative flex-1 px-5 py-5">
          <div className={cn("flex h-full min-h-0 flex-col sm:flex-row", isRtl && "sm:flex-row-reverse")}>
            <SettingsRail
              activeSection={activeSection}
              onSelect={setActiveSection}
              suggestedSection={suggestedSection}
              isRtl={isRtl}
              t={t}
            />
            <div className="min-w-0 flex-1 px-1 py-4 sm:px-5 sm:py-1">
              {activeSection === "identity" && (
                <SettingsSection
                  icon={Bot}
                  title={t("zakiSettingsSheet.rail.identity.label")}
                  summary={overviewSummary}
                  isRtl={isRtl}
                >
                  <div className="space-y-3">
                    <div className={cn("rounded-2xl border px-4 py-3 text-sm", getStatusTone(overviewStatusTone))}>
                      <div className="font-semibold">{overviewSummary}</div>
                      <div className="mt-1 text-xs opacity-90">
                        {setupSummary || t("zakiSettingsSheet.overview.statusHelper", { updated: setupDateLabel })}
                      </div>
                    </div>

                    {operatorConfigRequired ? (
                      <div className="rounded-zaki-xl border border-zaki-brand/30 bg-zaki-brand/10 px-4 py-3 text-sm text-zaki-primary dark:text-zaki-dark-primary">
                        <p className="font-display font-bold">{t("zakiSettingsSheet.overview.operatorBlockingTitle")}</p>
                        <p className="mt-1 text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                          {t("zakiSettingsSheet.overview.operatorBlockingBody")}
                        </p>
                      </div>
                    ) : null}

                    <CompactRow
                      title={t("zakiSettingsSheet.overview.readinessTitle")}
                      summary={
                        canStartChatNow
                          ? t("zakiSettingsSheet.overview.readyToStart")
                          : t("zakiSettingsSheet.overview.notReady")
                      }
                      helper={t("zakiSettingsSheet.overview.readinessHelper")}
                      isRtl={isRtl}
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.overview.telegramTitle")}
                      summary={
                        telegramConnected
                          ? t("zakiSettingsSheet.workspace.channelStatus.connected")
                          : t("zakiSettingsSheet.workspace.channelStatus.notConnected")
                      }
                      helper={getChannelMeta(telegramSetup) || t("zakiSettingsSheet.overview.telegramHelper")}
                      isRtl={isRtl}
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.overview.minimumRequiredTitle")}
                      summary={
                        minimumRequired.length > 0
                          ? minimumRequired.join(", ")
                          : t("zakiSettingsSheet.overview.nothingMissing")
                      }
                      helper={t("zakiSettingsSheet.overview.minimumRequiredHelper")}
                      isRtl={isRtl}
                    />
                  </div>
                </SettingsSection>
              )}

              {activeSection === "responseStyle" && (
                <SettingsSection
                  icon={Volume2}
                  title={t("zakiSettingsSheet.rail.responseStyle.label")}
                  summary={t("zakiSettingsSheet.sections.assistant.summary", {
                    style: responseStyleLabel,
                    join: joinBehaviorLabel,
                  })}
                  isRtl={isRtl}
                >
                  <div className="space-y-3">
                    <ModeCardGroup
                      legend={t("zakiSettingsSheet.fields.responseStyle.title")}
                      helper={t("zakiSettingsSheet.fields.responseStyle.helper")}
                      value={settingsDraft.assistant_mode}
                      onChange={(next) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          assistant_mode: next,
                        }))
                      }
                      isRtl={isRtl}
                      errorText={settingsErrors.assistant_mode}
                      options={[
                        {
                          value: "fast",
                          label: t("zakiSettingsSheet.options.fast"),
                          description: t("zakiSettingsSheet.fields.responseStyle.modes.fast.description"),
                          icon: Zap,
                        },
                        {
                          value: "balanced",
                          label: t("zakiSettingsSheet.options.balanced"),
                          description: t("zakiSettingsSheet.fields.responseStyle.modes.balanced.description"),
                          icon: Gauge,
                        },
                        {
                          value: "deep",
                          label: t("zakiSettingsSheet.options.deep"),
                          description: t("zakiSettingsSheet.fields.responseStyle.modes.deep.description"),
                          icon: Telescope,
                        },
                      ]}
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.joinBehavior.title")}
                      summary={joinBehaviorLabel}
                      helper={t("zakiSettingsSheet.fields.joinBehavior.helper")}
                      isRtl={isRtl}
                      control={
                        <div>
                          <select
                            aria-label={t("zakiSettingsSheet.fields.joinBehavior.title")}
                            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-body text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-primary"
                            value={settingsDraft.group_activation}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({
                                ...current,
                                group_activation: event.target.value as SettingsDraft["group_activation"],
                              }))
                            }
                          >
                            <option value="mention">{t("zakiSettingsSheet.options.mentionOnly")}</option>
                            <option value="always">{t("zakiSettingsSheet.options.alwaysActive")}</option>
                          </select>
                          <InlineFieldError text={settingsErrors.group_activation} />
                        </div>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.proactiveUpdates.title")}
                      summary={t(
                        settingsDraft.proactive_updates
                          ? "zakiSettingsSheet.status.enabled"
                          : "zakiSettingsSheet.status.disabled"
                      )}
                      helper={t("zakiSettingsSheet.fields.proactiveUpdates.helper")}
                      isRtl={isRtl}
                      control={
                        <div>
                          <label className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 transition-colors hover:border-zaki-accent/40 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]">
                            <span className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                              {t(
                                settingsDraft.proactive_updates
                                  ? "zakiSettingsSheet.status.enabled"
                                  : "zakiSettingsSheet.status.disabled"
                              )}
                            </span>
                            <input
                              aria-label={t("zakiSettingsSheet.fields.proactiveUpdates.title")}
                              type="checkbox"
                              checked={settingsDraft.proactive_updates}
                              onChange={(event) =>
                                setSettingsDraft((current) => ({
                                  ...current,
                                  proactive_updates: event.target.checked,
                                }))
                              }
                            />
                          </label>
                          <InlineFieldError text={settingsErrors.proactive_updates} />
                        </div>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.voiceReplies.title")}
                      summary={
                        !telegramConnected
                          ? t("zakiSettingsSheet.fields.voiceReplies.requiresTelegram")
                          : t(
                              settingsDraft.voice_replies
                                ? "zakiSettingsSheet.status.enabled"
                                : "zakiSettingsSheet.status.disabled"
                            )
                      }
                      helper={t("zakiSettingsSheet.fields.voiceReplies.helper")}
                      isRtl={isRtl}
                      disabled={!telegramConnected}
                      control={
                        <div>
                          <label className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 transition-colors hover:border-zaki-accent/40 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]">
                            <span className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                              {t(
                                settingsDraft.voice_replies
                                  ? "zakiSettingsSheet.status.enabled"
                                  : "zakiSettingsSheet.status.disabled"
                              )}
                            </span>
                            <input
                              aria-label={t("zakiSettingsSheet.fields.voiceReplies.title")}
                              type="checkbox"
                              checked={settingsDraft.voice_replies}
                              disabled={voiceRepliesDisabled}
                              onChange={(event) =>
                                setSettingsDraft((current) => ({
                                  ...current,
                                  voice_replies: event.target.checked,
                                }))
                              }
                            />
                          </label>
                          {!telegramConnected ? (
                            <button
                              type="button"
                              onClick={() => setActiveSection("channels")}
                              className="mt-2 text-xs font-semibold text-zaki-brand hover:underline"
                            >
                              {t("zakiSettingsSheet.fields.voiceReplies.connectTelegram")}
                            </button>
                          ) : null}
                          <InlineFieldError text={settingsErrors.voice_replies} />
                        </div>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.sessionWindow.title")}
                      summary={t("zakiSettingsSheet.fields.sessionWindow.summary", {
                        minutes: settingsDraft.session_timeout_minutes || DEFAULT_SETTINGS.session_timeout_minutes,
                      })}
                      helper={t("zakiSettingsSheet.fields.sessionWindow.helper")}
                      isRtl={isRtl}
                      control={
                        <div>
                          <input
                            aria-label={t("zakiSettingsSheet.fields.sessionWindow.title")}
                            type="number"
                            min={5}
                            max={180}
                            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-body text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-primary"
                            value={settingsDraft.session_timeout_minutes}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({
                                ...current,
                                session_timeout_minutes: event.target.value,
                              }))
                            }
                          />
                          <InlineFieldError text={settingsErrors.session_timeout_minutes} />
                        </div>
                      }
                    />
                  </div>
                </SettingsSection>
              )}

              {activeSection === "channels" && (
                <SettingsSection
                  icon={Link2}
                  title={t("zakiSettingsSheet.channelsList.headerHeading")}
                  summary={t("zakiSettingsSheet.channelsList.headerSummary")}
                  isRtl={isRtl}
                >
                  <div className="space-y-3">
                    <ChannelCard
                      icon={<Send className="size-4" />}
                      iconBg="#229ED9"
                      name={t("zakiSettingsSheet.channelsList.telegram.name")}
                      tagline={t("zakiSettingsSheet.channelsList.telegram.tagline")}
                      status={
                        telegramUiStatusOverride === "connecting"
                          ? "connecting"
                          : telegramUiStatusOverride === "verifying"
                            ? "verifying"
                            : telegramUiStatusOverride === "needs_attention"
                              ? "needs_attention"
                              : telegramConnected
                                ? "connected"
                                : "not_connected"
                      }
                      isRtl={isRtl}
                      t={t}
                    >
                      <div className={cn("space-y-4", isRtl && "text-right")}>
                        <div>
                          <h4 className="font-display text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                            {t("zakiSettingsSheet.telegram.guide.title")}
                          </h4>
                          <ol className="mt-3 space-y-2 text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle">
                            {(["step1", "step2", "step3", "step4"] as const).map((step, index) => (
                              <li
                                key={step}
                                className={cn("flex items-start gap-2", isRtl && "flex-row-reverse")}
                              >
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zaki-brand-15 text-[11px] font-semibold text-zaki-brand">
                                  {index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  {t(`zakiSettingsSheet.telegram.guide.${step}`)}
                                </span>
                              </li>
                            ))}
                          </ol>
                          <a
                            href="https://t.me/BotFather"
                            target="_blank"
                            rel="noreferrer noopener"
                            className={cn(
                              "mt-3 inline-flex items-center gap-1 text-xs font-medium text-zaki-brand hover:underline",
                              isRtl && "flex-row-reverse"
                            )}
                          >
                            {t("zakiSettingsSheet.telegram.guide.openBotFather")}
                            <span aria-hidden>{isRtl ? "←" : "→"}</span>
                          </a>
                        </div>

                        <label className="block">
                          <MetaLabel className="mb-2 flex">
                            {t("zakiSettingsSheet.telegram.botTokenLabel")}
                          </MetaLabel>
                          <input
                            aria-label={t("zakiSettingsSheet.telegram.botTokenLabel")}
                            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-mono-ui text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-zaki-dark-card dark:border-zaki-dark-card dark:text-zaki-dark-primary"
                            placeholder={
                              telegramConnected
                                ? t("zakiSettingsSheet.telegram.botTokenMasked")
                                : t("zakiSettingsSheet.workspace.telegramToken")
                            }
                            type="password"
                            value={telegramToken}
                            onChange={(event) => setTelegramToken(event.target.value)}
                          />
                          <InlineFieldError text={telegramErrors.bot_token} />
                        </label>

                        <label className="block">
                          <MetaLabel className="mb-2 flex">
                            {t("zakiSettingsSheet.telegram.allowFromLabel")}
                          </MetaLabel>
                          <textarea
                            aria-label={t("zakiSettingsSheet.telegram.allowFromLabel")}
                            className="min-h-[96px] w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-mono-ui text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-zaki-dark-card dark:border-zaki-dark-card dark:text-zaki-dark-primary"
                            placeholder={t("zakiSettingsSheet.telegram.allowFromPlaceholder")}
                            value={telegramAllowFrom}
                            onChange={(event) => setTelegramAllowFrom(event.target.value)}
                          />
                          <p className="mt-2 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                            {t("zakiSettingsSheet.telegram.allowFromHelper")}
                          </p>
                          <InlineFieldError text={telegramErrors.allow_from} />
                        </label>

                        <div className={cn("flex flex-wrap gap-2", isRtl && "justify-end")}>
                          <button
                            type="button"
                            disabled={telegramBusy || agentUserUnavailable}
                            className="rounded-full bg-zaki-brand px-4 py-2 text-sm font-medium text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                            onClick={() => {
                              void handleTelegramConnect();
                            }}
                          >
                            {telegramBusy
                              ? t("zakiSettingsSheet.actions.connecting")
                              : telegramConnected
                                ? t("zakiSettingsSheet.actions.reconnectTelegram")
                                : t("zakiSettingsSheet.actions.connectTelegram")}
                          </button>
                          <button
                            type="button"
                            disabled={telegramBusy || !telegramConnected || agentUserUnavailable}
                            className="rounded-full border border-zaki-strong px-4 py-2 text-sm font-medium text-zaki-primary transition-colors hover:bg-zaki-hover disabled:opacity-60"
                            onClick={() => {
                              void handleTelegramDisconnect();
                            }}
                          >
                            {t("zakiSettingsSheet.actions.disconnect")}
                          </button>
                        </div>
                      </div>
                    </ChannelCard>

                    <ChannelCard
                      icon={<Hash className="size-4" />}
                      iconBg="#4A154B"
                      name={t("zakiSettingsSheet.channelsList.slack.name")}
                      tagline={t("zakiSettingsSheet.channelsList.slack.tagline")}
                      status="coming_soon"
                      isRtl={isRtl}
                      t={t}
                    />

                    <ChannelCard
                      icon={<Gamepad2 className="size-4" />}
                      iconBg="#5865F2"
                      name={t("zakiSettingsSheet.channelsList.discord.name")}
                      tagline={t("zakiSettingsSheet.channelsList.discord.tagline")}
                      status="coming_soon"
                      isRtl={isRtl}
                      t={t}
                    />

                    <ChannelCard
                      icon={<MessageCircle className="size-4" />}
                      iconBg="#25D366"
                      name={t("zakiSettingsSheet.channelsList.whatsapp.name")}
                      tagline={t("zakiSettingsSheet.channelsList.whatsapp.tagline")}
                      status="coming_soon"
                      isRtl={isRtl}
                      t={t}
                    />
                  </div>
                </SettingsSection>
              )}

              {activeSection === "autonomy" && (
                <SettingsSection
                  icon={Activity}
                  title={t("zakiSettingsSheet.rail.autonomy.label")}
                  summary={t(`zakiSettingsSheet.autonomy.levels.${settingsDraft.autonomy}.label`)}
                  isRtl={isRtl}
                >
                  <div className="space-y-3">
                    <ModeCardGroup
                      legend={t("zakiSettingsSheet.autonomy.levelTitle")}
                      helper={t("zakiSettingsSheet.autonomy.levelHelper")}
                      value={settingsDraft.autonomy}
                      onChange={(next) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          autonomy: next,
                        }))
                      }
                      isRtl={isRtl}
                      errorText={settingsErrors.autonomy}
                      options={[
                        {
                          value: "read_only",
                          label: t("zakiSettingsSheet.autonomy.levels.read_only.label"),
                          description: t("zakiSettingsSheet.autonomy.levels.read_only.description"),
                          icon: Eye,
                        },
                        {
                          value: "supervised",
                          label: t("zakiSettingsSheet.autonomy.levels.supervised.label"),
                          description: t("zakiSettingsSheet.autonomy.levels.supervised.description"),
                          icon: Shield,
                        },
                        {
                          value: "full",
                          label: t("zakiSettingsSheet.autonomy.levels.full.label"),
                          description: t("zakiSettingsSheet.autonomy.levels.full.description"),
                          icon: Rocket,
                        },
                      ]}
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.autonomy.proactiveTitle")}
                      summary={
                        settingsDraft.proactive_updates
                          ? t("zakiSettingsSheet.status.enabled")
                          : t("zakiSettingsSheet.status.disabled")
                      }
                      helper={t("zakiSettingsSheet.autonomy.proactiveHelper")}
                      isRtl={isRtl}
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.autonomy.heartbeatTitle")}
                      summary={
                        !telegramConnected
                          ? t("zakiSettingsSheet.autonomy.heartbeatRequiresTelegram")
                          : heartbeatEnabled
                            ? t("zakiSettingsSheet.status.enabled")
                            : t("zakiSettingsSheet.status.disabled")
                      }
                      helper={t("zakiSettingsSheet.autonomy.heartbeatHelper")}
                      isRtl={isRtl}
                      disabled={!telegramConnected}
                      control={
                        <label className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 transition-colors hover:border-zaki-accent/40 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]">
                          <span className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                            {heartbeatEnabled
                              ? t("zakiSettingsSheet.status.enabled")
                              : t("zakiSettingsSheet.status.disabled")}
                          </span>
                          <input
                            aria-label={t("zakiSettingsSheet.autonomy.heartbeatTitle")}
                            type="checkbox"
                            checked={heartbeatEnabled}
                            disabled={heartbeatToggleDisabled}
                            onChange={(event) => {
                              void handleHeartbeatToggle(event.target.checked);
                            }}
                          />
                        </label>
                      }
                    />
                  </div>
                </SettingsSection>
              )}

              {activeSection === "plan" && (
                <SettingsSection
                  icon={BarChart3}
                  title={t("zakiSettingsSheet.rail.plan.label")}
                  summary={
                    usageUnavailable
                      ? t("zakiSettingsSheet.sections.usage.summaryUnavailable")
                      : usage
                        ? t("zakiSettingsSheet.sections.usage.summary", {
                            requests: usage.requests_day ?? 0,
                            state: usage.state ?? t("zakiSettingsSheet.sections.usage.stateUnknown"),
                          })
                        : t("zakiSettingsSheet.sections.usage.summaryPending")
                  }
                  isRtl={isRtl}
                >
                  <div className="space-y-3">
                    {usageUnavailable ? (
                      <p className="rounded-zaki-md border border-zaki bg-zaki-raised px-3 py-3 text-sm text-zaki-secondary dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-subtle">
                        {t("zakiSettingsSheet.usage.unavailable")}
                      </p>
                    ) : usage ? (
                      <div className="grid gap-2 rounded-zaki-md border border-zaki bg-zaki-raised p-3 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)]">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zaki-secondary dark:text-zaki-dark-subtle">
                            {t("zakiSettingsSheet.usage.state")}
                          </span>
                          <span className="font-mono-ui text-zaki-primary dark:text-zaki-dark-primary">
                            {usage.state ?? "unknown"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zaki-secondary dark:text-zaki-dark-subtle">
                            {t("zakiSettingsSheet.usage.requestsToday")}
                          </span>
                          <span className="font-mono-ui text-zaki-primary dark:text-zaki-dark-primary">
                            {usage.requests_day ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zaki-secondary dark:text-zaki-dark-subtle">
                            {t("zakiSettingsSheet.usage.tokensToday")}
                          </span>
                          <span className="font-mono-ui text-zaki-primary dark:text-zaki-dark-primary">
                            {(usage.tokens_day ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-zaki-secondary dark:text-zaki-dark-subtle">
                            {t("zakiSettingsSheet.usage.tokensMonth")}
                          </span>
                          <span className="font-mono-ui text-zaki-primary dark:text-zaki-dark-primary">
                            {(usage.tokens_month ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-zaki-md border border-zaki bg-zaki-raised px-3 py-3 text-sm text-zaki-secondary dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-subtle">
                        {t("zakiSettingsSheet.usage.pending")}
                      </p>
                    )}
                    <p className="text-xs text-zaki-muted dark:text-zaki-dark-muted">
                      {t("zakiSettingsSheet.usage.helper")}
                    </p>
                  </div>
                </SettingsSection>
              )}

            </div>
          </div>

          {!loading ? null : (
            <div className="mt-4 flex items-center gap-2 rounded-zaki-xl border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-secondary dark:bg-[#1a1714] dark:text-zaki-dark-subtle">
              <span className="inline-block size-2 animate-pulse rounded-full bg-zaki-brand" />
              {t("zakiSettingsSheet.loading.state")}
            </div>
          )}
        </div>

        <p className={cn(
          "px-5 pb-4 text-[11px] leading-5 text-zaki-muted dark:text-zaki-dark-muted",
          isRtl && "text-right"
        )}>
          {t("zakiSettingsSheet.privacy.footer")}
        </p>
      </div>
    </SheetShell>
  );
}
