import { createHmac } from "node:crypto";
import { describe, expect, test } from "@jest/globals";
import {
  MINUTES_CONTROL_CALLBACK_WINDOW_SECONDS,
  MinutesControlContractError,
  assertMinutesControlResponseBinding,
  meetingUrlMatchesPlatform,
  parseMinutesBrowserCapture,
  parseMinutesCallbackEnvelope,
  parseMinutesStatusResponse,
  readMinutesControlResponseJson,
  verifyMinutesCallbackSignature,
} from "./minutes-control-contract.js";

const SUBJECT = { tenant_id: "default", user_id: "42" };

describe("Minutes zaki-control.v1 adapter contract", () => {
  test("accepts only a visible-bot capture input on a contract-valid provider URL", () => {
    const input = {
      platform: "google_meet",
      meeting_url: "https://meet.google.com/abc-defg-hij",
      bot_display_name: "ZAKI Minutes",
      visible_bot_attested: true,
      idempotency_key: "capture-01",
    };
    expect(parseMinutesBrowserCapture(input)).toEqual(input);
    expect(() => parseMinutesBrowserCapture({ ...input, visible_bot_attested: false })).toThrow(
      expect.objectContaining({ code: "minutes_control_invalid_request" })
    );
    expect(() => parseMinutesBrowserCapture({ ...input, meeting_url: "https://evil.example/abc-defg-hij" })).toThrow(
      expect.objectContaining({ code: "minutes_control_invalid_request" })
    );
  });

  test("keeps the engine's provider URL recognition strict", () => {
    expect(meetingUrlMatchesPlatform("zoom", "https://acme.zoom.us/j/12345678901")).toBe(true);
    expect(meetingUrlMatchesPlatform("teams", "https://teams.microsoft.com/l/meetup-join/abc")).toBe(true);
    expect(meetingUrlMatchesPlatform("jitsi", "https://meet.jit.si/private-room")).toBe(true);
    expect(meetingUrlMatchesPlatform("jitsi", "https://meet.evil-jitsi.example/private-room")).toBe(false);
    expect(meetingUrlMatchesPlatform("google_meet", "https://meet.google.com/lookup/private")).toBe(false);
  });

  test("verifies the exact timestamp.raw-body HMAC before callback parsing", () => {
    const secret = "k".repeat(32);
    const timestamp = "1780000000";
    const rawBody = Buffer.from('{"event_id":"evt-1"}', "utf8");
    const signature = `sha256=${createHmac("sha256", secret).update(Buffer.concat([
      Buffer.from(`${timestamp}.`, "utf8"), rawBody,
    ])).digest("hex")}`;
    expect(verifyMinutesCallbackSignature({
      rawBody,
      contentType: "application/json",
      timestamp,
      signature,
      secret,
      nowMs: Number(timestamp) * 1_000,
    })).toEqual({ ok: true });
    expect(verifyMinutesCallbackSignature({
      rawBody: Buffer.from('{"event_id":"evt-2"}', "utf8"),
      contentType: "application/json",
      timestamp,
      signature,
      secret,
      nowMs: Number(timestamp) * 1_000,
    })).toEqual({ ok: false, reason: "auth_failed" });
    expect(verifyMinutesCallbackSignature({
      rawBody,
      contentType: "application/json",
      timestamp,
      signature,
      secret,
      nowMs: (Number(timestamp) + MINUTES_CONTROL_CALLBACK_WINDOW_SECONDS + 1) * 1_000,
    })).toEqual({ ok: false, reason: "auth_failed" });
  });

  test("rejects malformed callback envelopes and terminal-state mismatches", () => {
    expect(() => parseMinutesCallbackEnvelope({
      event_id: "evt-1",
      event_type: "minutes.capture.status",
      api_version: "zaki-control.v1",
      created_at: "2026-07-19T10:00:00.000Z",
      data: { subject: SUBJECT, operation_id: "op-1", capture_id: "cap-1", state: "failed" },
    })).toThrow(MinutesControlContractError);

    expect(() => parseMinutesStatusResponse({
      api_version: "zaki-control.v1",
      request_id: "req-1",
      subject: SUBJECT,
      capture_id: "cap-1",
      state: "completed",
      metering: { reservation_id: "hold-1", captured_seconds_total: 61, terminal: false },
    })).toThrow(MinutesControlContractError);
  });

  test("rejects a successful response bound to another owner or request", () => {
    const response = {
      api_version: "zaki-control.v1",
      request_id: "req-1",
      operation_id: "op-1",
      subject: SUBJECT,
      state: "ready",
      policy_version: "consent-v1",
    };
    expect(assertMinutesControlResponseBinding(response, { subject: SUBJECT, requestId: "req-1" })).toEqual(response);
    expect(() => assertMinutesControlResponseBinding(response, { subject: { tenant_id: "default", user_id: "43" }, requestId: "req-1" })).toThrow(MinutesControlContractError);
  });

  test("never reads an oversized or non-JSON upstream success body", async () => {
    const plain = new Response("private meeting content", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    await expect(readMinutesControlResponseJson(plain)).rejects.toMatchObject({
      code: "minutes_control_upstream_invalid_content_type",
    });
  });
});
