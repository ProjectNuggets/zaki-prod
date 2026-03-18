import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, Brain, Sparkles, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  connectBotTelegram,
  disconnectBotTelegram,
  fetchBotOnboarding,
  fetchBotSettings,
  fetchBotUsage,
  provisionBot,
  updateBotOnboarding,
  updateBotSettings,
  type BotErrorCode,
  type BotOnboardingSetup,
  type BotOnboardingState,
  type BotSettingsPatch,
  type BotSettingsProfile,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type BannerState =
  | { tone: "success"; text: string }
  | { tone: "error"; text: string }
  | null;

type SectionValue = "core" | "workspace";
type OpenSectionValue = SectionValue | "";
type ChannelValue = "telegram" | "slack" | "discord" | null;

type SettingsDraft = {
  assistant_mode: "fast" | "balanced" | "deep";
  group_activation: "mention" | "always";
  proactive_updates: boolean;
  voice_replies: boolean;
  session_timeout_minutes: string;
};

const DEFAULT_SETTINGS: SettingsDraft = {
  assistant_mode: "balanced",
  group_activation: "mention",
  proactive_updates: true,
  voice_replies: false,
  session_timeout_minutes: "30",
};

const FALLBACK_CHANNEL_STEPS = {
  slack: [
    "Open your Slack workspace admin apps page.",
    "Add the ZAKI Slack app when it is available to your workspace.",
    "Complete authorization to let ZAKI receive mentions and send replies.",
  ],
  discord: [
    "Open your Discord server settings and app integrations.",
    "Invite the ZAKI app to the target server.",
    "Grant message and channel permissions so ZAKI can respond when enabled.",
  ],
} as const;

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

function getBotErrorMessage(payload: unknown) {
  return asString(asRecord(payload).message).toLowerCase();
}

function formatCompletedAt(value?: number | null, fallback?: string) {
  if (!value) return fallback || "Not completed yet";
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? fallback || "Not completed yet" : date.toLocaleString();
}

function getSetupSummary(setup: BotOnboardingSetup | null | undefined) {
  const source = asRecord(setup);
  return (
    asString(source.summary) ||
    asString(asRecord(source.guidance).summary) ||
    asString(source.description) ||
    asString(asRecord(source.onboarding).summary)
  );
}

function getChannelSetup(
  setup: BotOnboardingSetup | null | undefined,
  channel: "telegram" | "slack" | "discord"
) {
  const source = asRecord(setup);
  const channels = asRecord(source.channels);
  return asRecord(channels[channel] ?? source[channel]);
}

function getChannelStatus(setup: Record<string, unknown>) {
  return asString(setup.status) || asString(setup.connection_status) || asString(setup.state);
}

function getChannelMeta(setup: Record<string, unknown>) {
  return (
    asString(setup.bot_username) ||
    asString(setup.username) ||
    asString(setup.workspace_name) ||
    asString(setup.workspace) ||
    asString(setup.server_name) ||
    asString(setup.server)
  );
}

function getInstructionSteps(setup: Record<string, unknown>, fallback: string[]) {
  const candidates = [
    asStringArray(setup.instructions),
    asStringArray(setup.steps),
    asStringArray(setup.connect_steps),
    asStringArray(setup.how_to_connect),
  ];
  const steps = candidates.find((candidate) => candidate.length > 0) ?? [];
  return steps.length > 0 ? steps : fallback;
}

