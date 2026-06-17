import { jest } from "@jest/globals";

let checkEmailLoginThrottle;
let recordEmailLoginFailure;
let clearEmailLoginFailures;
let cleanupExpiredLoginFailures;

beforeAll(async () => {
  ({
    checkEmailLoginThrottle,
    recordEmailLoginFailure,
    clearEmailLoginFailures,
    cleanupExpiredLoginFailures,
  } = await import("./login-throttle.js"));
});

describe("durable login throttle", () => {
  it("blocks when the DB has too many failures inside the rolling window", async () => {
    const dbGet = jest.fn(async () => ({
      failure_count: 10,
      reset_at: "2026-06-17T12:15:00.000Z",
    }));

    const result = await checkEmailLoginThrottle({
      dbGet,
      email: "USER@example.com",
      maxFailures: 10,
      windowMs: 15 * 60 * 1000,
    });

    expect(result).toEqual({
      blocked: true,
      resetAt: "2026-06-17T12:15:00.000Z",
    });
    expect(dbGet).toHaveBeenCalledWith(
      expect.stringContaining("zaki_login_failures"),
      ["user@example.com", expect.any(String)]
    );
  });

  it("records and clears failures in durable storage", async () => {
    const dbQuery = jest.fn(async () => ({ rows: [] }));

    await recordEmailLoginFailure({
      dbQuery,
      email: "USER@example.com",
      windowMs: 15 * 60 * 1000,
    });
    await clearEmailLoginFailures({ dbQuery, email: "USER@example.com" });

    expect(dbQuery.mock.calls[0][0]).toContain("INSERT INTO zaki_login_failures");
    expect(dbQuery.mock.calls[0][1][0]).toBe("user@example.com");
    expect(dbQuery.mock.calls[1][0]).toContain("DELETE FROM zaki_login_failures");
    expect(dbQuery.mock.calls[1][1]).toEqual(["user@example.com"]);
  });

  it("cleans expired failure rows after the retention window", async () => {
    const dbQuery = jest.fn(async () => ({ rows: [] }));

    await cleanupExpiredLoginFailures({ dbQuery, retentionHours: 12 });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM zaki_login_failures"),
      [12]
    );
  });
});
