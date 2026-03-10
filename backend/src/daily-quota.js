export const APP_CHAT_SURFACE = "app_chat";
export const ZAKI_BOT_SURFACE = "zaki_bot";

export const DEFAULT_APP_CHAT_DAILY_PROMPT_LIMIT = 5;
export const DEFAULT_APP_CHAT_DAILY_PROMPT_BUCKET = APP_CHAT_SURFACE;
export const DEFAULT_ZAKI_BOT_DAILY_PROMPT_LIMIT = 5;
export const DEFAULT_ZAKI_BOT_DAILY_PROMPT_BUCKET = ZAKI_BOT_SURFACE;

function parsePositiveInteger(raw, fallback) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
}

function parseBucket(raw, fallback) {
  const bucket = String(raw || "").trim();
  return bucket || fallback;
}

export function resolveQuotaSurface(input) {
  const normalized = String(input || "").trim().toLowerCase();
  return normalized === ZAKI_BOT_SURFACE ? ZAKI_BOT_SURFACE : APP_CHAT_SURFACE;
}

export function getSurfaceQuotaConfig(env = process.env, surface = APP_CHAT_SURFACE) {
  const normalizedSurface = resolveQuotaSurface(surface);
  if (normalizedSurface === ZAKI_BOT_SURFACE) {
    return {
      surface: ZAKI_BOT_SURFACE,
      bucket: parseBucket(
        env?.ZAKI_BOT_DAILY_PROMPT_BUCKET,
        DEFAULT_ZAKI_BOT_DAILY_PROMPT_BUCKET
      ),
      limit: parsePositiveInteger(
        env?.ZAKI_BOT_DAILY_PROMPT_LIMIT,
        DEFAULT_ZAKI_BOT_DAILY_PROMPT_LIMIT
      ),
    };
  }
  return {
    surface: APP_CHAT_SURFACE,
    bucket: parseBucket(
      env?.ZAKI_APP_CHAT_DAILY_PROMPT_BUCKET,
      DEFAULT_APP_CHAT_DAILY_PROMPT_BUCKET
    ),
    limit: parsePositiveInteger(
      env?.ZAKI_APP_CHAT_DAILY_PROMPT_LIMIT,
      DEFAULT_APP_CHAT_DAILY_PROMPT_LIMIT
    ),
  };
}

export function getQuotaResetAtUtcIso(nowDate = new Date()) {
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  ).toISOString();
}

export function isUnlimitedUser({ tier, status, accessActive }) {
  const normalizedTier = String(tier || "").trim().toLowerCase();
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const paidActive =
    ["student", "personal"].includes(normalizedTier) &&
    ["active", "trialing", "past_due"].includes(normalizedStatus);
  return paidActive || accessActive === true;
}

export function buildDailyLimitExceededPayload({
  limit,
  resetAt,
  surface = APP_CHAT_SURFACE,
}) {
  const normalizedSurface = resolveQuotaSurface(surface);
  if (normalizedSurface === ZAKI_BOT_SURFACE) {
    return {
      error: `You reached today's ZAKI BOT limit (${limit}). Resets at ${resetAt}. BOT premium is coming soon.`,
      message: `You reached today's ZAKI BOT limit (${limit}). Resets at ${resetAt}. BOT premium is coming soon.`,
      code: "daily_limit_reached",
      surface: ZAKI_BOT_SURFACE,
      limit,
      remaining: 0,
      resetAt,
    };
  }
  return {
    error: `You reached today's free limit (${limit}).`,
    message: `You reached today's free limit (${limit}).`,
    code: "daily_limit_reached",
    surface: APP_CHAT_SURFACE,
    limit,
    remaining: 0,
    resetAt,
  };
}

function normalizeUsedCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

export async function readDailyPromptUsage({
  dbGet,
  userId,
  bucket = DEFAULT_APP_CHAT_DAILY_PROMPT_BUCKET,
  nowDate = new Date(),
}) {
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const row = await dbGet(
    `
      SELECT used_count
      FROM zaki_daily_prompt_usage
      WHERE user_id = $1
        AND usage_date = (($3::timestamptz AT TIME ZONE 'UTC')::date)
        AND bucket = $2
      LIMIT 1
    `,
    [userId, bucket, nowIso]
  );
  return normalizeUsedCount(row?.used_count);
}

export async function consumeDailyPromptQuota({
  dbQuery,
  dbGet,
  userId,
  bucket = DEFAULT_APP_CHAT_DAILY_PROMPT_BUCKET,
  limit = DEFAULT_APP_CHAT_DAILY_PROMPT_LIMIT,
  nowDate = new Date(),
}) {
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : DEFAULT_APP_CHAT_DAILY_PROMPT_LIMIT;
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const resetAt = getQuotaResetAtUtcIso(nowDate);

  const insertResult = await dbQuery(
    `
      INSERT INTO zaki_daily_prompt_usage (user_id, usage_date, bucket, used_count, updated_at)
      VALUES ($1, (($4::timestamptz AT TIME ZONE 'UTC')::date), $2, 1, NOW())
      ON CONFLICT (user_id, usage_date, bucket)
      DO UPDATE
      SET used_count = zaki_daily_prompt_usage.used_count + 1,
          updated_at = NOW()
      WHERE zaki_daily_prompt_usage.used_count < $3
      RETURNING used_count
    `,
    [userId, bucket, safeLimit, nowIso]
  );

  const inserted = insertResult?.rows?.[0];
  if (inserted) {
    const used = normalizeUsedCount(inserted.used_count);
    return {
      allowed: true,
      limit: safeLimit,
      used,
      remaining: Math.max(0, safeLimit - used),
      resetAt,
    };
  }

  const currentUsed = await readDailyPromptUsage({
    dbGet,
    userId,
    bucket,
    nowDate,
  });

  return {
    allowed: false,
    limit: safeLimit,
    used: currentUsed,
    remaining: 0,
    resetAt,
  };
}
