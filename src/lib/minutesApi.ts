import { backendAuthRequest } from "@/lib/api";

export type MinutesKind = "meeting" | "transcript" | "summary";
type MinutesCommonMetadata = {
  id: string;
  title: string;
  occurred_at: string;
  updated_at: string;
  sensitivity: "sensitive_pii";
};
type MinutesTranscriptRetention = { scope: "minutes.transcript"; expires_at: string };
type MinutesSummaryRetention = { scope: "minutes.summary"; expires_at: string };
export type MinutesRetention = MinutesTranscriptRetention | MinutesSummaryRetention;
export type MinutesCaptureNotice = {
  bot_visible: true;
  tenant_attested_at: string;
  policy_version: string;
};
export type MinutesMetadata =
  | (MinutesCommonMetadata & { kind: "meeting"; retention: MinutesTranscriptRetention })
  | (MinutesCommonMetadata & { kind: "transcript"; meeting_id: string; retention: MinutesTranscriptRetention })
  | (MinutesCommonMetadata & { kind: "summary"; meeting_id: string; retention: MinutesSummaryRetention });
type MinutesSummaryContent = { format: "summary"; text: string };
type MinutesTranscriptContent = {
  format: "speaker_turns";
  language?: string;
  turns: Array<{ speaker: string; text: string; started_at: string; ended_at?: string }>;
};
export type MinutesItem =
  | (MinutesCommonMetadata & {
      kind: "meeting";
      capture_notice: MinutesCaptureNotice;
      retention: MinutesTranscriptRetention;
      content: { platform: "google_meet" | "teams" | "zoom" | "jitsi"; started_at: string; ended_at: string; attendees: string[] };
    })
  | (MinutesCommonMetadata & {
      kind: "transcript";
      meeting_id: string;
      capture_notice: MinutesCaptureNotice;
      retention: MinutesTranscriptRetention;
      content: MinutesTranscriptContent | MinutesSummaryContent;
    })
  | (MinutesCommonMetadata & {
      kind: "summary";
      meeting_id: string;
      retention: MinutesSummaryRetention;
      content: MinutesSummaryContent;
    });
export type MinutesIndexResponse = { items: MinutesMetadata[]; truncated: boolean; next_cursor?: string };
export type MinutesItemResponse = { item: MinutesItem; truncated: false };

export class MinutesApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "MinutesApiError";
  }
}

async function minutesRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await backendAuthRequest(path, { ...init, redirectOnAuthFailure: false });
  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* user-safe fallback below */ }
  if (!response.ok) {
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    throw new MinutesApiError(
      response.status,
      String(body.code || "minutes_failed"),
      String(body.message || "Minutes could not be loaded."),
      Boolean(body.retryable),
    );
  }
  return payload as T;
}

export function listMinutes({ limit = 50, cursor }: { limit?: number; cursor?: string } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return minutesRequest<MinutesIndexResponse>(`/api/minutes/index?${params.toString()}`, { method: "GET" });
}

export function readMinutesItem(itemId: string, variant: "full" | "summary" = "full") {
  return minutesRequest<MinutesItemResponse>(
    `/api/minutes/items/${encodeURIComponent(itemId)}?variant=${variant}`,
    { method: "GET" },
  );
}

export function searchMinutes(query: string, limit = 20, cursor?: string) {
  return minutesRequest<MinutesIndexResponse>("/api/minutes/search", {
    method: "POST",
    body: JSON.stringify({ query, limit, ...(cursor ? { cursor } : {}) }),
  });
}

export type MinutesControlRetention = {
  audio_days: number;
  transcript_days: number;
  summary_days: number;
};

export type MinutesControlStatus = {
  available: true;
  policy: {
    capture_notice_policy_version: string;
    retention: MinutesControlRetention;
  };
  // The user's saved consent, so the form reflects reality instead of resetting
  // to unchecked. Absent from older backends → normalized to false (see below).
  consent: {
    capture_enabled: boolean;
    agent_read_enabled: boolean;
  };
};

function isMinutesControlStatus(value: unknown): value is MinutesControlStatus {
  if (!value || typeof value !== "object") return false;
  const control = value as { available?: unknown; policy?: { capture_notice_policy_version?: unknown; retention?: unknown } };
  const retention = control.policy?.retention;
  if (!retention || typeof retention !== "object") return false;
  const windows = retention as Partial<MinutesControlRetention>;
  return control.available === true &&
    typeof control.policy?.capture_notice_policy_version === "string" &&
    typeof windows.audio_days === "number" && Number.isInteger(windows.audio_days) && windows.audio_days >= 0 && windows.audio_days <= 365 &&
    typeof windows.transcript_days === "number" && Number.isInteger(windows.transcript_days) && windows.transcript_days >= 1 && windows.transcript_days <= 3_650 &&
    typeof windows.summary_days === "number" && Number.isInteger(windows.summary_days) && windows.summary_days >= 1 && windows.summary_days <= windows.transcript_days;
}

