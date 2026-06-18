import { describe, expect, it, jest } from "@jest/globals";
import {
  walletToWeeklyWindow,
  readMeterSnapshotForIdentity,
} from "./platform-meter.js";

describe("walletToWeeklyWindow", () => {
  it("maps a fully-consumed wallet to a 0-remaining weekly window", () => {
    const window = walletToWeeklyWindow({
      weekly_allowance_units: 100,
      weekly_used_units: 100,
      weekly_anchor_at: "2026-06-01T00:00:00.000Z",
      weekly_reset_at: "2026-06-08T00:00:00.000Z",
      topup_units: 0,
    });
    expect(window).toEqual(
      expect.objectContaining({
        limit: 100,
        used: 100,
        remaining: 0,
        pendingFirstUse: false,
        anchorAt: "2026-06-01T00:00:00.000Z",
        resetAt: "2026-06-08T00:00:00.000Z",
      })
    );
  });

  it("maps a partially-consumed wallet to the correct remaining", () => {
    const window = walletToWeeklyWindow({
      weekly_allowance_units: 100,
      weekly_used_units: 40,
      weekly_anchor_at: "2026-06-01T00:00:00.000Z",
      weekly_reset_at: "2026-06-08T00:00:00.000Z",
      topup_units: 0,
    });
    expect(window.limit).toBe(100);
    expect(window.used).toBe(40);
    expect(window.remaining).toBe(60);
    expect(window.pendingFirstUse).toBe(false);
  });

  it("never reports negative remaining when over the allowance", () => {
    const window = walletToWeeklyWindow({
      weekly_allowance_units: 100,
      weekly_used_units: 130,
      weekly_reset_at: "2026-06-08T00:00:00.000Z",
    });
    expect(window.remaining).toBe(0);
  });

  it("adds persistent top-up units on top of the weekly remaining (gate funds topup after recurring)", () => {
    const window = walletToWeeklyWindow({
      weekly_allowance_units: 100,
      weekly_used_units: 100,
      weekly_reset_at: "2026-06-08T00:00:00.000Z",
      topup_units: 25,
    });
    expect(window.remaining).toBe(25);
  });

  it("is pendingFirstUse when the wallet has never been anchored (reset_at IS NULL)", () => {
    const window = walletToWeeklyWindow({
      weekly_allowance_units: 100,
      weekly_used_units: 0,
      weekly_anchor_at: null,
      weekly_reset_at: null,
      topup_units: 0,
    });
    expect(window.pendingFirstUse).toBe(true);
    expect(window.anchorAt).toBeNull();
    expect(window.resetAt).toBeNull();
  });
});

