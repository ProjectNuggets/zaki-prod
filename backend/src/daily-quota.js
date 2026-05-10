export const APP_CHAT_SURFACE = "app_chat";
export const LEARNING_SURFACE = "learning";
export const ZAKI_BOT_SURFACE = "zaki_bot";

export const DEFAULT_APP_CHAT_DAILY_PROMPT_LIMIT = 10;
export const DEFAULT_APP_CHAT_DAILY_PROMPT_BUCKET = APP_CHAT_SURFACE;
export const DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_LIMIT = 10;
export const DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_BUCKET = "anonymous_spaces";
export const DEFAULT_LEARNING_DAILY_PROMPT_LIMIT = 10;
export const DEFAULT_LEARNING_DAILY_PROMPT_BUCKET = LEARNING_SURFACE;
export const DEFAULT_ZAKI_BOT_DAILY_PROMPT_LIMIT = 10;
export const DEFAULT_ZAKI_BOT_DAILY_PROMPT_BUCKET = ZAKI_BOT_SURFACE;
export const DEFAULT_LEARNING_WEEKLY_PROMPT_LIMIT = 10;
export const DEFAULT_LEARNING_WEEKLY_PROMPT_BUCKET = "learning_weekly";
export const DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_LIMIT = 10;
export const DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_BUCKET = "zaki_bot_weekly";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parsePositiveInteger(raw, fallback) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
}

function parseBucket(raw, fallback) {
  const bucket = String(raw || "").trim();
  return bucket || fallback;
}

function parseEmailList(raw) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((value) => normalizeEmail(value))
      .filter(Boolean)
  );
}

export function resolveQuotaSurface(input) {
  const normalized = String(input || "").trim().toLowerCase();
  if (normalized === ZAKI_BOT_SURFACE) return ZAKI_BOT_SURFACE;
  if (normalized === LEARNING_SURFACE) return LEARNING_SURFACE;
  return APP_CHAT_SURFACE;
}

export function getSurfaceQuotaConfig(env = process.env, surface = APP_CHAT_SURFACE) {
  const normalizedSurface = resolveQuotaSurface(surface);
  if (normalizedSurface === LEARNING_SURFACE) {
    return {
      surface: LEARNING_SURFACE,
      bucket: parseBucket(
        env?.ZAKI_LEARNING_WEEKLY_PROMPT_BUCKET ||
          env?.ZAKI_LEARNING_DAILY_PROMPT_BUCKET,
        DEFAULT_LEARNING_WEEKLY_PROMPT_BUCKET
      ),
      limit: parsePositiveInteger(
        env?.ZAKI_LEARNING_WEEKLY_PROMPT_LIMIT ||
          env?.ZAKI_LEARNING_DAILY_PROMPT_LIMIT,
        DEFAULT_LEARNING_WEEKLY_PROMPT_LIMIT
      ),
      period: "week",
    };
  }
  if (normalizedSurface === ZAKI_BOT_SURFACE) {
    return {
      surface: ZAKI_BOT_SURFACE,
      bucket: parseBucket(
        env?.ZAKI_BOT_WEEKLY_PROMPT_BUCKET ||
          env?.ZAKI_BOT_DAILY_PROMPT_BUCKET,
        DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_BUCKET
      ),
      limit: parsePositiveInteger(
        env?.ZAKI_BOT_WEEKLY_PROMPT_LIMIT ||
          env?.ZAKI_BOT_DAILY_PROMPT_LIMIT,
        DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_LIMIT
      ),
      period: "week",
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
    period: "day",
  };
}

export function getQuotaResetAtUtcIso(nowDate = new Date()) {
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  ).toISOString();
}

function getUtcWeekStartDate(nowDate = new Date()) {
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0, 0)
  );
}

