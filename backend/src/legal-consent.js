import { z } from "zod";

export const LEGAL_POLICY_VERSION_FALLBACK = "2026-02-17.v2";

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
      ...buildLegalConsentShape(),
    })
    .refine((data) => data.email || data.username, {
      message: "Email or username is required",
      path: ["email"],
    });
}

export function buildSignupSchema() {
  return z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required").max(100),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
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
