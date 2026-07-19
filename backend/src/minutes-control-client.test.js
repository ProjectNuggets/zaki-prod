import { describe, expect, jest, test } from "@jest/globals";
import {
  MINUTES_CONTROL_AUTH_HEADER,
  createMinutesCapture,
  getMinutesControlBase,
  stopMinutesCapture,
} from "./minutes-control-client.js";
import { verifyMinutesControlAccessToken } from "./minutes-control-secret.js";

const BASE_OPTIONS = Object.freeze({
  baseUrl: "http://minutes-api:8056/",
  controlToken: "c".repeat(32),
  userId: "42",
  tenantId: "default",
  requestId: "req-control-01",
  timeoutMs: 5_000,
  nowMs: Date.parse("2026-07-19T10:00:00.000Z"),
});

describe("Minutes control service client", () => {
  test("uses one fixed service origin and rejects path or credential injection", () => {
    expect(getMinutesControlBase(" https://minutes.example.test/ ")).toBe("https://minutes.example.test");
    expect(() => getMinutesControlBase("https://user:secret@minutes.example.test")).toThrow("invalid_minutes_control_base_url");
    expect(() => getMinutesControlBase("https://minutes.example.test/api/zaki/control/v1")).toThrow("invalid_minutes_control_base_url");
  });

  test("binds capture path, headers, body identity, and reservation server-side", async () => {
    const fetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    await createMinutesCapture({
      ...BASE_OPTIONS,
      idempotencyKey: "capture-01",
      platform: "google_meet",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      captureAttestation: {
        bot_visible: true,
        bot_display_name: "ZAKI Minutes",
        policy_version: "consent-v1",
        attested_at: "2026-07-19T10:00:00.000Z",
        attested_by_user_id: "42",
      },
      metering: { reservation_id: "hold-01", unit: "bot_minute", reserved_units: 60 },
      fetchWithTimeout,
    });
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://minutes-api:8056/api/zaki/control/v1/42/captures",
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: expect.objectContaining({
          "X-Zaki-Tenant-Id": "default",
          "X-Zaki-User-Id": "42",
          "X-Request-Id": "req-control-01",
          "Idempotency-Key": "capture-01",
        }),
      }),
      5_000,
      "Minutes capture request"
    );
    const body = JSON.parse(fetchWithTimeout.mock.calls[0][1].body);
    const accessToken = fetchWithTimeout.mock.calls[0][1].headers[MINUTES_CONTROL_AUTH_HEADER];
    expect(accessToken).not.toBe("c".repeat(32));
    expect(verifyMinutesControlAccessToken({
      token: accessToken,
      signingKey: "c".repeat(32),
      nowMs: BASE_OPTIONS.nowMs,
    })).toMatchObject({ aud: "zaki-control.v1", tenant_id: "default", user_id: "42", v: 1 });
    expect(body).toMatchObject({
      api_version: "zaki-control.v1",
      request_id: "req-control-01",
      idempotency_key: "capture-01",
      subject: { tenant_id: "default", user_id: "42" },
      metering: { reservation_id: "hold-01", unit: "bot_minute", reserved_units: 60 },
    });
  });

  test("does not perform network work for an invalid capture id", async () => {
    const fetchWithTimeout = jest.fn();
    await expect(stopMinutesCapture({
      ...BASE_OPTIONS,
      captureId: "../../admin",
      idempotencyKey: "stop-01",
      fetchWithTimeout,
    })).rejects.toThrow();
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });
});
