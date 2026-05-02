import { describe, expect, it } from "@jest/globals";
import { validateRuntimeConfig } from "./config-validation.js";

function createBaseEnv(overrides = {}) {
  return {
    NODE_ENV: "development",
    NOVA_TYP_BASE_URL: "https://api.example.com",
    NOVA_TYP_API_KEY: "test-key",
    ZAKI_BILLING_PROVIDER: "stripe",
    ...overrides,
  };
}

describe("runtime config validation", () => {
  it("warns when yearly Stripe prices are missing without failing startup", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        STRIPE_PRICE_STUDENT_YEARLY: "",
        STRIPE_PRICE_PERSONAL_YEARLY: "",
        STRIPE_PRICE_ACCESS_CODE_MONTHLY: "",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_ACCESS_CODE_MONTHLY" }),
      ])
    );
  });

  it("does not emit yearly Stripe warnings for non-stripe providers", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_BILLING_PROVIDER: "paddle",
      })
    );

    const warningKeys = report.warnings.map((warning) => warning.key);
    expect(warningKeys).not.toContain("STRIPE_PRICE_STUDENT_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PERSONAL_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_ACCESS_CODE_MONTHLY");
  });

  it("OATH-09: production missing ZAKI_JWT_SIGNING_KEY pushes an error", () => {
    const env = createBaseEnv({
      NODE_ENV: "production",
      ZAKI_ALLOWED_ORIGINS: "https://app.chatzaki.com",
      ZAKI_PUBLIC_URL: "https://api.chatzaki.com",
      ZAKI_APP_URL: "https://app.chatzaki.com",
      ZAKI_LEGAL_POLICY_VERSION: "1.0",
      ZAKI_EMAIL_MODE: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "no-reply@chatzaki.com",
    });
    delete env.ZAKI_JWT_SIGNING_KEY;
    const { errors } = validateRuntimeConfig(env);
    expect(errors.some((e) => e.key === "ZAKI_JWT_SIGNING_KEY")).toBe(true);
  });

  it("OATH-09: production with malformed ZAKI_JWT_SIGNING_KEY pushes an error", () => {
    const env = createBaseEnv({
      NODE_ENV: "production",
      ZAKI_ALLOWED_ORIGINS: "https://app.chatzaki.com",
      ZAKI_PUBLIC_URL: "https://api.chatzaki.com",
      ZAKI_APP_URL: "https://app.chatzaki.com",
      ZAKI_LEGAL_POLICY_VERSION: "1.0",
      ZAKI_EMAIL_MODE: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "no-reply@chatzaki.com",
      ZAKI_JWT_SIGNING_KEY: "not-hex-and-too-short",
    });
    const { errors } = validateRuntimeConfig(env);
    expect(errors.some((e) => e.key === "ZAKI_JWT_SIGNING_KEY")).toBe(true);
  });

  it("OATH-09: production with valid 64-char hex passes", () => {
    const env = createBaseEnv({
      NODE_ENV: "production",
      ZAKI_ALLOWED_ORIGINS: "https://app.chatzaki.com",
      ZAKI_PUBLIC_URL: "https://api.chatzaki.com",
      ZAKI_APP_URL: "https://app.chatzaki.com",
      ZAKI_LEGAL_POLICY_VERSION: "1.0",
      ZAKI_EMAIL_MODE: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "no-reply@chatzaki.com",
      ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
    });
    const { errors } = validateRuntimeConfig(env);
    expect(errors.find((e) => e.key === "ZAKI_JWT_SIGNING_KEY")).toBeUndefined();
  });

  it("OATH-09: non-production missing ZAKI_JWT_SIGNING_KEY does NOT error", () => {
    const env = createBaseEnv({ NODE_ENV: "development" });
    delete env.ZAKI_JWT_SIGNING_KEY;
    const { errors } = validateRuntimeConfig(env);
    expect(errors.find((e) => e.key === "ZAKI_JWT_SIGNING_KEY")).toBeUndefined();
  });
});
