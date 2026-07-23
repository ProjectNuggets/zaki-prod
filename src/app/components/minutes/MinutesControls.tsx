import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarClock, CircleAlert, Eraser, Link2, RefreshCw, Square, Unplug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import {
  MinutesApiError,
  disconnectCalendar,
  forgetMinutesMeeting,
  getCalendarAutojoin,
  getCalendarConnection,
  getMinutesCaptureStatus,
  getMinutesControl,
  requestMinutesCapture,
  saveCalendarAutojoin,
  saveMinutesConsent,
  startCalendarConnect,
  stopMinutesCapture,
  type CalendarJoinScope,
  type MinutesCaptureResult,
  type MinutesControlRetention,
} from "@/lib/minutesApi";

type MeetingChoice = { id: string; title: string };
type MinutesControlsProps = {
  meetings: MeetingChoice[];
  onForgot?: (meetingId: string) => void;
};

function idempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isDarkLaunchError(error: unknown) {
  return error instanceof MinutesApiError && error.code === "minutes_control_disabled";
}

// The calendar routes 404 when the feature is dark/unconfigured. Like the control
// panel's dark-launch handling, an unavailable calendar card is simply invisible —
// it must never hint at a feature that isn't wired.
function isCalendarUnavailable(error: unknown) {
  return error instanceof MinutesApiError && error.status === 404;
}

function numberField(value: number, update: (value: number) => void, min: number, max: number, label: string) {
  return <label className="grid gap-1 text-xs text-[var(--v2-ink-2)]">
    <span>{label}</span>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => update(Number(event.target.value))}
      className="min-h-10 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-2 text-sm text-[var(--v2-ink-1)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)]"
    />
  </label>;
}

// "Forever" is the platform maximum the WP-M8 reaper enforces (3650 days ≈ 10y),
// not literal permanence — the fine print says so rather than the contract lying.
const RETENTION_FOREVER_DAYS = 3650;
const RETENTION_PRESETS = [30, 60, 90, 180, 360, RETENTION_FOREVER_DAYS] as const;

function retentionPresetLabel(days: number, t: (key: string, opts: { defaultValue: string }) => string) {
  if (days === RETENTION_FOREVER_DAYS) return t("minutes.retentionForever", { defaultValue: "Forever" });
  return t("minutes.retentionDays", { defaultValue: `${days} days` });
}