function getStatusTone(status: string) {
  if (status === "connected" || status === "active" || status === "normal") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "needs_setup" || status === "pending" || status === "warmup") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200";
  }
  if (status === "disconnected" || status === "error" || status === "throttled") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200";
  }
  return "border-zaki-subtle bg-white text-zaki-secondary dark:border-[#2d2219] dark:bg-[#17110d] dark:text-zaki-dark-subtle";
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
        "group rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 transition-colors dark:border-[#2b2119] dark:bg-[#17120f]",
        disabled && "bg-[#fcf8f3] dark:bg-[#15110e]"
      )}
    >
      <div className={cn("flex flex-col gap-3 sm:items-start sm:justify-between", isRtl ? "sm:flex-row-reverse" : "sm:flex-row")}>
        <div className={cn("min-w-0 flex-1", disabled && "opacity-75", isRtl && "text-right")}>
          <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {title}
          </div>
          <div className="mt-1 truncate text-xs text-zaki-secondary dark:text-zaki-dark-subtle">
            {summary}
          </div>
          {helper ? (
            <p className="mt-2 max-h-0 overflow-hidden text-xs leading-5 text-zaki-muted opacity-0 transition-all duration-200 group-hover:max-h-20 group-hover:opacity-100 group-focus-within:max-h-20 group-focus-within:opacity-100 dark:text-zaki-dark-muted">
              {helper}
            </p>
          ) : null}
        </div>
        {control ? <div className={cn("w-full shrink-0 sm:w-[220px]", disabled && "opacity-80")}>{control}</div> : null}
      </div>
      {children ? <div className="mt-3 border-t border-[#e6d8c8] pt-3 dark:border-[#2b2119]">{children}</div> : null}
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
    <div className={cn("flex min-w-0 items-start gap-3", isRtl && "flex-row-reverse text-right")}>
      <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-full bg-[#f6efe6] text-zaki-brand dark:bg-[#221913]">
        <Icon className="size-4" />
      </div>
      <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
        <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {title}
        </div>
        <div className="mt-1 truncate text-xs text-zaki-muted dark:text-zaki-dark-muted">
          {summary}
        </div>
      </div>
    </div>
  );
}

