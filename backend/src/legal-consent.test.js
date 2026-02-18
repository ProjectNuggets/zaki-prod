import { describe, it, expect } from "@jest/globals";
import {
  buildLoginSchema,
  buildSignupSchema,
  validateLegalPolicyVersion,
  buildConsentStatus,
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
      legalPolicyVersion: "2026-02-17.v2",
    });
    expect(valid.success).toBe(true);
  });
});

describe("legal consent version and status", () => {
  it("rejects stale policy version", () => {
    const result = validateLegalPolicyVersion("2025-01-01.v1", "2026-02-17.v2");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("2026-02-17.v2");
  });

  it("marks missing or stale consent as requiring re-consent", () => {
    const current = "2026-02-17.v2";
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