describe("readMeterSnapshotForIdentity wallet override", () => {
  it("sources the weekly window from the wallet for an authenticated user with a wallet row", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ anchor_at: "2026-06-01T00:00:00.000Z" }) // first metered-use anchor
      .mockResolvedValueOnce({ weighted_units: 5, receipts: 3 }); // rolling window only
    const snapshot = await readMeterSnapshotForIdentity({
      dbGet,
      identity: { type: "user", tenantId: "tenant-a", userId: 42 },
      platform: {
        plan: { id: "pro", label: "Pro" },
        usage: {
          burstWindowHours: 5,
          rollingAllowanceUnits: 20,
          weeklyAllowanceUnits: 100,
        },
      },
      wallet: {
        weekly_allowance_units: 100,
        weekly_used_units: 100,
        weekly_anchor_at: "2026-06-01T00:00:00.000Z",
        weekly_reset_at: "2026-06-08T00:00:00.000Z",
        topup_units: 0,
      },
      nowDate: new Date("2026-06-03T10:00:00.000Z"),
    });
    expect(snapshot.weekly).toEqual(
      expect.objectContaining({
        limit: 100,
        used: 100,
        remaining: 0,
        source: "wallet_unit_ledger",
        pendingFirstUse: false,
        anchorAt: "2026-06-01T00:00:00.000Z",
        resetAt: "2026-06-08T00:00:00.000Z",
      })
    );
  });

  it("sources rolling and product windows from wallet holds when a wallet is present", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ anchor_at: "2026-05-20T00:00:00.000Z" })
      .mockResolvedValueOnce({
        weighted_units: 4,
        receipts: 2,
        first_active_at: "2026-06-03T06:15:00.000Z",
      });
    const dbAll = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { product_id: "agent", weighted_units: 3, receipts: 1 },
        { product_id: "spaces", weighted_units: 1, receipts: 1 },
      ])
      .mockResolvedValueOnce([
        { product_id: "agent", weighted_units: 5, receipts: 2 },
        { product_id: "spaces", weighted_units: 8, receipts: 3 },
      ]);

    const snapshot = await readMeterSnapshotForIdentity({
      dbGet,
      dbAll,
      identity: { type: "user", tenantId: "tenant-a", userId: 42 },
      platform: {
        plan: { id: "pro", label: "Pro" },
        usage: {
          burstWindowHours: 5,
          rollingAllowanceUnits: 20,
          weeklyAllowanceUnits: 100,
        },
      },
      wallet: {
        plan_id: "pro",
        weekly_allowance_units: 100,
        weekly_used_units: 13,
        weekly_anchor_at: "2026-06-01T00:00:00.000Z",
        weekly_reset_at: "2026-06-08T00:00:00.000Z",
        topup_units: 0,
      },
      nowDate: new Date("2026-06-03T10:00:00.000Z"),
    });

    expect(snapshot.rolling).toEqual(
      expect.objectContaining({
        used: 4,
        receipts: 2,
        remaining: 16,
        resetAt: "2026-06-03T11:15:00.000Z",
        source: "wallet_unit_ledger",
      })
    );
    expect(dbGet.mock.calls[1][0]).toMatch(/reserved_at > \$3::timestamptz/);
    expect(snapshot.products).toEqual({
      agent: {
        rolling: { used: 3, receipts: 1 },
        weekly: { used: 5, receipts: 2 },
      },
      spaces: {
        rolling: { used: 1, receipts: 1 },
        weekly: { used: 8, receipts: 3 },
      },
    });
    expect(dbAll.mock.calls[3][1]).toEqual([
      "tenant-a",
      42,
      "2026-06-01T00:00:00.000Z",
      "2026-06-03T10:00:00.000Z",
    ]);
  });

  it("does not let zero-unit hold rows hide receipt-backed product usage", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ anchor_at: "2026-05-20T00:00:00.000Z" })
      .mockResolvedValueOnce({ weighted_units: 0, receipts: 0 });
    const dbAll = jest
      .fn()
      .mockResolvedValueOnce([{ product_id: "agent", weighted_units: 9, receipts: 1 }])
      .mockResolvedValueOnce([{ product_id: "agent", weighted_units: 9, receipts: 1 }])
      .mockResolvedValueOnce([{ product_id: "agent", weighted_units: 0, receipts: 1 }])
      .mockResolvedValueOnce([{ product_id: "agent", weighted_units: 0, receipts: 1 }]);

    const snapshot = await readMeterSnapshotForIdentity({
      dbGet,
      dbAll,
      identity: { type: "user", tenantId: "tenant-a", userId: 42 },
      platform: {
        plan: { id: "pro", label: "Pro" },
        usage: {
          burstWindowHours: 5,
          rollingAllowanceUnits: 20,
          weeklyAllowanceUnits: 100,
        },
      },
      wallet: {
        plan_id: "pro",
        weekly_allowance_units: 100,
        weekly_used_units: 9,
        weekly_anchor_at: "2026-06-01T00:00:00.000Z",
        weekly_reset_at: "2026-06-08T00:00:00.000Z",
        topup_units: 0,
      },
      nowDate: new Date("2026-06-03T10:00:00.000Z"),
    });

    expect(snapshot.products.agent).toEqual({
      rolling: { used: 9, receipts: 1 },
      weekly: { used: 9, receipts: 1 },
    });
  });

  it("falls back to the receipts-based weekly window when there is no wallet", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ anchor_at: "2026-06-01T00:00:00.000Z" })
      .mockResolvedValueOnce({ weighted_units: 2, receipts: 1 }) // rolling
      .mockResolvedValueOnce({ weighted_units: 7, receipts: 4 }); // weekly (receipts)
    const snapshot = await readMeterSnapshotForIdentity({
      dbGet,
      identity: { type: "user", tenantId: "tenant-a", userId: 42 },
      platform: {
        plan: { id: "pro", label: "Pro" },
        usage: {
          burstWindowHours: 5,
          rollingAllowanceUnits: 20,
          weeklyAllowanceUnits: 100,
        },
      },
      nowDate: new Date("2026-06-03T10:00:00.000Z"),
    });
    expect(snapshot.weekly.used).toBe(7);
    expect(snapshot.weekly.remaining).toBe(93);
  });
});
