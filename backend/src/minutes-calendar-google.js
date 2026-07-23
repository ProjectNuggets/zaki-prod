// WP-M10 slice 5a — the Google Calendar client the auto-join poller uses: refresh
// an access token from the stored refresh_token, list upcoming events that carry
// a Google Meet link, and decide which qualify under the user's join_scope.
//
// Read-only (calendar.events.readonly). Pure + fetch-injectable so it unit-tests
// in isolation. It reads only the PRIMARY calendar (the scope grants events, not
// the calendar list); multi-calendar is a documented follow-up.

export class GoogleCalendarError extends Error {
  constructor(message, { code = "google_calendar_error", invalidGrant = false } = {}) {
    super(message);
    this.name = "GoogleCalendarError";
    this.code = code;
    this.invalidGrant = invalidGrant;
  }
}

// Exchange the stored refresh_token for a short-lived access token. An
// invalid_grant here means the user revoked our grant at Google — the caller
// must stop firing and surface a reconnect (never silently retry forever).
export async function refreshCalendarAccessToken({ refreshToken, clientId, clientSecret, fetchImpl = fetch } = {}) {
  if (!String(refreshToken || "").trim()) throw new GoogleCalendarError("missing refresh token", { code: "no_refresh_token" });
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  let data = {};
  try { data = await res.json(); } catch { /* keep {} */ }
  if (!res.ok) {
    const err = String(data?.error || "");
    throw new GoogleCalendarError(`token refresh failed: ${err || res.status}`, {
      code: "token_refresh_failed",
      invalidGrant: err === "invalid_grant",
    });
  }
  const accessToken = String(data.access_token || "").trim();
  if (!accessToken) throw new GoogleCalendarError("token refresh returned no access_token", { code: "token_refresh_failed" });
  return { accessToken, expiresInMs: Math.max(0, Number(data.expires_in || 0)) * 1000 };
}

// The Meet URL for an event, or null. Prefer hangoutLink; else a conferenceData
// video entry point on meet.google.com. Non-Meet conferencing (Zoom/Teams links
// pasted into a Google event) is deliberately ignored — capture is Meet-only.
export function meetUrlOfEvent(event) {
  const hangout = String(event?.hangoutLink || "").trim();
  if (/^https:\/\/meet\.google\.com\//.test(hangout)) return hangout;
  const points = Array.isArray(event?.conferenceData?.entryPoints) ? event.conferenceData.entryPoints : [];
  for (const p of points) {
    const uri = String(p?.uri || "").trim();
    if (p?.entryPointType === "video" && /^https:\/\/meet\.google\.com\//.test(uri)) return uri;
  }
  return null;
}

// Does this event qualify under the user's scope preference?
//  organizer — only meetings the user organizes
//  accepted  — organizer OR the user has accepted (skip declined/tentative/needsAction)
//  all       — any event with a Meet link (still excludes cancelled)
//
// Operates on the NORMALIZED event that listUpcomingMeetEvents emits (isOrganizer,
// responseStatus, status) — NOT the raw Google event. The poller only ever holds
// the normalized shape, so reading raw fields here would make every organizer/
// accepted decision silently false. Keep this consuming the normalized contract.
export function eventPassesScope(event, joinScope) {
  if (String(event?.status || "") === "cancelled") return false;
  const isOrganizer = Boolean(event?.isOrganizer);
  if (joinScope === "organizer") return isOrganizer;
  if (joinScope === "all") return true;
  // default: "accepted"
  if (isOrganizer) return true;
  return event?.responseStatus === "accepted";
}

// The occurrence start as a canonical UTC instant (RFC3339 Z). dateTime for timed
// events; date-only all-day events are excluded (no wall-clock start to join at).
// Normalizing to a UTC instant is load-bearing: the dedup key + engine
// idempotency key are derived from this string, and two attendees' calendars can
// render the SAME instant with different offsets (…-04:00 vs …+01:00). Without
// normalization those hash differently → two bots in one meeting.
export function occurrenceStartOf(event) {
  const dt = event?.start?.dateTime;
  if (!dt) return null;
  const ms = new Date(dt).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

// List upcoming events with a Meet link in [timeMin, timeMax], expanding
// recurring series into single instances (singleEvents=true) so each occurrence
// is its own row with its own start — the poller keys idempotency off that.
export async function listUpcomingMeetEvents(
  { accessToken, timeMinIso, timeMaxIso, maxResults = 50, fetchImpl = fetch } = {}
) {
  if (!String(accessToken || "").trim()) throw new GoogleCalendarError("missing access token", { code: "no_access_token" });
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  // Force UTC so start.dateTime comes back with a Z offset regardless of each
  // calendar's own default zone — every attendee sees the same instant string
  // (occurrenceStartOf normalizes too; this makes them agree at the source).
  url.searchParams.set("timeZone", "UTC");
  url.searchParams.set("timeMin", timeMinIso);
  url.searchParams.set("timeMax", timeMaxIso);
  url.searchParams.set("maxResults", String(Math.max(1, Math.min(250, Number(maxResults) || 50))));
  const res = await fetchImpl(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  let data = {};
  try { data = await res.json(); } catch { /* keep {} */ }
  if (!res.ok) {
    throw new GoogleCalendarError(`events.list failed: ${data?.error?.message || res.status}`, {
      code: "events_list_failed",
      invalidGrant: res.status === 401,
    });
  }
  const items = Array.isArray(data.items) ? data.items : [];
  const out = [];
  for (const ev of items) {
    const meetUrl = meetUrlOfEvent(ev);
    const start = occurrenceStartOf(ev);
    if (!meetUrl || !start) continue;
    out.push({
      eventId: String(ev.id || ""),
      // iCalUID is stable across a recurring series; combined with the occurrence
      // start it forms a per-occurrence dedup key the same for every attendee.
      icalUid: String(ev.iCalUID || ev.id || ""),
      occurrenceStart: start,
      meetUrl,
      status: String(ev.status || "confirmed"),
      isOrganizer: Boolean(ev.organizer?.self),
      responseStatus: (Array.isArray(ev.attendees) ? ev.attendees : []).find((a) => a?.self)?.responseStatus || null,
      summary: String(ev.summary || ""),
      raw: ev,
    });
  }
  return out;
}
