import { describe, expect, it, jest } from "@jest/globals";
import {
  hashAnonymousSessionId,
  readMeterSnapshotForIdentity,
} from "./platform-meter.js";

describe("platform meter", () => {
  it("hashes anonymous session ids for durable pseudonymous metering", () => {
    expect(hashAnonymousSessionId("anon-1")).toHaveLength(64);
    expect(hashAnonymousSessionId("anon-1")).toBe(hashAnonymousSessionId("anon-1"));
    expect(hashAnonymousSessionId("anon-2")).not.toBe(hashAnonymousSessionId("anon-1"));
  });

  it("reads rolling and weekly weighted usage windows", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ weighted_units: 2.5, receipts: 2 })
      .mockResolvedValueOnce({ weighted_units: 7, receipts: 5 });

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
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(snapshot.rolling).toEqual(
      expect.objectContaining({
        windowHours: 5,
        used: 2.5,
        receipts: 2,
        limit: 20,
        remaining: 17.5,
        resetAt: "2026-05-22T10:00:00.000Z",
      })
    );
    expect(snapshot.weekly).toEqual(
      expect.objectContaining({
        used: 7,
        receipts: 5,
        limit: 100,
        remaining: 93,
        startedAt: "2026-05-18T00:00:00.000Z",
        resetAt: "2026-05-25T00:00:00.000Z",
      })
    );
    expect(dbGet).toHaveBeenCalledTimes(2);
    expect(dbGet.mock.calls[0][0]).toMatch(/g\.tenant_id = \$1/);
    expect(dbGet.mock.calls[0][1][0]).toBe("tenant-a");
    expect(dbGet.mock.calls[0][1][1]).toBe(42);
  });

  it("keeps tenant usage windows isolated for anonymous sessions", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ weighted_units: 1, receipts: 1 })
      .mockResolvedValueOnce({ weighted_units: 3, receipts: 2 });

    await readMeterSnapshotForIdentity({
      dbGet,
      identity: {
        type: "anonymous",
        tenantId: "tenant-b",
        anonymousKeyHash: "hash-1",
      },
      platform: {
        plan: { id: "free", label: "Free" },
        usage: {
          burstWindowHours: 5,
          rollingAllowanceUnits: 20,
          weeklyAllowanceUnits: 100,
        },
      },
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(dbGet.mock.calls[0][0]).toMatch(/g\.tenant_id = \$1/);
    expect(dbGet.mock.calls[0][0]).toMatch(/g\.anonymous_key_hash = \$2/);
    expect(dbGet.mock.calls[0][1]).toEqual([
      "tenant-b",
      "hash-1",
      "2026-05-22T05:00:00.000Z",
      "2026-05-22T10:00:00.000Z",
    ]);
  });

  it("aggregates product usage windows from the central receipt ledger", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ weighted_units: 3, receipts: 2 })
      .mockResolvedValueOnce({ weighted_units: 8, receipts: 4 });
    const dbAll = jest
      .fn()
      .mockResolvedValueOnce([
        { product_id: "spaces", weighted_units: 1.5, receipts: 1 },
        { product_id: "agent", weighted_units: 1.5, receipts: 1 },
      ])
      .mockResolvedValueOnce([
        { product_id: "spaces", weighted_units: 2, receipts: 2 },
        { product_id: "learning", weighted_units: 6, receipts: 2 },
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
      nowDate: new Date("2026-05-22T10:00:00.000Z"),
    });

    expect(snapshot.products).toEqual({
      spaces: {
        rolling: { used: 1.5, receipts: 1 },
        weekly: { used: 2, receipts: 2 },
      },
      agent: {
        rolling: { used: 1.5, receipts: 1 },
        weekly: { used: 0, receipts: 0 },
      },
      learning: {
        rolling: { used: 0, receipts: 0 },
        weekly: { used: 6, receipts: 2 },
      },
    });
    expect(dbAll).toHaveBeenCalledTimes(2);
    expect(dbAll.mock.calls[0][0]).toMatch(/GROUP BY r\.product_id/);
  });
});
