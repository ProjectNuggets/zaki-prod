import {
  APP_CHAT_SURFACE,
  buildDailyLimitExceededPayload,
  getQuotaResetAtUtcIso,
  resolveQuotaSurface,
} from "./daily-quota.js";

export async function enforcePromptQuotaForIngress({
  zakiUser,
  res,
  surface = APP_CHAT_SURFACE,
  consumePromptQuotaForUser,
  setPromptQuotaHeaders,
}) {
  if (!zakiUser?.id) {
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
  resolveSurfaceQuotaConfig,
  dbGet,
  nowDate = new Date(),
}) {
  const resolvedSurface = resolveQuotaSurface(surface);
  const { bucket, limit } = resolveSurfaceQuotaConfig(resolvedSurface);
  const quotaContext = buildUserQuotaContext(zakiUser, { surface: resolvedSurface });
  const resetAt = getQuotaResetAtUtcIso(nowDate);
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
    });
  }

  return readDailyPromptUsage({
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
  }));
}
