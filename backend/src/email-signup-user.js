/**
 * The email-signup account decision, independent of HTTP.
 *
 * Extracted from index.js by WP-M for the same reason #87 extracted
 * `completeGoogleOAuthSignIn`: the two guarantees that matter here are guarantees
 * about what lands in the DATABASE, and they are only worth anything if a test can
 * observe the actual SQL.
 *
 * The two invariants pinned here:
 *
 *   1. NO DATE OF BIRTH IS PERSISTED. Neither the INSERT nor the UPDATE names
 *      `date_of_birth`. The column still exists on `zaki_users` holding legacy
 *      values (expand-contract: this is the "stop writing" step; the DROP is a
 *      separate, owner-approved migration), but nothing writes it any more.
 *
 *   2. CONSENT IS RECORDED ON EVERY SIGNUP — unchanged from #87, which made a
 *      consent row an invariant of account creation. `recordSignupConsent` is
 *      called for the fresh-insert path AND the unverified-resignup path, exactly
 *      as the inline handler did. It is not conditional, and WP-M does not
 *      weaken it.
 *
 * Returns `{ userId, created }`.
 */
export async function completeEmailSignup({
  dbGet,
  dbQuery,
  email,
  passwordHash,
  fullName,
  recordSignupConsent,
  now = new Date().toISOString(),
}) {
  const existing = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [email]);

  if (existing && existing.verified) {
    const err = new Error("Email already registered. Please sign in.");
    err.status = 400;
    err.code = "email_already_registered";
    throw err;
  }

  let userId = existing?.id;
  let created = false;

  if (existing) {
    // Re-signup over an unverified row. Note the absence of date_of_birth.
    await dbQuery(
      `UPDATE zaki_users
         SET password_hash = $1, full_name = $2, updated_at = $3
       WHERE id = $4`,
      [passwordHash, fullName, now, existing.id]
    );
  } else {
    const insertResult = await dbQuery(
      `INSERT INTO zaki_users
         (email, password_hash, full_name, verified, created_at, updated_at)
       VALUES ($1, $2, $3, false, $4, $5)
       RETURNING id`,
      [email, passwordHash, fullName, now, now]
    );
    userId = insertResult.rows?.[0]?.id;
    created = true;
  }

  if (!userId) {
    const err = new Error("Unable to create user.");
    err.status = 500;
    err.code = "user_create_failed";
    throw err;
  }

  // GDPR Art. 7: we must be able to demonstrate consent for every account we
  // create. Same shared writer the Google path calls; always at the current
  // server policy version.
  if (typeof recordSignupConsent === "function") {
    await recordSignupConsent({ userId, source: "signup" });
  }

  return { userId, created };
}
