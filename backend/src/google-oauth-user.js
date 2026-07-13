import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export async function findOrCreateGoogleUser({
  dbGet,
  dbQuery,
  userColumns,
  email,
  googleSub,
  fullName,
  recordLegalConsent,
}) {
  const now = new Date().toISOString();
  const finalizeUser = async (user) => {
    if (user?.id && typeof recordLegalConsent === "function") {
      await recordLegalConsent({ userId: user.id });
    }
    return user;
  };
  const existingByGoogleSub = await dbGet(
    `SELECT ${userColumns}, google_sub FROM zaki_users WHERE google_sub = $1`,
    [googleSub]
  );
  if (existingByGoogleSub) {
    const result = await dbQuery(
      `UPDATE zaki_users
       SET verified = TRUE,
           auth_provider = CASE
             WHEN auth_provider IS NULL OR auth_provider = '' THEN 'google'
             WHEN auth_provider = 'password' THEN 'password_google'
             ELSE auth_provider
           END,
           full_name = COALESCE(NULLIF(full_name, ''), $2),
           updated_at = $3
       WHERE id = $1
       RETURNING ${userColumns}`,
      [existingByGoogleSub.id, fullName, now]
    );
    return finalizeUser(result.rows?.[0] || { ...existingByGoogleSub, verified: true });
  }

  const existing = await dbGet(
    `SELECT ${userColumns}, google_sub FROM zaki_users WHERE email = $1`,
    [email]
  );
  if (existing) {
    if (existing.google_sub && existing.google_sub !== googleSub) {
      const err = new Error("This email is already linked to another Google account.");
      err.status = 409;
      err.code = "google_account_mismatch";
      throw err;
    }
    const result = await dbQuery(
      `UPDATE zaki_users
       SET verified = TRUE,
           google_sub = COALESCE(google_sub, $2),
           auth_provider = CASE
             WHEN auth_provider IS NULL OR auth_provider = '' THEN 'google'
             WHEN auth_provider = 'password' THEN 'password_google'
             ELSE auth_provider
           END,
           full_name = COALESCE(NULLIF(full_name, ''), $3),
           updated_at = $4
       WHERE id = $1 AND (google_sub IS NULL OR google_sub = $2)
       RETURNING ${userColumns}`,
      [existing.id, googleSub, fullName, now]
    );
    if (!result.rows?.[0]) {
      const err = new Error("This email is already linked to another Google account.");
      err.status = 409;
      err.code = "google_account_mismatch";
      throw err;
    }
    return finalizeUser(result.rows[0]);
  }

  const passwordHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
  const result = await dbQuery(
    `INSERT INTO zaki_users
       (email, password_hash, full_name, verified, google_sub, auth_provider, created_at, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, 'google', $5, $5)
     RETURNING ${userColumns}`,
    [email, passwordHash, fullName, googleSub, now]
  );
  return finalizeUser(result.rows?.[0]);
}
