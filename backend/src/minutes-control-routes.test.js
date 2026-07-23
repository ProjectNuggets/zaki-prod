import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { bypassMinutesReadBodyParser } from "./minutes-read-routes.js";
import { buildMinutesControlRouter, createMinutesCaptureForUser } from "./minutes-control-routes.js";

const CALLBACK_SECRET = "w".repeat(32);
const HOLD_ID = "00000000-0000-4000-8000-000000000001";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildApp(overrides = {}) {
  const resolveUser = overrides.resolveUser || jest.fn().mockResolvedValue({
    zakiUser: { id: 42, verified: true, plan_tier: "personal" },
  });
  const client = {
    ensure: jest.fn().mockResolvedValue(jsonResponse({
      api_version: "zaki-control.v1", request_id: "req-control-01", operation_id: "op-ensure-01",
      subject: { tenant_id: "default", user_id: "42" }, state: "ready", policy_version: "minutes-capture-consent-v1",
    })),
    createCapture: jest.fn().mockResolvedValue(jsonResponse({
      api_version: "zaki-control.v1", request_id: "req-control-01", operation_id: "op-capture-01",
      subject: { tenant_id: "default", user_id: "42" }, capture_id: "capture-01", meeting_id: "meeting-01",
      state: "requested", metering: { reservation_id: HOLD_ID },
    }, 202)),
    getCapture: jest.fn().mockResolvedValue(jsonResponse({
      api_version: "zaki-control.v1", request_id: "req-control-01", subject: { tenant_id: "default", user_id: "42" },
      capture_id: "capture-01", meeting_id: "meeting-01", state: "active",
      metering: { reservation_id: HOLD_ID, captured_seconds_total: 61, terminal: false },
    })),
    stopCapture: jest.fn(),
    eraseMeeting: jest.fn(),
    eraseAccount: jest.fn(),
    ...overrides.client,
  };
  const reserveCapture = overrides.reserveCapture || jest.fn().mockResolvedValue({ hold: { id: HOLD_ID } });
  const recordCapture = overrides.recordCapture || jest.fn().mockResolvedValue({ capture_id: "capture-01" });
  const recordCompensation = overrides.recordCompensation || jest.fn().mockResolvedValue({ capture_id: "capture-01" });
  const markRecoveryCapture = overrides.markRecoveryCapture || jest.fn().mockResolvedValue({ recovery_id: "recovery-01" });
  const markRecoveryPreSpawnOutcome = overrides.markRecoveryPreSpawnOutcome || jest.fn().mockResolvedValue({ recovery_id: "recovery-01" });
  const applyCallback = overrides.applyCallback || jest.fn().mockResolvedValue({ status: "accepted" });
  const app = express();
  app.use(bypassMinutesReadBodyParser(express.json({ limit: "10mb" })));
  app.use("/api/minutes", buildMinutesControlRouter({
    enabled: overrides.enabled ?? true,
    baseUrl: "http://minutes-api:8056",
    controlSigningKey: "c".repeat(32),
    recoveryEncryptionKey: overrides.recoveryEncryptionKey || "r".repeat(32),
    callbackHmacKey: overrides.callbackHmacKey ?? CALLBACK_SECRET,
    timeoutMs: 5_000,
    policy: {
      capture_notice_policy_version: "minutes-capture-consent-v1",
      retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
    },
    captureReserveUnits: overrides.captureReserveUnits ?? 60,
    captureHoldTtlMs: overrides.captureHoldTtlMs ?? 3_900_000,
    captureMaxSeconds: overrides.captureMaxSeconds ?? 3_600,
    resolveUser,
    getRequestId: overrides.getRequestId || (() => "req-control-01"),
    fetchWithTimeout: jest.fn(),
    reserveCapture,
    recordCapture,
    recordCompensation,
    markRecoveryCapture,
    markRecoveryPreSpawnOutcome,
    decryptRecoveryRequest: overrides.decryptRecoveryRequest,
    applyCallback,
    forgetMeeting: overrides.forgetMeeting || jest.fn(),
    releaseCapture: overrides.releaseCapture || jest.fn(),
    recordCapturePolicyMirror: overrides.recordCapturePolicyMirror,
    client,
    now: () => new Date("2026-05-28T13:46:40.000Z"),
  }));
  return {
    app,
    client,
    resolveUser,
    reserveCapture,
    recordCapture,
    recordCompensation,
    markRecoveryCapture,
    markRecoveryPreSpawnOutcome,
    applyCallback,
  };
}

