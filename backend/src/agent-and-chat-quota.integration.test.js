import { describe, expect, it, jest } from "@jest/globals";
import { APP_CHAT_SURFACE, ZAKI_BOT_SURFACE } from "./daily-quota.js";
import {
  buildUsageQuotaResponse,
  enforcePromptQuotaForIngress,
} from "./quota-route-handlers.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = String(value);
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createInMemoryQuotaConsumer({ appLimit = 10, botLimit = 10 } = {}) {
  const usage = new Map();
  const dailyResetAt = "2026-03-10T00:00:00.000Z";
  const weeklyResetAt = "2026-03-16T00:00:00.000Z";
  return {
    async consumePromptQuotaForUser(zakiUser, { surface } = {}) {
      const safeSurface = surface === ZAKI_BOT_SURFACE ? ZAKI_BOT_SURFACE : APP_CHAT_SURFACE;
      const limit = safeSurface === ZAKI_BOT_SURFACE ? botLimit : appLimit;
      const bucket = safeSurface === ZAKI_BOT_SURFACE ? "zaki_bot_weekly" : "app_chat";
      const hasAccess = Boolean(zakiUser.accessActive);
      const unlimited =
        safeSurface === APP_CHAT_SURFACE
          ? zakiUser.plan_tier === "student" ||
            zakiUser.plan_tier === "personal" ||
            zakiUser.plan_tier === "complete" ||
            hasAccess
          : zakiUser.plan_tier === "personal" ||
            zakiUser.plan_tier === "agent" ||
            zakiUser.plan_tier === "complete" ||
            hasAccess;
      const resetAt = safeSurface === ZAKI_BOT_SURFACE ? weeklyResetAt : dailyResetAt;
      const period = safeSurface === ZAKI_BOT_SURFACE ? "week" : "day";
      if (unlimited) {
        return {
          allowed: true,
          unlimited: true,
          limit: null,
          used: 0,
          remaining: null,
          resetAt,
          surface: safeSurface,
          bucket,
          period,
        };
      }

      const key = `${zakiUser.id}:${bucket}`;
      const used = usage.get(key) || 0;
      if (used >= limit) {
        return {
          allowed: false,
          limit,
          used,
          remaining: 0,
          resetAt,
          surface: safeSurface,
          bucket,
          period,
        };
      }
      const next = used + 1;
      usage.set(key, next);
      return {
        allowed: true,
        limit,
        used: next,
        remaining: Math.max(0, limit - next),
        resetAt,
        surface: safeSurface,
        bucket,
        period,
      };
    },
  };
}

function setPromptQuotaHeaders(res, quota) {
  const limitValue = quota?.limit === null ? "unlimited" : String(quota?.limit ?? "");
  const remainingValue =
    quota?.remaining === null ? "unlimited" : String(quota?.remaining ?? "");
  res.setHeader("X-Zaki-Quota-Limit", limitValue);
  res.setHeader("X-Zaki-Quota-Remaining", remainingValue);
  if (quota?.resetAt) res.setHeader("X-Zaki-Quota-Reset-At", quota.resetAt);
  if (quota?.surface) res.setHeader("X-Zaki-Quota-Surface", quota.surface);
  if (quota?.bucket) res.setHeader("X-Zaki-Quota-Bucket", quota.bucket);
  if (quota?.period) res.setHeader("X-Zaki-Quota-Period", quota.period);
}

async function runIngressHandler({
  zakiUser,
  surface,
  consumePromptQuotaForUser,
}) {
  const res = createMockRes();
  const decision = await enforcePromptQuotaForIngress({
    zakiUser,
    surface,
    res,
    consumePromptQuotaForUser,
    setPromptQuotaHeaders,
  });
  if (!decision.allowed) {
    res.status(decision.status).json(decision.payload);
  } else {
    res.status(200).json({ ok: true });
  }
  return res;
}

