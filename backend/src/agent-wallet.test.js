import { describe, expect, it, jest } from "@jest/globals";
import {
  AGENT_HOLD_EXPIRY_MS,
  AGENT_PROVIDER,
  AGENT_PROVIDER_MODEL,
  AGENT_RESERVE_UNITS_DEFAULT,
  reserveAgentChatUnits,
  resolveAgentReserveUnits,
  settleAgentChatUnits,
} from "./agent-metering.js";

const identity = (overrides = {}) => ({
  type: "user",
  userId: 42,
  zakiUser: { id: 42, plan_tier: "pro" },
  ...overrides,
});

const deterministicGrantId = (key) => `grant-${key}`;

describe("resolveAgentReserveUnits", () => {
  it("defaults to the reserve-high ceiling (40u)", () => {
    expect(resolveAgentReserveUnits({})).toBe(AGENT_RESERVE_UNITS_DEFAULT);
    expect(AGENT_RESERVE_UNITS_DEFAULT).toBe(40);
  });

  it("honors a positive ZAKI_AGENT_RESERVE_UNITS override", () => {
    expect(resolveAgentReserveUnits({ ZAKI_AGENT_RESERVE_UNITS: "60" })).toBe(60);
  });

  it("ignores a non-positive override", () => {
    expect(resolveAgentReserveUnits({ ZAKI_AGENT_RESERVE_UNITS: "0" })).toBe(AGENT_RESERVE_UNITS_DEFAULT);
    expect(resolveAgentReserveUnits({ ZAKI_AGENT_RESERVE_UNITS: "-5" })).toBe(AGENT_RESERVE_UNITS_DEFAULT);
  });

  it("ignores fractional overrides so reserve policy stays aligned with plan floors", () => {
    expect(resolveAgentReserveUnits({ ZAKI_AGENT_RESERVE_UNITS: "40.5" })).toBe(AGENT_RESERVE_UNITS_DEFAULT);
  });
});

