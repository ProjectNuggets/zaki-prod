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
  it("warns when commercial Stripe prices are missing without failing startup", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        STRIPE_PRICE_STUDENT_YEARLY: "",
        STRIPE_PRICE_PERSONAL_YEARLY: "",
        STRIPE_PRICE_AGENT_MONTHLY: "",
        STRIPE_PRICE_LEARN_MONTHLY: "",
        STRIPE_PRICE_COMPLETE_MONTHLY: "",
        STRIPE_PRICE_ACCESS_CODE_MONTHLY: "",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_AGENT_MONTHLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_LEARN_MONTHLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_COMPLETE_MONTHLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_ACCESS_CODE_MONTHLY" }),
      ])
    );
  });

  it("does not emit Stripe price warnings for non-stripe providers", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_BILLING_PROVIDER: "paddle",
      })
    );

    const warningKeys = report.warnings.map((warning) => warning.key);
    expect(warningKeys).not.toContain("STRIPE_PRICE_STUDENT_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PERSONAL_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_AGENT_MONTHLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_LEARN_MONTHLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_COMPLETE_MONTHLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_ACCESS_CODE_MONTHLY");
  });

  it("warns when commercial Stripe upgrades lack an explicit portal configuration", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        STRIPE_PRICE_AGENT_MONTHLY: "price_agent",
        STRIPE_PRICE_LEARN_MONTHLY: "price_learn",
        STRIPE_PRICE_COMPLETE_MONTHLY: "price_complete",
        STRIPE_BILLING_PORTAL_CONFIGURATION: "",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_BILLING_PORTAL_CONFIGURATION" }),
      ])
    );
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

  it("blocks Nullalis dev-user bypass in production config", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_ALLOWED_ORIGINS: "https://app.chatzaki.com",
        ZAKI_PUBLIC_URL: "https://api.chatzaki.com",
        ZAKI_APP_URL: "https://app.chatzaki.com",
        ZAKI_LEGAL_POLICY_VERSION: "1.0",
        ZAKI_EMAIL_MODE: "resend",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "no-reply@chatzaki.com",
        ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
        NULLALIS_DEV_USER_ID: "1",
      })
    );

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "NULLALIS_DEV_USER_ID" })])
    );
  });

  it("warns about Nullalis dev-user bypass in local config", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "development",
        NULLCLAW_DEV_USER_ID: "1",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "NULLALIS_DEV_USER_ID" })])
    );
  });

  it("requires learning engine base and token when learning is enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_LEARNING_ENABLED: "true",
        LEARNING_ENGINE_BASE_URL: "",
        LEARNING_ENGINE_INTERNAL_TOKEN: "",
      })
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "LEARNING_ENGINE_BASE_URL" }),
        expect.objectContaining({ key: "LEARNING_ENGINE_INTERNAL_TOKEN" }),
      ])
    );
  });

  it("accepts learning engine config when enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_LEARNING_ENABLED: "true",
        LEARNING_ENGINE_BASE_URL: "http://learning:8001",
        LEARNING_ENGINE_INTERNAL_TOKEN: "secret",
      })
    );

    expect(report.errors.find((e) => e.key === "LEARNING_ENGINE_BASE_URL")).toBeUndefined();
    expect(report.errors.find((e) => e.key === "LEARNING_ENGINE_INTERNAL_TOKEN")).toBeUndefined();
  });

  it("warns when learning config is present but disabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_LEARNING_ENABLED: "false",
        LEARNING_ENGINE_BASE_URL: "http://learning:8001",
        LEARNING_ENGINE_INTERNAL_TOKEN: "secret",
      })
    );

    expect(report.errors.find((e) => e.key === "LEARNING_ENGINE_BASE_URL")).toBeUndefined();
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ZAKI_LEARNING_ENABLED" })])
    );
  });

  it("requires hire engine base and token when hire is enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_HIRE_ENABLED: "true",
        HIRE_ENGINE_BASE_URL: "",
        HIRE_ENGINE_INTERNAL_TOKEN: "",
      })
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "HIRE_ENGINE_BASE_URL" }),
        expect.objectContaining({ key: "HIRE_ENGINE_INTERNAL_TOKEN" }),
      ])
    );
  });

  it("accepts hire engine config when enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_HIRE_ENABLED: "true",
        HIRE_ENGINE_BASE_URL: "http://hire:8002",
        HIRE_ENGINE_INTERNAL_TOKEN: "secret",
      })
    );

    expect(report.errors.find((e) => e.key === "HIRE_ENGINE_BASE_URL")).toBeUndefined();
    expect(report.errors.find((e) => e.key === "HIRE_ENGINE_INTERNAL_TOKEN")).toBeUndefined();
  });

  it("warns when hire config is present but disabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_HIRE_ENABLED: "false",
        HIRE_ENGINE_BASE_URL: "http://hire:8002",
        HIRE_ENGINE_INTERNAL_TOKEN: "secret",
      })
    );

    expect(report.errors.find((e) => e.key === "HIRE_ENGINE_BASE_URL")).toBeUndefined();
    expect(report.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ZAKI_HIRE_ENABLED" })])
    );
  });
});
