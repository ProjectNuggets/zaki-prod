const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_PER_USER_LIMIT = 3;
const DEFAULT_GLOBAL_LIMIT = 100;
const DEFAULT_PAGE_THRESHOLD = 10;

function parseBoolean(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function resolveMeterFailOpenConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.ZAKI_METER_FAIL_OPEN_ENABLED, true),
    windowMs: parsePositiveInteger(env.ZAKI_METER_FAIL_OPEN_WINDOW_MS, DEFAULT_WINDOW_MS),
    perUserLimit: parsePositiveInteger(
      env.ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE,
      DEFAULT_PER_USER_LIMIT
    ),
    globalLimit: parsePositiveInteger(
      env.ZAKI_METER_FAIL_OPEN_GLOBAL_BUDGET_PER_MINUTE,
      DEFAULT_GLOBAL_LIMIT
    ),
    pageThreshold: parsePositiveInteger(
      env.ZAKI_METER_FAIL_OPEN_PAGE_THRESHOLD_PER_MINUTE,
      DEFAULT_PAGE_THRESHOLD
    ),
  };
}

export function createMeterFailOpenBackstop({ env = process.env, now = Date.now } = {}) {
  const config = resolveMeterFailOpenConfig(env);
  let windowStartedAt = Number(now());
  let globalCount = 0;
  let pageSent = false;
  const userCounts = new Map();

  function resetIfExpired(currentTime) {
    if (currentTime - windowStartedAt < config.windowMs) return;
    windowStartedAt = currentTime;
    globalCount = 0;
    pageSent = false;
    userCounts.clear();
  }

  return {
    config,
    check({ userId, surface = "unknown" } = {}) {
      const currentTime = Number(now());
      resetIfExpired(currentTime);

      const userKey = String(userId || "unknown").trim() || "unknown";
      globalCount += 1;
      const userCount = (userCounts.get(userKey) || 0) + 1;
      userCounts.set(userKey, userCount);

      const shouldPage = globalCount > config.pageThreshold && !pageSent;
      if (shouldPage) pageSent = true;

      const context = {
        surface,
        userId: userKey,
        globalCount,
        userCount,
        windowMs: config.windowMs,
        globalLimit: config.globalLimit,
        perUserLimit: config.perUserLimit,
        pageThreshold: config.pageThreshold,
        shouldPage,
      };

      if (!config.enabled) {
        return { ...context, allowed: false, status: 503, reason: "fail_open_disabled" };
      }
      if (globalCount > config.globalLimit) {
        return { ...context, allowed: false, status: 503, reason: "global_budget_exhausted" };
      }
      if (userCount > config.perUserLimit) {
        return { ...context, allowed: false, status: 429, reason: "user_rate_limited" };
      }
      return { ...context, allowed: true, status: 200, reason: "fail_open_allowed" };
    },
  };
}
