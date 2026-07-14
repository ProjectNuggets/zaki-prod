import { resolveMinimumSignupAge, validateMinimumSignupAge } from "./legal-consent.js";

/**
 * Signup policy — the SINGLE place the age gate is configured and evaluated.
 *
 * Both account-creation paths (email signup and Google OAuth) call
 * `evaluateSignupAgePolicy` with the same policy object, so the age rule cannot
 * drift between them. To change the policy (hard DOB gate vs. ToS
 * attestation-only) flip config; do not edit either auth path.
 *
 *   ZAKI_AGE_GATE_ENABLED   "false" | "0" | "no" | "off"  -> attestation-only
 *                           unset / anything else         -> hard DOB gate (default)
 *   ZAKI_MINIMUM_SIGNUP_AGE integer 13..21                -> threshold (default 16)
 *
 * Defaults preserve today's email-path behaviour: the gate is ON at age 16.
 */

export const DEFAULT_AGE_GATE_ENABLED = true;

const FALSEY = new Set(["0", "false", "no", "off"]);

export function resolveAgeGateEnabled(rawValue) {
  const normalized = String(rawValue ?? "").trim().toLowerCase();
  if (!normalized) return DEFAULT_AGE_GATE_ENABLED;
  return !FALSEY.has(normalized);
}

/**
 * Read the age policy from the environment. Call this ONCE at boot.
 */
export function resolveSignupAgePolicy(env = {}) {
  return {
    enabled: resolveAgeGateEnabled(env.ZAKI_AGE_GATE_ENABLED),
    minimumAge: resolveMinimumSignupAge(env.ZAKI_MINIMUM_SIGNUP_AGE),
  };
}

/**
 * Evaluate a prospective signup against the age policy.
 *
 * Identical semantics for every caller — email passes the DOB it collected,
 * Google passes null because OIDC `openid email profile` carries no birthdate.
 *
 *   gate disabled            -> { ok: true }  (no DOB wall on EITHER path)
 *   gate enabled, no DOB     -> { ok: false, code: "age_verification_required" }
 *   gate enabled, underage   -> { ok: false, code: "minimum_age" }
 *   gate enabled, old enough -> { ok: true }
 */
export function evaluateSignupAgePolicy({ dateOfBirth, policy, now = new Date() } = {}) {
  const activePolicy = policy || { enabled: DEFAULT_AGE_GATE_ENABLED, minimumAge: 16 };

  if (!activePolicy.enabled) {
    return { ok: true, enforced: false };
  }

  const normalizedDob = String(dateOfBirth || "").trim();
  if (!normalizedDob) {
    return {
      ok: false,
      enforced: true,
      code: "age_verification_required",
      error:
        `We must confirm you are at least ${activePolicy.minimumAge} years old before creating an account. ` +
        `Please sign up with your email address so we can collect your date of birth.`,
    };
  }

  const result = validateMinimumSignupAge(normalizedDob, activePolicy.minimumAge, now);
  if (!result.ok) {
    return { ok: false, enforced: true, code: "minimum_age", error: result.error };
  }
  return { ok: true, enforced: true, age: result.age };
}

/**
 * Throwing form used by the auth routes. Errors carry `status` + `code` so the
 * email handler can render JSON and the OAuth callback can redirect.
 */
export function assertSignupAgePolicy({ dateOfBirth, policy, now = new Date() } = {}) {
  const result = evaluateSignupAgePolicy({ dateOfBirth, policy, now });
  if (result.ok) return result;
  const error = new Error(result.error);
  error.status = 403;
  error.code = result.code;
  throw error;
}
