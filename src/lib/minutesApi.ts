import { backendAuthRequest } from "@/lib/api";

export type MinutesKind = "meeting" | "transcript" | "summary";
export type MinutesRetention = { scope: "minutes.transcript" | "minutes.summary"; expires_at: string };
export type MinutesMetadata = {
  id: string;
  kind: MinutesKind;
  title: string;
  meeting_id?: string;
  occurred_at: string;
  updated_at: string;
  sensitivity: "sensitive_pii";
  retention: MinutesRetention;
};
export type MinutesItem = MinutesMetadata & {
  content:
    | { format: "summary"; text: string }
    | { format: "speaker_turns"; language?: string; turns: Array<{ speaker: string; text: string; started_at: string; ended_at?: string }> }
    | { platform: string; started_at: string; ended_at: string; attendees: string[] };
};
export type MinutesIndexResponse = { items: MinutesMetadata[]; truncated: boolean; next_cursor?: string };
export type MinutesItemResponse = { item: MinutesItem; truncated: false };

export class MinutesApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "MinutesApiError";
  }
}

async function minutesRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await backendAuthRequest(path, init);
  let payload: unknown = null;
  try { payload = await response.json(); } catch { /* user-safe fallback below */ }
  if (!response.ok) {
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    throw new MinutesApiError(response.status, String(body.code || "minutes_failed"), String(body.message || "Minutes could not be loaded."));
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
