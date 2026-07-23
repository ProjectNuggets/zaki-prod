import { describe, expect, test } from "@jest/globals";
import {
  GoogleCalendarError,
  refreshCalendarAccessToken,
  meetUrlOfEvent,
  eventPassesScope,
  occurrenceStartOf,
  listUpcomingMeetEvents,
} from "./minutes-calendar-google.js";

function jsonRes(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe("refreshCalendarAccessToken", () => {
  test("exchanges a refresh token for an access token", async () => {
    let seen;
    const fetchImpl = async (url, opts) => { seen = { url, body: opts.body }; return jsonRes({ access_token: "at-1", expires_in: 3599 }); };
    const r = await refreshCalendarAccessToken({ refreshToken: "1//rt", clientId: "c", clientSecret: "s", fetchImpl });
    expect(r.accessToken).toBe("at-1");
    expect(r.expiresInMs).toBe(3599 * 1000);
    expect(seen.url).toBe("https://oauth2.googleapis.com/token");
    expect(seen.body).toContain("grant_type=refresh_token");
  });
  test("invalid_grant is flagged so the poller can stop + surface reconnect", async () => {
    const fetchImpl = async () => jsonRes({ error: "invalid_grant" }, false, 400);
    await expect(refreshCalendarAccessToken({ refreshToken: "x", clientId: "c", clientSecret: "s", fetchImpl }))
      .rejects.toMatchObject({ invalidGrant: true, code: "token_refresh_failed" });
  });
  test("a missing refresh token throws before any network call", async () => {
    await expect(refreshCalendarAccessToken({ refreshToken: "", fetchImpl: () => { throw new Error("should not fetch"); } }))
      .rejects.toBeInstanceOf(GoogleCalendarError);
  });
});

describe("meetUrlOfEvent", () => {
  test("prefers a Meet hangoutLink", () => {
    expect(meetUrlOfEvent({ hangoutLink: "https://meet.google.com/abc-defg-hij" })).toBe("https://meet.google.com/abc-defg-hij");
  });
  test("falls back to a conferenceData video entry point on meet.google.com", () => {
    expect(meetUrlOfEvent({ conferenceData: { entryPoints: [{ entryPointType: "phone", uri: "tel:+1" }, { entryPointType: "video", uri: "https://meet.google.com/xyz" }] } }))
      .toBe("https://meet.google.com/xyz");
  });
  test("ignores non-Meet links (Zoom/Teams pasted into a Google event)", () => {
    expect(meetUrlOfEvent({ hangoutLink: "https://zoom.us/j/1", conferenceData: { entryPoints: [{ entryPointType: "video", uri: "https://teams.microsoft.com/x" }] } })).toBeNull();
  });
  test("returns null when there is no conferencing", () => {
    expect(meetUrlOfEvent({})).toBeNull();
  });
});

describe("eventPassesScope", () => {
  const organized = { organizer: { self: true }, status: "confirmed" };
  const acceptedInvite = { attendees: [{ self: true, responseStatus: "accepted" }], status: "confirmed" };
  const declinedInvite = { attendees: [{ self: true, responseStatus: "declined" }], status: "confirmed" };
  const tentative = { attendees: [{ self: true, responseStatus: "tentative" }], status: "confirmed" };

  test("organizer scope: only self-organized", () => {
    expect(eventPassesScope(organized, "organizer")).toBe(true);
    expect(eventPassesScope(acceptedInvite, "organizer")).toBe(false);
  });
  test("accepted scope (default): organizer or accepted; not declined/tentative", () => {
    expect(eventPassesScope(organized, "accepted")).toBe(true);
    expect(eventPassesScope(acceptedInvite, "accepted")).toBe(true);
    expect(eventPassesScope(declinedInvite, "accepted")).toBe(false);
    expect(eventPassesScope(tentative, "accepted")).toBe(false);
  });
  test("all scope: any non-cancelled", () => {
    expect(eventPassesScope(declinedInvite, "all")).toBe(true);
  });
  test("a cancelled event never qualifies, under any scope", () => {
    expect(eventPassesScope({ ...organized, status: "cancelled" }, "organizer")).toBe(false);
    expect(eventPassesScope({ ...organized, status: "cancelled" }, "all")).toBe(false);
  });
});

describe("listUpcomingMeetEvents", () => {
  test("normalizes only timed events that carry a Meet link; drops all-day + non-Meet", async () => {
    const items = [
      { id: "e1", iCalUID: "u1", start: { dateTime: "2026-07-23T10:00:00Z" }, hangoutLink: "https://meet.google.com/aaa", organizer: { self: true }, status: "confirmed" },
      { id: "e2", iCalUID: "u2", start: { date: "2026-07-24" }, hangoutLink: "https://meet.google.com/bbb" }, // all-day → dropped (no dateTime)
      { id: "e3", iCalUID: "u3", start: { dateTime: "2026-07-23T12:00:00Z" }, summary: "no meet" }, // no meet → dropped
      { id: "e4", iCalUID: "u4", start: { dateTime: "2026-07-23T14:00:00Z" }, hangoutLink: "https://zoom.us/j/1" }, // zoom → dropped
    ];
    let seenUrl;
    const fetchImpl = async (url) => { seenUrl = url; return jsonRes({ items }); };
    const out = await listUpcomingMeetEvents({ accessToken: "at", timeMinIso: "2026-07-23T00:00:00Z", timeMaxIso: "2026-07-24T00:00:00Z", fetchImpl });
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(expect.objectContaining({ eventId: "e1", icalUid: "u1", occurrenceStart: "2026-07-23T10:00:00Z", meetUrl: "https://meet.google.com/aaa", isOrganizer: true }));
    expect(seenUrl).toContain("singleEvents=true");
    expect(seenUrl).toContain("orderBy=startTime");
  });
  test("a 401 from events.list flags invalidGrant (token died mid-flight)", async () => {
    const fetchImpl = async () => jsonRes({ error: { message: "unauthorized" } }, false, 401);
    await expect(listUpcomingMeetEvents({ accessToken: "at", timeMinIso: "a", timeMaxIso: "b", fetchImpl }))
      .rejects.toMatchObject({ invalidGrant: true });
  });
});

describe("occurrenceStartOf", () => {
  test("returns the dateTime for a timed event, null for all-day", () => {
    expect(occurrenceStartOf({ start: { dateTime: "2026-07-23T10:00:00Z" } })).toBe("2026-07-23T10:00:00Z");
    expect(occurrenceStartOf({ start: { date: "2026-07-23" } })).toBeNull();
  });
});
