import { resolveMinimumSignupAge, validateMinimumSignupAge } from "./legal-consent.js";

/**
 * Signup policy — the SINGLE place the age gate is configured and evaluated.
 *
 * Both account-creation paths (email signup and Google OAuth) call
 * `evaluateSignupAgePolicy` with the same policy object, so the age rule cannot
 * drift between them. To change the policy, flip config; do not edit either auth
 * path.
 *
 * WP-M — ZAKI NO LONGER COLLECTS A DATE OF BIRTH ANYWHERE.
 *
 * The gate had been off in every environment (`ZAKI_AGE_GATE_ENABLED=false`),
 * which meant a DOB was collected on the email path and never enforced. GDPR
 * Art. 5(1)(c) (data minimisation) makes an unused sensitive field a liability in
 * itself, so collection was dropped: the signup form, the request payload and the
 * persisted column are all gone. Minimum age is now a **ToS attestation** (the
 * market norm — ChatGPT/Claude do the same), carried by the mandatory consent
 * clickwrap, which remains an invariant of account creation on BOTH paths.
 *
 * The ONLY supported behaviour is therefore: no DOB, no wall.
 *
 *   ZAKI_AGE_GATE_ENABLED   unset / "false" | "0" | "no" | "off"  -> attestation-only (default)
 *                           "true" | "1" | ...                    -> gate requested (see below)
 *   ZAKI_MINIMUM_SIGNUP_AGE integer 13..21                        -> threshold (default 16)
 *
 * The config surface is deliberately retained so that a lawyer-driven decision to
 * reintroduce a hard gate is a config + form change, not surgery. But note what
 * enabling it means TODAY: with no DOB collected on either path, an enabled gate
 * is **unsatisfiable** and fails closed — every new account, email and Google
 * alike, is refused with `age_verification_required`. That is intentional. A
 * legal control must never silently no-op; if you turn the gate on you must also
 * reintroduce DOB collection in the signup form and payload. `index.js` logs a
 * loud boot error if the gate is enabled, so this can't be discovered in prod.
 */

export const DEFAULT_AGE_GATE_ENABLED = false;

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
 * Identical semantics for every caller. Since WP-M, NEITHER path supplies a DOB:
 * the email form no longer collects one, and Google's `openid email profile`
 * scope never carried one. `dateOfBirth` is retained on the signature only so the
 * dormant gate stays wired end-to-end.
 *
 *   gate disabled (default)  -> { ok: true }  (no DOB wall on EITHER path)
 *   gate enabled, no DOB     -> { ok: false, code: "age_verification_required" }
 *   gate enabled, underage   -> { ok: false, code: "minimum_age" }
 *   gate enabled, old enough -> { ok: true }
 *
 * In today's configuration only the first branch is reachable. The rest fire only
 * if someone re-enables the gate, in which case "no DOB" is the universal verdict
 * until DOB collection is reintroduced — fail-closed, by design.
 */
export function evaluateSignupAgePolicy({ dateOfBirth, policy, now = new Date() } = {}) {
  const activePolicy = policy || { enabled: DEFAULT_AGE_GATE_ENABLED, minimumAge: 16 };

  if (!activePolicy.enabled) {
    return { ok: true, enforced: false };
  }

  const normalizedDob = String(dateOfBirth || "").trim();
  if (!normalizedDob) {
    // Reachable only with the gate re-enabled. ZAKI collects no birthdate on any
    // path, so we cannot verify age and must refuse rather than wave the user
    // through. The old copy told people to "sign up with your email address so we
    // can collect your date of birth" — that route no longer exists, so we no
    // longer promise it.
    return {
      ok: false,
      enforced: true,
      code: "age_verification_required",
      error:
        `We cannot verify that you are at least ${activePolicy.minimumAge} years old, ` +
        `so we are unable to create an account right now. Please contact support.`,
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
