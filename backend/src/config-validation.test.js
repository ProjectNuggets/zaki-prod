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
  it("warns loudly in development when Stripe billing config is incomplete", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        STRIPE_PRICE_STUDENT_YEARLY: "",
        STRIPE_PRICE_PERSONAL_YEARLY: "",
        STRIPE_PRICE_PRO_YEARLY: "",
        STRIPE_PRICE_PRO_MAX_YEARLY: "",
        STRIPE_PRICE_PERSONAL: "",
        STRIPE_PRICE_PRO: "",
        STRIPE_PRICE_PRO_MAX: "",
        STRIPE_PRICE_ACCESS_CODE_MONTHLY: "",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_SECRET_KEY" }),
        expect.objectContaining({ key: "STRIPE_WEBHOOK_SECRET" }),
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT" }),
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_MAX_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_MAX" }),
        expect.objectContaining({ key: "STRIPE_PRICE_ACCESS_CODE_MONTHLY" }),
      ])
    );
  });

  it("refuses production startup when Stripe billing config is incomplete", () => {
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
        ZAKI_TURNSTILE_SECRET_KEY: "turnstile-secret",
      })
    );

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_SECRET_KEY" }),
        expect.objectContaining({ key: "STRIPE_WEBHOOK_SECRET" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_MAX" }),
      ])
    );
  });

  it("accepts complete production Stripe billing config", () => {
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
        ZAKI_TURNSTILE_SECRET_KEY: "turnstile-secret",
        STRIPE_SECRET_KEY: "sk_test_configured",
        STRIPE_WEBHOOK_SECRET: "whsec_configured",
        STRIPE_PRICE_STUDENT: "price_student_monthly",
        STRIPE_PRICE_STUDENT_YEARLY: "price_student_yearly",
        STRIPE_PRICE_PERSONAL: "price_personal_monthly",
        STRIPE_PRICE_PERSONAL_YEARLY: "price_personal_yearly",
        STRIPE_PRICE_PRO: "price_pro_monthly",
        STRIPE_PRICE_PRO_YEARLY: "price_pro_yearly",
        STRIPE_PRICE_PRO_MAX: "price_pro_max_monthly",
        STRIPE_PRICE_PRO_MAX_YEARLY: "price_pro_max_yearly",
        STRIPE_PRICE_ACCESS_CODE_MONTHLY: "price_access_code_monthly",
        ZAKI_BILLING_ALERT_WEBHOOK_URL: "https://alerts.example.com/metering",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it("boots in production when only the deferred SKUs (student/yearly/access-code) are unset", () => {
    // The owner deferred these price IDs as non-blocking; a missing SKU disables one checkout
    // button, it must not crash the server. Core monthly plans + Stripe secrets + the fail-open
    // paging webhook are present, so production boots with warnings — not a fatal config error.
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
        ZAKI_TURNSTILE_SECRET_KEY: "turnstile-secret",
        STRIPE_SECRET_KEY: "sk_test_configured",
        STRIPE_WEBHOOK_SECRET: "whsec_configured",
        STRIPE_PRICE_PERSONAL: "price_personal_monthly",
        STRIPE_PRICE_PRO: "price_pro_monthly",
        STRIPE_PRICE_PRO_MAX: "price_pro_max_monthly",
        ZAKI_BILLING_ALERT_WEBHOOK_URL: "https://alerts.example.com/metering",
        // Deferred, non-blocking:
        STRIPE_PRICE_STUDENT: "",
        STRIPE_PRICE_STUDENT_YEARLY: "",
        STRIPE_PRICE_PERSONAL_YEARLY: "",
        STRIPE_PRICE_PRO_YEARLY: "",
        STRIPE_PRICE_PRO_MAX_YEARLY: "",
        STRIPE_PRICE_ACCESS_CODE_MONTHLY: "",
      })
    );

    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
    const errorKeys = report.errors.map((e) => e.key);
    expect(errorKeys).not.toContain("STRIPE_PRICE_STUDENT");
    expect(errorKeys).not.toContain("STRIPE_PRICE_STUDENT_YEARLY");
    expect(errorKeys).not.toContain("STRIPE_PRICE_PERSONAL_YEARLY");
    expect(errorKeys).not.toContain("STRIPE_PRICE_PRO_YEARLY");
    expect(errorKeys).not.toContain("STRIPE_PRICE_PRO_MAX_YEARLY");
    expect(errorKeys).not.toContain("STRIPE_PRICE_ACCESS_CODE_MONTHLY");
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT" }),
        expect.objectContaining({ key: "STRIPE_PRICE_STUDENT_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PERSONAL_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_PRO_MAX_YEARLY" }),
        expect.objectContaining({ key: "STRIPE_PRICE_ACCESS_CODE_MONTHLY" }),
      ])
    );
  });

  it("requires a paging destination in production while fail-open is enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_METER_FAIL_OPEN_ENABLED: "true",
        ZAKI_BILLING_ALERT_WEBHOOK_URL: "",
      })
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ZAKI_BILLING_ALERT_WEBHOOK_URL" })])
    );
  });

  it("does not require a paging destination when production fail-open is killed", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_METER_FAIL_OPEN_ENABLED: "false",
        ZAKI_BILLING_ALERT_WEBHOOK_URL: "",
      })
    );

    expect(
      report.errors.find((error) => error.key === "ZAKI_BILLING_ALERT_WEBHOOK_URL")
    ).toBeUndefined();
  });

  it("does not emit Stripe price warnings for non-stripe providers", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_BILLING_PROVIDER: "paddle",
      })
    );

    const warningKeys = report.warnings.map((warning) => warning.key);
    expect(warningKeys).not.toContain("STRIPE_SECRET_KEY");
    expect(warningKeys).not.toContain("STRIPE_WEBHOOK_SECRET");
    expect(warningKeys).not.toContain("STRIPE_PRICE_STUDENT");
    expect(warningKeys).not.toContain("STRIPE_PRICE_STUDENT_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PERSONAL_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PRO_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PRO_MAX_YEARLY");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PERSONAL");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PRO");
    expect(warningKeys).not.toContain("STRIPE_PRICE_PRO_MAX");
    expect(warningKeys).not.toContain("STRIPE_PRICE_ACCESS_CODE_MONTHLY");
  });

  it("warns when commercial Stripe upgrades lack an explicit portal configuration", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        STRIPE_PRICE_PERSONAL: "price_personal",
        STRIPE_PRICE_PRO: "price_pro",
        STRIPE_PRICE_PRO_MAX: "price_pro_max",
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
      ZAKI_TURNSTILE_SECRET_KEY: "turnstile-secret",
    });
    const { errors } = validateRuntimeConfig(env);
    expect(errors.find((e) => e.key === "ZAKI_JWT_SIGNING_KEY")).toBeUndefined();
  });

  it("requires Turnstile in production unless explicitly disabled", () => {
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

    expect(validateRuntimeConfig(env).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ZAKI_TURNSTILE_SECRET_KEY" })])
    );

    expect(
      validateRuntimeConfig({
        ...env,
        ZAKI_TURNSTILE_DISABLED: "true",
      }).errors.find((error) => error.key === "ZAKI_TURNSTILE_SECRET_KEY")
    ).toBeUndefined();
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

  it("requires a fixed Minutes read origin and dedicated token when enabled", () => {
    const missing = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_ENABLED: "true",
        MINUTES_ENGINE_BASE_URL: "",
        MINUTES_ENGINE_READ_TOKEN: "",
      })
    );
    expect(missing.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "MINUTES_ENGINE_BASE_URL" }),
      expect.objectContaining({ key: "MINUTES_ENGINE_READ_TOKEN" }),
    ]));

    const unsafe = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_ENABLED: "true",
        MINUTES_ENGINE_BASE_URL: "https://user:secret@minutes.example.test/api/zaki/read/v1",
        MINUTES_ENGINE_READ_TOKEN: "short",
      })
    );
    expect(unsafe.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "MINUTES_ENGINE_BASE_URL" }),
      expect.objectContaining({ key: "MINUTES_ENGINE_READ_TOKEN" }),
    ]));
  });

  it("accepts sealed Minutes read config and warns when credentials are staged behind the disabled gate", () => {
    const enabled = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_ENABLED: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_READ_TOKEN: "m".repeat(32),
      })
    );
    expect(enabled.errors.find((issue) => issue.key.startsWith("MINUTES_ENGINE"))).toBeUndefined();

    const disabled = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_ENABLED: "false",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_READ_TOKEN: "m".repeat(32),
      })
    );
    expect(disabled.errors.find((issue) => issue.key.startsWith("MINUTES_ENGINE"))).toBeUndefined();
    expect(disabled.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ZAKI_MINUTES_ENABLED" }),
    ]));
  });

  it("requires file-projected Minutes credentials in production and rejects env-carried secrets", () => {
    const envSecret = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_MINUTES_ENABLED: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_READ_TOKEN: "m".repeat(32),
      })
    );
    expect(envSecret.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "MINUTES_ENGINE_READ_TOKEN" }),
      expect.objectContaining({ key: "MINUTES_ENGINE_READ_TOKEN_FILE" }),
    ]));

    const projected = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_MINUTES_ENABLED: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_READ_TOKEN_FILE: "/run/secrets/zaki-read/minutes",
      })
    );
    expect(projected.errors.find((issue) => issue.key.startsWith("MINUTES_ENGINE"))).toBeUndefined();
  });

  it("keeps Minutes control dark until the separate staging-evidence gate is set", () => {
    const dark = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_CONTROL_ENABLED: "true",
        ZAKI_MINUTES_CONTROL_STAGING_READY: "false",
        MINUTES_ENGINE_CONTROL_TOKEN: "c".repeat(32),
      })
    );
    expect(dark.errors.find((issue) => issue.key === "MINUTES_ENGINE_CONTROL_TOKEN")).toBeUndefined();
    expect(dark.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ZAKI_MINUTES_CONTROL_STAGING_READY" }),
    ]));

    const invalidEvidence = validateRuntimeConfig(
      createBaseEnv({ ZAKI_MINUTES_CONTROL_STAGING_READY: "true" })
    );
    expect(invalidEvidence.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ZAKI_MINUTES_CONTROL_STAGING_READY" }),
    ]));
  });

  it("requires complete scoped-token, callback-HMAC, and reserve configuration once Minutes control is active", () => {
    const missing = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_CONTROL_ENABLED: "true",
        ZAKI_MINUTES_CONTROL_STAGING_READY: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
      })
    );
    expect(missing.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "MINUTES_ENGINE_CONTROL_TOKEN" }),
      expect.objectContaining({ key: "MINUTES_ENGINE_CALLBACK_HMAC_KEY" }),
      expect.objectContaining({ key: "MINUTES_CONTROL_CAPTURE_RESERVE_UNITS" }),
    ]));

    const configured = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_CONTROL_ENABLED: "true",
        ZAKI_MINUTES_CONTROL_STAGING_READY: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_CONTROL_TOKEN: "c".repeat(32),
        MINUTES_ENGINE_CALLBACK_HMAC_KEY: "h".repeat(32),
        MINUTES_CONTROL_CAPTURE_RESERVE_UNITS: "60",
        MINUTES_CONTROL_TOKEN_TTL_SECONDS: "60",
      })
    );
    expect(configured.errors.find((issue) => issue.key.includes("MINUTES_CONTROL") || issue.key === "MINUTES_ENGINE_BASE_URL")).toBeUndefined();
  });

  it("requires projected Minutes control signing and callback keys in production", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        NODE_ENV: "production",
        ZAKI_MINUTES_CONTROL_ENABLED: "true",
        ZAKI_MINUTES_CONTROL_STAGING_READY: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_CONTROL_TOKEN_FILE: "/run/secrets/zaki-control/signing-key",
        MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE: "/run/secrets/zaki-control/callback-key",
        MINUTES_CONTROL_CAPTURE_RESERVE_UNITS: "60",
      })
    );
    expect(report.errors.find((issue) => issue.key.includes("MINUTES_CONTROL") || issue.key === "MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE")).toBeUndefined();
  });

  it("rejects an active Minutes control policy that would violate the sealed retention contract", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_MINUTES_CONTROL_ENABLED: "true",
        ZAKI_MINUTES_CONTROL_STAGING_READY: "true",
        MINUTES_ENGINE_BASE_URL: "http://zaki-minutes-engine:8056",
        MINUTES_ENGINE_CONTROL_TOKEN: "c".repeat(32),
        MINUTES_ENGINE_CALLBACK_HMAC_KEY: "h".repeat(32),
        MINUTES_CONTROL_CAPTURE_RESERVE_UNITS: "60",
        MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS: "10",
        MINUTES_CONTROL_POLICY_VERSION: "not a valid policy id",
        MINUTES_CONTROL_AUDIO_RETENTION_DAYS: "366",
        MINUTES_CONTROL_TRANSCRIPT_RETENTION_DAYS: "20",
        MINUTES_CONTROL_SUMMARY_RETENTION_DAYS: "21",
      })
    );

    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "MINUTES_CONTROL_CAPTURE_HOLD_TTL_MS" }),
      expect.objectContaining({ key: "MINUTES_CONTROL_POLICY_VERSION" }),
      expect.objectContaining({ key: "MINUTES_CONTROL_AUDIO_RETENTION_DAYS" }),
      expect.objectContaining({ key: "MINUTES_CONTROL_SUMMARY_RETENTION_DAYS" }),
    ]));
  });

  it("requires the complete split-token controller contract when the Design session controller is enabled", () => {
    const report = validateRuntimeConfig(
      createBaseEnv({
        ZAKI_DESIGN_ENABLED: "false",
        ZAKI_DESIGN_SESSION_CONTROLLER_ENABLED: "true",
      })
    );
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ZAKI_DESIGN_CONTROLLER_BASE_URL" }),
      expect.objectContaining({ key: "ZAKI_DESIGN_CONTROLLER_TOKEN" }),
      expect.objectContaining({ key: "ZAKI_DESIGN_HUB_CALLBACK_TOKEN" }),
    ]));
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

  it("requires a central meter signing key in production when hire is enabled", () => {
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
        ZAKI_HIRE_ENABLED: "true",
        HIRE_ENGINE_BASE_URL: "http://hire:8002",
        HIRE_ENGINE_INTERNAL_TOKEN: "internal-token",
      })
    );

    expect(report.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ZAKI_METER_GRANT_SIGNING_SECRET" })])
    );
  });

  it("accepts production hire config with a central meter signing key", () => {
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
        ZAKI_HIRE_ENABLED: "true",
        HIRE_ENGINE_BASE_URL: "http://hire:8002",
        HIRE_ENGINE_INTERNAL_TOKEN: "internal-token",
        ZAKI_METER_GRANT_SIGNING_SECRET: "hire-meter-signing-key-production-2026",
      })
    );

    expect(report.errors.find((e) => e.key === "ZAKI_METER_GRANT_SIGNING_SECRET")).toBeUndefined();
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