function ConsentForm({
  initialRetention,
  initialConsent,
  onReady,
}: {
  initialRetention: MinutesControlRetention;
  initialConsent: { capture_enabled: boolean; agent_read_enabled: boolean };
  onReady: (captureEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  // Seed from the saved consent so the boxes reflect reality — re-saving them
  // blank would silently DISABLE consent. Initializing here means clicking Save
  // without a change is idempotent, so no toggle-tracking is needed.
  const [captureEnabled, setCaptureEnabled] = useState(initialConsent.capture_enabled);
  const [agentReadEnabled, setAgentReadEnabled] = useState(initialConsent.agent_read_enabled);
  const [retention, setRetention] = useState<MinutesControlRetention>(initialRetention);
  const consent = useMutation({
    mutationFn: saveMinutesConsent,
    onSuccess: (result, input) => {
      onReady(result.state === "ready" && input.captureEnabled);
    },
  });
  const validRetention = Number.isInteger(retention.audio_days) && retention.audio_days >= 0 && retention.audio_days <= 365 &&
    Number.isInteger(retention.transcript_days) && retention.transcript_days >= 1 && retention.transcript_days <= 3650 &&
    Number.isInteger(retention.summary_days) && retention.summary_days >= 1 && retention.summary_days <= retention.transcript_days;
  // The GET /control seed is a deployment default, not the user's saved policy, and may
  // carry an off-preset or asymmetric value — surface it verbatim as "Custom" rather than
  // silently snapping it onto a preset the user never chose.
  const isCustomRetention = retention.transcript_days !== retention.summary_days ||
    !RETENTION_PRESETS.includes(retention.transcript_days as (typeof RETENTION_PRESETS)[number]);

  return <section aria-labelledby="minutes-consent-heading" className="border-b border-[var(--v2-hairline)] pb-5">
    <div className="mb-3">
      <h3 id="minutes-consent-heading" className="text-sm font-semibold">{t("minutes.consentTitle", { defaultValue: "Capture consent" })}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.consentBody", { defaultValue: "Confirm the visible bot and choose the retention windows before requesting a capture." })}</p>
    </div>
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!validRetention) return;
        consent.mutate({ captureEnabled, agentReadEnabled, retention, idempotencyKey: idempotencyKey("minutes-consent") });
      }}
    >
      <label className="flex items-start gap-2 text-sm text-[var(--v2-ink-1)]">
        <input type="checkbox" checked={captureEnabled} onChange={(event) => setCaptureEnabled(event.target.checked)} className="mt-1 size-4 accent-[var(--v2-accent)]" />
        <span>{t("minutes.captureConsent", { defaultValue: "Allow ZAKI Minutes to request a visible capture bot." })}</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--v2-ink-1)]">
        <input type="checkbox" checked={agentReadEnabled} onChange={(event) => setAgentReadEnabled(event.target.checked)} className="mt-1 size-4 accent-[var(--v2-accent)]" />
        <span>{t("minutes.agentReadConsent", { defaultValue: "Allow my ZAKI agent to read retained Minutes items." })}</span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[var(--v2-ink-2)]">
          <span>{t("minutes.retentionKeep", { defaultValue: "Keep each meeting for" })}</span>
          <select
            value={retention.transcript_days}
            onChange={(event) => {
              const days = Number(event.target.value);
              // Presets are symmetric — transcript === summary — so a preset can never
              // trip the engine's summary_days <= transcript_days check. Audio is left
              // untouched: it is its own privacy control and any value > 0 turns
              // recording on, which a retention preset must never do silently.
              setRetention((value) => ({ ...value, transcript_days: days, summary_days: days }));
            }}
            className="min-h-10 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-2 text-sm text-[var(--v2-ink-1)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)]"
          >
            {isCustomRetention ? <option value={retention.transcript_days}>{t("minutes.retentionCustom", { defaultValue: `Custom (${retention.transcript_days} days)` })}</option> : null}
            {RETENTION_PRESETS.map((days) => <option key={days} value={days}>{retentionPresetLabel(days, t)}</option>)}
          </select>
        </label>
        {numberField(retention.audio_days, (audio_days) => setRetention((value) => ({ ...value, audio_days })), 0, 365, t("minutes.audioRetention", { defaultValue: "Audio days (0 = no recording)" }))}
      </div>
      <p className="text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.retentionForeverHint", { defaultValue: "“Forever” keeps meetings until you delete them (system maximum ≈ 10 years). Transcript and summary share one window; changes apply to future captures only." })}</p>
      {!validRetention ? <p role="alert" className="text-xs text-[var(--v2-danger)]">{t("minutes.retentionInvalid", { defaultValue: "Choose a retention window and keep audio between 0 and 365 days." })}</p> : null}
      {consent.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.consentUnavailable", { defaultValue: "Consent could not be saved." })}<V2Button size="sm" type="button" onClick={() => consent.variables && consent.mutate(consent.variables)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}
      {consent.isSuccess ? <p role="status" className="text-xs text-[var(--v2-accent)]">{consent.data.state === "ready" ? t("minutes.consentSaved", { defaultValue: "Consent saved." }) : t("minutes.consentDisabled", { defaultValue: "Capture remains disabled by this consent." })}</p> : null}
      <V2Button type="submit" size="sm" variant="primary" disabled={!validRetention || consent.isPending}>{consent.isPending ? t("minutes.savingConsent", { defaultValue: "Saving consent…" }) : t("minutes.saveConsent", { defaultValue: "Save consent" })}</V2Button>
    </form>
  </section>;
}

const JOIN_SCOPES: readonly CalendarJoinScope[] = ["organizer", "accepted", "all"] as const;