export type MinutesConsentResult = { state: "ready" | "disabled"; policyVersion: string };
export type MinutesCaptureResult = {
  captureId: string;
  meetingId?: string;
  state: "requested";
};
export type MinutesCaptureStatus = {
  captureId: string;
  meetingId?: string;
  state: "requested" | "joining" | "awaiting_admission" | "active" | "stopping" | "completed" | "failed";
  failureCode?: string;
  capturedSecondsTotal: number;
  terminal: boolean;
};
export type MinutesForgetResult = {
  status: "completed" | "already_absent";
  receiptId: string;
  erasedAt: string;
  counts: {
    meetingRows: number;
    transcriptRows: number;
    summaryRows: number;
    recordingObjects: number;
  };
};

function readSavedConsent(value: unknown): MinutesControlStatus["consent"] {
  const consent = (value as { consent?: unknown }).consent;
  if (consent && typeof consent === "object") {
    const { capture_enabled, agent_read_enabled } = consent as Record<string, unknown>;
    return { capture_enabled: capture_enabled === true, agent_read_enabled: agent_read_enabled === true };
  }
  return { capture_enabled: false, agent_read_enabled: false };
}

export async function getMinutesControl() {
  const control = await minutesRequest<unknown>("/api/minutes/control", { method: "GET" });
  if (!isMinutesControlStatus(control)) {
    throw new MinutesApiError(502, "minutes_control_invalid_response", "Minutes controls are temporarily unavailable.", true);
  }
  return { ...control, consent: readSavedConsent(control) };
}

export function saveMinutesConsent(input: {
  captureEnabled: boolean;
  agentReadEnabled: boolean;
  retention: MinutesControlRetention;
  idempotencyKey: string;
}) {
  return minutesRequest<MinutesConsentResult>("/api/minutes/control/consent", {
    method: "POST",
    body: JSON.stringify({
      capture_enabled: input.captureEnabled,
      agent_read_enabled: input.agentReadEnabled,
      retention: input.retention,
      idempotency_key: input.idempotencyKey,
    }),
  });
}

export function requestMinutesCapture(input: {
  platform: "google_meet" | "teams";
  meetingUrl: string;
  visibleBotAttested: true;
  idempotencyKey: string;
}) {
  return minutesRequest<MinutesCaptureResult>("/api/minutes/captures", {
    method: "POST",
    body: JSON.stringify({
      platform: input.platform,
      meeting_url: input.meetingUrl,
      visible_bot_attested: input.visibleBotAttested,
      idempotency_key: input.idempotencyKey,
    }),
  });
}

export function getMinutesCaptureStatus(captureId: string) {
  return minutesRequest<MinutesCaptureStatus>(`/api/minutes/captures/${encodeURIComponent(captureId)}`, {
    method: "GET",
  });
}

export function stopMinutesCapture(captureId: string, idempotencyKey: string) {
  return minutesRequest<Pick<MinutesCaptureStatus, "captureId" | "meetingId" | "state" | "terminal">>(
    `/api/minutes/captures/${encodeURIComponent(captureId)}/stop`,
    { method: "POST", body: JSON.stringify({ idempotency_key: idempotencyKey }) },
  );
}

export function forgetMinutesMeeting(meetingId: string, idempotencyKey: string) {
  return minutesRequest<MinutesForgetResult>(
    `/api/minutes/meetings/${encodeURIComponent(meetingId)}/forget`,
    { method: "POST", body: JSON.stringify({ idempotency_key: idempotencyKey }) },
  );
}

// ── WP-M10 calendar auto-join ───────────────────────────────────────────────
// These routes 404 when the calendar feature is dark (unconfigured); the UI
// treats a 404 as "not available" and hides the card entirely.
export type CalendarConnectionStatus = "active" | "revoked" | "invalid_grant";
export type CalendarConnection = {
  connected: boolean;
  status?: CalendarConnectionStatus;
  scopes?: string[];
  connectedAt?: string;
};
export type CalendarJoinScope = "organizer" | "accepted" | "all";
export type CalendarAutojoin = {
  enabled: boolean;
  joinScope: CalendarJoinScope;
  consentVersion: string;
  hasConsent: boolean;
  isCurrent: boolean;
  requiresReconsent: boolean;
  consentedAt: string | null;
};

export function getCalendarConnection() {
  return minutesRequest<CalendarConnection>("/api/minutes/calendar/connect/status", { method: "GET" });
}

// Returns the Google authorize URL the SPA then navigates to (top-level), which
// sets the path-scoped nonce cookie. returnTo is where the callback lands the
// browser afterward (same-origin path only, enforced server-side).
export function startCalendarConnect(returnTo?: string) {
  const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return minutesRequest<{ authorizeUrl: string }>(
    `/api/minutes/calendar/connect/start${query}`,
    { method: "GET" },
  );
}

export function disconnectCalendar() {
  return minutesRequest<{ disconnected: true; revoked: boolean }>(
    "/api/minutes/calendar/disconnect",
    { method: "POST" },
  );
}

export function getCalendarAutojoin() {
  return minutesRequest<CalendarAutojoin>("/api/minutes/calendar/autojoin", { method: "GET" });
}

export function saveCalendarAutojoin(input: { enabled: boolean; joinScope: CalendarJoinScope }) {
  return minutesRequest<CalendarAutojoin>("/api/minutes/calendar/autojoin", {
    method: "POST",
    body: JSON.stringify({ enabled: input.enabled, joinScope: input.joinScope }),
  });
}
