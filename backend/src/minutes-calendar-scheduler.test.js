import { describe, expect, jest, test } from "@jest/globals";
import { fireDedupKey, pollConnection, runCalendarAutojoinSweep } from "./minutes-calendar-scheduler.js";

const NOW = new Date("2026-07-23T10:00:00.000Z");
// An event starting in 30s — inside the [start-60s, start+600s] window.
const soonEvent = {
  eventId: "e1", icalUid: "u1", occurrenceStart: "2026-07-23T10:00:30.000Z",
  meetUrl: "https://meet.google.com/abc-defg-hij", status: "confirmed", isOrganizer: true,
};

function makeDeps(overrides = {}) {
  const calls = { markInvalidGrant: [], claimFire: [], fire: [] };
  const deps = {
    tenantId: "default",
    now: () => NOW,
    getFireContext: jest.fn().mockResolvedValue({ shouldFire: true, reason: null, joinScope: "accepted", policy: { captureEnabled: true, policyVersion: "v2", retention: { transcript_days: 30 } } }),
    decryptRefreshToken: jest.fn().mockResolvedValue("1//rt"),
    refreshAccessToken: jest.fn().mockResolvedValue({ accessToken: "at" }),
    listEvents: jest.fn().mockResolvedValue([soonEvent]),
    eventPassesScope: jest.fn().mockReturnValue(true),
    markInvalidGrant: jest.fn(async (a) => { calls.markInvalidGrant.push(a); }),
    claimFire: jest.fn(async (a) => { calls.claimFire.push(a); return true; }),
    loadZakiUser: jest.fn().mockResolvedValue({ id: 42, plan_tier: "personal" }),
    fireCapture: jest.fn(async (a) => { calls.fire.push(a); return { ok: true, capture: { captureId: "capture-01", meetingId: "m1", state: "requested" } }; }),
    recordFailure: jest.fn(),
    ...overrides,
  };
  return { deps, calls };
}
const connection = { user_id: "42" };

describe("pollConnection safety gates", () => {
  test("happy path: dedup-claim → re-check consent → fire, with the dedup key as the idempotency key", async () => {
    const { deps, calls } = makeDeps();
    const s = await pollConnection({ connection, deps });
    expect(s.fired).toEqual([{ eventId: "e1", captureId: "capture-01" }]);
    const key = fireDedupKey({ tenantId: "default", meetingUrl: soonEvent.meetUrl, occurrenceStart: soonEvent.occurrenceStart });
    expect(calls.fire[0].input).toEqual(expect.objectContaining({ platform: "google_meet", meeting_url: soonEvent.meetUrl, idempotency_key: key }));
    expect(calls.fire[0].context).toEqual(expect.objectContaining({ userId: "42", tenantId: "default", zakiUser: { id: 42, plan_tier: "personal" } }));
  });

  test("gate 1: shouldFire=false → nothing fires", async () => {
    const { deps, calls } = makeDeps({ getFireContext: jest.fn().mockResolvedValue({ shouldFire: false, reason: "capture_disabled" }) });
    const s = await pollConnection({ connection, deps });
    expect(s.reason).toBe("capture_disabled");
    expect(calls.fire).toHaveLength(0);
  });

  test("gate 5: invalid_grant on refresh → marks the connection dead, fires nothing", async () => {
    const err = Object.assign(new Error("revoked"), { invalidGrant: true });
    const { deps, calls } = makeDeps({ refreshAccessToken: jest.fn().mockRejectedValue(err) });
    const s = await pollConnection({ connection, deps });
    expect(s.reason).toBe("invalid_grant");
    expect(calls.markInvalidGrant).toEqual([{ userId: "42" }]);
    expect(calls.fire).toHaveLength(0);
  });

  test("gate 2: an out-of-scope event is skipped, not fired", async () => {
    const { deps, calls } = makeDeps({ eventPassesScope: jest.fn().mockReturnValue(false) });
    const s = await pollConnection({ connection, deps });
    expect(s.skipped[0]).toEqual({ eventId: "e1", reason: "scope" });
    expect(calls.fire).toHaveLength(0);
  });

  test("gate 2: an event outside the fire window is skipped", async () => {
    const farEvent = { ...soonEvent, occurrenceStart: "2026-07-23T12:00:00.000Z" }; // 2h out
    const { deps, calls } = makeDeps({ listEvents: jest.fn().mockResolvedValue([farEvent]) });
    const s = await pollConnection({ connection, deps });
    expect(s.skipped[0]).toEqual({ eventId: "e1", reason: "window" });
    expect(calls.fire).toHaveLength(0);
  });

  test("gate 3: losing the dedup claim (another attendee/replica) skips without firing", async () => {
    const { deps, calls } = makeDeps({ claimFire: jest.fn().mockResolvedValue(false) });
    const s = await pollConnection({ connection, deps });
    expect(s.skipped[0]).toEqual({ eventId: "e1", reason: "already_claimed" });
    expect(calls.fire).toHaveLength(0);
  });

  test("consent withdrawn between the top-of-poll read and the fire → claimed but not fired", async () => {
    const getFireContext = jest.fn()
      .mockResolvedValueOnce({ shouldFire: true, joinScope: "accepted", policy: { captureEnabled: true, policyVersion: "v2", retention: {} } })
      .mockResolvedValueOnce({ shouldFire: false, reason: "disabled" });
    const { deps, calls } = makeDeps({ getFireContext });
    const s = await pollConnection({ connection, deps });
    expect(s.skipped[0]).toEqual({ eventId: "e1", reason: "revoked_before_fire" });
    expect(calls.fire).toHaveLength(0);
  });

  test("a fire-capture failure is recorded and surfaced, not thrown", async () => {
    const { deps } = makeDeps({ fireCapture: jest.fn().mockResolvedValue({ ok: false, kind: "upstream" }) });
    const s = await pollConnection({ connection, deps });
    expect(s.skipped[0]).toEqual({ eventId: "e1", reason: "fire_upstream" });
  });

  test("the dedup key is identical for two attendees of the same meeting-occurrence (one bot per meeting)", () => {
    const a = fireDedupKey({ tenantId: "default", meetingUrl: soonEvent.meetUrl, occurrenceStart: soonEvent.occurrenceStart });
    const b = fireDedupKey({ tenantId: "default", meetingUrl: soonEvent.meetUrl, occurrenceStart: soonEvent.occurrenceStart });
    const other = fireDedupKey({ tenantId: "default", meetingUrl: soonEvent.meetUrl, occurrenceStart: "2026-07-30T10:00:30.000Z" });
    expect(a).toBe(b);
    expect(a).not.toBe(other); // a different occurrence of the same recurring series is its own bot
  });
});

describe("runCalendarAutojoinSweep", () => {
  test("claims connections and polls each; a crashing connection doesn't abort the sweep", async () => {
    const good = { user_id: "42" };
    const bad = { user_id: "99" };
    const base = makeDeps();
    const getFireContext = jest.fn(async ({ userId }) => {
      if (userId === "99") throw new Error("boom");
      return { shouldFire: true, joinScope: "accepted", policy: { captureEnabled: true, policyVersion: "v2", retention: {} } };
    });
    const deps = { ...base.deps, getFireContext, claimConnections: jest.fn().mockResolvedValue([bad, good]) };
    const summaries = await runCalendarAutojoinSweep({ deps });
    expect(deps.recordFailure).toHaveBeenCalledWith(expect.objectContaining({ stage: "poll", userId: "99" }));
    expect(summaries.some((x) => x.userId === "42" && x.fired.length === 1)).toBe(true);
  });
});
