import {
  APP_CHAT_SURFACE,
  buildDailyLimitExceededPayload,
  getQuotaResetAtUtcIso,
  getWeeklyQuotaResetAtUtcIso,
  resolveQuotaSurface,
} from "./daily-quota.js";

export async function enforcePromptQuotaForIngress({
  zakiUser,
  res,
  surface = APP_CHAT_SURFACE,
  consumePromptQuotaForUser,
  setPromptQuotaHeaders,
  // The legacy prompt-COUNT quota is deactivated for authenticated users — logged-in users are
  // metered solely by the unit wallet. Pass enabled:false to skip it (anonymous users use a
  // separate counter path and are unaffected by this function).
  enabled = true,
}) {
  if (!enabled || !zakiUser?.id) {
    return { allowed: true, quota: null };
  }

  const resolvedSurface = resolveQuotaSurface(surface);
  const promptQuota = await consumePromptQuotaForUser(zakiUser, {
    surface: resolvedSurface,
  });
  if (!promptQuota?.allowed) {
    return {
      allowed: false,
      quota: promptQuota || null,
      status: 429,
      payload: buildDailyLimitExceededPayload({
        limit: promptQuota?.limit || 0,
        resetAt: promptQuota?.resetAt || getQuotaResetAtUtcIso(),
        surface: resolvedSurface,
        period: promptQuota?.period || "day",
      }),
    };
  }

  setPromptQuotaHeaders(res, promptQuota);
  return { allowed: true, quota: promptQuota };
}

export function buildUsageQuotaResponse({
  zakiUser,
  surface = APP_CHAT_SURFACE,
  buildUserQuotaContext,
  readDailyPromptUsage,
  readWeeklyPromptUsage,
  resolveSurfaceQuotaConfig,
  dbGet,
  nowDate = new Date(),
}) {
  const resolvedSurface = resolveQuotaSurface(surface);
  const { bucket, limit, period = "day" } = resolveSurfaceQuotaConfig(resolvedSurface);
  const quotaContext = buildUserQuotaContext(zakiUser, { surface: resolvedSurface });
  const resetAt =
    period === "week"
      ? getWeeklyQuotaResetAtUtcIso(nowDate)
      : getQuotaResetAtUtcIso(nowDate);
  if (quotaContext.unlimited) {
    return Promise.resolve({
      success: true,
      unlimited: true,
      limit: null,
      used: 0,
      remaining: null,
      resetAt,
      bucket,
      surface: resolvedSurface,
      period,
    });
  }

  const readUsage =
    period === "week" && typeof readWeeklyPromptUsage === "function"
      ? readWeeklyPromptUsage
      : readDailyPromptUsage;

  return readUsage({
    dbGet,
    userId: zakiUser.id,
    bucket,
    nowDate,
  }).then((used) => ({
    success: true,
    unlimited: false,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
    bucket,
    surface: resolvedSurface,
    period,
  }));
}
