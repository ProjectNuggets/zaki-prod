import { describe, it, expect } from "@jest/globals";
import {
  buildLoginSchema,
  buildSignupSchema,
  validateLegalPolicyVersion,
  buildConsentStatus,
  resolveMinimumSignupAge,
  validateMinimumSignupAge,
} from "./legal-consent.js";

describe("legal consent auth schemas", () => {
  it("does not require consent fields for login", () => {
    const schema = buildLoginSchema();

    const valid = schema.safeParse({
      username: "user@example.com",
      password: "secret",
    });
    expect(valid.success).toBe(true);

    const missingIdentity = schema.safeParse({
      password: "secret",
    });
    expect(missingIdentity.success).toBe(false);
  });

  it("requires consent fields for signup", () => {
    const schema = buildSignupSchema();

    const missingConsent = schema.safeParse({
      email: "user@example.com",
      password: "Password123",
      name: "User",
      dateOfBirth: "1995-01-15",
    });
    expect(missingConsent.success).toBe(false);

    const valid = schema.safeParse({
      email: "user@example.com",
      password: "Password123",
      name: "User",
      dateOfBirth: "1995-01-15",
      legalConsentAccepted: true,
      legalPolicyVersion: "2026-07-12.v4",
    });
    expect(valid.success).toBe(true);
  });
});

describe("minimum signup age", () => {
  it("uses 16 unless an operator configures a plausible threshold", () => {
    expect(resolveMinimumSignupAge(undefined)).toBe(16);
    expect(resolveMinimumSignupAge("18")).toBe(18);
    expect(resolveMinimumSignupAge("12")).toBe(16);
  });

  it("rejects under-age and impossible birth dates on the server", () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    expect(validateMinimumSignupAge("2010-07-13", 16, now)).toMatchObject({ ok: false });
    expect(validateMinimumSignupAge("2010-07-12", 16, now)).toMatchObject({ ok: true, age: 16 });
    expect(validateMinimumSignupAge("2020-02-31", 16, now)).toMatchObject({ ok: false });
  });
});

describe("legal consent version and status", () => {
  it("rejects stale policy version", () => {
    const result = validateLegalPolicyVersion("2025-01-01.v1", "2026-07-12.v4");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("2026-07-12.v4");
  });

  it("marks missing or stale consent as requiring re-consent", () => {
    const current = "2026-07-12.v4";
    const missing = buildConsentStatus({}, current);
    expect(missing.requiresReconsent).toBe(true);

    const stale = buildConsentStatus(
      {
        legal_consent_version: "2025-01-01.v1",
        legal_consent_at: "2026-02-15T10:00:00.000Z",
      },
      current
    );
    expect(stale.requiresReconsent).toBe(true);

    const currentStatus = buildConsentStatus(
      {
        legal_consent_version: current,
        legal_consent_at: "2026-02-16T10:00:00.000Z",
      },
      current
    );
    expect(currentStatus.requiresReconsent).toBe(false);
    expect(currentStatus.isCurrent).toBe(true);
  });
});
