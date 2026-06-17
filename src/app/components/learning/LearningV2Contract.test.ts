import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const learningPageSource = readFileSync(
  path.join(process.cwd(), "src/app/components/learning/LearningPage.tsx"),
  "utf8",
);

describe("Learning V2 product contract", () => {
  it("uses the central product registry and meter instead of local entitlement UI", () => {
    expect(learningPageSource).toContain("useProductRegistry");
    expect(learningPageSource).toContain("useMeterStatus");
    expect(learningPageSource).toContain('data-product-id={LEARNING_PRODUCT_ID}');
    expect(learningPageSource).toContain("Central meter");
    expect(learningPageSource).not.toContain("useEntitlements");
    expect(learningPageSource).not.toContain("useBillingPortal");
  });

  it("keeps global account, billing, privacy, and usage controls linked to central settings", () => {
    expect(learningPageSource).toContain("/settings#settings-billing");
    expect(learningPageSource).toContain("/settings#settings-privacy");
    expect(learningPageSource).toContain("learner_memory");
    expect(learningPageSource).not.toContain("/learn/settings/billing");
  });

  it("defines central operational states for hosted Learn", () => {
    for (const state of [
      "enabled",
      "disabled",
      "maintenance",
      "degraded",
      "readOnly",
      "privateBeta",
    ]) {
      expect(learningPageSource).toContain(state);
    }
  });

  it("keeps saved learning visible while central read-only states fail writes closed", () => {
    expect(learningPageSource).toContain("const learningWritesDisabled");
    expect(learningPageSource).toContain('productState === "readOnly"');
    expect(learningPageSource).toContain("assertLearningWritesAllowed");
    expect(learningPageSource).toContain("<LearningWriteGateContext.Provider");
    expect(learningPageSource).not.toContain("learningStateBlocksWork");
  });
});
