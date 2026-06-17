function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export const DEFAULT_LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_LOGIN_FAILURE_MAX = 10;

export async function checkEmailLoginThrottle({
  dbGet,
  email,
  maxFailures = DEFAULT_LOGIN_FAILURE_MAX,
  windowMs = DEFAULT_LOGIN_FAILURE_WINDOW_MS,
} = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { blocked: false, resetAt: null };
  const nowIso = new Date().toISOString();
  const row = await dbGet(
    `
      SELECT failure_count, reset_at
      FROM zaki_login_failures
      WHERE email = $1
        AND reset_at > $2::timestamptz
      LIMIT 1
    `,
    [normalizedEmail, nowIso]
  );
  const count = Number(row?.failure_count || 0);
  return {
    blocked: count >= Math.max(1, Number(maxFailures)),
    resetAt: row?.reset_at || null,
  };
}

export async function recordEmailLoginFailure({
  dbQuery,
  email,
  windowMs = DEFAULT_LOGIN_FAILURE_WINDOW_MS,
} = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  await dbQuery(
    `
      INSERT INTO zaki_login_failures (email, failure_count, reset_at, updated_at)
      VALUES ($1, 1, NOW() + ($2::int * INTERVAL '1 millisecond'), NOW())
      ON CONFLICT (email)
      DO UPDATE
      SET failure_count = CASE
            WHEN zaki_login_failures.reset_at <= NOW() THEN 1
            ELSE zaki_login_failures.failure_count + 1
          END,
          reset_at = CASE
            WHEN zaki_login_failures.reset_at <= NOW()
              THEN NOW() + ($2::int * INTERVAL '1 millisecond')
            ELSE zaki_login_failures.reset_at
          END,
          updated_at = NOW()
    `,
    [normalizedEmail, Math.max(1, Math.floor(Number(windowMs || DEFAULT_LOGIN_FAILURE_WINDOW_MS)))]
  );
}

export async function clearEmailLoginFailures({ dbQuery, email } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  await dbQuery("DELETE FROM zaki_login_failures WHERE email = $1", [normalizedEmail]);
}

export async function cleanupExpiredLoginFailures({ dbQuery, retentionHours = 24 } = {}) {
  const safeRetentionHours = Math.max(1, Math.floor(Number(retentionHours || 24)));
  await dbQuery(
    `
      DELETE FROM zaki_login_failures
      WHERE reset_at < NOW() - ($1::int * INTERVAL '1 hour')
    `,
    [safeRetentionHours]
  );
}
