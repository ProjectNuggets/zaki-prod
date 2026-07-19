import { describe, expect, jest, test } from "@jest/globals";
import { minutesControlPayloadFingerprint } from "./minutes-control-contract.js";
import {
  MinutesControlStateError,
  applyMinutesControlCallback,
  recordMinutesControlCapture,
} from "./minutes-control-state.js";

const HOLD_ID = "00000000-0000-4000-8000-000000000001";
const CAPTURE = {
  capture_id: "capture-01",
  user_id: "42",
  tenant_id: "default",
  operation_id: "op-capture-01",
  reservation_id: HOLD_ID,
  meeting_id: "meeting-01",
  state: "active",
  usage_sequence: -1,
  captured_seconds_total: 0,
  usage_terminal: false,
};

function callback(overrides = {}) {
  return {
    event_id: "event-01",
    event_type: "minutes.capture.usage",
    api_version: "zaki-control.v1",
    created_at: "2026-07-19T10:00:00.000Z",
    data: {
      subject: { tenant_id: "default", user_id: "42" },
      operation_id: "op-capture-01",
      capture_id: "capture-01",
      meeting_id: "meeting-01",
      metering: { reservation_id: HOLD_ID, sequence: 0, captured_seconds_total: 61, terminal: true },
    },
    ...overrides,
  };
}

function runWith(client) {
  return async (work) => work(client);
}

describe("Minutes control callback state", () => {
  test("records the capture-to-reservation binding before callbacks arrive", async () => {
    const created = { ...CAPTURE, state: "requested" };
    const client = { query: jest.fn().mockResolvedValue({ rows: [created] }) };
    const result = await recordMinutesControlCapture({
      response: { capture_id: "capture-01", operation_id: "op-capture-01" },
      userId: "42",
      tenantId: "default",
      reservationId: HOLD_ID,
      runInTransaction: runWith(client),
    });
    expect(result).toEqual(created);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO zaki_minutes_control_captures"), expect.arrayContaining([
      "capture-01", "42", "default", "op-capture-01", HOLD_ID,
    ]));
  });

  test("settles a terminal cumulative usage callback exactly through the stored hold", async () => {
    const updated = {
      ...CAPTURE,
      usage_sequence: 0,
      captured_seconds_total: 61,
      usage_terminal: true,
    };
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [CAPTURE] })
        .mockResolvedValueOnce({ rows: [{ event_id: "event-01" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [updated] }),
    };
    const settleCapture = jest.fn().mockResolvedValue({ ok: true });
    const result = await applyMinutesControlCallback({
      envelope: callback(),
      runInTransaction: runWith(client),
      settleCapture,
    });
    expect(result).toEqual({ status: "accepted", eventId: "event-01" });
    expect(settleCapture).toHaveBeenCalledWith(expect.objectContaining({
      holdId: HOLD_ID,
      idempotencyKey: "event-01",
      capturedSecondsTotal: 61,
      client,
    }));
  });

  test("returns duplicate without a second state or wallet effect for the same event", async () => {
    const client = {
      query: jest.fn(),
    };
    // Override the stored fingerprint with the canonical value from a first test
    // run by observing it in the query, then return the correct prior row.
    client.query.mockImplementation(async (sql, params) => {
      if (sql.includes("SELECT * FROM zaki_minutes_control_captures")) return { rows: [CAPTURE] };
      if (sql.includes("INSERT INTO zaki_minutes_control_callback_events")) return { rows: [] };
      if (sql.includes("SELECT canonical_event_sha256")) {
        return { rows: [{ canonical_event_sha256: minutesControlPayloadFingerprint(callback()) }] };
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const settleCapture = jest.fn();
    await expect(applyMinutesControlCallback({
      envelope: callback(),
      runInTransaction: runWith(client),
      settleCapture,
    })).resolves.toEqual({ status: "duplicate", eventId: "event-01" });
    expect(settleCapture).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  test("fails closed when an event id is reused with a different canonical payload", async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [CAPTURE] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ canonical_event_sha256: "0".repeat(64) }] }),
    };
    await expect(applyMinutesControlCallback({
      envelope: callback(),
      runInTransaction: runWith(client),
      settleCapture: jest.fn(),
    })).rejects.toBeInstanceOf(MinutesControlStateError);
  });
});
