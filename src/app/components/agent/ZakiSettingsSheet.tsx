import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Bot, Link2, Settings, Sparkles, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  connectBotTelegram,
  disconnectBotTelegram,
  fetchBotHeartbeat,
  fetchBotOnboarding,
  fetchBotSettings,
  updateBotHeartbeat,
  type BotHeartbeatState,
  updateBotSettings,
  type BotErrorCode,
  type BotOnboardingState,
  type BotTelegramConnectPayload,
  type BotSettingsPatch,
  type BotSettingsProfile,
} from "@/lib/api";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { MetaLabel, SectionHeader, SheetShell } from "@/app/components/ui/zaki";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type BannerState =
  | { tone: "success"; text: string }
  | { tone: "error"; text: string }
  | null;

type SectionValue = "overview" | "assistant" | "telegram" | "autonomy";
type OpenSectionValue = SectionValue | "";
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
};

type SettingsFieldErrorKey =
  | "assistant_mode"
  | "group_activation"
  | "proactive_updates"
  | "voice_replies"
  | "session_timeout_minutes";

type TelegramFieldErrorKey = "bot_token" | "allow_from";

type SettingsFieldErrors = Partial<Record<SettingsFieldErrorKey, string>>;
type TelegramFieldErrors = Partial<Record<TelegramFieldErrorKey, string>>;

const DEFAULT_SETTINGS: SettingsDraft = {
  assistant_mode: "balanced",
  group_activation: "mention",
  proactive_updates: true,
  voice_replies: false,
  session_timeout_minutes: "30",
};

const TELEGRAM_CONFIRMATION_DELAYS_MS = [0, 300, 1000, 2000];

const ERROR_COPY: Record<BotErrorCode, string> = {
  temporary_contention: "ZAKI is busy on another node. Retry shortly.",
  unauthorized: "Sign in again to manage your ZAKI space.",
  forbidden: "This ZAKI action is not available for your account.",
  invalid_telegram_token: "The Telegram token is invalid. Check it and try again.",
  provision_failed: "We could not provision your ZAKI space right now.",
  settings_update_failed: "We could not save your ZAKI settings.",
  usage_unavailable: "Usage is temporarily unavailable.",
};

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

function getBotErrorText(payload: unknown, fallback: string) {
  const code = getBotErrorCode(payload);
  return code ? ERROR_COPY[code] : fallback;
}

function getErrorText(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  return asString(record.message) || asString(record.error) || getBotErrorText(payload, fallback);
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
      <div className={cn("flex flex-col gap-3 sm:items-start sm:justify-between", isRtl ? "sm:flex-row-reverse" : "sm:flex-row")}>
        <div className={cn("min-w-0 flex-1", disabled && "opacity-75", isRtl && "text-right")}>
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
        {control ? <div className={cn("w-full shrink-0 sm:w-[240px]", disabled && "opacity-80")}>{control}</div> : null}
      </div>
      {children ? <div className="mt-3 border-t border-zaki pt-3">{children}</div> : null}
    </div>
  );
}

function SectionBadge({
  icon: Icon,
  title,
  summary,
  isRtl = false,
}: {
  icon: typeof Bot;
  title: string;
  summary: string;
  isRtl?: boolean;
}) {
  return (
    <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
      <SectionHeader
        icon={<Icon className="size-4" />}
        title={title}
        subtitle={summary}
      />
    </div>
  );
}

function InlineFieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-2 text-xs text-zaki-brand">{text}</p>;
}