describe("agent/chat surface quota integration", () => {
  it("free users get independent app_chat daily and zaki_bot weekly buckets", async () => {
    const { consumePromptQuotaForUser } = createInMemoryQuotaConsumer({ appLimit: 10, botLimit: 10 });
    const freeUser = { id: 77, plan_tier: "free", plan_status: "inactive", accessActive: false };

    const appResults = [];
    for (let i = 0; i < 11; i += 1) {
      appResults.push(
        await runIngressHandler({
          zakiUser: freeUser,
          surface: APP_CHAT_SURFACE,
          consumePromptQuotaForUser,
        })
      );
    }
    const botResults = [];
    for (let i = 0; i < 11; i += 1) {
      botResults.push(
        await runIngressHandler({
          zakiUser: freeUser,
          surface: ZAKI_BOT_SURFACE,
          consumePromptQuotaForUser,
        })
      );
    }

    expect(appResults.slice(0, 10).every((res) => res.statusCode === 200)).toBe(true);
    expect(appResults[10].statusCode).toBe(429);
    expect(appResults[10].body).toEqual(
      expect.objectContaining({
        code: "daily_limit_reached",
        surface: APP_CHAT_SURFACE,
      })
    );

    expect(botResults.slice(0, 10).every((res) => res.statusCode === 200)).toBe(true);
    expect(botResults[10].statusCode).toBe(429);
    expect(botResults[10].body).toEqual(
      expect.objectContaining({
        code: "weekly_limit_reached",
        surface: ZAKI_BOT_SURFACE,
        period: "week",
      })
    );
  });

  it("Agent subscribers unlock zaki_bot without uncapping app_chat", async () => {
    const { consumePromptQuotaForUser } = createInMemoryQuotaConsumer({ appLimit: 10, botLimit: 10 });
    const paidUser = { id: 88, plan_tier: "agent", plan_status: "active", accessActive: false };

    const appRes = await runIngressHandler({
      zakiUser: paidUser,
      surface: APP_CHAT_SURFACE,
      consumePromptQuotaForUser,
    });
    expect(appRes.statusCode).toBe(200);
    expect(appRes.headers["X-Zaki-Quota-Limit"]).toBe("10");
    expect(appRes.headers["X-Zaki-Quota-Remaining"]).toBe("9");
    expect(appRes.headers["X-Zaki-Quota-Surface"]).toBe(APP_CHAT_SURFACE);
    expect(appRes.headers["X-Zaki-Quota-Bucket"]).toBe("app_chat");
    expect(appRes.headers["X-Zaki-Quota-Period"]).toBe("day");

    const botRes = await runIngressHandler({
      zakiUser: paidUser,
      surface: ZAKI_BOT_SURFACE,
      consumePromptQuotaForUser,
    });
    expect(botRes.statusCode).toBe(200);
    expect(botRes.headers["X-Zaki-Quota-Limit"]).toBe("unlimited");
    expect(botRes.headers["X-Zaki-Quota-Remaining"]).toBe("unlimited");
    expect(botRes.headers["X-Zaki-Quota-Surface"]).toBe(ZAKI_BOT_SURFACE);
    expect(botRes.headers["X-Zaki-Quota-Bucket"]).toBe("zaki_bot_weekly");
    expect(botRes.headers["X-Zaki-Quota-Period"]).toBe("week");
  });

  it("access-code users are unlimited on app_chat and zaki_bot", async () => {
    const { consumePromptQuotaForUser } = createInMemoryQuotaConsumer({ appLimit: 10, botLimit: 10 });
    const accessUser = {
      id: 99,
      plan_tier: "free",
      plan_status: "inactive",
      accessActive: true,
    };

    const appRes = await runIngressHandler({
      zakiUser: accessUser,
      surface: APP_CHAT_SURFACE,
      consumePromptQuotaForUser,
    });
    expect(appRes.statusCode).toBe(200);
    expect(appRes.headers["X-Zaki-Quota-Limit"]).toBe("unlimited");

    const botRes = await runIngressHandler({
      zakiUser: accessUser,
      surface: ZAKI_BOT_SURFACE,
      consumePromptQuotaForUser,
    });
    expect(botRes.statusCode).toBe(200);
    expect(botRes.headers["X-Zaki-Quota-Limit"]).toBe("unlimited");
  });

  it("builds /api/usage/quota payloads by requested surface", async () => {
    const readDailyPromptUsage = jest.fn(async () => 2);
    const readWeeklyPromptUsage = jest.fn(async () => 4);
    const buildUserQuotaContext = jest.fn((user, { surface }) => ({
      unlimited: Boolean(user?.unlimitedApp && surface === APP_CHAT_SURFACE),
    }));
    const resolveSurfaceQuotaConfig = jest.fn((surface) =>
      surface === ZAKI_BOT_SURFACE
        ? { surface: ZAKI_BOT_SURFACE, limit: 10, bucket: "zaki_bot_weekly", period: "week" }
        : { surface: APP_CHAT_SURFACE, limit: 10, bucket: "app_chat", period: "day" }
    );

    const appPayload = await buildUsageQuotaResponse({
      zakiUser: { id: 1, unlimitedApp: false },
      surface: APP_CHAT_SURFACE,
      buildUserQuotaContext,
      readDailyPromptUsage,
      readWeeklyPromptUsage,
      resolveSurfaceQuotaConfig,
      dbGet: jest.fn(),
      nowDate: new Date("2026-03-09T09:00:00.000Z"),
    });
    expect(appPayload).toEqual(
      expect.objectContaining({
        surface: APP_CHAT_SURFACE,
        bucket: "app_chat",
        used: 2,
        remaining: 8,
      })
    );

    const botPayload = await buildUsageQuotaResponse({
      zakiUser: { id: 1, unlimitedApp: true },
      surface: ZAKI_BOT_SURFACE,
      buildUserQuotaContext,
      readDailyPromptUsage,
      readWeeklyPromptUsage,
      resolveSurfaceQuotaConfig,
      dbGet: jest.fn(),
      nowDate: new Date("2026-03-09T09:00:00.000Z"),
    });
    expect(botPayload).toEqual(
      expect.objectContaining({
        unlimited: false,
        surface: ZAKI_BOT_SURFACE,
        bucket: "zaki_bot_weekly",
        used: 4,
        remaining: 6,
        period: "week",
      })
    );
    expect(readWeeklyPromptUsage).toHaveBeenCalledTimes(1);
  });
});
