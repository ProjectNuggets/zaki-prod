import { jest } from "@jest/globals";

let buildAnonymousDeviceSignalHash;
let consumeAnonymousDeviceQuota;
let cleanupAnonymousDeviceUsage;

beforeAll(async () => {
  ({
    buildAnonymousDeviceSignalHash,
    consumeAnonymousDeviceQuota,
    cleanupAnonymousDeviceUsage,
  } = await import("./anonymous-abuse-guard.js"));
});

describe("anonymous device/IP quota guard", () => {
  it("keeps the same device/IP signal when the anonymous cookie is reset", () => {
    const req = {
      headers: {
        "cf-connecting-ip": "203.0.113.7",
        "user-agent": "Mozilla/5.0 Test",
      },
      ip: "10.0.0.1",
    };

    expect(buildAnonymousDeviceSignalHash(req, { secret: "secret", anonymousSessionId: "anon-a" }))
      .toBe(buildAnonymousDeviceSignalHash(req, { secret: "secret", anonymousSessionId: "anon-b" }));
  });

  it("uses a persistent daily counter for the device/IP signal", async () => {
    const dbQuery = jest.fn(async () => ({
      rows: [{ used_count: 2 }],
    }));
    const dbGet = jest.fn();

    const result = await consumeAnonymousDeviceQuota({
      dbQuery,
      dbGet,
      deviceSignalHash: "device-hash",
      bucket: "anonymous_spaces_device",
      limit: 3,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("zaki_anonymous_device_usage"),
      ["device-hash", "anonymous_spaces_device", 3, expect.any(String)]
    );
  });

  it("cleans old device quota rows after the retention window", async () => {
    const dbQuery = jest.fn(async () => ({ rows: [] }));

    await cleanupAnonymousDeviceUsage({ dbQuery, retentionDays: 7 });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM zaki_anonymous_device_usage"),
      [7]
    );
  });
});
