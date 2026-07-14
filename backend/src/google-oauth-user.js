import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { assertSignupAgePolicy } from "./signup-policy.js";

/**
 * Find, link, or create the ZAKI user behind a verified Google profile.
 *
 * Returns `{ user, created }`. `created` is true ONLY when this call inserted a
 * brand-new row — the caller uses it to record signup consent exactly once, so a
 * returning Google user never accumulates duplicate consent rows.
 *
 * `assertCanCreate` (optional) runs immediately before the INSERT and may throw
 * to abort. It is the hook the callback uses to enforce consent + the age policy
 * on account creation, which guarantees a refused signup leaves NO user row
 * behind — rather than creating the account and then discovering it is not
 * allowed to exist.
 */
export async function findOrCreateGoogleUser({
  dbGet,
  dbQuery,
  userColumns,
  email,
  googleSub,
  fullName,
  assertCanCreate,
}) {
  const now = new Date().toISOString();
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
    return {
      user: result.rows?.[0] || { ...existingByGoogleSub, verified: true },
      created: false,
    };
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
    return { user: result.rows[0], created: false };
  }

  // Brand-new account. Policy is enforced BEFORE the INSERT so a refused signup
  // never leaves a consent-less user row behind.
  if (typeof assertCanCreate === "function") {
    await assertCanCreate();
  }

  const passwordHash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
  const result = await dbQuery(
    `INSERT INTO zaki_users
       (email, password_hash, full_name, verified, google_sub, auth_provider, created_at, updated_at)
     VALUES ($1, $2, $3, TRUE, $4, 'google', $5, $5)
     RETURNING ${userColumns}`,
    [email, passwordHash, fullName, googleSub, now]
  );
  return { user: result.rows?.[0], created: true };
}

/**
 * The Google OAuth sign-in decision, independent of HTTP.
 *
 * This is the unit that was defective: the callback used to record consent only
 * when the frontend happened to send it (signup mode), which meant a brand-new
 * account created from the LOGIN screen persisted with no consent row at all —
 * and, when consent was sent, it was re-written on every subsequent login.
 *
 * The rules enforced here, for BOTH login-mode and signup-mode entry:
 *   1. A new account requires an attestation at the current policy version.
 *   2. A new account must satisfy the shared age policy (same config, same
 *      evaluation, as the email path).
 *   3. Consent is recorded exactly once — on creation, never on return.
 *
 * `recordSignupConsent` is injected; it always writes at the current server
 * policy version. Returns `{ user, created }`.
 */
export async function completeGoogleOAuthSignIn({
  dbGet,
  dbQuery,
  userColumns,
  profile,
  acceptedPolicyVersion,
  agePolicy,
  recordSignupConsent,
  now = new Date(),
}) {
  const { user, created } = await findOrCreateGoogleUser({
    dbGet,
    dbQuery,
    userColumns,
    ...profile,
    assertCanCreate: () => {
      // GDPR Art. 7: we must be able to demonstrate consent for every account we
      // create. No attestation -> no account.
      if (!acceptedPolicyVersion) {
        const err = new Error(
          "Please accept the Terms, Privacy & Compliance policy to create an account."
        );
        err.status = 403;
        err.code = "google_consent_required";
        throw err;
      }
      // Google's `openid email profile` scope carries no birthdate, so there is
      // no DOB to check. When the gate is ON that means the account cannot be
      // age-verified and is refused; when it is OFF this is a no-op.
      assertSignupAgePolicy({ dateOfBirth: null, policy: agePolicy, now });
    },
  });

  if (!user?.id) {
    throw new Error("Unable to create or link Google user.");
  }

  if (created && typeof recordSignupConsent === "function") {
    await recordSignupConsent({ userId: user.id, source: "google_signup" });
  }

  return { user, created };
}
