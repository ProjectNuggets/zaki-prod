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
};

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

export function getMinutesControl() {
  return minutesRequest<MinutesControlStatus>("/api/minutes/control", { method: "GET" });
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
  platform: "google_meet" | "zoom" | "teams" | "jitsi";
  meetingUrl: string;
  botDisplayName: string;
  visibleBotAttested: true;
  idempotencyKey: string;
}) {
  return minutesRequest<MinutesCaptureResult>("/api/minutes/captures", {
    method: "POST",
    body: JSON.stringify({
      platform: input.platform,
      meeting_url: input.meetingUrl,
      bot_display_name: input.botDisplayName,
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
