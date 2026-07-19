import { describe, expect, jest, test } from "@jest/globals";
import { minutesControlPayloadFingerprint } from "./minutes-control-contract.js";
import {
  MinutesControlStateError,
  applyMinutesControlCallback,
  hasMinutesControlAccountState,
  recordMinutesControlCompensation,
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

  test("persists a compensation marker and promotes it when the stopped engine callback arrives", async () => {
    const compensation = {
      capture_id: "capture-01",
      user_id: "42",
      tenant_id: "default",
      operation_id: "op-capture-01",
      reservation_id: HOLD_ID,
      meeting_id: "meeting-01",
      stop_state: "stop_requested",
    };
    const promoted = { ...CAPTURE, state: "stopping" };
    const client = {
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM zaki_minutes_control_captures")) return { rows: [] };
        if (sql.includes("SELECT * FROM zaki_minutes_control_compensations")) return { rows: [compensation] };
        if (sql.includes("INSERT INTO zaki_minutes_control_captures")) return { rows: [promoted] };
        if (sql.includes("DELETE FROM zaki_minutes_control_compensations")) return { rows: [] };
        if (sql.includes("INSERT INTO zaki_minutes_control_callback_events")) return { rows: [{ event_id: "event-01" }] };
        throw new Error(`unexpected query: ${sql}`);
      }),
    };
    const result = await applyMinutesControlCallback({
      envelope: callback({
        event_type: "minutes.capture.status",
        data: {
          subject: { tenant_id: "default", user_id: "42" },
          operation_id: "op-capture-01",
          capture_id: "capture-01",
          meeting_id: "meeting-01",
          state: "stopping",
        },
      }),
      runInTransaction: runWith(client),
    });
    expect(result).toEqual({ status: "accepted", eventId: "event-01" });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO zaki_minutes_control_captures"), expect.any(Array));
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM zaki_minutes_control_compensations"), ["capture-01"]);
  });

  test("promotes a capture from the durable recovery intent when primary persistence was lost", async () => {
    const recovery = {
      capture_id: "capture-01",
      user_id: "42",
      tenant_id: "default",
      operation_id: "op-capture-01",
      reservation_id: HOLD_ID,
      meeting_id: "meeting-01",
      state: "stop_pending",
    };
    const promoted = { ...CAPTURE, state: "joining" };
    const client = {
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM zaki_minutes_control_captures")) return { rows: [] };
        if (sql.includes("SELECT * FROM zaki_minutes_control_compensations")) return { rows: [] };
        if (sql.includes("FROM zaki_minutes_control_recoveries")) return { rows: [recovery] };
        if (sql.includes("INSERT INTO zaki_minutes_control_captures")) return { rows: [promoted] };
        if (sql.includes("INSERT INTO zaki_minutes_control_callback_events")) return { rows: [{ event_id: "event-01" }] };
        throw new Error(`unexpected query: ${sql}`);
      }),
    };

    await expect(applyMinutesControlCallback({
      envelope: callback({
        event_type: "minutes.capture.status",
        data: {
          subject: { tenant_id: "default", user_id: "42" },
          operation_id: "op-capture-01",
          capture_id: "capture-01",
          meeting_id: "meeting-01",
          state: "joining",
        },
      }),
      runInTransaction: runWith(client),
    })).resolves.toEqual({ status: "accepted", eventId: "event-01" });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("FROM zaki_minutes_control_recoveries"), ["capture-01", "op-capture-01"]);
  });

  test("promotes callbacks only from recoveries that still own a live reservation", async () => {
    const client = {
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM zaki_minutes_control_captures")) return { rows: [] };
        if (sql.includes("SELECT * FROM zaki_minutes_control_compensations")) return { rows: [] };
        if (sql.includes("FROM zaki_minutes_control_recoveries")) return { rows: [] };
        throw new Error(`unexpected query: ${sql}`);
      }),
    };

    await expect(applyMinutesControlCallback({
      envelope: callback({
        event_type: "minutes.capture.status",
        data: {
          subject: { tenant_id: "default", user_id: "42" },
          operation_id: "op-capture-01",
          capture_id: "capture-01",
          meeting_id: "meeting-01",
          state: "joining",
        },
      }),
      runInTransaction: runWith(client),
    })).rejects.toMatchObject({ code: "upstream_unavailable" });

    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested')"), ["capture-01", "op-capture-01"]);
  });

  test("takes the capture lock before the recovery lock during callback promotion", async () => {
    const recovery = {
      recovery_id: "00000000-0000-4000-8000-000000000003",
      capture_id: "capture-01",
      user_id: "42",
      tenant_id: "default",
      operation_id: "op-capture-01",
      reservation_id: HOLD_ID,
      meeting_id: "meeting-01",
      state: "stop_pending",
    };
    const promoted = { ...CAPTURE, state: "joining" };
    const client = {
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql.includes("SELECT * FROM zaki_minutes_control_captures")) return { rows: [] };
        if (sql.includes("SELECT * FROM zaki_minutes_control_compensations")) return { rows: [] };
        if (sql.includes("WHERE recovery_id = $1 FOR UPDATE")) return { rows: [recovery] };
        if (sql.includes("FROM zaki_minutes_control_recoveries")) return { rows: [recovery] };
        if (sql.includes("INSERT INTO zaki_minutes_control_captures")) return { rows: [promoted] };
        if (sql.includes("INSERT INTO zaki_minutes_control_callback_events")) return { rows: [{ event_id: "event-01" }] };
        throw new Error(`unexpected query: ${sql}`);
      }),
    };

    await expect(applyMinutesControlCallback({
      envelope: callback({
        event_type: "minutes.capture.status",
        data: {
          subject: { tenant_id: "default", user_id: "42" },
          operation_id: "op-capture-01",
          capture_id: "capture-01",
          meeting_id: "meeting-01",
          state: "joining",
        },
      }),
      runInTransaction: runWith(client),
    })).resolves.toEqual({ status: "accepted", eventId: "event-01" });

    const statements = client.query.mock.calls.map(([sql]) => sql);
    expect(statements.findIndex((sql) => sql.includes("INSERT INTO zaki_minutes_control_captures")))
      .toBeLessThan(statements.findIndex((sql) => sql.includes("WHERE recovery_id = $1 FOR UPDATE")));
  });

  test("records opaque compensation state and detects account-erasure evidence", async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ capture_id: "capture-01" }] }) };
    await expect(recordMinutesControlCompensation({
      captureId: "capture-01",
      operationId: "op-capture-01",
      reservationId: HOLD_ID,
      userId: "42",
      stopState: "stop_pending",
      runInTransaction: runWith(client),
    })).resolves.toMatchObject({ capture_id: "capture-01" });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO zaki_minutes_control_compensations"), expect.arrayContaining([
      "capture-01", "42", "default", "op-capture-01", HOLD_ID, null, "stop_pending",
    ]));

    await expect(hasMinutesControlAccountState({
      userId: "42",
      dbQuery: jest.fn().mockResolvedValue({ rows: [{ has_minutes_control_state: true }] }),
    })).resolves.toBe(true);
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
