import { describe, expect, test } from "@jest/globals";
import { RUNTIME_POOL_TIMEOUTS } from "./db.js";

// The whole point of these guardrails is that no runtime query can hang forever.
// If any value is missing, zero, or non-finite, that guarantee is gone.
describe("runtime pool timeouts", () => {
  test("every guardrail is a positive, finite millisecond value", () => {
    for (const [key, ms] of Object.entries(RUNTIME_POOL_TIMEOUTS)) {
      expect(Number.isFinite(ms)).toBe(true);
      expect(ms).toBeGreaterThan(0);
    }
    // No infinite statement_timeout — the exact bug this fixes (default 0 = no limit).
    expect(RUNTIME_POOL_TIMEOUTS.statement_timeout).toBeGreaterThan(0);
  });

  test("runtime statement_timeout stays under the 120s migration override", () => {
    // Boot DDL raises its own client to 120s (db.js). Runtime must be lower, or
    // migrations would be the thing getting killed instead of runaway queries.
    expect(RUNTIME_POOL_TIMEOUTS.statement_timeout).toBeLessThan(120_000);
  });
});