describe("reserveAgentChatUnits", () => {
  it("reserves 40u against productId=agent with a 10-minute hold and returns the hold", async () => {
    const hold = { id: "hold-1", reserved_units: 40, user_id: 42 };
    const reserveUnits = jest.fn().mockResolvedValue({ ok: true, hold });
    const ensureWallet = jest.fn().mockResolvedValue({});

    const before = Date.now();
    const result = await reserveAgentChatUnits({
      identity: identity(),
      action: "agent_turn",
      idempotencyKey: "agent:42:req-1",
      message: "hello",
      env: {},
      reserveUnits,
      ensureWallet,
      deterministicGrantId,
    });

    expect(result.outcome).toBe("allowed");
    expect(result.hold).toBe(hold);
    expect(result.idempotencyKey).toBe("agent:42:req-1");
    expect(ensureWallet).toHaveBeenCalledWith({ userId: 42, planId: "pro" });
    expect(reserveUnits).toHaveBeenCalledTimes(1);
    const args = reserveUnits.mock.calls[0][0];
    expect(args.productId).toBe("agent");
    expect(args.userId).toBe(42);
    expect(args.reservedUnits).toBe(40);
    expect(args.grantId).toBe("grant-agent:42:req-1");
    expect(args.reserveIdempotencyKey).toBe("agent:42:req-1");
    const expiryMs = new Date(args.expiresAt).getTime() - before;
    expect(expiryMs).toBeGreaterThan(AGENT_HOLD_EXPIRY_MS - 2_000);
    expect(expiryMs).toBeLessThanOrEqual(AGENT_HOLD_EXPIRY_MS + 2_000);
  });

  it("ensures the wallet (plan from identity) on no_wallet then retries", async () => {
    const hold = { id: "hold-2", reserved_units: 40, user_id: 42 };
    const reserveUnits = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: "no_wallet" })
      .mockResolvedValueOnce({ ok: true, hold });
    const ensureWallet = jest.fn().mockResolvedValue({});

    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-2",
      env: {},
      reserveUnits,
      ensureWallet,
      deterministicGrantId,
    });

    expect(ensureWallet).toHaveBeenCalledWith({ userId: 42, planId: "pro" });
    expect(ensureWallet).toHaveBeenCalledTimes(2);
    expect(reserveUnits).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("allowed");
    expect(result.hold).toBe(hold);
  });

  it("defaults the plan to free when identity has no plan_tier", async () => {
    const reserveUnits = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, reason: "no_wallet" })
      .mockResolvedValueOnce({ ok: true, hold: { id: "h", reserved_units: 40 } });
    const ensureWallet = jest.fn().mockResolvedValue({});

    await reserveAgentChatUnits({
      identity: identity({ zakiUser: { id: 42 } }),
      idempotencyKey: "agent:42:req-3",
      env: {},
      reserveUnits,
      ensureWallet,
      deterministicGrantId,
    });

    expect(ensureWallet).toHaveBeenCalledWith({ userId: 42, planId: "free" });
  });

  it("syncs the wallet from effective entitlement before reserving", async () => {
    const reserveUnits = jest.fn().mockResolvedValue({ ok: true, hold: { id: "h", reserved_units: 40 } });
    const ensureWallet = jest.fn().mockResolvedValue({});

    await reserveAgentChatUnits({
      identity: identity({
        effectivePlanId: "personal",
        zakiUser: { id: 42, plan_tier: "free" },
      }),
      idempotencyKey: "agent:42:req-effective",
      env: {},
      reserveUnits,
      ensureWallet,
      deterministicGrantId,
    });

    expect(ensureWallet).toHaveBeenCalledWith({ userId: 42, planId: "personal" });
    expect(reserveUnits).toHaveBeenCalledTimes(1);
  });

  // C1 money-exploit fix: a true in-flight RETRY (ledger `idempotent`, hold still reserved) must NOT
  // proceed as an allowed turn — that would run a second billable engine turn FREE. It is a duplicate.
  // (This test previously asserted outcome="allowed" + hold=null — that encoded the BUGGY behavior
  //  where a reused idempotency key ran the engine unmetered. Updated to the secure semantics.)
  it("returns a 409 DUPLICATE (not allowed) on an in-flight idempotent retry — no free turn", async () => {
    const reserveUnits = jest.fn().mockResolvedValue({ ok: true, idempotent: true, hold: { id: "h" } });
    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-4",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("duplicate");
    expect(result.hold).toBeNull();
    expect(result.denial.status).toBe(409);
    expect(result.denial.error).toBe("duplicate_request");
  });

  // C1: a key replayed AFTER its hold went terminal (settled/released/expired) is refused by the
  // ledger with reason "idempotency_replayed" → must surface as a 409 duplicate, NEVER a free turn.
  it("returns a 409 DUPLICATE on a replay of a completed turn (ledger idempotency_replayed)", async () => {
    const reserveUnits = jest.fn().mockResolvedValue({ ok: false, reason: "idempotency_replayed", hold: { id: "h", state: "settled" } });
    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-replay",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("duplicate");
    expect(result.hold).toBeNull();
    expect(result.denial.status).toBe(409);
    expect(result.denial.error).toBe("duplicate_request");
  });

  // A genuinely NEW first turn still runs allowed with a real hold (charged exactly once).
  it("a genuine first turn is allowed with the new hold (charged once)", async () => {
    const hold = { id: "hold-new", reserved_units: 40, user_id: 42 };
    const reserveUnits = jest.fn().mockResolvedValue({ ok: true, hold });
    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-first",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("allowed");
    expect(result.hold).toBe(hold);
    expect(reserveUnits).toHaveBeenCalledTimes(1);
  });

  it("denies with 429 + insufficient_units when out of units", async () => {
    const reserveUnits = jest.fn().mockResolvedValue({
      ok: false,
      reason: "insufficient_units",
      remaining: 20,
      effectiveRemaining: 20,
      weeklyRemaining: 100,
      rollingRemaining: 20,
      topupUnits: 0,
      requiredUnits: 40,
      shortfall: 20,
      constraint: "rolling",
    });
    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-5",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("denied");
    expect(result.denial.status).toBe(429);
    expect(result.denial.error).toBe("insufficient_units");
    expect(result.denial.remaining).toBe(20);
    expect(result.denial.constraint).toBe("rolling");
    expect(result.denial.requiredUnits).toBe(40);
    expect(result.denial.effectiveRemaining).toBe(20);
    expect(result.denial.shortfall).toBe(20);
  });

  it("denies with 401 when there is no authenticated user identity", async () => {
    const reserveUnits = jest.fn();
    const result = await reserveAgentChatUnits({
      identity: null,
      idempotencyKey: "k",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("denied");
    expect(result.denial.status).toBe(401);
    expect(result.denial.error).toBe("agent_meter_identity_required");
    expect(reserveUnits).not.toHaveBeenCalled();
  });

  it("fails OPEN (unmetered) when the ledger throws", async () => {
    const reserveUnits = jest.fn().mockRejectedValue(new Error("db down"));
    const result = await reserveAgentChatUnits({
      identity: identity(),
      idempotencyKey: "agent:42:req-6",
      env: {},
      reserveUnits,
      ensureWallet: jest.fn(),
      deterministicGrantId,
    });
    expect(result.outcome).toBe("unmetered");
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe("settleAgentChatUnits", () => {
  const hold = { id: "hold-9", reserved_units: 40, user_id: 42 };

  it("settles on real done-frame cost → units from cost, usage event emitted with costSource real", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn().mockResolvedValue({ recorded: true });
    const dbQuery = jest.fn();
    const logStructured = jest.fn();
    // costUsd 0.015 / unitCost 0.00075 = 20 units
    const streamMetrics = { costUsd: 0.015, inputTokens: 100, outputTokens: 50, usageTokens: 150, toolCalls: 1, sawError: false };

    const result = await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-1",
      action: "agent_turn",
      status: "success",
      message: "hello",
      streamMetrics,
      env: {},
      sourceRoute: "/api/agent/chat/stream",
      requestId: "req-1",
      settleHold,
      recordUsageEvent,
      dbQuery,
      logStructured,
    });

    expect(result).toEqual({ ok: true });
    const settleArgs = settleHold.mock.calls[0][0];
    expect(settleArgs.holdId).toBe("hold-9");
    expect(settleArgs.settleIdempotencyKey).toBe("agent:42:req-1:settle");
    expect(settleArgs.finalState).toBe("settled");
    expect(settleArgs.settledUnits).toBe(20);
    expect(settleArgs.provider).toBe(AGENT_PROVIDER);
    expect(settleArgs.providerModel).toBe(AGENT_PROVIDER_MODEL);
    expect(settleArgs.providerCostUsdMicros).toBe(15000);
    expect(settleArgs.providerInputTokens).toBe(100);
    expect(settleArgs.providerOutputTokens).toBe(50);

    expect(recordUsageEvent).toHaveBeenCalledTimes(1);
    const eventArg = recordUsageEvent.mock.calls[0][0].event;
    expect(eventArg.userId).toBe(42);
    expect(eventArg.productId).toBe("agent");
    expect(eventArg.surface).toBe("agent");
    expect(eventArg.eventType).toBe("agent_turn");
    expect(eventArg.usageUnits).toBe(20);
    expect(eventArg.sourceRoute).toBe("/api/agent/chat/stream");
    expect(eventArg.metadata.costSource).toBe("real");
    expect(eventArg.metadata.costOverflow).toBe(false);
    expect(eventArg.metadata.toolCalls).toBe(1);
  });

  it("falls back to the flat estimate (costSource estimate) when there is no cost", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn().mockResolvedValue({ recorded: true });
    const streamMetrics = { costUsd: null, sawError: false };

    await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-2",
      action: "agent_turn",
      status: "success",
      message: "hello",
      streamMetrics,
      env: {},
      sourceRoute: "/api/agent/chat/stream",
      settleHold,
      recordUsageEvent,
      dbQuery: jest.fn(),
      logStructured: jest.fn(),
    });

    // agent_turn flat estimate floor = 1 unit
    expect(settleHold.mock.calls[0][0].settledUnits).toBe(1);
    expect(settleHold.mock.calls[0][0].finalState).toBe("settled");
    expect(recordUsageEvent.mock.calls[0][0].event.metadata.costSource).toBe("estimate");
  });

  it("flags costOverflow when cost-units exceed the reserve (ledger caps the actual debit)", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn().mockResolvedValue({ recorded: true });
    // costUsd 0.06 / 0.00075 = 80 units > reserved 40
    const streamMetrics = { costUsd: 0.06, sawError: false };

    await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-3",
      action: "agent_turn",
      status: "success",
      message: "hello",
      streamMetrics,
      env: {},
      settleHold,
      recordUsageEvent,
      dbQuery: jest.fn(),
      logStructured: jest.fn(),
    });

    // units passed through as-is; the ledger refund math caps the actual debit at the reserve.
    expect(settleHold.mock.calls[0][0].settledUnits).toBe(80);
    expect(recordUsageEvent.mock.calls[0][0].event.metadata.costOverflow).toBe(true);
  });

  it("releases (settledUnits 0, no usage event) on an error turn", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn();
    const streamMetrics = { costUsd: 0.015, sawError: true };

    await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-4",
      action: "agent_turn",
      status: "success",
      message: "hello",
      streamMetrics,
      env: {},
      settleHold,
      recordUsageEvent,
      dbQuery: jest.fn(),
      logStructured: jest.fn(),
    });

    expect(settleHold.mock.calls[0][0].settledUnits).toBe(0);
    expect(settleHold.mock.calls[0][0].finalState).toBe("released");
    expect(recordUsageEvent).not.toHaveBeenCalled();
  });

  it("releases (no usage event) when status is not success even if the stream had no error", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn();

    await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-5",
      status: "failed",
      message: "hello",
      streamMetrics: { costUsd: 0.015, sawError: false },
      env: {},
      settleHold,
      recordUsageEvent,
      dbQuery: jest.fn(),
      logStructured: jest.fn(),
    });

    expect(settleHold.mock.calls[0][0].finalState).toBe("released");
    expect(recordUsageEvent).not.toHaveBeenCalled();
  });

  it("is a no-op when there is no hold (anonymous / idempotent retry / fail-open)", async () => {
    const settleHold = jest.fn();
    const result = await settleAgentChatUnits({
      hold: null,
      idempotencyKey: "k",
      settleHold,
      recordUsageEvent: jest.fn(),
      dbQuery: jest.fn(),
      logStructured: jest.fn(),
    });
    expect(result).toBeNull();
    expect(settleHold).not.toHaveBeenCalled();
  });

  it("does not throw or block the response when the usage-event write fails (logs + still returns the settle)", async () => {
    const settleHold = jest.fn().mockResolvedValue({ ok: true });
    const recordUsageEvent = jest.fn().mockRejectedValue(new Error("usage table down"));
    const logStructured = jest.fn();

    const result = await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-6",
      status: "success",
      message: "hello",
      streamMetrics: { costUsd: 0.015, sawError: false },
      env: {},
      settleHold,
      recordUsageEvent,
      dbQuery: jest.fn(),
      logStructured,
    });

    expect(result).toEqual({ ok: true });
    expect(logStructured).toHaveBeenCalledWith(
      "error",
      "agent.usage.record_failed",
      expect.objectContaining({ holdId: "hold-9" })
    );
  });

  it("swallows a settleHold throw and returns null (sweeper reconciles)", async () => {
    const settleHold = jest.fn().mockRejectedValue(new Error("ledger down"));
    const logStructured = jest.fn();
    const result = await settleAgentChatUnits({
      hold,
      idempotencyKey: "agent:42:req-7",
      status: "success",
      message: "hello",
      streamMetrics: { costUsd: 0.015, sawError: false },
      env: {},
      settleHold,
      recordUsageEvent: jest.fn(),
      dbQuery: jest.fn(),
      logStructured,
    });
    expect(result).toBeNull();
    expect(logStructured).toHaveBeenCalledWith(
      "error",
      "agent.wallet.settle_failed",
      expect.objectContaining({ holdId: "hold-9" })
    );
  });
});