function joinScopeLabel(scope: CalendarJoinScope, t: (key: string, opts: { defaultValue: string }) => string) {
  switch (scope) {
    case "organizer": return t("minutes.calendarScopeOrganizer", { defaultValue: "Only meetings I organize" });
    case "all": return t("minutes.calendarScopeAll", { defaultValue: "Every meeting with a Meet link" });
    default: return t("minutes.calendarScopeAccepted", { defaultValue: "Meetings I organize or have accepted" });
  }
}

// WP-M10 slice 6 — the calendar auto-join settings card. Connect a Google Calendar,
// grant standing auto-join consent, and choose which meetings qualify (join_scope).
// The poller (slice 5) then sends the visible notetaker to upcoming Meet meetings.
// Dark-invisible: a 404 from either route hides the card entirely.
function CalendarAutojoin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connection = useQuery({
    queryKey: ["minutes", "calendar", "connection"],
    queryFn: getCalendarConnection,
    retry: false,
    gcTime: 0,
  });
  const autojoin = useQuery({
    queryKey: ["minutes", "calendar", "autojoin"],
    queryFn: getCalendarAutojoin,
    retry: false,
    gcTime: 0,
    enabled: connection.data?.connected === true,
  });

  const [enabled, setEnabled] = useState(false);
  const [joinScope, setJoinScope] = useState<CalendarJoinScope>("accepted");
  useEffect(() => {
    if (autojoin.data) {
      setEnabled(autojoin.data.enabled);
      setJoinScope(autojoin.data.joinScope);
    }
  }, [autojoin.data]);

  // OAuth callback result: the connect flow lands the browser back at returnTo with
  // ?calendar=connected | ?calendar=error&reason=…. Read it once, then strip it from
  // the URL so a refresh doesn't replay the banner.
  const [callback, setCallback] = useState<{ status: string; reason?: string } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calendar");
    if (!status) return;
    setCallback({ status, reason: params.get("reason") ?? undefined });
    params.delete("calendar");
    params.delete("reason");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  const connect = useMutation({
    mutationFn: () =>
      startCalendarConnect(typeof window !== "undefined" ? window.location.pathname + window.location.hash : undefined),
    onSuccess: (result) => {
      if (result?.authorizeUrl && typeof window !== "undefined") window.location.assign(result.authorizeUrl);
    },
  });
  const disconnect = useMutation({
    mutationFn: disconnectCalendar,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["minutes", "calendar", "autojoin"] });
      void connection.refetch();
    },
  });
  const save = useMutation({
    mutationFn: () => saveCalendarAutojoin({ enabled, joinScope }),
    onSuccess: (data) => queryClient.setQueryData(["minutes", "calendar", "autojoin"], data),
  });

  // Invisible while loading or when the feature is dark (404) on EITHER route — a
  // 404 from the autojoin route (e.g. the deployment goes dark mid-session) must
  // also hide the whole card, never leave a stray "unavailable" error behind.
  if (connection.isLoading || isCalendarUnavailable(connection.error) || isCalendarUnavailable(autojoin.error)) return null;

  const heading = <div className="mb-3">
    <h3 id="minutes-calendar-heading" className="flex items-center gap-1.5 text-sm font-semibold"><CalendarClock className="size-4" aria-hidden />{t("minutes.calendarTitle", { defaultValue: "Calendar auto-join" })}</h3>
    <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.calendarBody", { defaultValue: "Connect Google Calendar to send the visible notetaker to your upcoming Google Meet meetings automatically." })}</p>
  </div>;

  if (connection.isError || !connection.data) {
    return <section aria-labelledby="minutes-calendar-heading" className="border-b border-[var(--v2-hairline)] py-5">
      {heading}
      <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.calendarUnavailable", { defaultValue: "Calendar status is unavailable." })}<V2Button size="sm" onClick={() => void connection.refetch()}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div>
    </section>;
  }

  const conn = connection.data;
  const needsReconnect = !conn.connected && (conn.status === "invalid_grant" || conn.status === "revoked");

  return <section aria-labelledby="minutes-calendar-heading" className="border-b border-[var(--v2-hairline)] py-5">
    {heading}

    {callback ? <p role="status" className={`mb-3 text-xs ${callback.status === "connected" ? "text-[var(--v2-accent)]" : "text-[var(--v2-danger)]"}`}>
      {callback.status === "connected"
        ? t("minutes.calendarConnected", { defaultValue: "Google Calendar connected." })
        : callback.reason === "cancelled"
          ? t("minutes.calendarConnectCancelled", { defaultValue: "Calendar connection was cancelled." })
          : t("minutes.calendarConnectError", { defaultValue: "Calendar could not be connected. Please try again." })}
    </p> : null}

    {!conn.connected ? <div className="grid gap-2">
      {needsReconnect ? <p className="text-xs text-[var(--v2-danger)]">{t("minutes.calendarReconnectNeeded", { defaultValue: "Your Google Calendar access ended. Reconnect to keep auto-join working." })}</p> : null}
      <p className="text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.calendarConnectExplainer", { defaultValue: "You grant access once here. Each meeting still shows the visible in-meeting bot notice. ZAKI does not notify other attendees for you — you are responsible for any notice your workplace or local law requires." })}</p>
      {connect.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.calendarConnectStartFailed", { defaultValue: "Could not start the connection." })}<V2Button size="sm" onClick={() => connect.mutate()}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}
      <div><V2Button size="sm" variant="primary" disabled={connect.isPending} onClick={() => connect.mutate()}><Link2 className="size-3.5" aria-hidden />{connect.isPending ? t("minutes.calendarConnecting", { defaultValue: "Connecting…" }) : needsReconnect ? t("minutes.calendarReconnect", { defaultValue: "Reconnect Google Calendar" }) : t("minutes.calendarConnect", { defaultValue: "Connect Google Calendar" })}</V2Button></div>
    </div> : <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--v2-ink-2)]">{t("minutes.calendarConnectedMeta", { defaultValue: "Google Calendar connected" })}</span>
        <V2Button size="sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}><Unplug className="size-3.5" aria-hidden />{disconnect.isPending ? t("minutes.calendarDisconnecting", { defaultValue: "Disconnecting…" }) : t("minutes.calendarDisconnect", { defaultValue: "Disconnect" })}</V2Button>
      </div>

      {autojoin.isLoading ? <p className="text-xs text-[var(--v2-ink-2)]">{t("minutes.calendarLoadingSettings", { defaultValue: "Loading auto-join settings…" })}</p>
        : autojoin.isError || !autojoin.data ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.calendarAutojoinUnavailable", { defaultValue: "Auto-join settings are unavailable." })}<V2Button size="sm" onClick={() => void autojoin.refetch()}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div>
        : <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          {autojoin.data.requiresReconsent ? <p className="text-xs text-[var(--v2-danger)]">{t("minutes.calendarReconsent", { defaultValue: "The auto-join terms changed. Re-confirm below to keep auto-join on." })}</p> : null}
          <label className="flex items-start gap-2 text-sm text-[var(--v2-ink-1)]">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="mt-1 size-4 accent-[var(--v2-accent)]" />
            <span>{t("minutes.calendarAutojoinConsent", { defaultValue: "Automatically send the visible notetaker to my upcoming Meet meetings (standing consent)." })}</span>
          </label>
          <label className="grid gap-1 text-xs text-[var(--v2-ink-2)]">
            <span>{t("minutes.calendarScopeLabel", { defaultValue: "Which meetings" })}</span>
            <select value={joinScope} onChange={(event) => setJoinScope(event.target.value as CalendarJoinScope)} disabled={!enabled} className="min-h-10 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-2 text-sm text-[var(--v2-ink-1)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)] disabled:opacity-60">
              {JOIN_SCOPES.map((scope) => <option key={scope} value={scope}>{joinScopeLabel(scope, t)}</option>)}
            </select>
          </label>
          <p className="text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.calendarAutojoinFinePrint", { defaultValue: "Auto-join also requires capture consent (above) to stay on. Only Google Meet links are joined for now. Each meeting still shows the visible bot notice." })}</p>
          {save.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.calendarAutojoinSaveFailed", { defaultValue: "Auto-join settings could not be saved." })}<V2Button size="sm" type="button" onClick={() => save.mutate()}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}
          {save.isSuccess ? <p role="status" className="text-xs text-[var(--v2-accent)]">{save.data.enabled ? t("minutes.calendarAutojoinOn", { defaultValue: "Auto-join is on." }) : t("minutes.calendarAutojoinOff", { defaultValue: "Auto-join is off." })}</p> : null}
          <div><V2Button type="submit" size="sm" variant="primary" disabled={save.isPending}>{save.isPending ? t("minutes.savingConsent", { defaultValue: "Saving…" }) : t("minutes.calendarSaveAutojoin", { defaultValue: "Save auto-join" })}</V2Button></div>
        </form>}
    </div>}
  </section>;
}