function signedCallback(envelope) {
  const timestamp = "1779976000";
  const raw = JSON.stringify(envelope);
  const signature = `sha256=${createHmac("sha256", CALLBACK_SECRET).update(`${timestamp}.${raw}`).digest("hex")}`;
  return { timestamp, raw, signature };
}

const CALLBACK = {
  event_id: "event-01",
  event_type: "minutes.capture.status",
  api_version: "zaki-control.v1",
  created_at: "2026-05-28T13:46:40.000Z",
  data: {
    subject: { tenant_id: "default", user_id: "42" },
    operation_id: "op-capture-01",
    capture_id: "capture-01",
    meeting_id: "meeting-01",
    state: "joining",
  },
};

describe("Minutes control BFF routes", () => {
  test("stays dark by default without authenticating or touching control dependencies", async () => {
    const { app, resolveUser, client } = buildApp({ enabled: false });
    const response = await request(app).get("/api/minutes/control");
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: "minutes_control_disabled", retryable: false });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(resolveUser).not.toHaveBeenCalled();
    expect(client.ensure).not.toHaveBeenCalled();
  });

  test("does not shadow the read plane while control is dark", async () => {
    const { app, resolveUser } = buildApp({ enabled: false });
    app.get("/api/minutes/index", (_req, res) => res.status(200).json({ source: "read-plane" }));

    const response = await request(app).get("/api/minutes/index");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: "read-plane" });
    expect(resolveUser).not.toHaveBeenCalled();
  });

  test("authenticates before parsing a control consent body", async () => {
    const resolveUser = jest.fn().mockImplementation(async (_req, res) => {
      res.status(401).json({ error: "unauthorized" });
      return null;
    });
    const { app, client } = buildApp({ resolveUser });
    const response = await request(app)
      .post("/api/minutes/control/consent")
      .set("content-type", "application/json")
      .send("{not-json");
    expect(response.status).toBe(401);
    expect(resolveUser).toHaveBeenCalledTimes(1);
    expect(client.ensure).not.toHaveBeenCalled();
  });

  test("WP-M10: mirrors capture-enabled from the ENGINE's confirmed state, not the request (idempotent-replay fire-open guard)", async () => {
    const recordCapturePolicyMirror = jest.fn().mockResolvedValue(undefined);
    // Engine confirms capture DISABLED (e.g. an idempotent replay or an entitlement
    // override), even though the request said capture_enabled:true.
    const { app } = buildApp({
      recordCapturePolicyMirror,
      client: {
        ensure: jest.fn().mockResolvedValue(jsonResponse({
          api_version: "zaki-control.v1", request_id: "req-control-01", operation_id: "op-ensure-01",
          subject: { tenant_id: "default", user_id: "42" }, state: "disabled", policy_version: "minutes-capture-consent-v1",
        })),
      },
    });
    const res = await request(app)
      .post("/api/minutes/control/consent")
      .set("x-zaki-user-id", "999")
      .set("x-zaki-control-token", "browser-controlled")
      .send({ capture_enabled: true, agent_read_enabled: false, retention: { audio_days: 0, transcript_days: 30, summary_days: 30 }, idempotency_key: "consent-replay" });
    expect(res.status).toBe(200);
    expect(recordCapturePolicyMirror).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      captureEnabled: false, // NOT the request's true — the engine said disabled
      policyVersion: "minutes-capture-consent-v1",
    }));
  });

  test("WP-M10: a mirror-write failure never fails the consent save", async () => {
    const recordCapturePolicyMirror = jest.fn().mockRejectedValue(new Error("mirror db down"));
    const { app } = buildApp({ recordCapturePolicyMirror });
    const res = await request(app)
      .post("/api/minutes/control/consent")
      .set("x-zaki-user-id", "999")
      .set("x-zaki-control-token", "browser-controlled")
      .send({ capture_enabled: true, agent_read_enabled: false, retention: { audio_days: 0, transcript_days: 30, summary_days: 30 }, idempotency_key: "consent-mirrorfail" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "ready", policyVersion: "minutes-capture-consent-v1" });
  });

  test("derives consent identity from auth and forwards only a bounded contract policy", async () => {
    const { app, client } = buildApp();
    const response = await request(app)
      .post("/api/minutes/control/consent")
      .set("x-zaki-user-id", "999")
      .set("x-zaki-control-token", "browser-controlled")
      .send({
        capture_enabled: true,
        agent_read_enabled: false,
        retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
        idempotency_key: "consent-01",
      });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: "ready", policyVersion: "minutes-capture-consent-v1" });
    expect(client.ensure).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42", tenantId: "default", requestId: "req-control-01", idempotencyKey: "consent-01",
      policy: expect.objectContaining({ capture_notice_policy_version: "minutes-capture-consent-v1" }),
    }));
    expect(client.ensure.mock.calls[0][0]).not.toHaveProperty("req");
  });

  test("reserves server-side units and submits one visible-bot capture request", async () => {
    const { app, client, reserveCapture, recordCapture } = buildApp();
    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-01",
      });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ captureId: "capture-01", meetingId: "meeting-01", state: "requested" });
    expect(reserveCapture).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "default", idempotencyKey: "capture-01", reservedUnits: 60,
    }));
    expect(client.createCapture).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      metering: { reservation_id: HOLD_ID, unit: "bot_minute", reserved_units: 60 },
      captureAttestation: expect.objectContaining({
        bot_visible: true, bot_display_name: "ZAKI Notetaker", attested_by_user_id: "42", policy_version: "minutes-capture-consent-v1",
      }),
    }));
    expect(recordCapture).toHaveBeenCalledWith(expect.objectContaining({ reservationId: HOLD_ID, userId: "42" }));
  });

  test("reuses the durable request id for a browser idempotency retry", async () => {
    const originalRequestId = "req-capture-original";
    const reserveCapture = jest.fn().mockResolvedValue({
      hold: { id: HOLD_ID },
      recoveryIntent: { recovery_id: "recovery-01", request_id: originalRequestId, state: "prepared" },
    });
    const decryptRecoveryRequest = jest.fn().mockReturnValue({
      platform: "google_meet",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      captureAttestation: {
        bot_visible: true,
        bot_display_name: "ZAKI Notetaker",
        policy_version: "minutes-capture-consent-v1",
        attested_at: "2026-05-28T13:46:40.000Z",
        attested_by_user_id: "42",
      },
      metering: { reservation_id: HOLD_ID, unit: "bot_minute", reserved_units: 60 },
    });
    const createCapture = jest.fn().mockResolvedValue(jsonResponse({
      api_version: "zaki-control.v1", request_id: originalRequestId, operation_id: "op-capture-01",
      subject: { tenant_id: "default", user_id: "42" }, capture_id: "capture-01", meeting_id: "meeting-01",
      state: "requested", metering: { reservation_id: HOLD_ID },
    }, 202));
    const { app } = buildApp({
      reserveCapture,
      decryptRecoveryRequest,
      client: { createCapture },
      getRequestId: () => "req-browser-retry",
    });

    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-01",
      });

    expect(response.status).toBe(202);
    expect(createCapture).toHaveBeenCalledWith(expect.objectContaining({ requestId: originalRequestId }));
    expect(decryptRecoveryRequest).toHaveBeenCalledWith(expect.objectContaining({
      recovery: expect.objectContaining({ recovery_id: "recovery-01" }),
    }));
  });

  test("does not create again from a durably blocked recovery intent", async () => {
    const reserveCapture = jest.fn().mockResolvedValue({
      hold: { id: HOLD_ID },
      recoveryIntent: { recovery_id: "recovery-01", request_id: "req-control-01", state: "blocked" },
    });
    const decryptRecoveryRequest = jest.fn();
    const createCapture = jest.fn();
    const { app } = buildApp({ reserveCapture, decryptRecoveryRequest, client: { createCapture } });

    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-01",
      });

    expect(response.status).toBe(503);
    expect(createCapture).not.toHaveBeenCalled();
    expect(decryptRecoveryRequest).not.toHaveBeenCalled();
  });

  test("leaves a browser-side create rejection for the leased reconciler instead of releasing its hold", async () => {
    const reserveCapture = jest.fn().mockResolvedValue({
      hold: { id: HOLD_ID },
      recoveryIntent: { recovery_id: "recovery-01", request_id: "req-control-01", state: "prepared" },
    });
    const markRecoveryPreSpawnOutcome = jest.fn().mockResolvedValue({ state: "create_uncertain" });
    const releaseCapture = jest.fn();
    const createCapture = jest.fn().mockResolvedValue(new Response("{}", { status: 400 }));
    const { app } = buildApp({
      reserveCapture,
      markRecoveryPreSpawnOutcome,
      releaseCapture,
      decryptRecoveryRequest: jest.fn().mockReturnValue({
        platform: "google_meet",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        captureAttestation: {
          bot_visible: true,
          bot_display_name: "ZAKI Notetaker",
          policy_version: "minutes-capture-consent-v1",
          attested_at: "2026-05-28T13:46:40.000Z",
          attested_by_user_id: "42",
        },
        metering: { reservation_id: HOLD_ID, unit: "bot_minute", reserved_units: 60 },
      }),
      client: { createCapture },
    });

    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-01",
      });

    expect(response.status).toBe(400);
    expect(markRecoveryPreSpawnOutcome).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: "recovery-01",
      state: "create_uncertain",
      errorCode: "engine_create_rejected",
    }));
    expect(releaseCapture).not.toHaveBeenCalled();
  });

  test("fails closed before reservation when the configured hold cannot fund the engine maximum", async () => {
    const { app, reserveCapture, client } = buildApp({ captureMaxSeconds: 3_601, captureReserveUnits: 60 });
    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-window-invalid",
      });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "minutes_control_unavailable", retryable: true });
    expect(reserveCapture).not.toHaveBeenCalled();
    expect(client.createCapture).not.toHaveBeenCalled();
  });

  test("compensates an engine-created capture when local persistence fails and retains its hold", async () => {
    const recordCapture = jest.fn().mockRejectedValue(new Error("database temporarily unavailable"));
    const recordCompensation = jest.fn().mockResolvedValue({ capture_id: "capture-01" });
    const stopCapture = jest.fn().mockResolvedValue(jsonResponse({
      api_version: "zaki-control.v1", request_id: "req-control-01", subject: { tenant_id: "default", user_id: "42" },
      capture_id: "capture-01", meeting_id: "meeting-01", state: "stopping",
      metering: { reservation_id: HOLD_ID, captured_seconds_total: 0, terminal: false },
    }));
    const releaseCapture = jest.fn();
    const { app, client } = buildApp({
      recordCapture,
      recordCompensation,
      releaseCapture,
      client: { stopCapture },
    });
    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-persist-failure",
      });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: "minutes_control_unavailable", retryable: true });
    expect(stopCapture).toHaveBeenCalledWith(expect.objectContaining({
      captureId: "capture-01",
      idempotencyKey: expect.stringMatching(/^minutes-compensate-[a-f0-9]{64}$/),
    }));
    expect(recordCompensation).toHaveBeenNthCalledWith(1, expect.objectContaining({
      captureId: "capture-01", reservationId: HOLD_ID, stopState: "stop_pending",
    }));
    expect(recordCompensation).toHaveBeenLastCalledWith(expect.objectContaining({ stopState: "stop_requested" }));
    expect(releaseCapture).not.toHaveBeenCalled();
    expect(client.createCapture).toHaveBeenCalledTimes(1);
  });

  test("keeps the pre-spawn recovery owner when both primary and legacy compensation writes fail", async () => {
    const recordCapture = jest.fn().mockRejectedValue(new Error("primary write failed"));
    const recordCompensation = jest.fn().mockRejectedValue(new Error("legacy compensation write failed"));
    const markRecoveryCapture = jest.fn().mockResolvedValue({ recovery_id: "recovery-01" });
    const stopCapture = jest.fn().mockRejectedValue(new Error("stop timeout"));
    const reserveCapture = jest.fn().mockResolvedValue({
      hold: { id: HOLD_ID },
      recoveryIntent: { recovery_id: "recovery-01" },
    });
    const releaseCapture = jest.fn();
    const { app } = buildApp({
      reserveCapture,
      recordCapture,
      recordCompensation,
      markRecoveryCapture,
      decryptRecoveryRequest: jest.fn().mockReturnValue({
        platform: "google_meet",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        captureAttestation: {
          bot_visible: true,
          bot_display_name: "ZAKI Notetaker",
          policy_version: "minutes-capture-consent-v1",
          attested_at: "2026-05-28T13:46:40.000Z",
          attested_by_user_id: "42",
        },
        metering: { reservation_id: HOLD_ID, unit: "bot_minute", reserved_units: 60 },
      }),
      releaseCapture,
      client: { stopCapture },
    });

    const response = await request(app)
      .post("/api/minutes/captures")
      .send({
        platform: "google_meet",
        meeting_url: "https://meet.google.com/abc-defg-hij",
        visible_bot_attested: true,
        idempotency_key: "capture-double-write-failure",
      });

    expect(response.status).toBe(503);
    expect(recordCapture).toHaveBeenCalledWith(expect.objectContaining({ recoveryIntentId: "recovery-01" }));
    expect(recordCompensation).toHaveBeenCalledWith(expect.objectContaining({ stopState: "stop_pending" }));
    expect(markRecoveryCapture).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: "recovery-01",
      captureId: "capture-01",
      state: "stop_pending",
    }));
    expect(markRecoveryCapture).toHaveBeenLastCalledWith(expect.objectContaining({ state: "stop_pending" }));
    expect(releaseCapture).not.toHaveBeenCalled();
  });

  test("rejects invalid raw callbacks before invoking state or wallet work", async () => {
    const { app, applyCallback } = buildApp();
    const { timestamp, raw, signature } = signedCallback(CALLBACK);
    const response = await request(app)
      .post("/api/minutes/callback/v1")
      .set("content-type", "application/json")
      .set("x-webhook-timestamp", timestamp)
      .set("x-webhook-signature", signature)
      .send(raw.replace("joining", "active"));
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ api_version: "zaki-control.v1", code: "auth_failed", retryable: false });
    expect(applyCallback).not.toHaveBeenCalled();
  });

  test("acknowledges a trusted duplicate callback without exposing callback secrets", async () => {
    const { app, applyCallback } = buildApp({ applyCallback: jest.fn().mockResolvedValue({ status: "duplicate" }) });
    const { timestamp, raw, signature } = signedCallback(CALLBACK);
    const response = await request(app)
      .post("/api/minutes/callback/v1")
      .set("content-type", "application/json")
      .set("x-webhook-timestamp", timestamp)
      .set("x-webhook-signature", signature)
      .send(raw);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ api_version: "zaki-control.v1", event_id: "event-01", status: "duplicate" });
    expect(applyCallback).toHaveBeenCalledWith({ envelope: CALLBACK });
    expect(JSON.stringify(response.body)).not.toContain(CALLBACK_SECRET);
  });

  test("uses a callback-safe unavailable response while the evidence gate is closed", async () => {
    const { app, applyCallback } = buildApp({ enabled: false });
    const response = await request(app).post("/api/minutes/callback/v1").send("ignored");
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ api_version: "zaki-control.v1", code: "upstream_unavailable", retryable: true });
    expect(applyCallback).not.toHaveBeenCalled();
  });

  test("treats a missing callback verifier as retryable unavailability", async () => {
    const { app, applyCallback } = buildApp({ callbackHmacKey: "" });
    const response = await request(app).post("/api/minutes/callback/v1").send("ignored");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ api_version: "zaki-control.v1", code: "upstream_unavailable", retryable: true });
    expect(applyCallback).not.toHaveBeenCalled();
  });
});

