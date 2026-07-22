import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, CircleAlert, Eraser, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { V2Button, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import {
  MinutesApiError,
  forgetMinutesMeeting,
  getMinutesCaptureStatus,
  getMinutesControl,
  requestMinutesCapture,
  saveMinutesConsent,
  stopMinutesCapture,
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
  onReady,
}: {
  initialRetention: MinutesControlRetention;
  onReady: (captureEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const [captureEnabled, setCaptureEnabled] = useState(false);
  const [agentReadEnabled, setAgentReadEnabled] = useState(false);
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
    if (controls.data && !initialRetention) setInitialRetention(controls.data.policy.retention);
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
      <ConsentForm initialRetention={initialRetention} onReady={setCaptureEnabled} />
      <CaptureForm enabled={captureEnabled} />
      <ForgetMeetingList meetings={meetings} onForgot={onForgot} />
    </V2PanelBody>
  </V2Panel>;
}
