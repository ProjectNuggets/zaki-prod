import { jest } from "@jest/globals";
import {
  APP_CHAT_SURFACE,
  LEARNING_SURFACE,
  ZAKI_BOT_SURFACE,
  buildDailyLimitExceededPayload,
  consumeAnonymousDailyPromptQuota,
  consumeDailyPromptQuota,
  consumeWeeklyPromptQuota,
  getQuotaResetAtUtcIso,
  getWeeklyQuotaResetAtUtcIso,
  getSurfaceQuotaConfig,
  hasLocalUnlimitedQuotaBypass,
  isUnlimitedUser,
  readDailyPromptUsage,
  readAnonymousDailyPromptUsage,
  readWeeklyPromptUsage,
  resolveQuotaSurface,
} from "./daily-quota.js";

describe("daily quota helpers", () => {
  it("resolves quota surface with app_chat default", () => {
    expect(resolveQuotaSurface(APP_CHAT_SURFACE)).toBe(APP_CHAT_SURFACE);
    expect(resolveQuotaSurface(LEARNING_SURFACE)).toBe(LEARNING_SURFACE);
    expect(resolveQuotaSurface(ZAKI_BOT_SURFACE)).toBe(ZAKI_BOT_SURFACE);
    expect(resolveQuotaSurface("unknown")).toBe(APP_CHAT_SURFACE);
    expect(resolveQuotaSurface("")).toBe(APP_CHAT_SURFACE);
  });

  it("resolves per-surface config from env with defaults", () => {
    const env = {
      ZAKI_APP_CHAT_DAILY_PROMPT_LIMIT: "8",
      ZAKI_APP_CHAT_DAILY_PROMPT_BUCKET: "chat_bucket",
      ZAKI_LEARNING_WEEKLY_PROMPT_LIMIT: "12",
      ZAKI_LEARNING_WEEKLY_PROMPT_BUCKET: "learning_bucket",
      ZAKI_BOT_WEEKLY_PROMPT_LIMIT: "3",
      ZAKI_BOT_WEEKLY_PROMPT_BUCKET: "bot_bucket",
    };
    expect(getSurfaceQuotaConfig(env, APP_CHAT_SURFACE)).toEqual({
      surface: APP_CHAT_SURFACE,
      limit: 8,
      bucket: "chat_bucket",
      period: "day",
    });
    expect(getSurfaceQuotaConfig(env, ZAKI_BOT_SURFACE)).toEqual({
      surface: ZAKI_BOT_SURFACE,
      limit: 3,
      bucket: "bot_bucket",
      period: "week",
    });
    expect(getSurfaceQuotaConfig(env, LEARNING_SURFACE)).toEqual({
      surface: LEARNING_SURFACE,
      limit: 12,
      bucket: "learning_bucket",
      period: "week",
    });
    expect(getSurfaceQuotaConfig({}, APP_CHAT_SURFACE)).toEqual({
      surface: APP_CHAT_SURFACE,
      limit: 10,
      bucket: "app_chat",
      period: "day",
    });
    expect(getSurfaceQuotaConfig({}, ZAKI_BOT_SURFACE)).toEqual({
      surface: ZAKI_BOT_SURFACE,
      limit: 10,
      bucket: "zaki_bot_weekly",
      period: "week",
    });
    expect(getSurfaceQuotaConfig({}, LEARNING_SURFACE)).toEqual({
      surface: LEARNING_SURFACE,
      limit: 10,
      bucket: "learning_weekly",
      period: "week",
    });
  });

  it("computes reset at the next UTC midnight", () => {
    const now = new Date("2026-03-09T13:45:00.000Z");
    expect(getQuotaResetAtUtcIso(now)).toBe("2026-03-10T00:00:00.000Z");
  });

  it("computes weekly reset at the next UTC Monday", () => {
    expect(getWeeklyQuotaResetAtUtcIso(new Date("2026-03-09T13:45:00.000Z"))).toBe(
      "2026-03-16T00:00:00.000Z"
    );
    expect(getWeeklyQuotaResetAtUtcIso(new Date("2026-03-15T23:59:00.000Z"))).toBe(
      "2026-03-16T00:00:00.000Z"
    );
  });

  it("treats active paid plans or active access code as unlimited", () => {
    expect(isUnlimitedUser({ tier: "student", status: "active", accessActive: false })).toBe(true);
    expect(isUnlimitedUser({ tier: "free", status: "inactive", accessActive: true })).toBe(true);
    expect(isUnlimitedUser({ tier: "free", status: "inactive", accessActive: false })).toBe(false);
  });

  it("supports a local unlimited quota bypass by email outside production", () => {
    expect(
      hasLocalUnlimitedQuotaBypass(
        { email: "alaasuccar@gmail.com" },
        {
          ZAKI_LOCAL_UNLIMITED_QUOTA_EMAILS: "other@example.com, alaasuccar@gmail.com ",
        }
      )
    ).toBe(true);

    expect(
      hasLocalUnlimitedQuotaBypass(
        { email: "other@example.com" },
        {
          ZAKI_LOCAL_UNLIMITED_QUOTA_EMAILS: "alaasuccar@gmail.com",
        }
      )
    ).toBe(false);
  });

  it("builds structured exceeded payloads for app, learning, and bot surfaces", () => {
    expect(
      buildDailyLimitExceededPayload({
        limit: 10,
        resetAt: "2026-03-10T00:00:00.000Z",
        surface: APP_CHAT_SURFACE,
      })
    ).toEqual(
      expect.objectContaining({
        code: "daily_limit_reached",
        surface: APP_CHAT_SURFACE,
        limit: 10,
        period: "day",
        remaining: 0,
      })
    );
    expect(
      buildDailyLimitExceededPayload({
        limit: 10,
        resetAt: "2026-03-16T00:00:00.000Z",
        surface: LEARNING_SURFACE,
        period: "week",
      })
    ).toEqual(
      expect.objectContaining({
        code: "weekly_limit_reached",
        surface: LEARNING_SURFACE,
        limit: 10,
        period: "week",
        remaining: 0,
      })
    );
    expect(
      buildDailyLimitExceededPayload({
        limit: 10,
        resetAt: "2026-03-16T00:00:00.000Z",
        surface: ZAKI_BOT_SURFACE,
        period: "week",
      })
    ).toEqual(
      expect.objectContaining({
        code: "weekly_limit_reached",
        surface: ZAKI_BOT_SURFACE,
        limit: 10,
        period: "week",
        remaining: 0,
      })
    );
  });

  it("reads current usage count for current UTC date", async () => {
    const dbGet = jest.fn().mockResolvedValue({ used_count: 3 });
    const used = await readDailyPromptUsage({
      dbGet,
      userId: 11,
      bucket: "app_chat",
      nowDate: new Date("2026-03-09T10:10:10.000Z"),
    });
    expect(used).toBe(3);
    expect(dbGet).toHaveBeenCalledTimes(1);
  });

  it("consumes quota when under limit", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ used_count: 4 }] });
    const dbGet = jest.fn();
    const result = await consumeDailyPromptQuota({
      dbQuery,
      dbGet,
      userId: 17,
      bucket: "app_chat",
      limit: 10,
      nowDate: new Date("2026-03-09T11:00:00.000Z"),
    });
    expect(result).toMatchObject({
      allowed: true,
      limit: 10,
      used: 4,
      remaining: 6,
      resetAt: "2026-03-10T00:00:00.000Z",
      period: "day",
    });
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbGet).not.toHaveBeenCalled();
  });

  it("rejects quota when at limit", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    const dbGet = jest.fn().mockResolvedValue({ used_count: 10 });
    const result = await consumeDailyPromptQuota({
      dbQuery,
      dbGet,
      userId: 17,
      bucket: "zaki_bot",
      limit: 10,
      nowDate: new Date("2026-03-09T12:00:00.000Z"),
    });
    expect(result).toMatchObject({
      allowed: false,
      limit: 10,
      used: 10,
      remaining: 0,
      resetAt: "2026-03-10T00:00:00.000Z",
      period: "day",
    });
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbGet).toHaveBeenCalledTimes(1);
  });

  it("reads and consumes weekly quota using the UTC week-start bucket date", async () => {
    const nowDate = new Date("2026-03-11T12:00:00.000Z");
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ used_count: 5 }] });
    const dbGet = jest.fn().mockResolvedValue({ used_count: 5 });

    const result = await consumeWeeklyPromptQuota({
      dbQuery,
      dbGet,
      userId: 22,
      bucket: "zaki_bot_weekly",
      limit: 10,
      nowDate,
    });

    expect(result).toMatchObject({
      allowed: true,
      limit: 10,
      used: 5,
      remaining: 5,
      resetAt: "2026-03-16T00:00:00.000Z",
      period: "week",
    });
    expect(dbQuery.mock.calls[0][1]).toEqual([
      22,
      "zaki_bot_weekly",
      10,
      "2026-03-09T00:00:00.000Z",
    ]);

    await expect(
      readWeeklyPromptUsage({
        dbGet,
        userId: 22,
        bucket: "zaki_bot_weekly",
        nowDate,
      })
    ).resolves.toBe(5);
    expect(dbGet.mock.calls[0][1]).toEqual([
      22,
      "zaki_bot_weekly",
      "2026-03-09T00:00:00.000Z",
    ]);
  });

  it("consumes anonymous quota without a zaki user id", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ used_count: 7 }] });
    const dbGet = jest.fn();
    const result = await consumeAnonymousDailyPromptQuota({
      dbQuery,
      dbGet,
      anonKeyHash: "hash-123",
      bucket: "anonymous_spaces",
      limit: 10,
      nowDate: new Date("2026-03-09T13:00:00.000Z"),
    });
    expect(result).toMatchObject({
      allowed: true,
      limit: 10,
      used: 7,
      remaining: 3,
      resetAt: "2026-03-10T00:00:00.000Z",
    });
    expect(String(dbQuery.mock.calls[0][0])).toContain("zaki_anonymous_prompt_usage");
    expect(dbQuery.mock.calls[0][1]).toEqual([
      "hash-123",
      "anonymous_spaces",
      10,
      "2026-03-09T13:00:00.000Z",
    ]);
    expect(dbGet).not.toHaveBeenCalled();
  });

  it("reads anonymous usage by anonymous hash and UTC date", async () => {
    const dbGet = jest.fn().mockResolvedValue({ used_count: 9 });
    const used = await readAnonymousDailyPromptUsage({
      dbGet,
      anonKeyHash: "hash-456",
      bucket: "anonymous_spaces",
      nowDate: new Date("2026-03-09T13:30:00.000Z"),
    });
    expect(used).toBe(9);
    expect(String(dbGet.mock.calls[0][0])).toContain("zaki_anonymous_prompt_usage");
    expect(dbGet.mock.calls[0][1]).toEqual([
      "hash-456",
      "anonymous_spaces",
      "2026-03-09T13:30:00.000Z",
    ]);
  });
});
