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
      identity: { type: "user", userId: 42 },
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
  });
});