export function getWeeklyQuotaResetAtUtcIso(nowDate = new Date()) {
  const weekStart = getUtcWeekStartDate(nowDate);
  return new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function isUnlimitedUser({ tier, status, accessActive }) {
  const normalizedTier = String(tier || "").trim().toLowerCase();
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const paidActive =
    ["student", "personal"].includes(normalizedTier) &&
    ["active", "trialing", "past_due"].includes(normalizedStatus);
  return paidActive || accessActive === true;
}

export function hasLocalUnlimitedQuotaBypass(zakiUser, env = process.env) {
  const email = normalizeEmail(zakiUser?.email);
  if (!email) return false;
  const allowlist = parseEmailList(env?.ZAKI_LOCAL_UNLIMITED_QUOTA_EMAILS);
  return allowlist.has(email);
}

export function buildDailyLimitExceededPayload({
  limit,
  resetAt,
  surface = APP_CHAT_SURFACE,
  period = "day",
}) {
  const normalizedSurface = resolveQuotaSurface(surface);
  const weekly = period === "week";
  if (normalizedSurface === LEARNING_SURFACE) {
    return {
      error: weekly
        ? "You reached this week's learning preview limit. Free preview usage resets weekly."
        : "You reached today's learning limit. Free usage resets daily.",
      message: weekly
        ? "You reached this week's learning preview limit. Free preview usage resets weekly."
        : "You reached today's learning limit. Free usage resets daily.",
      code: weekly ? "weekly_limit_reached" : "daily_limit_reached",
      surface: LEARNING_SURFACE,
      limit,
      remaining: 0,
      resetAt,
      period,
    };
  }
  if (normalizedSurface === ZAKI_BOT_SURFACE) {
    return {
      error: weekly
        ? "You reached this week's free Agent preview limit. Free preview usage resets weekly."
        : "You reached today's free experimental limit. Free usage resets daily and may vary with traffic and prompt complexity.",
      message: weekly
        ? "You reached this week's free Agent preview limit. Free preview usage resets weekly."
        : "You reached today's free experimental limit. Free usage resets daily and may vary with traffic and prompt complexity.",
      code: weekly ? "weekly_limit_reached" : "daily_limit_reached",
      surface: ZAKI_BOT_SURFACE,
      limit,
      remaining: 0,
      resetAt,
      period,
    };
  }
  return {
    error: "You reached today's free limit. Free usage resets daily.",
    message: "You reached today's free limit. Free usage resets daily.",
    code: "daily_limit_reached",
    surface: APP_CHAT_SURFACE,
    limit,
    remaining: 0,
    resetAt,
    period,
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

export async function readWeeklyPromptUsage({
  dbGet,
  userId,
  bucket = DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_BUCKET,
  nowDate = new Date(),
}) {
  const weekStartIso = getUtcWeekStartDate(nowDate).toISOString();
  const row = await dbGet(
    `
      SELECT used_count
      FROM zaki_daily_prompt_usage
      WHERE user_id = $1
        AND usage_date = (($3::timestamptz AT TIME ZONE 'UTC')::date)
        AND bucket = $2
      LIMIT 1
    `,
    [userId, bucket, weekStartIso]
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
      period: "day",
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
    period: "day",
  };
}

export async function consumeWeeklyPromptQuota({
  dbQuery,
  dbGet,
  userId,
  bucket = DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_BUCKET,
  limit = DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_LIMIT,
  nowDate = new Date(),
}) {
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : DEFAULT_ZAKI_BOT_WEEKLY_PROMPT_LIMIT;
  const weekStartIso = getUtcWeekStartDate(nowDate).toISOString();
  const resetAt = getWeeklyQuotaResetAtUtcIso(nowDate);

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
    [userId, bucket, safeLimit, weekStartIso]
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
      period: "week",
    };
  }

  const currentUsed = await readWeeklyPromptUsage({
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
    period: "week",
  };
}

export async function readAnonymousDailyPromptUsage({
  dbGet,
  anonKeyHash,
  bucket = DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_BUCKET,
  nowDate = new Date(),
}) {
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const row = await dbGet(
    `
      SELECT used_count
      FROM zaki_anonymous_prompt_usage
      WHERE anon_key_hash = $1
        AND usage_date = (($3::timestamptz AT TIME ZONE 'UTC')::date)
        AND bucket = $2
      LIMIT 1
    `,
    [anonKeyHash, bucket, nowIso]
  );
  return normalizeUsedCount(row?.used_count);
}

export async function consumeAnonymousDailyPromptQuota({
  dbQuery,
  dbGet,
  anonKeyHash,
  bucket = DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_BUCKET,
  limit = DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_LIMIT,
  nowDate = new Date(),
}) {
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : DEFAULT_ANONYMOUS_SPACES_DAILY_PROMPT_LIMIT;
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const resetAt = getQuotaResetAtUtcIso(nowDate);

  const insertResult = await dbQuery(
    `
      INSERT INTO zaki_anonymous_prompt_usage (anon_key_hash, usage_date, bucket, used_count, updated_at)
      VALUES ($1, (($4::timestamptz AT TIME ZONE 'UTC')::date), $2, 1, NOW())
      ON CONFLICT (anon_key_hash, usage_date, bucket)
      DO UPDATE
      SET used_count = zaki_anonymous_prompt_usage.used_count + 1,
          updated_at = NOW()
      WHERE zaki_anonymous_prompt_usage.used_count < $3
      RETURNING used_count
    `,
    [anonKeyHash, bucket, safeLimit, nowIso]
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
      period: "day",
    };
  }

  const currentUsed = await readAnonymousDailyPromptUsage({
    dbGet,
    anonKeyHash,
    bucket,
    nowDate,
  });

  return {
    allowed: false,
    limit: safeLimit,
    used: currentUsed,
    remaining: 0,
    resetAt,
    period: "day",
  };
}
