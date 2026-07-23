import { describe, expect, test } from "@jest/globals";
import {
  MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION,
  DEFAULT_JOIN_SCOPE,
  saveAutojoinConsent,
  mirrorCapturePolicy,
  getAutojoinStatus,
  getAutojoinFireContext,
} from "./minutes-calendar-autojoin.js";

// In-memory db that honors the two ON CONFLICT upsert shapes + the events append.
function mockDb() {
  const rows = new Map();
  const events = [];
  // Each writer is now a single data-modifying CTE (state upsert + audit append
  // atomically), so the mock applies BOTH effects per statement.
  const dbQuery = async (text, params) => {
    if (/WITH up AS/.test(text) && /INSERT INTO zaki_calendar_autojoin\b/.test(text)) {
      const uid = params[0];
      const cur = rows.get(uid) || { user_id: uid };
      if (/mirror_capture_enabled/.test(text)) {
        // mirrorCapturePolicy: params = [uid, capEnabled, audio, transcript, summary, policyVersion]
        Object.assign(cur, {
          mirror_capture_enabled: params[1], mirror_audio_days: params[2],
          mirror_transcript_days: params[3], mirror_summary_days: params[4],
          mirror_policy_version: params[5],
        });
        rows.set(uid, cur);
        events.push({ user_id: uid, event: "policy_mirrored" });
      } else {
        // saveAutojoinConsent: params = [uid, enabled, scope, version, at, eventName]
        Object.assign(cur, {
          enabled: params[1], join_scope: params[2], consent_version: params[3], consent_at: params[4],
        });
        rows.set(uid, cur);
        events.push({ user_id: uid, event: params[5] });
      }
      return { rows: [] };
    }
    if (/^\s*SELECT \* FROM zaki_calendar_autojoin\b/.test(text)) {
      return { rows: rows.has(params[0]) ? [rows.get(params[0])] : [] };
    }
    return { rows: [] };
  };
  return { db: { dbQuery }, events, rows };
}

const V = MINUTES_CALENDAR_AUTOJOIN_CONSENT_VERSION;

describe("autojoin consent + scope", () => {
  test("enabling records consent at the current version, defaults scope, and audits", async () => {
    const { db, events } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    const s = await getAutojoinStatus({ userId: 42 }, db);
    expect(s).toEqual(expect.objectContaining({ enabled: true, isCurrent: true, joinScope: DEFAULT_JOIN_SCOPE, requiresReconsent: false }));
    expect(events).toEqual([expect.objectContaining({ event: "consent_granted" })]);
  });

  test("an invalid scope falls back to 'accepted'; a valid one is kept", async () => {
    const { db } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true, joinScope: "nonsense" }, db);
    expect((await getAutojoinStatus({ userId: 42 }, db)).joinScope).toBe("accepted");
    await saveAutojoinConsent({ userId: 42, enabled: true, joinScope: "organizer" }, db);
    expect((await getAutojoinStatus({ userId: 42 }, db)).joinScope).toBe("organizer");
  });

  test("disabling withdraws consent and audits", async () => {
    const { db, events } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    await saveAutojoinConsent({ userId: 42, enabled: false }, db);
    const s = await getAutojoinStatus({ userId: 42 }, db);
    expect(s.enabled).toBe(false);
    expect(events.map((e) => e.event)).toEqual(["consent_granted", "consent_withdrawn"]);
  });

  test("a row consented under an OLD version is not 'enabled' and requires reconsent", async () => {
    const { db, rows } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    rows.get("42").consent_version = "2020-01-01.old.v0"; // simulate a version bump
    const s = await getAutojoinStatus({ userId: 42 }, db);
    expect(s.enabled).toBe(false);
    expect(s.requiresReconsent).toBe(true);
    expect(s.isCurrent).toBe(false);
  });

  test("rejects an invalid user id", async () => {
    await expect(saveAutojoinConsent({ userId: "0", enabled: true }, mockDb().db)).rejects.toThrow(
      expect.objectContaining({ code: "calendar_autojoin_user_invalid" })
    );
  });
});

describe("capture-policy mirror + poller fire-context", () => {
  test("shouldFire is false until enabled + current consent + capture-enabled mirror + a mirrored policy_version are all present", async () => {
    const { db } = mockDb();
    // nothing yet
    expect((await getAutojoinFireContext({ userId: 42 }, db)).reason).toBe("not_configured");
    // consent on, but no mirror yet
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    expect((await getAutojoinFireContext({ userId: 42 }, db)).reason).toBe("capture_disabled");
    // mirror says capture disabled
    await mirrorCapturePolicy({ userId: 42, captureEnabled: false, retention: { transcript_days: 30 }, policyVersion: "v1" }, db);
    expect((await getAutojoinFireContext({ userId: 42 }, db)).reason).toBe("capture_disabled");
    // mirror capture enabled + policy_version → shouldFire
    await mirrorCapturePolicy({ userId: 42, captureEnabled: true, retention: { audio_days: 0, transcript_days: 60, summary_days: 60 }, policyVersion: "v2" }, db);
    const ctx = await getAutojoinFireContext({ userId: 42 }, db);
    expect(ctx.shouldFire).toBe(true);
    expect(ctx.reason).toBeNull();
    expect(ctx.joinScope).toBe("accepted");
    expect(ctx.policy).toEqual(expect.objectContaining({ captureEnabled: true, policyVersion: "v2", retention: expect.objectContaining({ transcript_days: 60 }) }));
  });

  test("shouldFire drops to false the moment consent is withdrawn, even with a live mirror", async () => {
    const { db } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    await mirrorCapturePolicy({ userId: 42, captureEnabled: true, retention: { transcript_days: 30 }, policyVersion: "v2" }, db);
    expect((await getAutojoinFireContext({ userId: 42 }, db)).shouldFire).toBe(true);
    await saveAutojoinConsent({ userId: 42, enabled: false }, db);
    const ctx = await getAutojoinFireContext({ userId: 42 }, db);
    expect(ctx.shouldFire).toBe(false);
    expect(ctx.reason).toBe("disabled");
  });

  test("a policy mirrored but never version-stamped blocks firing (policy_unmirrored)", async () => {
    const { db } = mockDb();
    await saveAutojoinConsent({ userId: 42, enabled: true }, db);
    await mirrorCapturePolicy({ userId: 42, captureEnabled: true, retention: {}, policyVersion: null }, db);
    expect((await getAutojoinFireContext({ userId: 42 }, db)).reason).toBe("policy_unmirrored");
  });
});