export function ZakiSettingsSheet({ isOpen, onClose }: Props) {
  const authLoading = useAuthStore((state) => state.isLoading);
  const authUser = useAuthStore((state) => state.user);
  const isAuthReady = !authLoading && Boolean(authUser);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [onboarding, setOnboarding] = useState<BotOnboardingState | null>(null);
  const [settings, setSettings] = useState<BotSettingsProfile | null>(null);
  const [heartbeat, setHeartbeat] = useState<BotHeartbeatState | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(DEFAULT_SETTINGS);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramAllowFrom, setTelegramAllowFrom] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramUiStatusOverride, setTelegramUiStatusOverride] = useState<TelegramUiStatus | null>(null);
  const [heartbeatBusy, setHeartbeatBusy] = useState(false);
  const [openSection, setOpenSection] = useState<OpenSectionValue>("");
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
  const telegramUiStatus = telegramUiStatusOverride ?? (telegramConnected ? "connected" : "not_connected");
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
      String(settings?.session_timeout_minutes ?? DEFAULT_SETTINGS.session_timeout_minutes);

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
    ? "overview"
    : !telegramConnected
      ? "telegram"
      : minimumRequired.length > 0
        ? "overview"
        : "assistant";

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

      const [onboardingResult, settingsResult, heartbeatResult] = await Promise.allSettled([
        fetchBotOnboarding(),
        fetchBotSettings(),
        fetchBotHeartbeat(),
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
              : getErrorText(data, t("zakiSettingsSheet.errors.onboardingLoad")),
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
          });
        } else {
          const unknownUser = isUnknownBotUserError(data);
          if (unknownUser) nextAgentUserUnavailable = true;
          setBanner({
            tone: "error",
            text: unknownUser
              ? t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser")
              : getErrorText(data, t("zakiSettingsSheet.errors.settingsLoad")),
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
            text: getErrorText(data, t("zakiSettingsSheet.errors.heartbeatLoad")),
          });
          setHeartbeat(null);
        }
      } else {
        setBanner({ tone: "error", text: t("zakiSettingsSheet.errors.heartbeatLoad") });
        setHeartbeat(null);
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
    setOpenSection("");
    setSettingsErrors({});
    setTelegramErrors({});
    setAgentUserUnavailable(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return;
    setOpenSection((current) => (current ? current : suggestedSection));
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

  const telegramStatusSummary = (() => {
    switch (telegramUiStatus) {
      case "connecting":
        return t("zakiSettingsSheet.telegram.statusConnecting");
      case "verifying":
        return t("zakiSettingsSheet.telegram.statusVerifying");
      case "needs_attention":
        return t("zakiSettingsSheet.telegram.statusNeedsAttention");
      case "connected":
        return t("zakiSettingsSheet.workspace.channelStatus.connected");
      default:
        return t("zakiSettingsSheet.workspace.channelStatus.notConnected");
    }
  })();

  const telegramStatusHelper = (() => {
    if (telegramUiStatus === "connecting") {
      return t("zakiSettingsSheet.telegram.connectingHelper");
    }
    if (telegramUiStatus === "verifying") {
      return t("zakiSettingsSheet.telegram.verifyingHelper");
    }
    if (telegramUiStatus === "needs_attention") {
      return banner?.tone === "error"
        ? banner.text
        : t("zakiSettingsSheet.telegram.needsAttentionHelper");
    }
    return getChannelMeta(telegramSetup) || t("zakiSettingsSheet.telegram.statusHelper");
  })();

  const telegramSectionSummary = (() => {
    switch (telegramUiStatus) {
      case "connecting":
        return t("zakiSettingsSheet.sections.telegram.summaryConnecting");
      case "verifying":
        return t("zakiSettingsSheet.sections.telegram.summaryVerifying");
      case "needs_attention":
        return t("zakiSettingsSheet.sections.telegram.summaryNeedsAttention");
      case "connected":
        return t("zakiSettingsSheet.sections.telegram.summaryConnected");
      default:
        return t("zakiSettingsSheet.sections.telegram.summaryDisconnected");
    }
  })();

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
    const { response, data } = await updateBotSettings(payload);
    setSavingSettings(false);
    if (!response.ok) {
      const fieldErrors = extractSettingsFieldErrors(data, t);
      setSettingsErrors(fieldErrors);
      setBanner({
        tone: "error",
        text: getErrorText(data, t("zakiSettingsSheet.errors.settingsSave")),
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
        text: getErrorText(data, t("zakiSettingsSheet.errors.telegramConnectFailed")),
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
        : getErrorText(data, t("zakiSettingsSheet.errors.telegramDisconnectFailed")),
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
      className="w-full max-w-[100vw] sm:max-w-[720px] dark:text-zaki-dark-primary"
      description={t("zakiSettingsSheet.closeAria")}
      padded={false}
      footer={footer}
    >
      <div dir={isRtl ? "rtl" : "ltr"} className="relative flex h-full flex-col">
        <div className="px-5 pt-4">
          <MetaLabel className="inline-flex rounded-full border border-zaki bg-zaki-hover px-3 py-1 text-zaki-secondary">
            <Sparkles className="size-3.5 text-zaki-brand" />
            {t("zakiSettingsSheet.badge")}
          </MetaLabel>
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
          <Accordion
              type="single"
              collapsible
              value={openSection}
              onValueChange={(value) => setOpenSection((value as OpenSectionValue) || "")}
              className="space-y-0"
            >
              <AccordionItem value="overview" className="border-b border-zaki px-0">
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Bot}
                    title={t("zakiSettingsSheet.sections.overview.title")}
                    summary={overviewSummary}
                    isRtl={isRtl}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-6">
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="assistant" className="border-b border-zaki px-0">
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Volume2}
                    title={t("zakiSettingsSheet.sections.assistant.title")}
                    summary={t("zakiSettingsSheet.sections.assistant.summary", {
                      style: responseStyleLabel,
                      join: joinBehaviorLabel,
                    })}
                    isRtl={isRtl}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-3">
                    <CompactRow
                      title={t("zakiSettingsSheet.fields.responseStyle.title")}
                      summary={responseStyleLabel}
                      helper={t("zakiSettingsSheet.fields.responseStyle.helper")}
                      isRtl={isRtl}
                      control={
                        <div>
                          <select
                            aria-label={t("zakiSettingsSheet.fields.responseStyle.title")}
                            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-body text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-primary"
                            value={settingsDraft.assistant_mode}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({
                                ...current,
                                assistant_mode: event.target.value as SettingsDraft["assistant_mode"],
                              }))
                            }
                          >
                            <option value="fast">{t("zakiSettingsSheet.options.fast")}</option>
                            <option value="balanced">{t("zakiSettingsSheet.options.balanced")}</option>
                            <option value="deep">{t("zakiSettingsSheet.options.deep")}</option>
                          </select>
                          <InlineFieldError text={settingsErrors.assistant_mode} />
                        </div>
                      }
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="telegram" className="border-b border-zaki px-0">
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Link2}
                    title={t("zakiSettingsSheet.sections.telegram.title")}
                    summary={telegramSectionSummary}
                    isRtl={isRtl}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-3">
                    <CompactRow
                      title={t("zakiSettingsSheet.telegram.statusTitle")}
                      summary={telegramStatusSummary}
                      helper={telegramStatusHelper}
                      isRtl={isRtl}
                    />

                    <div className="rounded-zaki-xl border border-zaki-strong bg-zaki-raised px-4 py-4 dark:bg-[#1a1714]">
                      <div className="grid gap-3">
                        <label className="block">
                          <MetaLabel className="mb-2 flex">
                            {t("zakiSettingsSheet.telegram.botTokenLabel")}
                          </MetaLabel>
                          <input
                            aria-label={t("zakiSettingsSheet.telegram.botTokenLabel")}
                            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-mono-ui text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-primary"
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

                        <CompactRow
                          title={t("zakiSettingsSheet.telegram.webhookBaseLabel")}
                          summary={t("zakiSettingsSheet.telegram.webhookBaseSummary")}
                          helper={t("zakiSettingsSheet.telegram.webhookBaseHelper")}
                          isRtl={isRtl}
                        />

                        <label className="block">
                          <MetaLabel className="mb-2 flex">
                            {t("zakiSettingsSheet.telegram.allowFromLabel")}
                          </MetaLabel>
                          <textarea
                            aria-label={t("zakiSettingsSheet.telegram.allowFromLabel")}
                            className="min-h-[96px] w-full rounded-zaki-md border border-zaki-strong bg-zaki-raised px-3 py-2 font-mono-ui text-sm text-zaki-primary outline-none transition-colors focus:border-zaki-accent focus:ring-2 focus:ring-zaki-accent/20 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.1)] dark:text-zaki-dark-primary"
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
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="autonomy" className="border-b border-zaki px-0">
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Activity}
                    title={t("zakiSettingsSheet.sections.autonomy.title")}
                    summary={
                      !telegramConnected
                        ? t("zakiSettingsSheet.autonomy.heartbeatRequiresTelegram")
                        : heartbeatEnabled
                        ? t("zakiSettingsSheet.sections.autonomy.summaryEnabled")
                        : t("zakiSettingsSheet.sections.autonomy.summaryDisabled")
                    }
                    isRtl={isRtl}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-3">
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

          {!loading ? null : (
            <div className="mt-4 flex items-center gap-2 rounded-zaki-xl border border-zaki bg-zaki-raised px-4 py-3 text-sm text-zaki-secondary dark:bg-[#1a1714] dark:text-zaki-dark-subtle">
              <span className="inline-block size-2 animate-pulse rounded-full bg-zaki-brand" />
              {t("zakiSettingsSheet.loading.state")}
            </div>
          )}
        </div>
      </div>
    </SheetShell>
  );
}
