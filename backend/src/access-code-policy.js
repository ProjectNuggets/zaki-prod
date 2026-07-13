export const ACCESS_CODE_DEFAULT_DURATION_DAYS = 30;

// Intentional operator ceiling: long-lived founder/support grants are allowed,
// but no access-code path may mint more than ten years from one redemption.
export const ACCESS_CODE_MAX_DURATION_DAYS = 3650;

const DAY_MS = 24 * 60 * 60 * 1000;

export function clampAccessCodeDurationDays(
  value,
  fallback = ACCESS_CODE_DEFAULT_DURATION_DAYS
) {
  const normalizedValue = String(value ?? "").trim();
  const parsed = normalizedValue ? Number(normalizedValue) : Number(fallback);
  const safeValue = Number.isFinite(parsed) ? parsed : ACCESS_CODE_DEFAULT_DURATION_DAYS;
  return Math.max(1, Math.min(ACCESS_CODE_MAX_DURATION_DAYS, Math.trunc(safeValue)));
}

export async function redeemAccessCodeForUser({ client, normalizedCode, userId, now }) {
  const redemptionTime = now instanceof Date ? now : new Date();
  const accessCodeResult = await client.query(
    `SELECT *
     FROM access_codes
     WHERE UPPER(regexp_replace(code, '[\\s-]+', '', 'g')) = $1
     FOR UPDATE`,
    [normalizedCode]
  );
  const accessCode = accessCodeResult.rows[0];
  if (!accessCode) {
    return { status: 404, body: { success: false, error: "Invalid access code." } };
  }

  // The code-row lock serializes concurrent attempts. Return the original
  // grant before checking current code state so retries stay idempotent even
  // after a one-use code becomes full, disabled, or expires.
  const existingResult = await client.query(
    `SELECT access_expires_at, campaign
     FROM access_code_redemptions
     WHERE code_id = $1 AND user_id = $2
     ORDER BY redeemed_at ASC
     LIMIT 1`,
    [accessCode.id, userId]
  );
  const existing = existingResult.rows[0];
  if (existing) {
    return {
      status: 200,
      body: {
        success: true,
        accessExpiresAt: new Date(existing.access_expires_at).toISOString(),
        campaign: existing.campaign || accessCode.campaign,
        alreadyRedeemed: true,
      },
    };
  }

  if (!accessCode.active) {
    return { status: 404, body: { success: false, error: "Invalid access code." } };
  }
  if (
    accessCode.expires_at &&
    new Date(accessCode.expires_at).getTime() < redemptionTime.getTime()
  ) {
    return { status: 410, body: { success: false, error: "Access code expired." } };
  }

  const incrementResult = await client.query(
    `UPDATE access_codes
     SET redeemed_count = redeemed_count + 1
     WHERE id = $1
       AND active = TRUE
       AND (max_redemptions IS NULL OR redeemed_count < max_redemptions)
     RETURNING id`,
    [accessCode.id]
  );
  if (!incrementResult.rows[0]) {
    return {
      status: 400,
      body: { success: false, error: "Access code already fully redeemed." },
    };
  }

  const userRowResult = await client.query(
    `SELECT access_expires_at
     FROM zaki_users
     WHERE id = $1
     FOR UPDATE`,
    [userId]
  );
  const userRow = userRowResult.rows[0];
  if (!userRow) {
    throw new Error("Authenticated user not found during code redemption.");
  }

  const currentExpiry = userRow.access_expires_at
    ? new Date(userRow.access_expires_at)
    : null;
  const baseDate =
    currentExpiry && currentExpiry.getTime() > redemptionTime.getTime()
      ? currentExpiry
      : redemptionTime;
  const durationDays = clampAccessCodeDurationDays(accessCode.duration_days);
  const expiresAt = new Date(baseDate.getTime() + durationDays * DAY_MS);

  await client.query(
    `UPDATE zaki_users
     SET access_expires_at = $1,
         access_code_campaign = $2,
         access_code_last = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [expiresAt.toISOString(), accessCode.campaign, accessCode.code, userId]
  );
  await client.query(
    `INSERT INTO access_code_redemptions
     (code_id, user_id, access_expires_at, campaign, code)
     VALUES ($1, $2, $3, $4, $5)`,
    [accessCode.id, userId, expiresAt.toISOString(), accessCode.campaign, normalizedCode]
  );

  return {
    status: 200,
    body: {
      success: true,
      accessExpiresAt: expiresAt.toISOString(),
      campaign: accessCode.campaign,
      alreadyRedeemed: false,
    },
  };
}
