import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Link2,
  Settings2,
  X,
} from "lucide-react";
import { ModalShell } from "@/app/components/ui/ModalShell";
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
  type BotUsageSummary,
} from "@/lib/api";
import { useAuthStore } from "@/stores";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type BannerState =
  | { tone: "success"; text: string }
  | { tone: "error"; text: string }
  | null;

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

const TELEGRAM_CONFIRMATION_DELAYS_MS = [0, 300, 1000, 2000];

const FALLBACK_CHANNEL_STEPS = {
  slack: [
    "Open your Slack workspace admin apps page.",
    "Add the ZAKI Slack app when it is available to your workspace.",
    "Complete authorization to let ZAKI BOT receive mentions and send replies.",
  ],
  discord: [
    "Open your Discord server settings and app integrations.",
    "Invite the ZAKI BOT app to the target server.",
    "Grant message and channel permissions so ZAKI BOT can respond when enabled.",
  ],
};

const ERROR_COPY: Record<BotErrorCode, string> = {
  temporary_contention: "ZAKI BOT is busy on another node. Retry shortly.",
  unauthorized: "Sign in again to manage your ZAKI BOT space.",
  forbidden: "This ZAKI BOT action is not available for your account.",
  invalid_telegram_token: "The Telegram token is invalid. Check it and try again.",
  provision_failed: "We could not provision your ZAKI BOT space right now.",
  settings_update_failed: "We could not save your ZAKI BOT settings.",
  usage_unavailable: "Usage is temporarily unavailable.",
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

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

function getErrorText(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const stableText = getBotErrorText(payload, "");
  return stableText || asString(record.message) || asString(record.error) || fallback;
}

function formatCompletedAt(value?: number | null) {
  if (!value) return "Not completed yet";
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? "Not completed yet" : date.toLocaleString();
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
  return (
    asString(setup.status) ||
    asString(setup.connection_status) ||
    asString(setup.state)
  );
}

function getTelegramConnected(status: string) {
  return status === "connected" || status === "active" || status === "normal";
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

function getInstructionSteps(
  setup: Record<string, unknown>,
  fallback: string[]
) {
  const candidates = [
    asStringArray(setup.instructions),
    asStringArray(setup.steps),
    asStringArray(setup.connect_steps),
    asStringArray(setup.how_to_connect),
  ];
  const steps = candidates.find((candidate) => candidate.length > 0) ?? [];
  return steps.length > 0 ? steps : fallback;
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Bot;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-zaki-subtle bg-white px-5 py-5 shadow-[0px_14px_32px_rgba(15,15,15,0.06)] dark:border-[#2e241b] dark:bg-[#16110d]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl border border-zaki-subtle bg-zaki-base p-2.5 dark:border-[#2e241b] dark:bg-[#1d1611]">
          <Icon className="size-4 text-zaki-brand" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProductField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChannelInstructionCard({
  title,
  status,
  meta,
  steps,
}: {
  title: string;
  status?: string;
  meta?: string;
  steps: string[];
}) {
  return (
    <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
          {title}
        </h4>
        {status ? (
          <span className="rounded-full border border-zaki-subtle bg-white px-2.5 py-0.5 text-[11px] font-medium text-zaki-secondary dark:border-[#3a2b1f] dark:bg-[#20160f] dark:text-[#e9d3bf]">
            {status}
          </span>
        ) : null}
      </div>
      {meta ? (
        <p className="mt-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">{meta}</p>
      ) : null}
      <ol className="mt-3 space-y-2 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
        {steps.map((step) => (
          <li key={step} className="flex gap-2">
            <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-zaki-brand" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ZakiBotControlPanel({ isOpen, onClose }: Props) {
  const authLoading = useAuthStore((state) => state.isLoading);
  const authUser = useAuthStore((state) => state.user);
  const isAuthReady = !authLoading && Boolean(authUser);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [onboarding, setOnboarding] = useState<BotOnboardingState | null>(null);
  const [settings, setSettings] = useState<BotSettingsProfile | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(DEFAULT_SETTINGS);
  const [usage, setUsage] = useState<BotUsageSummary | null>(null);
  const [usageUnavailable, setUsageUnavailable] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramBusy, setTelegramBusy] = useState(false);

  const setup = useMemo(
    () => (onboarding?.setup && typeof onboarding.setup === "object" ? onboarding.setup : null),
    [onboarding]
  );
  const telegramSetup = useMemo(() => getChannelSetup(setup, "telegram"), [setup]);
  const slackSetup = useMemo(() => getChannelSetup(setup, "slack"), [setup]);
  const discordSetup = useMemo(() => getChannelSetup(setup, "discord"), [setup]);
  const telegramStatus = getChannelStatus(telegramSetup);

  useEffect(() => {
    if (!isOpen) return;
    if (!isAuthReady) {
      setLoading(true);
      return;
    }
    let active = true;

    async function loadBotSpace() {
      setLoading(true);
      setBanner(null);
      setUsageUnavailable(false);

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
            text: getBotErrorText(data, "Unable to load ZAKI BOT onboarding."),
          });
          setOnboarding(null);
        }
      } else {
        setBanner({ tone: "error", text: "Unable to load ZAKI BOT onboarding." });
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
            text: getBotErrorText(data, "Unable to load ZAKI BOT settings."),
          });
          setSettings(null);
        }
      } else {
        setBanner({ tone: "error", text: "Unable to load ZAKI BOT settings." });
        setSettings(null);
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

      setLoading(false);
    }

    void loadBotSpace();

    return () => {
      active = false;
    };
  }, [isAuthReady, isOpen]);

  if (!isOpen) return null;

  const settingsDirty =
    settingsDraft.assistant_mode !== (settings?.assistant_mode ?? DEFAULT_SETTINGS.assistant_mode) ||
    settingsDraft.group_activation !== (settings?.group_activation ?? DEFAULT_SETTINGS.group_activation) ||
    settingsDraft.proactive_updates !== Boolean(settings?.proactive_updates ?? DEFAULT_SETTINGS.proactive_updates) ||
    settingsDraft.voice_replies !== Boolean(settings?.voice_replies ?? DEFAULT_SETTINGS.voice_replies) ||
    settingsDraft.session_timeout_minutes !==
      String(settings?.session_timeout_minutes ?? DEFAULT_SETTINGS.session_timeout_minutes);

  const onboardingSummary = getSetupSummary(setup);
  const telegramMeta = getChannelMeta(telegramSetup);
  const slackMeta = getChannelMeta(slackSetup);
  const discordMeta = getChannelMeta(discordSetup);
  const refreshTelegramStatus = async (
    targetState: "connected" | "disconnected",
    enablePolling = false
  ) => {
    const readState = async () => {
      const onboardingResult = await fetchBotOnboarding();
      if (onboardingResult.response.ok) {
        setOnboarding(onboardingResult.data);
      }
      const confirmedConnected = onboardingResult.response.ok
        ? getTelegramConnected(
            getChannelStatus(getChannelSetup(onboardingResult.data.setup, "telegram"))
          )
        : false;
      return { onboardingResult, confirmedConnected };
    };

    let latestResult = await readState();
    const targetReached =
      targetState === "connected" ? latestResult.confirmedConnected : !latestResult.confirmedConnected;
    if (targetReached || !enablePolling) {
      return latestResult;
    }

    for (const delay of TELEGRAM_CONFIRMATION_DELAYS_MS.slice(1)) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      latestResult = await readState();
      const nextTargetReached =
        targetState === "connected" ? latestResult.confirmedConnected : !latestResult.confirmedConnected;
      if (nextTargetReached) {
        return latestResult;
      }
    }

    return latestResult;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="ZAKI BOT space"
      className="w-full max-w-[980px] overflow-hidden rounded-[28px] border border-zaki-subtle bg-[#f8f1e8] dark:border-[#2e241b] dark:bg-[#120e0b]"
    >
      <div className="max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-zaki-subtle bg-[linear-gradient(135deg,#fff7ee_0%,#f6ecdf_65%,#efe5d8_100%)] px-6 py-5 dark:border-[#2e241b] dark:bg-[linear-gradient(140deg,#21170f_0%,#18120d_58%,#120e0b_100%)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2e241b] dark:bg-[#1a140f] dark:text-zaki-dark-muted">
                <Bot className="size-3.5 text-zaki-brand" />
                ZAKI BOT space
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                Personal intelligence settings
              </h2>
              <p className="mt-2 max-w-[62ch] text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                Provision your bot space, tune its product settings, connect channels, and review daily usage without touching raw JSON.
              </p>
            </div>
            <button
              type="button"
              className="zaki-icon-btn size-9"
              onClick={onClose}
              aria-label="Close ZAKI BOT panel"
            >
              <X className="size-4" />
            </button>
          </div>
          {banner ? (
            <div
              className={cn(
                "mt-4 rounded-zaki-lg border px-4 py-3 text-sm",
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              {banner.text}
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <SectionCard
              icon={Bot}
              title="Onboarding"
              description="Provision the space, verify your current setup state, and complete the first-run flow."
            >
              {loading && !onboarding ? (
                <p className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">Loading onboarding…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        onboarding?.completed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {onboarding?.completed ? "Completed" : "Needs setup"}
                    </span>
                    <span className="text-sm text-zaki-muted dark:text-zaki-dark-muted">
                      {formatCompletedAt(onboarding?.completed_at_s ?? null)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={savingOnboarding}
                      className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={async () => {
                        setSavingOnboarding(true);
                        setBanner(null);
                        const { response, data } = await provisionBot();
                        setSavingOnboarding(false);
                        if (!response.ok) {
                          setBanner({
                            tone: "error",
                            text: getBotErrorText(data, "Unable to provision ZAKI BOT."),
                          });
                          return;
                        }
                        const onboardingResult = await fetchBotOnboarding();
                        if (onboardingResult.response.ok) {
                          setOnboarding(onboardingResult.data);
                        }
                        setBanner({ tone: "success", text: "ZAKI BOT space provisioned." });
                      }}
                    >
                      {savingOnboarding ? "Provisioning…" : "Provision ZAKI BOT"}
                    </button>
                    <button
                      type="button"
                      disabled={savingOnboarding}
                      className="zaki-btn zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
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
                            ? "Onboarding marked complete."
                            : "Onboarding reopened for further setup.",
                        });
                      }}
                    >
                      {onboarding?.completed ? "Mark as incomplete" : "Mark as complete"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
                    <h4 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                      Setup summary
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                      {onboardingSummary ||
                        "Provisioning unlocks your bot space. As channel setup metadata becomes available, it will appear here without exposing internal runtime details."}
                    </p>
                    {setup ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          ["Telegram", getChannelStatus(telegramSetup)],
                          ["Slack", getChannelStatus(slackSetup)],
                          ["Discord", getChannelStatus(discordSetup)],
                        ]
                          .filter(([, status]) => Boolean(status))
                          .map(([label, status]) => (
                            <span
                              key={label}
                              className="rounded-full border border-zaki-subtle bg-white px-3 py-1 text-xs text-zaki-secondary dark:border-[#2e241b] dark:bg-[#120e0b] dark:text-zaki-dark-subtle"
                            >
                              {label}: {status}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </SectionCard>

            <SectionCard
              icon={Settings2}
              title="Settings"
              description="These product settings shape how ZAKI BOT behaves across sessions and channels."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ProductField label="Assistant mode">
                  <select
                    className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary"
                    value={settingsDraft.assistant_mode}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        assistant_mode: event.target.value as SettingsDraft["assistant_mode"],
                      }))
                    }
                  >
                    <option value="fast">Fast</option>
                    <option value="balanced">Balanced</option>
                    <option value="deep">Deep</option>
                  </select>
                </ProductField>
                <ProductField label="Group activation">
                  <select
                    className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary"
                    value={settingsDraft.group_activation}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        group_activation: event.target.value as SettingsDraft["group_activation"],
                      }))
                    }
                  >
                    <option value="mention">Mention only</option>
                    <option value="always">Always active</option>
                  </select>
                </ProductField>
                <ProductField label="Session timeout (minutes)">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary"
                    value={settingsDraft.session_timeout_minutes}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        session_timeout_minutes: event.target.value,
                      }))
                    }
                  />
                </ProductField>
                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-zaki-md border border-zaki-subtle bg-zaki-base/70 px-4 py-3 text-sm text-zaki-primary dark:border-[#2e241b] dark:bg-[#1a140f] dark:text-zaki-dark-primary">
                    <input
                      type="checkbox"
                      checked={settingsDraft.proactive_updates}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          proactive_updates: event.target.checked,
                        }))
                      }
                    />
                    Proactive updates
                  </label>
                  <label className="flex items-center gap-3 rounded-zaki-md border border-zaki-subtle bg-zaki-base/70 px-4 py-3 text-sm text-zaki-primary dark:border-[#2e241b] dark:bg-[#1a140f] dark:text-zaki-dark-primary">
                    <input
                      type="checkbox"
                      checked={settingsDraft.voice_replies}
                      onChange={(event) =>
                        setSettingsDraft((current) => ({
                          ...current,
                          voice_replies: event.target.checked,
                        }))
                      }
                    />
                    Voice replies
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                  Product-level settings only. No raw runtime config is exposed here.
                </p>
                <button
                  type="button"
                  disabled={!settingsDirty || savingSettings}
                  className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={async () => {
                    setSavingSettings(true);
                    setBanner(null);
                    const parsedTimeout = Number.parseInt(
                      settingsDraft.session_timeout_minutes,
                      10
                    );
                    if (!Number.isInteger(parsedTimeout) || parsedTimeout < 5 || parsedTimeout > 180) {
                      setSavingSettings(false);
                      setBanner({
                        tone: "error",
                        text: "Session timeout must be between 5 and 180 minutes.",
                      });
                      return;
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
                        text: getBotErrorText(data, "Unable to save ZAKI BOT settings."),
                      });
                      return;
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
                    setBanner({ tone: "success", text: "ZAKI BOT settings saved." });
                  }}
                >
                  {savingSettings ? "Saving…" : "Save settings"}
                </button>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard
              icon={Link2}
              title="Channels"
              description="Connect Telegram now. Slack and Discord are guided through setup instructions until those channels are ready."
            >
              <div className="space-y-4">
                <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        Telegram
                      </h4>
                      <p className="mt-1 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                        {telegramStatus
                          ? `Current status: ${telegramStatus}${telegramMeta ? ` — ${telegramMeta}` : ""}`
                          : "Connect Telegram so ZAKI BOT can receive and respond through your bot. ZAKI manages webhook routing for you."}
                      </p>
                    </div>
                    {telegramStatus === "connected" ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Connected
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <input
                      className="w-full rounded-zaki-md border border-zaki-strong bg-white px-3 py-2 text-sm text-zaki-primary outline-none focus:border-zaki-focus dark:border-[#2a2018] dark:bg-[#14100d] dark:text-zaki-dark-primary"
                      placeholder="Telegram bot token"
                      value={telegramToken}
                      onChange={(event) => setTelegramToken(event.target.value)}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={telegramBusy}
                      className="zaki-btn zaki-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={async () => {
                        setBanner(null);
                        const botToken = telegramToken.trim();
                        if (!botToken) {
                          setBanner({
                            tone: "error",
                            text: "Enter a Telegram bot token before connecting.",
                          });
                          return;
                        }
                        const payload: Parameters<typeof connectBotTelegram>[0] = {
                          bot_token: botToken,
                        };
                        setTelegramBusy(true);
                        const { response, data } = await connectBotTelegram(payload);
                        if (!response.ok) {
                          setTelegramBusy(false);
                          setBanner({
                            tone: "error",
                            text: getErrorText(data, "Unable to connect Telegram."),
                          });
                          return;
                        }
                        const { confirmedConnected } = await refreshTelegramStatus("connected", true);
                        setTelegramBusy(false);
                        if (confirmedConnected) {
                          setTelegramToken("");
                          setBanner({
                            tone: "success",
                            text: "Telegram connected. Send a message to your bot to confirm routing.",
                          });
                          return;
                        }
                        setBanner({
                          tone: "error",
                          text: "Telegram is still being verified. Refresh in a few seconds if your bot already responds in Telegram.",
                        });
                      }}
                    >
                      {telegramBusy ? "Connecting…" : "Connect Telegram"}
                    </button>
                    <button
                      type="button"
                      disabled={telegramBusy}
                      className="zaki-btn zaki-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={async () => {
                        setTelegramBusy(true);
                        const { response, data } = await disconnectBotTelegram();
                        if (!response.ok) {
                          setTelegramBusy(false);
                          setBanner({
                            tone: "error",
                            text: getErrorText(data, "Unable to disconnect Telegram."),
                          });
                          return;
                        }
                        const { confirmedConnected } = await refreshTelegramStatus("disconnected", true);
                        setTelegramBusy(false);
                        if (!confirmedConnected) {
                          setBanner({ tone: "success", text: "Telegram disconnected." });
                          return;
                        }
                        setBanner({
                          tone: "error",
                          text: "Telegram disconnect is not confirmed yet. Refresh and try again.",
                        });
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <ChannelInstructionCard
                  title="Slack"
                  status={getChannelStatus(slackSetup) || undefined}
                  meta={slackMeta || undefined}
                  steps={getInstructionSteps(slackSetup, FALLBACK_CHANNEL_STEPS.slack)}
                />
                <ChannelInstructionCard
                  title="Discord"
                  status={getChannelStatus(discordSetup) || undefined}
                  meta={discordMeta || undefined}
                  steps={getInstructionSteps(discordSetup, FALLBACK_CHANNEL_STEPS.discord)}
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={Activity}
              title="Usage"
              description="Daily product usage reflects the public ZAKI BOT limits exposed by the BFF."
            >
              {usageUnavailable ? (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  Usage is temporarily unavailable. Your bot space still works, but we could not load the daily usage summary.
                </div>
              ) : usage ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
                    <p className="text-xs uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                      State
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                      {usage.state ?? "unknown"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
                    <p className="text-xs uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                      Requests / day
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                      {usage.requests_day ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 dark:border-[#2e241b] dark:bg-[#1a140f]">
                    <p className="text-xs uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                      Token telemetry
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                      {(usage.tokens_day ?? 0) + (usage.tokens_month ?? 0) === 0 ? "Pending" : "Live"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-zaki-subtle bg-zaki-base/70 px-4 py-4 text-sm text-zaki-secondary dark:border-[#2e241b] dark:bg-[#1a140f] dark:text-zaki-dark-subtle">
                  No usage snapshot is available yet.
                </div>
              )}
            </SectionCard>

            <div className="rounded-[24px] border border-zaki-subtle bg-white px-5 py-5 dark:border-[#2e241b] dark:bg-[#16110d]">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    What stays unchanged
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                    Nullalis stays private. This UI only talks to the ZAKI BFF, and it only exposes product-level state that future clients can reuse unchanged.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