export function ZakiSettingsSheet({ isOpen, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [onboarding, setOnboarding] = useState<BotOnboardingState | null>(null);
  const [settings, setSettings] = useState<BotSettingsProfile | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(DEFAULT_SETTINGS);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramWebhookUrl, setTelegramWebhookUrl] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [openSection, setOpenSection] = useState<OpenSectionValue>("");
  const [expandedChannel, setExpandedChannel] = useState<ChannelValue>(null);
  const nullalisSettingsLocked = true;

  const setup = useMemo(
    () => (onboarding?.setup && typeof onboarding.setup === "object" ? onboarding.setup : null),
    [onboarding]
  );
  const telegramSetup = useMemo(() => getChannelSetup(setup, "telegram"), [setup]);
  const slackSetup = useMemo(() => getChannelSetup(setup, "slack"), [setup]);
  const discordSetup = useMemo(() => getChannelSetup(setup, "discord"), [setup]);
  const telegramStatus = getChannelStatus(telegramSetup);
  const telegramMeta = getChannelMeta(telegramSetup);
  const slackStatus = getChannelStatus(slackSetup);
  const slackMeta = getChannelMeta(slackSetup);
  const discordStatus = getChannelStatus(discordSetup);
  const discordMeta = getChannelMeta(discordSetup);
  const onboardingSummary = getSetupSummary(setup);

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
  const connectedChannelsCount = [telegramStatus, slackStatus, discordStatus].filter(
    (status) => status === "connected"
  ).length;
  const headerSummary = onboarding?.completed
    ? t("zakiSettingsSheet.header.readySummary", {
        mode: responseStyleLabel,
        join: joinBehaviorLabel,
      })
    : t("zakiSettingsSheet.header.setupSummary");
  const setupStatusLabel = onboarding?.completed
    ? t("zakiSettingsSheet.summary.ready")
    : t("zakiSettingsSheet.summary.setupInProgress");
  const setupDateLabel = formatCompletedAt(
    onboarding?.completed_at_s ?? null,
    t("zakiSettingsSheet.workspace.setupNotCompleted")
  );
  const getBotLoadErrorText = (payload: unknown, fallbackKey: string) => {
    if (getBotErrorMessage(payload) === "unknown_user_id") {
      return t("zakiSettingsSheet.errors.botStateUnavailableUnknownUser");
    }

    const code = getBotErrorCode(payload);
    if (
      code === "temporary_contention" ||
      code === "unauthorized" ||
      code === "forbidden" ||
      code === "provision_failed" ||
      code === "settings_update_failed"
    ) {
      return t("zakiSettingsSheet.errors.botStateUnavailable");
    }

    return t(fallbackKey);
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadBotSpace() {
      setLoading(true);
      setBanner(null);

      const [onboardingResult, settingsResult, usageResult] = await Promise.allSettled([
        fetchBotOnboarding(),
        fetchBotSettings(),
        fetchBotUsage(),
      ]);

      if (!active) return;

      if (onboardingResult.status === "fulfilled") {
        const { response, data } = onboardingResult.value;
        if (response.ok) {
          setOnboarding(data);
        } else {
          setBanner({
            tone: "error",
            text: getBotLoadErrorText(data, "zakiSettingsSheet.errors.onboardingLoad"),
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
          setBanner({
            tone: "error",
            text: getBotLoadErrorText(data, "zakiSettingsSheet.errors.settingsLoad"),
          });
          setSettings(null);
        }
      } else {
        setBanner({ tone: "error", text: t("zakiSettingsSheet.errors.settingsLoad") });
        setSettings(null);
      }

      if (usageResult.status === "fulfilled") {
        void usageResult.value;
      } else {
        void usageResult.reason;
      }

      setLoading(false);
    }

    void loadBotSpace();

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setTelegramToken("");
    setTelegramWebhookUrl("");
    setOpenSection("");
    setExpandedChannel(null);
  }, [isOpen]);

  const handleSaveBotSettings = async () => {
    setSavingSettings(true);
    setBanner(null);
    const parsedTimeout = Number.parseInt(settingsDraft.session_timeout_minutes, 10);
    if (!Number.isInteger(parsedTimeout) || parsedTimeout < 5 || parsedTimeout > 180) {
      setSavingSettings(false);
      setBanner({
        tone: "error",
        text: t("zakiSettingsSheet.errors.sessionTimeoutRange"),
      });
      return false;
    }

    const payload: BotSettingsPatch = {
      assistant_mode: settingsDraft.assistant_mode,
      group_activation: settingsDraft.group_activation,
      proactive_updates: settingsDraft.proactive_updates,
      voice_replies: settingsDraft.voice_replies,
      session_timeout_minutes: parsedTimeout,
    };
    const { response, data } = await updateBotSettings(payload);
    setSavingSettings(false);
    if (!response.ok) {
      setBanner({
        tone: "error",
        text: getBotErrorText(data, "Unable to save ZAKI settings."),
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

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        hideCloseButton
        dir={isRtl ? "rtl" : "ltr"}
        className="w-full max-w-[100vw] gap-0 border-l border-[#eadcca] bg-[#f6f1ea] p-0 text-zaki-primary sm:max-w-[720px] dark:border-[#2b2119] dark:bg-[#120e0b] dark:text-zaki-dark-primary"
      >
        <div className="relative flex h-full flex-col">
          <div className="sticky top-0 z-20 border-b border-[#e7d8c6] bg-[#f6f1ea]/96 px-5 py-4 backdrop-blur dark:border-[#2b2119] dark:bg-[#120e0b]/95">
            <div className={cn("flex items-start justify-between gap-4", isRtl && "flex-row-reverse")}>
              <div className={cn("min-w-0", isRtl && "text-right")}>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d8c8] bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2d231b] dark:bg-[#1a140f] dark:text-zaki-dark-muted">
                  <Sparkles className="size-3.5 text-zaki-brand" />
                  {t("zakiSettingsSheet.badge")}
                </div>
                <SheetTitle className="mt-3 text-2xl font-semibold tracking-tight text-zaki-primary dark:text-zaki-dark-primary">
                  {t("zakiSettingsSheet.title")}
                </SheetTitle>
                <SheetDescription className="mt-2 max-w-[42ch] text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                  {headerSummary}
                </SheetDescription>
              </div>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#e6d8c8] bg-white/88 text-zaki-muted transition-colors hover:bg-[#f0e8de] hover:text-zaki-primary dark:border-[#2d231b] dark:bg-[#18120d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
                onClick={onClose}
                aria-label={t("zakiSettingsSheet.closeAria")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#e6d8c8] bg-white/70 px-3 py-1 text-xs text-zaki-secondary dark:border-[#2d231b] dark:bg-[#17110d] dark:text-zaki-dark-subtle">
                {setupStatusLabel}
              </span>
              <span className="rounded-full border border-[#e6d8c8] bg-white/70 px-3 py-1 text-xs text-zaki-secondary dark:border-[#2d231b] dark:bg-[#17110d] dark:text-zaki-dark-subtle">
                {responseStyleLabel}
              </span>
            </div>

            {banner ? (
              <div
                className={cn(
                  "mt-4 rounded-2xl border px-4 py-3 text-sm",
                  banner.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
                )}
              >
                {banner.text}
              </div>
            ) : null}
          </div>

          <div className="relative flex-1 overflow-y-auto px-5 py-5">
            <div className="mb-4 rounded-2xl border border-[#e3d4c4] bg-[#fbf6ef] px-4 py-3 dark:border-[#2b2119] dark:bg-[#15110e]">
              <p className={cn("text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary", isRtl && "text-right")}>
                {t("zakiSettingsSheet.locked.title")}
              </p>
              <p className={cn("mt-1 text-xs leading-5 text-zaki-secondary dark:text-zaki-dark-subtle", isRtl && "text-right")}>
                {t("zakiSettingsSheet.locked.note")}
              </p>
            </div>
            <Accordion
              type="single"
              collapsible
              value={openSection}
              onValueChange={(value) => setOpenSection((value as OpenSectionValue) || "")}
              className="space-y-0"
            >
              <AccordionItem
                value="core"
                className="border-b border-[#e6d8c8] px-0 dark:border-[#2b2119]"
              >
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Volume2}
                    title={t("zakiSettingsSheet.sections.core.title")}
                    summary={t("zakiSettingsSheet.sections.core.summary", {
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
                      disabled={nullalisSettingsLocked}
                      control={
                        <select
                          aria-label={t("zakiSettingsSheet.fields.responseStyle.title")}
                          className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus disabled:cursor-not-allowed disabled:bg-[#f6efe6] disabled:text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary dark:disabled:bg-[#181310]"
                          value={settingsDraft.assistant_mode}
                          disabled={nullalisSettingsLocked}
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
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.joinBehavior.title")}
                      summary={joinBehaviorLabel}
                      helper={t("zakiSettingsSheet.fields.joinBehavior.helper")}
                      isRtl={isRtl}
                      disabled={nullalisSettingsLocked}
                      control={
                        <select
                          aria-label={t("zakiSettingsSheet.fields.joinBehavior.title")}
                          className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus disabled:cursor-not-allowed disabled:bg-[#f6efe6] disabled:text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary dark:disabled:bg-[#181310]"
                          value={settingsDraft.group_activation}
                          disabled={nullalisSettingsLocked}
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
                      disabled={nullalisSettingsLocked}
                      control={
                        <label className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-subtle bg-white px-3 py-2 dark:border-[#2a2018] dark:bg-[#14100d]">
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
                            disabled={nullalisSettingsLocked}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({
                                ...current,
                                proactive_updates: event.target.checked,
                              }))
                            }
                          />
                        </label>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.voiceReplies.title")}
                      summary={t(
                        settingsDraft.voice_replies
                          ? "zakiSettingsSheet.status.enabled"
                          : "zakiSettingsSheet.status.disabled"
                      )}
                      helper={t("zakiSettingsSheet.fields.voiceReplies.helper")}
                      isRtl={isRtl}
                      disabled={nullalisSettingsLocked}
                      control={
                        <label className="flex items-center justify-between gap-3 rounded-zaki-md border border-zaki-subtle bg-white px-3 py-2 dark:border-[#2a2018] dark:bg-[#14100d]">
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
                            disabled={nullalisSettingsLocked}
                            onChange={(event) =>
                              setSettingsDraft((current) => ({
                                ...current,
                                voice_replies: event.target.checked,
                              }))
                            }
                          />
                        </label>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.fields.sessionWindow.title")}
                      summary={t("zakiSettingsSheet.fields.sessionWindow.summary", {
                        minutes: settingsDraft.session_timeout_minutes || DEFAULT_SETTINGS.session_timeout_minutes,
                      })}
                      helper={t("zakiSettingsSheet.fields.sessionWindow.helper")}
                      isRtl={isRtl}
                      disabled={nullalisSettingsLocked}
                      control={
                        <input
                          aria-label={t("zakiSettingsSheet.fields.sessionWindow.title")}
                          type="number"
                          min={5}
                          max={180}
                          className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus disabled:cursor-not-allowed disabled:bg-[#f6efe6] disabled:text-zaki-muted dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary dark:disabled:bg-[#181310]"
                          value={settingsDraft.session_timeout_minutes}
                          disabled={nullalisSettingsLocked}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({
                              ...current,
                              session_timeout_minutes: event.target.value,
                            }))
                          }
                        />
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="workspace"
                className="border-b border-[#e6d8c8] px-0 dark:border-[#2b2119]"
              >
                <AccordionTrigger className="py-5 no-underline hover:no-underline">
                  <SectionBadge
                    icon={Brain}
                    title={t("zakiSettingsSheet.sections.workspace.title")}
                    summary={t("zakiSettingsSheet.sections.workspace.summary", {
                      connected: connectedChannelsCount,
                      total: 3,
                    })}
                    isRtl={isRtl}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-3">
                    <CompactRow
                      title={t("zakiSettingsSheet.workspace.memoryTitle")}
                      summary={t("zakiSettingsSheet.workspace.memorySummary")}
                      helper={t("zakiSettingsSheet.workspace.memoryHelper")}
                      isRtl={isRtl}
                      control={
                        <div className={cn("flex flex-col gap-2", isRtl ? "sm:items-start" : "sm:items-end")}>
                          <button
                            type="button"
                            className="zaki-btn-sm zaki-btn-secondary"
                            onClick={() => {
                              onClose();
                              window.dispatchEvent(new Event("zaki:open-memory"));
                            }}
                          >
                            {t("zakiSettingsSheet.workspace.reviewMemory")}
                          </button>
                          <button
                            type="button"
                            className="zaki-btn-sm zaki-btn-secondary"
                            onClick={() => {
                              onClose();
                              navigate("/help");
                            }}
                          >
                            {t("zakiSettingsSheet.workspace.openHelp")}
                          </button>
                        </div>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.workspace.setupTitle")}
                      summary={
                        loading && !onboarding
                          ? t("zakiSettingsSheet.loading.onboarding")
                          : onboardingSummary || setupDateLabel
                      }
                      helper={t("zakiSettingsSheet.workspace.setupHelper", {
                        status: setupStatusLabel,
                        updated: setupDateLabel,
                      })}
                      isRtl={isRtl}
                      control={
                        <div className={cn("flex flex-col gap-2", isRtl ? "sm:items-start" : "sm:items-end")}>
                          <button
                            type="button"
                            disabled={savingOnboarding}
                            className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                            onClick={async () => {
                              setSavingOnboarding(true);
                              setBanner(null);
                              const { response, data } = await provisionBot();
                              setSavingOnboarding(false);
                              if (!response.ok) {
                                setBanner({
                                  tone: "error",
                                  text: getBotErrorText(data, "Unable to provision ZAKI."),
                                });
                                return;
                              }
                              const onboardingResult = await fetchBotOnboarding();
                              if (onboardingResult.response.ok) {
                                setOnboarding(onboardingResult.data);
                              }
                              setBanner({
                                tone: "success",
                                text: t("zakiSettingsSheet.success.provisioned"),
                              });
                            }}
                          >
                            {savingOnboarding
                              ? t("zakiSettingsSheet.actions.provisioning")
                              : t("zakiSettingsSheet.actions.provision")}
                          </button>
                          <button
                            type="button"
                            disabled={savingOnboarding}
                            className="zaki-btn-sm zaki-btn-secondary disabled:opacity-60"
                            onClick={async () => {
                              setSavingOnboarding(true);
                              setBanner(null);
                              const nextCompleted = !Boolean(onboarding?.completed);
                              const { response, data } = await updateBotOnboarding({
                                completed: nextCompleted,
                              });
                              setSavingOnboarding(false);
                              if (!response.ok) {
                                setBanner({
                                  tone: "error",
                                  text: getBotErrorText(data, "Unable to update onboarding state."),
                                });
                                return;
                              }
                              setOnboarding(data);
                              setBanner({
                                tone: "success",
                                text: nextCompleted
                                  ? t("zakiSettingsSheet.success.onboardingComplete")
                                  : t("zakiSettingsSheet.success.onboardingReopened"),
                              });
                            }}
                          >
                            {onboarding?.completed
                              ? t("zakiSettingsSheet.actions.markIncomplete")
                              : t("zakiSettingsSheet.actions.markComplete")}
                          </button>
                        </div>
                      }
                    />

                    <CompactRow
                      title={t("zakiSettingsSheet.workspace.channelsTitle")}
                      summary={t("zakiSettingsSheet.workspace.channelsSummaryLine", {
                        connected: connectedChannelsCount,
                        total: 3,
                      })}
                      helper={t("zakiSettingsSheet.locked.note")}
                      isRtl={isRtl}
                      disabled={nullalisSettingsLocked}
                    >
                      <div className="space-y-3">
                        {([
                          {
                            key: "telegram",
                            title: "Telegram",
                            status: telegramStatus,
                            meta: telegramMeta,
                            steps: [] as string[],
                          },
                          {
                            key: "slack",
                            title: "Slack",
                            status: slackStatus,
                            meta: slackMeta,
                            steps: getInstructionSteps(slackSetup, [...FALLBACK_CHANNEL_STEPS.slack]),
                          },
                          {
                            key: "discord",
                            title: "Discord",
                            status: discordStatus,
                            meta: discordMeta,
                            steps: getInstructionSteps(discordSetup, [...FALLBACK_CHANNEL_STEPS.discord]),
                          },
                        ] as const).map((channel) => {
                          const statusKey =
                            channel.status === "connected"
                              ? "connected"
                              : channel.status
                                ? "needsSetup"
                                : "notConnected";
                          const expanded = expandedChannel === channel.key;

                          return (
                            <div
                              key={channel.key}
                              className="rounded-2xl border border-[#e1d4c6] bg-white px-4 py-3 dark:border-[#2b2119] dark:bg-[#17120f]"
                            >
                              <div className={cn("flex flex-col gap-3 sm:items-center sm:justify-between", isRtl ? "sm:flex-row-reverse" : "sm:flex-row")}>
                                <div className={cn("min-w-0", isRtl && "text-right")}>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                                      {channel.title}
                                    </h4>
                                    <span
                                      className={cn(
                                        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                        getStatusTone(channel.status || statusKey)
                                      )}
                                    >
                                      {t(`zakiSettingsSheet.workspace.channelStatus.${statusKey}`)}
                                    </span>
                                  </div>
                                  <p className="mt-1 truncate text-xs text-zaki-muted dark:text-zaki-dark-muted">
                                    {channel.meta ||
                                      t(`zakiSettingsSheet.workspace.channelDescriptions.${channel.key}`)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="zaki-btn-sm zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={nullalisSettingsLocked}
                                  onClick={() =>
                                    setExpandedChannel((current) =>
                                      current === channel.key ? null : channel.key
                                    )
                                  }
                                >
                                  {nullalisSettingsLocked
                                    ? t("zakiSettingsSheet.actions.comingSoon")
                                    : expanded
                                      ? t("zakiSettingsSheet.actions.hide")
                                      : t("zakiSettingsSheet.actions.manage")}
                                </button>
                              </div>

                              {expanded && !nullalisSettingsLocked ? (
                                channel.key === "telegram" ? (
                                  <div className="mt-3 grid gap-3 border-t border-[#e6d8c8] pt-3 dark:border-[#2b2119]">
                                    <input
                                      className="w-full rounded-2xl border border-[#ddd0c1] bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand dark:border-[#2b2119] dark:bg-[#120e0b] dark:text-zaki-dark-primary"
                                      placeholder={t("zakiSettingsSheet.workspace.telegramToken")}
                                      value={telegramToken}
                                      onChange={(event) => setTelegramToken(event.target.value)}
                                    />
                                    <input
                                      className="w-full rounded-2xl border border-[#ddd0c1] bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand dark:border-[#2b2119] dark:bg-[#120e0b] dark:text-zaki-dark-primary"
                                      placeholder={t("zakiSettingsSheet.workspace.telegramWebhook")}
                                      value={telegramWebhookUrl}
                                      onChange={(event) => setTelegramWebhookUrl(event.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={telegramBusy}
                                        className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                                        onClick={async () => {
                                          setBanner(null);
                                          const botToken = telegramToken.trim();
                                          if (!botToken) {
                                            setBanner({
                                              tone: "error",
                                              text: t("zakiSettingsSheet.errors.telegramTokenRequired"),
                                            });
                                            return;
                                          }
                                          const payload: Parameters<typeof connectBotTelegram>[0] = {
                                            bot_token: botToken,
                                          };
                                          const webhookUrl = telegramWebhookUrl.trim();
                                          if (webhookUrl) payload.webhook_url = webhookUrl;
                                          setTelegramBusy(true);
                                          const { response, data } = await connectBotTelegram(payload);
                                          setTelegramBusy(false);
                                          if (!response.ok) {
                                            setBanner({
                                              tone: "error",
                                              text: getBotErrorText(data, "Unable to connect Telegram."),
                                            });
                                            return;
                                          }
                                          setBanner({
                                            tone: "success",
                                            text: t("zakiSettingsSheet.success.telegramConnected"),
                                          });
                                          const onboardingResult = await fetchBotOnboarding();
                                          if (onboardingResult.response.ok) {
                                            setOnboarding(onboardingResult.data);
                                          }
                                        }}
                                      >
                                        {telegramBusy
                                          ? t("zakiSettingsSheet.actions.connecting")
                                          : t("zakiSettingsSheet.actions.connectTelegram")}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={telegramBusy}
                                        className="zaki-btn-sm zaki-btn-secondary disabled:opacity-60"
                                        onClick={async () => {
                                          setTelegramBusy(true);
                                          const { response, data } = await disconnectBotTelegram();
                                          setTelegramBusy(false);
                                          if (!response.ok) {
                                            setBanner({
                                              tone: "error",
                                              text: getBotErrorText(data, "Unable to disconnect Telegram."),
                                            });
                                            return;
                                          }
                                          setBanner({
                                            tone: "success",
                                            text: t("zakiSettingsSheet.success.telegramDisconnected"),
                                          });
                                          const onboardingResult = await fetchBotOnboarding();
                                          if (onboardingResult.response.ok) {
                                            setOnboarding(onboardingResult.data);
                                          }
                                        }}
                                      >
                                        {t("zakiSettingsSheet.actions.disconnect")}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <ol className={cn("mt-3 space-y-2 border-t border-[#e6d8c8] pt-3 text-xs leading-5 text-zaki-secondary dark:border-[#2b2119] dark:text-zaki-dark-subtle", isRtl && "text-right")}>
                                    {channel.steps.map((step) => (
                                      <li key={step} className={cn("flex gap-2", isRtl && "flex-row-reverse")}>
                                        <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-zaki-brand" />
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </CompactRow>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-[#e7d8c6] bg-[#f6f1ea]/96 px-5 py-4 backdrop-blur dark:border-[#2b2119] dark:bg-[#120e0b]/95">
            <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
              {settingsDirty ? (
                <span className={cn("rounded-full border border-zaki-brand/20 bg-zaki-brand/10 px-2.5 py-1 text-[11px] font-semibold text-zaki-brand", isRtl ? "ms-auto" : "me-auto")}>
                  {t("zakiSettingsSheet.footer.unsaved")}
                </span>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="zaki-btn zaki-btn-secondary" onClick={onClose}>
                  {t("settingsModal.footer.cancel")}
                </button>
                <button
                  type="button"
                  className="zaki-btn zaki-btn-primary disabled:opacity-60"
                  onClick={() => {
                    void handleSaveBotSettings().then((okay) => {
                      if (okay) onClose();
                    });
                  }}
                  disabled={savingSettings || !settingsDirty}
                >
                  {savingSettings
                    ? t("zakiSettingsSheet.footer.saving")
                    : t("settingsModal.footer.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
