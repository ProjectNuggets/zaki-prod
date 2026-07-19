import { describe, expect, jest, test } from "@jest/globals";
import {
  decryptMinutesControlRecoveryRequest,
  encryptMinutesControlRecoveryRequest,
  markMinutesControlRecoveryCapture,
  releaseRejectedMinutesControlRecovery,
  reserveMinutesControlCaptureWithIntent,
} from "./minutes-control-recovery.js";
import { reconcileMinutesControlRecoveries } from "./minutes-control-reconciler.js";

const KEY = "c".repeat(32);
const HOLD_ID = "00000000-0000-4000-8000-000000000001";
const LEASE_OWNER = "00000000-0000-4000-8000-000000000002";
const RECOVERY_ID = "00000000-0000-4000-8000-000000000003";

function recoveryRequest() {
  return {
    platform: "google_meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    captureAttestation: {
      bot_visible: true,
      bot_display_name: "ZAKI Notetaker",
      policy_version: "minutes-capture-consent-v1",
      attested_at: "2026-07-19T10:00:00.000Z",
      attested_by_user_id: "42",
    },
    metering: { reservation_id: HOLD_ID, unit: "bot_minute", reserved_units: 60 },
  };
}

function recovery(overrides = {}) {
  const request = recoveryRequest();
  const encrypted = encryptMinutesControlRecoveryRequest({
    request,
    encryptionKey: KEY,
    tenantId: "default",
    userId: "42",
    idempotencyKey: "capture-01",
  });
  return {
    recovery_id: RECOVERY_ID,
    user_id: "42",
    tenant_id: "default",
    idempotency_key: "capture-01",
    request_id: "req-control-01",
    reservation_id: HOLD_ID,
    request_sha256: encrypted.requestSha256,
    request_ciphertext: encrypted.ciphertext,
    request_iv: encrypted.iv,
    request_tag: encrypted.tag,
    state: "prepared",
    capture_id: null,
    operation_id: null,
    attempt_count: 1,
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Minutes durable capture recovery", () => {
  test("attaches the exact encrypted pre-spawn intent to the same reserved hold callback", async () => {
    const client = { query: jest.fn() };
    const prepareRecoveryIntent = jest.fn().mockResolvedValue({ recovery_id: RECOVERY_ID });
    const reserveCapture = jest.fn(async (options) => ({
      hold: { id: HOLD_ID },
      recoveryIntent: await options.onReserved({ hold: { id: HOLD_ID } }, client),
    }));

    const result = await reserveMinutesControlCaptureWithIntent({
      zakiUser: { id: 42 },
      tenantId: "default",
      requestId: "req-control-01",
      idempotencyKey: "capture-01",
      reservedUnits: 60,
      recoveryRequest: recoveryRequest(),
      recoveryEncryptionKey: KEY,
      reserveCapture,
      prepareRecoveryIntent,
    });

    expect(result).toMatchObject({ hold: { id: HOLD_ID }, recoveryIntent: { recovery_id: RECOVERY_ID } });
    expect(prepareRecoveryIntent).toHaveBeenCalledWith(expect.objectContaining({
      userId: "42",
      tenantId: "default",
      requestId: "req-control-01",
      reservationId: HOLD_ID,
      client,
      request: expect.objectContaining({ metering: expect.objectContaining({ reservation_id: HOLD_ID }) }),
    }));
  });

  test("reuses an encrypted immutable request while keeping meeting URLs out of queryable fields", () => {
    const source = recovery();
    expect(decryptMinutesControlRecoveryRequest({ recovery: source, encryptionKey: KEY })).toEqual(recoveryRequest());
    expect(source.request_ciphertext.toString("utf8")).not.toContain("meet.google.com");
  });

  test("treats a new server attestation timestamp as the same browser idempotency request", () => {
    const original = recoveryRequest();
    const retried = {
      ...recoveryRequest(),
      captureAttestation: {
        ...recoveryRequest().captureAttestation,
        attested_at: "2026-07-19T10:00:02.000Z",
      },
    };
    const first = encryptMinutesControlRecoveryRequest({
      request: original,
      encryptionKey: KEY,
      tenantId: "default",
      userId: "42",
      idempotencyKey: "capture-01",
    });
    const second = encryptMinutesControlRecoveryRequest({
      request: retried,
      encryptionKey: KEY,
      tenantId: "default",
      userId: "42",
      idempotencyKey: "capture-01",
    });

    expect(second.requestSha256).toBe(first.requestSha256);
  });

  test("uses an independent recovery key so control-signing rotation does not strand the request", () => {
    const recoveryKey = "r".repeat(32);
    const source = encryptMinutesControlRecoveryRequest({
      request: recoveryRequest(),
      encryptionKey: recoveryKey,
      tenantId: "default",
      userId: "42",
      idempotencyKey: "capture-01",
    });
    const stored = {
      ...recovery(),
      request_sha256: source.requestSha256,
      request_ciphertext: source.ciphertext,
      request_iv: source.iv,
      request_tag: source.tag,
    };

    expect(decryptMinutesControlRecoveryRequest({ recovery: stored, encryptionKey: recoveryKey })).toEqual(recoveryRequest());
    expect(() => decryptMinutesControlRecoveryRequest({ recovery: stored, encryptionKey: KEY })).toThrow("could not be decrypted");
  });

  test("retries a malformed or lost create 2xx as create_uncertain instead of dropping the hold", async () => {
    const item = recovery();
    const claim = jest.fn().mockResolvedValue([item]);
    const reschedule = jest.fn().mockResolvedValue({});
    const client = {
      createCapture: jest.fn().mockResolvedValue(new Response("{not-json", {
        status: 202,
        headers: { "content-type": "application/json" },
      })),
      getCapture: jest.fn(),
      stopCapture: jest.fn(),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim,
      ensureReservation: jest.fn().mockResolvedValue(true),
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, retry: 1, blocked: 0 });
    expect(client.createCapture).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "capture-01",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
    }));
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: RECOVERY_ID,
      leaseOwner: LEASE_OWNER,
      state: "create_uncertain",
      errorCode: "engine_create_response_invalid",
    }));
  });

  test("keeps a stop timeout durably pending for the leased worker", async () => {
    const item = recovery({
      state: "stop_pending",
      capture_id: "capture-01",
      operation_id: "op-capture-01",
    });
    const claim = jest.fn().mockResolvedValue([item]);
    const reschedule = jest.fn().mockResolvedValue({});
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn(),
      stopCapture: jest.fn().mockRejectedValue(new Error("timeout")),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim,
      ensureReservation: jest.fn().mockResolvedValue(true),
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, retry: 1, blocked: 0 });
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: RECOVERY_ID,
      state: "stop_pending",
      errorCode: "engine_stop_transport_failed",
    }));
  });

  test("hashes a maximum-length capture id into a valid recovery stop idempotency key", async () => {
    const captureId = `capture-${"a".repeat(152)}`;
    const item = recovery({
      state: "stop_pending",
      capture_id: captureId,
      operation_id: "op-capture-01",
    });
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn(),
      stopCapture: jest.fn().mockRejectedValue(new Error("timeout")),
    };

    await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([item]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      reschedule: jest.fn().mockResolvedValue({}),
    });

    const stopKey = client.stopCapture.mock.calls[0][0].idempotencyKey;
    expect(stopKey).toMatch(/^minutes-recovery-stop-[a-f0-9]{64}$/);
    expect(stopKey.length).toBeLessThanOrEqual(160);
  });

  test("terminal stop status is settled before the recovery record is terminalized", async () => {
    const item = recovery({
      state: "stop_pending",
      capture_id: "capture-01",
      operation_id: "op-capture-01",
    });
    const claim = jest.fn().mockResolvedValue([item]);
    const settleRecovered = jest.fn().mockResolvedValue({ state: "terminal" });
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn(),
      stopCapture: jest.fn().mockResolvedValue(jsonResponse({
        api_version: "zaki-control.v1",
        request_id: "req-control-01",
        subject: { tenant_id: "default", user_id: "42" },
        capture_id: "capture-01",
        meeting_id: "meeting-01",
        state: "completed",
        metering: { reservation_id: HOLD_ID, captured_seconds_total: 61, terminal: true },
      })),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim,
      ensureReservation: jest.fn().mockResolvedValue(true),
      settleRecovered,
    });

    expect(result).toMatchObject({ claimed: 1, terminal: 1 });
    expect(settleRecovered).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: RECOVERY_ID,
      leaseOwner: LEASE_OWNER,
      response: expect.objectContaining({ capture_id: "capture-01", metering: expect.objectContaining({ terminal: true }) }),
    }));
  });

  test("blocks an expired or released reservation before it can create a late free capture", async () => {
    const item = recovery();
    const claim = jest.fn().mockResolvedValue([item]);
    const ensureReservation = jest.fn().mockResolvedValue(false);
    const reschedule = jest.fn().mockResolvedValue({});
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn(),
      stopCapture: jest.fn(),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim,
      ensureReservation,
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, blocked: 1 });
    expect(client.createCapture).not.toHaveBeenCalled();
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      recoveryId: RECOVERY_ID,
      state: "blocked",
      errorCode: "recovery_reservation_inactive",
    }));
  });

  test("never releases a hold from a stale recovery lease", async () => {
    const releaseCapture = jest.fn();
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await expect(releaseRejectedMinutesControlRecovery({
      recoveryId: RECOVERY_ID,
      leaseOwner: LEASE_OWNER,
      releaseCapture,
      runInTransaction: async (work) => work(client),
    })).rejects.toMatchObject({ code: "recovery_lease_lost" });

    expect(releaseCapture).not.toHaveBeenCalled();
  });

  test("does not resurrect a blocked recovery with a late capture response", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });

    await expect(markMinutesControlRecoveryCapture({
      recoveryId: RECOVERY_ID,
      userId: "42",
      tenantId: "default",
      reservationId: HOLD_ID,
      captureId: "capture-01",
      operationId: "op-capture-01",
      state: "stop_pending",
      dbQuery,
    })).rejects.toMatchObject({ code: "recovery_lease_lost" });

    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining("state IN ('prepared','create_uncertain','tracking','stop_pending','stop_requested')"), expect.any(Array));
  });

  test("releases a verified create rejection only through the current leased transition", async () => {
    const item = recovery();
    const releaseRejected = jest.fn().mockResolvedValue({ state: "blocked" });
    const client = {
      createCapture: jest.fn().mockResolvedValue(new Response("{}", { status: 400 })),
      getCapture: jest.fn(),
      stopCapture: jest.fn(),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([item]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      releaseRejected,
      reschedule: jest.fn(),
    });

    expect(result).toMatchObject({ claimed: 1, blocked: 1 });
    expect(releaseRejected).toHaveBeenCalledWith({
      recoveryId: RECOVERY_ID,
      leaseOwner: LEASE_OWNER,
      errorCode: "engine_create_rejected",
    });
  });

  test("keeps a confirmed capture 404 on the durable stop path", async () => {
    const item = recovery({
      state: "stop_pending",
      capture_id: "capture-01",
      operation_id: "op-capture-01",
    });
    const reschedule = jest.fn().mockResolvedValue({});
    const releaseRejected = jest.fn();
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn(),
      stopCapture: jest.fn().mockResolvedValue(new Response("{}", { status: 404 })),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([item]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      releaseRejected,
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, retry: 1, blocked: 0 });
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      state: "stop_pending",
      errorCode: "engine_capture_not_found",
    }));
    expect(releaseRejected).not.toHaveBeenCalled();
  });

  test("keeps a tracking capture 404 on the durable settlement path", async () => {
    const item = recovery({
      state: "tracking",
      capture_id: "capture-01",
      operation_id: "op-capture-01",
    });
    const reschedule = jest.fn().mockResolvedValue({});
    const client = {
      createCapture: jest.fn(),
      getCapture: jest.fn().mockResolvedValue(new Response("{}", { status: 404 })),
      stopCapture: jest.fn(),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([item]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, retry: 1, blocked: 0 });
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      state: "tracking",
      errorCode: "engine_capture_not_found",
    }));
  });

  test("treats a create 409 as uncertain rather than refunding a possibly live capture", async () => {
    const item = recovery();
    const reschedule = jest.fn().mockResolvedValue({});
    const releaseRejected = jest.fn();
    const client = {
      createCapture: jest.fn().mockResolvedValue(new Response("{}", { status: 409 })),
      getCapture: jest.fn(),
      stopCapture: jest.fn(),
    };

    const result = await reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([item]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      releaseRejected,
      reschedule,
    });

    expect(result).toMatchObject({ claimed: 1, retry: 1, blocked: 0 });
    expect(reschedule).toHaveBeenCalledWith(expect.objectContaining({
      state: "create_uncertain",
      errorCode: "engine_create_conflict",
    }));
    expect(releaseRejected).not.toHaveBeenCalled();
  });

  test("reconciles a claimed batch concurrently so one engine timeout cannot expire another lease", async () => {
    const first = recovery({ recovery_id: "00000000-0000-4000-8000-000000000010" });
    const second = recovery({ recovery_id: "00000000-0000-4000-8000-000000000011" });
    const pendingRejects = [];
    const client = {
      createCapture: jest.fn().mockImplementation(() => new Promise((_resolve, reject) => pendingRejects.push(reject))),
      getCapture: jest.fn(),
      stopCapture: jest.fn(),
    };
    const reschedule = jest.fn().mockResolvedValue({});
    const pending = reconcileMinutesControlRecoveries({
      baseUrl: "http://minutes-api:8056",
      controlSigningKey: KEY,
      recoveryEncryptionKey: KEY,
      fetchWithTimeout: jest.fn(),
      timeoutMs: 5_000,
      leaseOwner: LEASE_OWNER,
      client,
      claim: jest.fn().mockResolvedValue([first, second]),
      ensureReservation: jest.fn().mockResolvedValue(true),
      reschedule,
    });

    for (let tick = 0; tick < 8 && pendingRejects.length < 2; tick += 1) {
      await Promise.resolve();
    }
    expect(client.createCapture).toHaveBeenCalledTimes(2);
    pendingRejects.forEach((reject) => reject(new Error("timeout")));

    await expect(pending).resolves.toMatchObject({ claimed: 2, retry: 2, failed: 0 });
    expect(reschedule).toHaveBeenCalledTimes(2);
  });
});