// Which provider a pasted link belongs to, by host. The server re-validates the
// platform ↔ URL match and whether the deployment admits it; this only picks the
// platform field so the user pastes any supported link without choosing a provider.
function detectPlatform(rawUrl: string): "google_meet" | "teams" | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === "meet.google.com") return "google_meet";
  if (host === "teams.microsoft.com" || host.endsWith(".teams.microsoft.com") ||
      host === "teams.live.com" || host.endsWith(".teams.live.com") ||
      host.endsWith(".teams.microsoft.us")) return "teams";
  return null;
}

const PLATFORM_LABELS: Record<"google_meet" | "teams", string> = {
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
};

function CaptureForm({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [meetingUrl, setMeetingUrl] = useState("");
  const [visibleBotAttested, setVisibleBotAttested] = useState(false);
  const [capture, setCapture] = useState<MinutesCaptureResult | null>(null);
  const platform = detectPlatform(meetingUrl);
  const requestCapture = useMutation({ mutationFn: requestMinutesCapture, onSuccess: setCapture });
  const status = useMutation({ mutationFn: getMinutesCaptureStatus });
  const stop = useMutation({
    mutationFn: ({ captureId, idempotencyKey }: { captureId: string; idempotencyKey: string }) => stopMinutesCapture(captureId, idempotencyKey),
    onSuccess: () => status.reset(),
  });

  if (!enabled) return <p className="mt-4 text-xs text-[var(--v2-ink-2)]">{t("minutes.captureDisabledByConsent", { defaultValue: "Enable capture consent to request a meeting bot." })}</p>;
  return <section aria-labelledby="minutes-capture-heading" className="border-b border-[var(--v2-hairline)] py-5">
    <div className="mb-3">
      <h3 id="minutes-capture-heading" className="text-sm font-semibold">{t("minutes.requestCaptureTitle", { defaultValue: "Request a visible bot" })}</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.requestCaptureBody", { defaultValue: "ZAKI Notetaker must be visibly present and attendees must be notified before it joins." })}</p>
    </div>
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!platform) return;
        requestCapture.mutate({
          platform,
          meetingUrl,
          visibleBotAttested: true,
          idempotencyKey: idempotencyKey("minutes-capture"),
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <p className="grid gap-1 text-xs text-[var(--v2-ink-2)]"><span>{t("minutes.platform", { defaultValue: "Platform" })}</span><span className="min-h-10 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-2 py-2 text-sm text-[var(--v2-ink-1)]">{platform ? PLATFORM_LABELS[platform] : t("minutes.platformFromLink", { defaultValue: "From the link" })}</span></p>
        <label className="grid gap-1 text-xs text-[var(--v2-ink-2)]"><span>{t("minutes.meetingUrl", { defaultValue: "Meeting URL" })}</span><input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://…" className="min-h-10 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] px-2 text-sm text-[var(--v2-ink-1)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--v2-accent)]" /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-[var(--v2-ink-1)]"><input required type="checkbox" checked={visibleBotAttested} onChange={(event) => setVisibleBotAttested(event.target.checked)} className="mt-1 size-4 accent-[var(--v2-accent)]" /><span>{t("minutes.visibleBotAttestation", { defaultValue: "I confirm the bot will be visible and attendees will be told before capture starts." })}</span></label>
      {meetingUrl && !platform ? <p role="alert" className="text-xs text-[var(--v2-danger)]">{t("minutes.platformUnrecognized", { defaultValue: "Paste a Google Meet or Microsoft Teams meeting link." })}</p> : null}
      {requestCapture.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.captureUnavailable", { defaultValue: "The capture request could not be sent." })}<V2Button size="sm" type="button" onClick={() => requestCapture.variables && requestCapture.mutate(requestCapture.variables)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}
      <V2Button type="submit" size="sm" variant="primary" disabled={!meetingUrl || !platform || !visibleBotAttested || requestCapture.isPending}><Bot className="size-3.5" aria-hidden />{requestCapture.isPending ? t("minutes.requestingCapture", { defaultValue: "Requesting…" }) : t("minutes.requestCapture", { defaultValue: "Request capture" })}</V2Button>
    </form>
    {capture ? <div className="mt-4 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-3" aria-live="polite"><p className="text-sm font-medium">{t("minutes.captureRequested", { defaultValue: "Capture requested" })}</p><p className="mt-1 font-mono text-[10px] text-[var(--v2-ink-2)]">{capture.captureId}</p>{status.data ? <p className="mt-2 text-xs text-[var(--v2-ink-2)]">{t("minutes.captureState", { defaultValue: "State" })}: {status.data.state}{status.data.failureCode ? ` (${status.data.failureCode})` : ""}</p> : null}{status.isError ? <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]">{t("minutes.captureStatusUnavailable", { defaultValue: "Capture status is unavailable." })}<V2Button size="sm" onClick={() => status.variables && status.mutate(status.variables)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}{stop.isError ? <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]">{t("minutes.stopUnavailable", { defaultValue: "The stop request could not be sent." })}<V2Button size="sm" onClick={() => stop.variables && stop.mutate(stop.variables)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}{stop.isSuccess ? <p role="status" className="mt-2 text-xs text-[var(--v2-accent)]">{t("minutes.stopRequested", { defaultValue: "Stop request sent. Check status for completion." })}</p> : null}<div className="mt-3 flex flex-wrap gap-2"><V2Button size="sm" onClick={() => status.mutate(capture.captureId)}><RefreshCw className="size-3.5" aria-hidden />{t("minutes.checkCaptureStatus", { defaultValue: "Check status" })}</V2Button><V2Button size="sm" disabled={Boolean(status.data?.terminal) || stop.isPending} onClick={() => stop.mutate({ captureId: capture.captureId, idempotencyKey: idempotencyKey("minutes-stop") })}><Square className="size-3.5" aria-hidden />{t("minutes.stopCapture", { defaultValue: "Stop capture" })}</V2Button></div></div> : null}
  </section>;
}

function ForgetMeetingList({ meetings, onForgot }: MinutesControlsProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<MeetingChoice | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const forget = useMutation({
    mutationFn: ({ meetingId, key }: { meetingId: string; key: string }) => forgetMinutesMeeting(meetingId, key),
    onSuccess: (result, input) => {
      setReceipt(result.receiptId);
      setTarget(null);
      onForgot?.(input.meetingId);
    },
  });
  if (!meetings.length) return null;
  return <section aria-labelledby="minutes-forget-heading" className="pt-5">
    <h3 id="minutes-forget-heading" className="text-sm font-semibold">{t("minutes.forgetTitle", { defaultValue: "Forget retained meetings" })}</h3>
    <p className="mt-1 text-xs leading-5 text-[var(--v2-ink-2)]">{t("minutes.forgetBody", { defaultValue: "This permanently requests removal of the meeting, transcript, summary, and recording objects." })}</p>
    <ul className="mt-3 grid gap-2">{meetings.map((meeting) => <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--v2-hairline)] bg-[var(--v2-bg)] p-2"><span className="min-w-0 truncate text-sm">{meeting.title}</span>{target?.id === meeting.id ? <span className="flex flex-wrap items-center gap-2 text-xs"><span>{t("minutes.forgetConfirm", { defaultValue: "Forget permanently?" })}</span><V2Button size="sm" variant="primary" disabled={forget.isPending} onClick={() => forget.mutate({ meetingId: meeting.id, key: idempotencyKey("minutes-forget") })}>{t("minutes.forgetAction", { defaultValue: "Forget" })}</V2Button><V2Button size="sm" disabled={forget.isPending} onClick={() => setTarget(null)}>{t("common.cancel", { defaultValue: "Cancel" })}</V2Button></span> : <V2Button size="sm" onClick={() => setTarget(meeting)}><Eraser className="size-3.5" aria-hidden />{t("minutes.forgetAction", { defaultValue: "Forget" })}</V2Button>}</li>)}</ul>
    {forget.isError ? <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--v2-danger)]"><CircleAlert className="size-3.5" aria-hidden />{t("minutes.forgetUnavailable", { defaultValue: "The deletion request could not be completed." })}<V2Button size="sm" onClick={() => forget.variables && forget.mutate(forget.variables)}>{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></div> : null}
    {receipt ? <p role="status" className="mt-3 text-xs text-[var(--v2-accent)]">{t("minutes.forgetCompleted", { defaultValue: "Deletion receipt recorded." })}</p> : null}
  </section>;
}

export function MinutesControls({ meetings, onForgot }: MinutesControlsProps) {
  const { t } = useTranslation();
  const controls = useQuery({ queryKey: ["minutes", "control"], queryFn: getMinutesControl, retry: false, gcTime: 0 });
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const [initialRetention, setInitialRetention] = useState<MinutesControlRetention | null>(null);
  useEffect(() => {
    if (controls.data && !initialRetention) {
      setInitialRetention(controls.data.policy.retention);
      // Reflect saved capture consent so the CaptureForm opens unlocked without a
      // re-save. Seeded once alongside the retention snapshot; a later Save updates
      // it via onReady.
      setCaptureEnabled(controls.data.consent.capture_enabled);
    }
  }, [controls.data, initialRetention]);

  // A 404 from the default-false BFF is intentionally invisible: the product
  // route remains coming-soon and this panel must never imply an active bot.
  if (controls.isLoading || isDarkLaunchError(controls.error)) return null;
  if (controls.isError || !controls.data || !initialRetention) {
    return <V2Panel>
      <V2PanelHead>
        <h2 className="m-0 text-inherit">{t("minutes.controlsUnavailableTitle", { defaultValue: "Minutes controls are unavailable" })}</h2>
        <span>{t("minutes.controlsUnavailableMeta", { defaultValue: "Control check failed" })}</span>
      </V2PanelHead>
      <V2PanelBody className="flex flex-wrap items-center gap-3"><p className="text-sm text-[var(--v2-ink-2)]">{t("minutes.controlsUnavailableBody", { defaultValue: "Capture and deletion controls are not ready. Your retained archive was not changed." })}</p><V2Button size="sm" onClick={() => void controls.refetch()}><RefreshCw className="size-3.5" aria-hidden />{t("minutes.retry", { defaultValue: "Try again" })}</V2Button></V2PanelBody>
    </V2Panel>;
  }
  return <V2Panel>
    <V2PanelHead>
      <h2 className="m-0 text-inherit">{t("minutes.controlsTitle", { defaultValue: "Minutes controls" })}</h2>
      <span>{t("minutes.controlsMeta", { defaultValue: "Visible bot / owner only" })}</span>
    </V2PanelHead>
    <V2PanelBody>
      <ConsentForm initialRetention={initialRetention} initialConsent={controls.data.consent} onReady={setCaptureEnabled} />
      <CalendarAutojoin />
      <CaptureForm enabled={captureEnabled} />
      <ForgetMeetingList meetings={meetings} onForgot={onForgot} />
    </V2PanelBody>
  </V2Panel>;
}
