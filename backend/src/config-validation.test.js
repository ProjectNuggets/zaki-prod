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
});