describe("forget meeting id normalization", () => {
  test("the read-plane item id shape (meeting:6) erases the bare meeting id", async () => {
    // The archive UI hands back its read-plane item id; forwarding it verbatim made the
    // engine erase NOTHING while answering success-shaped (owner round-3 finding).
    const forgetMeeting = jest.fn();
    const { app, client } = buildApp({
      forgetMeeting,
      client: {
        eraseMeeting: jest.fn().mockResolvedValue(jsonResponse({
          api_version: "zaki-control.v1", request_id: "req-control-01", operation_id: "op-erase-01",
          subject: { tenant_id: "default", user_id: "42" },
          scope: "meeting", target_id: "6", status: "completed",
          receipt: {
            receipt_id: "erase-01", erased_at: "2026-05-28T13:46:40.000Z",
            counts: { meeting_rows: 1, transcript_rows: 0, summary_rows: 0, recording_objects: 0 },
          },
        })),
      },
    });
    const response = await request(app)
      .post("/api/minutes/meetings/meeting%3A6/forget")
      .send({ idempotency_key: "forget-1" });
    expect(response.status).toBe(200);
    expect(client.eraseMeeting).toHaveBeenCalledWith(expect.objectContaining({ meetingId: "6" }));
    expect(forgetMeeting).toHaveBeenCalledWith(expect.objectContaining({ meetingId: "6" }));
  });

  // WP-M10 slice 4: the extracted, res-decoupled pipeline the calendar poller will call.
  describe("createMinutesCaptureForUser (server-side, non-HTTP)", () => {
    function captureDeps(overrides = {}) {
      return {
        baseUrl: "http://minutes-api:8056", controlSigningKey: "c".repeat(32), callbackHmacKey: CALLBACK_SECRET,
        timeoutMs: 5_000, tokenTtlSeconds: 60,
        policy: { capture_notice_policy_version: "minutes-capture-consent-v1", retention: { audio_days: 0, transcript_days: 30, summary_days: 30 } },
        captureReserveUnits: 60, captureHoldTtlMs: 3_900_000, captureMaxSeconds: 3_600,
        getRequestId: () => "req-control-01", fetchWithTimeout: jest.fn(),
        resolvePlan: jest.fn(), recoveryEncryptionKey: "r".repeat(32),
        reserveCapture: jest.fn().mockResolvedValue({ hold: { id: HOLD_ID } }),
        recordCapture: jest.fn().mockResolvedValue({ capture_id: "capture-01" }),
        markRecoveryPreSpawnOutcome: jest.fn().mockResolvedValue({}),
        decryptRecoveryRequest: jest.fn(),
        recordFailure: jest.fn(),
        now: () => new Date("2026-05-28T13:46:40.000Z"),
        client: {
          createCapture: jest.fn().mockResolvedValue(jsonResponse({
            api_version: "zaki-control.v1", request_id: "req-control-01", operation_id: "op-capture-01",
            subject: { tenant_id: "default", user_id: "42" }, capture_id: "capture-01", meeting_id: "meeting-01",
            state: "requested", metering: { reservation_id: HOLD_ID },
          }, 202)),
        },
        ...overrides,
      };
    }
    const context = { userId: "42", tenantId: "default", requestId: "req-control-01", zakiUser: { id: 42, plan_tier: "personal" } };
    const input = { platform: "google_meet", meeting_url: "https://meet.google.com/abc-defg-hij", idempotency_key: "sched-01" };

    test("reserves, creates, persists, and returns a capture result — building the visible-bot attestation server-side", async () => {
      const dependencies = captureDeps();
      const result = await createMinutesCaptureForUser({ context, input, dependencies });
      expect(result).toEqual({ ok: true, capture: { captureId: "capture-01", meetingId: "meeting-01", state: "requested" } });
      expect(dependencies.reserveCapture).toHaveBeenCalled();
      expect(dependencies.recordCapture).toHaveBeenCalled();
      // The attestation is server-built from context.userId (never a browser tick).
      expect(dependencies.client.createCapture).toHaveBeenCalledWith(expect.objectContaining({
        captureAttestation: expect.objectContaining({ bot_visible: true, attested_by_user_id: "42" }),
      }));
    });

    test("returns a discriminated upstream failure (never throws) so the caller maps it", async () => {
      const dependencies = captureDeps({ client: { createCapture: jest.fn().mockResolvedValue(jsonResponse({ error: "conflict" }, 409)) } });
      const result = await createMinutesCaptureForUser({ context, input, dependencies });
      expect(result.ok).toBe(false);
      expect(result.kind).toBe("upstream");
      expect(result.upstream.status).toBe(409);
      expect(dependencies.recordCapture).not.toHaveBeenCalled();
    });

    test("a bad funding window returns funding_window without reserving a paid hold", async () => {
      const dependencies = captureDeps({ captureReserveUnits: 0 }); // can't fund the engine max
      const result = await createMinutesCaptureForUser({ context, input, dependencies });
      expect(result).toEqual({ ok: false, kind: "funding_window" });
      expect(dependencies.reserveCapture).not.toHaveBeenCalled();
    });
  });
});
