import { jest } from "@jest/globals";
import {
  APP_CHAT_SURFACE,
  ZAKI_BOT_SURFACE,
  buildDailyLimitExceededPayload,
  consumeDailyPromptQuota,
  getQuotaResetAtUtcIso,
  getSurfaceQuotaConfig,
  isUnlimitedUser,
  readDailyPromptUsage,
  resolveQuotaSurface,
} from "./daily-quota.js";

describe("daily quota helpers", () => {
  it("resolves quota surface with app_chat default", () => {
    expect(resolveQuotaSurface(APP_CHAT_SURFACE)).toBe(APP_CHAT_SURFACE);
    expect(resolveQuotaSurface(ZAKI_BOT_SURFACE)).toBe(ZAKI_BOT_SURFACE);
    expect(resolveQuotaSurface("unknown")).toBe(APP_CHAT_SURFACE);
    expect(resolveQuotaSurface("")).toBe(APP_CHAT_SURFACE);
  });

  it("resolves per-surface config from env with defaults", () => {
    const env = {
      ZAKI_APP_CHAT_DAILY_PROMPT_LIMIT: "8",
      ZAKI_APP_CHAT_DAILY_PROMPT_BUCKET: "chat_bucket",
      ZAKI_BOT_DAILY_PROMPT_LIMIT: "3",
      ZAKI_BOT_DAILY_PROMPT_BUCKET: "bot_bucket",
    };
    expect(getSurfaceQuotaConfig(env, APP_CHAT_SURFACE)).toEqual({
      surface: APP_CHAT_SURFACE,
      limit: 8,
      bucket: "chat_bucket",
    });
    expect(getSurfaceQuotaConfig(env, ZAKI_BOT_SURFACE)).toEqual({
      surface: ZAKI_BOT_SURFACE,
      limit: 3,
      bucket: "bot_bucket",
    });
    expect(getSurfaceQuotaConfig({}, APP_CHAT_SURFACE)).toEqual({
      surface: APP_CHAT_SURFACE,
      limit: 10,
      bucket: "app_chat",
    });
    expect(getSurfaceQuotaConfig({}, ZAKI_BOT_SURFACE)).toEqual({
      surface: ZAKI_BOT_SURFACE,
      limit: 10,
      bucket: "zaki_bot",
    });
  });

  it("computes reset at the next UTC midnight", () => {
    const now = new Date("2026-03-09T13:45:00.000Z");
    expect(getQuotaResetAtUtcIso(now)).toBe("2026-03-10T00:00:00.000Z");
  });

  it("treats active paid plans or active access code as unlimited", () => {
    expect(isUnlimitedUser({ tier: "student", status: "active", accessActive: false })).toBe(true);
    expect(isUnlimitedUser({ tier: "free", status: "inactive", accessActive: true })).toBe(true);
    expect(isUnlimitedUser({ tier: "free", status: "inactive", accessActive: false })).toBe(false);
  });

  it("builds structured exceeded payloads for app and bot surfaces", () => {
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
        remaining: 0,
      })
    );
    expect(
      buildDailyLimitExceededPayload({
        limit: 10,
        resetAt: "2026-03-10T00:00:00.000Z",
        surface: ZAKI_BOT_SURFACE,
      })
    ).toEqual(
      expect.objectContaining({
        code: "daily_limit_reached",
        surface: ZAKI_BOT_SURFACE,
        limit: 10,
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
    });
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbGet).toHaveBeenCalledTimes(1);
  });
});
