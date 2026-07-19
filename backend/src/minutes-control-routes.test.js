import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { describe, expect, jest, test } from "@jest/globals";
import { bypassMinutesReadBodyParser } from "./minutes-read-routes.js";
import { buildMinutesControlRouter } from "./minutes-control-routes.js";

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
  const applyCallback = overrides.applyCallback || jest.fn().mockResolvedValue({ status: "accepted" });
  const app = express();
  app.use(bypassMinutesReadBodyParser(express.json({ limit: "10mb" })));
  app.use("/api/minutes", buildMinutesControlRouter({
    enabled: overrides.enabled ?? true,
    baseUrl: "http://minutes-api:8056",
    controlSigningKey: "c".repeat(32),
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
    getRequestId: () => "req-control-01",
    fetchWithTimeout: jest.fn(),
    reserveCapture,
    recordCapture,
    recordCompensation,
    applyCallback,
    forgetMeeting: overrides.forgetMeeting || jest.fn(),
    releaseCapture: overrides.releaseCapture || jest.fn(),
    client,
    now: () => new Date("2026-05-28T13:46:40.000Z"),
  }));
  return { app, client, resolveUser, reserveCapture, recordCapture, recordCompensation, applyCallback };
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
