import { z } from "zod";
import { sanitizeLocalReturnTo } from "./auth-return-to.js";

export const LEGAL_POLICY_VERSION_FALLBACK = "2026-07-12.v4";
export const MINIMUM_SIGNUP_AGE_FALLBACK = 16;

export function resolveLegalPolicyVersion(rawVersion) {
  return String(rawVersion || "").trim() || LEGAL_POLICY_VERSION_FALLBACK;
}

export function buildLegalConsentShape() {
  return {
    legalConsentAccepted: z.boolean().refine((value) => value === true, {
      message: "You must accept Terms, Privacy & Compliance.",
    }),
    legalPolicyVersion: z
      .string()
      .trim()
      .min(1, "Legal policy version is required.")
      .max(80, "Legal policy version is invalid."),
  };
}

export function buildLoginSchema() {
  return z
    .object({
      email: z.string().email().optional(),
      username: z.string().email().optional(),
      password: z.string().min(1, "Password is required"),
    })
    .refine((data) => data.email || data.username, {
      message: "Email or username is required",
      path: ["email"],
    });
}

export function sanitizeAuthReturnTo(value) {
  return sanitizeLocalReturnTo(value, {
    fallback: "",
    stripSearchParams: ["auth"],
    requireLeadingSlash: true,
    allowRoot: false,
  });
}

export function buildVerificationLoginRedirect(appUrl, verifiedState = "success", returnTo = "") {
  const rawBase = String(appUrl || "").replace(/\/+$/, "");
  const appBase = rawBase.endsWith("/api") ? rawBase.slice(0, -4) : rawBase;
  const loginUrl = new URL(appBase.endsWith("/") ? appBase : `${appBase}/`);
  loginUrl.pathname = "/";
  loginUrl.searchParams.set("auth", "login");
  loginUrl.searchParams.set("verified", String(verifiedState || "success"));
  const safeReturnTo = sanitizeAuthReturnTo(returnTo);
  if (safeReturnTo) loginUrl.searchParams.set("next", safeReturnTo);
  return loginUrl.toString();
}

/**
 * WP-M — the signup schema no longer accepts a date of birth.
 *
 * The age gate is off (`ZAKI_AGE_GATE_ENABLED=false`), so a DOB was collected and
 * never enforced. Under GDPR Art. 5(1)(c) (data minimisation) holding a sensitive
 * personal field we do not act on is itself a liability, so we stopped collecting
 * it. Minimum age is now a ToS attestation — the same posture as ChatGPT/Claude —
 * carried by the mandatory `legalConsentAccepted` clickwrap below.
 *
 * Zod strips unknown keys by default, so a stale client still sending
 * `dateOfBirth` is accepted and the value is discarded rather than persisted.
 */
export function buildSignupSchema() {
  return z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required").max(100),
    returnTo: z.string().max(240).optional().transform(sanitizeAuthReturnTo),
    ...buildLegalConsentShape(),
  });
}

export function validateLegalPolicyVersion(rawVersion, currentVersion) {
  const version = String(rawVersion || "").trim();
  if (!version) {
    return { ok: false, error: "Legal policy version is required." };
  }
  if (version !== currentVersion) {
    return {
      ok: false,
      error: `Legal terms updated. Please review and accept policy version ${currentVersion}.`,
    };
  }
  return { ok: true, version };
}

/**
 * Age-gate primitives, retained but DORMANT (WP-M).
 *
 * No auth path collects a date of birth any more, so nothing calls
 * `validateMinimumSignupAge` at runtime: `evaluateSignupAgePolicy` short-circuits
 * on the missing DOB long before it gets here. They are kept — at zero runtime
 * cost — so that reintroducing a real age gate is a config + form change rather
 * than a rewrite of birthdate arithmetic. See `signup-policy.js`.
 */
export function resolveMinimumSignupAge(rawAge) {
  const parsed = Number.parseInt(String(rawAge ?? ""), 10);
  return Number.isInteger(parsed) && parsed >= 13 && parsed <= 21
    ? parsed
    : MINIMUM_SIGNUP_AGE_FALLBACK;
}

export function validateMinimumSignupAge(dateOfBirth, minimumAge, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOfBirth || ""));
  if (!match) return { ok: false, error: "Enter a valid date of birth." };

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (
    birthDate.getUTCFullYear() !== birthYear ||
    birthDate.getUTCMonth() !== birthMonth - 1 ||
    birthDate.getUTCDate() !== birthDay ||
    birthDate.getTime() > now.getTime()
  ) {
    return { ok: false, error: "Enter a valid date of birth." };
  }

  let age = now.getUTCFullYear() - birthYear;
  const birthdayHasPassed =
    now.getUTCMonth() + 1 > birthMonth ||
    (now.getUTCMonth() + 1 === birthMonth && now.getUTCDate() >= birthDay);
  if (!birthdayHasPassed) age -= 1;

  if (age < minimumAge) {
    return {
      ok: false,
      error: `You must be at least ${minimumAge} years old to create a ZAKI account.`,
    };
  }
  return { ok: true, age };
}

export function buildConsentStatus(zakiUser, currentPolicyVersion) {
  const consentVersion = String(zakiUser?.legal_consent_version || "").trim() || null;
  const consentedAt = zakiUser?.legal_consent_at
    ? new Date(zakiUser.legal_consent_at).toISOString()
    : null;
  const hasConsent = Boolean(consentVersion && consentedAt);
  const isCurrent = hasConsent && consentVersion === currentPolicyVersion;

  return {
    policyVersion: currentPolicyVersion,
    hasConsent,
    isCurrent,
    requiresReconsent: !isCurrent,
    consentVersion,
    consentedAt,
  };
}
